// 분석·성능 기록의 Firestore 연결과 브라우저 리스너 (specs/026, DEC-034·035)
// 기록 지점: main.tsx(startMetrics), App.tsx(화면), useGameState(팩), AuthService(로그인·탈퇴),
//           BoosterPackThreeView(3D 성능), WebGLErrorBoundary(2D 대체·오류)
import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { onCLS, onINP, onLCP } from 'web-vitals';
import { db, isFirebaseConfigured } from '../config/firebase';
import { PATCH_NOTES } from '../data/patchNotes';
import { METRICS_COLLECTION, VISITOR_ID_KEY, type DeviceKind } from '../types/metrics';
import { newSessionId } from './activityLog';
import { createMetricsLogger } from './metrics';
import { isLocalServer } from './storageService';

function requireDb() {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured');
  return db;
}

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}

/** 브라우저별 방문자 ID (DEC-034). 저장소를 못 쓰면 이번 페이지에서만 쓰는 ID */
function readVisitor(): { id: string; first: boolean } {
  try {
    const saved = window.localStorage.getItem(VISITOR_ID_KEY);
    if (saved && /^v_[a-z0-9_]{6,36}$/.test(saved)) return { id: saved, first: false };
    const id = `v_${randomId()}`;
    window.localStorage.setItem(VISITOR_ID_KEY, id);
    return { id, first: true };
  } catch {
    return { id: `v_${randomId()}`, first: true };
  }
}

export function deviceKind(): DeviceKind {
  try {
    return window.matchMedia('(max-width: 1023px)').matches || window.matchMedia('(pointer: coarse)').matches
      ? 'mobile'
      : 'desktop';
  } catch {
    return 'desktop';
  }
}

export const APP_VERSION = PATCH_NOTES[0]?.version ?? 'unknown';

export const metrics = createMetricsLogger({
  isLocal: () => isLocalServer() || !isFirebaseConfigured || !db,
  now: () => Date.now(),
  sessionId: newSessionId(),
  visitor: readVisitor,
  addMetric: (m) => addDoc(collection(requireDb(), METRICS_COLLECTION), { ...m, at: serverTimestamp() }),
});

let started = false;

/** 페이지를 열 때 한 번 (main.tsx). 방문·오류·세션 종료·첫 화면 로딩 지표 */
export function startMetrics(loggedIn: boolean): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    metrics.visit({ device: deviceKind(), loggedIn });

    window.addEventListener('error', (e) => {
      metrics.error('error', e.message || (e.error as Error | undefined)?.message || 'error', APP_VERSION);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason as { message?: unknown } | undefined;
      metrics.error('rejection', typeof r?.message === 'string' ? r.message : String(e.reason), APP_VERSION);
    });

    // web-vitals는 바뀔 때마다 값을 알려 준다. 화면이 숨겨질 때 그때까지의 값을 한 번 기록한다
    const vit: { lcp: number | null; inp: number | null; cls: number | null } = { lcp: null, inp: null, cls: null };
    onLCP((m) => (vit.lcp = Math.round(m.value)), { reportAllChanges: true });
    onINP((m) => (vit.inp = Math.round(m.value)), { reportAllChanges: true });
    onCLS((m) => (vit.cls = Math.round(m.value * 1000) / 1000), { reportAllChanges: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') return;
      metrics.sessionEnd();
      metrics.vitals({ device: deviceKind(), ...vit });
    });
  } catch (e) {
    console.warn('[Metrics] start skipped:', e);
  }
}

/** 탈퇴: 본인 identify 문서를 지운다. 실패하면 던진다 (spec 6절 탈퇴) */
export async function deleteMetricsIdentity(uid: string): Promise<void> {
  const firestore = requireDb();
  for (;;) {
    const snap = await getDocs(
      query(collection(firestore, METRICS_COLLECTION), where('uid', '==', uid), where('type', '==', 'identify'), limit(300)),
    );
    if (snap.empty) return;
    const batch = writeBatch(firestore);
    snap.docs.forEach((d) => batch.delete(doc(firestore, METRICS_COLLECTION, d.id)));
    await batch.commit();
  }
}
