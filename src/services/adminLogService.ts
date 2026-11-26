// 운영자 조회 화면의 Firestore 읽기 (specs/025, DEC-032). 쓰기·삭제는 하지 않는다 (DEC-023)
import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { ADMIN_GOOGLE_UIDS } from '../config/admin';
import { ACTIVITY_COLLECTION, type ActivityEventType } from '../types/activity';
import { ADMIN_FETCH_LIMIT, capEvents, type AdminEvent } from './adminLog';

/** 안내용 확인. 실제 권한은 firestore.rules의 isAdmin() */
export async function currentUserIsAdmin(): Promise<boolean> {
  if (!isFirebaseConfigured || !auth) return false;
  await auth.authStateReady();
  const u = auth.currentUser;
  if (!u || !ADMIN_GOOGLE_UIDS.includes(u.uid)) return false;
  return u.providerData.some((p) => p.providerId === 'google.com');
}

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as Timestamp).toMillis();
  return 0;
}

/** 기간 시작 이후 이벤트를 최신순으로 최대 ADMIN_FETCH_LIMIT건 (AC-05, AC-10) */
export async function fetchEventsSince(startMs: number): Promise<{ events: AdminEvent[]; capped: boolean }> {
  if (!db) throw new Error('Firestore not configured');
  const snap = await getDocs(
    query(
      collection(db, ACTIVITY_COLLECTION),
      where('at', '>=', Timestamp.fromMillis(startMs)),
      orderBy('at', 'desc'),
      limit(ADMIN_FETCH_LIMIT + 1),
    ),
  );
  const events: AdminEvent[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      uid: String(x.uid ?? ''),
      type: x.type as ActivityEventType,
      atMs: toMillis(x.at),
      kstDate: String(x.kstDate ?? ''),
      data: x.data && typeof x.data === 'object' ? (x.data as Record<string, unknown>) : {},
    };
  });
  return capEvents(events);
}

/** 공개 랭킹 문서의 닉네임. 없거나 실패하면 빠진다 (AC-06) */
export async function fetchNicknames(uids: string[]): Promise<Record<string, string>> {
  if (!db) return {};
  const firestore = db;
  const out: Record<string, string> = {};
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const s = await getDoc(doc(firestore, 'nmixx_tcg_leaderboard', uid));
        const name = s.exists() ? s.data().displayName : undefined;
        if (typeof name === 'string' && name) out[uid] = name;
      } catch {
        /* 닉네임 없이 계정 ID로 표시 */
      }
    }),
  );
  return out;
}
