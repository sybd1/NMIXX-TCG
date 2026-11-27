// 운영자 지표 탭의 Firestore 읽기·정리 (specs/026, DEC-035). 규칙상 운영자만 된다
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ACTIVITY_RETENTION_DAYS } from '../types/activity';
import { ADMIN_METRICS_FETCH_LIMIT, METRICS_COLLECTION, METRICS_PURGE_LIMIT, type MetricEventType } from '../types/metrics';
import type { AnalysisEvent } from './metricsAnalysis';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as Timestamp).toMillis();
  return 0;
}

/** 기간 시작 이후 기록을 최신순으로 최대 ADMIN_METRICS_FETCH_LIMIT건 */
export async function fetchMetricsSince(startMs: number): Promise<{ events: AnalysisEvent[]; capped: boolean }> {
  if (!db) throw new Error('Firestore not configured');
  const snap = await getDocs(
    query(
      collection(db, METRICS_COLLECTION),
      where('at', '>=', Timestamp.fromMillis(startMs)),
      orderBy('at', 'desc'),
      limit(ADMIN_METRICS_FETCH_LIMIT + 1),
    ),
  );
  const events: AnalysisEvent[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      vid: String(x.vid ?? ''),
      sid: String(x.sid ?? ''),
      type: x.type as MetricEventType,
      atMs: toMillis(x.at),
      kstDate: String(x.kstDate ?? ''),
      data: x.data && typeof x.data === 'object' ? (x.data as Record<string, unknown>) : {},
      ...(typeof x.uid === 'string' ? { uid: x.uid } : {}),
    };
  });
  const capped = events.length > ADMIN_METRICS_FETCH_LIMIT;
  return { events: capped ? events.slice(0, ADMIN_METRICS_FETCH_LIMIT) : events, capped };
}

/** 보관 기간(1년)이 지난 기록을 최대 METRICS_PURGE_LIMIT건 지운다. 기다리지 않고, 실패는 삼킨다 (DEC-035) */
export async function purgeOldMetrics(nowMs: number): Promise<number> {
  try {
    if (!db) return 0;
    const firestore = db;
    const cutoff = Timestamp.fromMillis(nowMs - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const snap = await getDocs(query(collection(firestore, METRICS_COLLECTION), where('at', '<', cutoff), limit(METRICS_PURGE_LIMIT)));
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(firestore, METRICS_COLLECTION, d.id))));
    return snap.size;
  } catch (e) {
    console.warn('[AdminMetrics] purge skipped:', (e as { code?: string })?.code || e);
    return 0;
  }
}
