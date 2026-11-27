// 운영자 지표 계산 — 순수 함수 (specs/026 plan 4절 "지표 계산")
import type { MetricEventType, ScreenName } from '../types/metrics';

export interface AnalysisEvent {
  id: string;
  vid: string;
  sid: string;
  type: MetricEventType;
  atMs: number;
  kstDate: string;
  data: Record<string, unknown>;
  uid?: string;
}

export interface Rate {
  value: number | null;
  n: number;
  reason: string | null;
}

export interface Dist {
  median: number | null;
  p75: number | null;
  n: number;
}

export interface MetricsReport {
  eventCount: number;
  users: {
    visitors: number;
    newVisitors: number;
    newLoggedIn: number;
    d1: Rate;
    d7: Rate;
    firstPackMs: Rate;
  };
  sessions: { count: number; noEnd: number; median: number | null; p75: number | null; buckets: { label: string; count: number }[] };
  screens: { entries: { screen: ScreenName; count: number }[]; lastScreen: { screen: ScreenName; count: number }[] };
  collection: { label: string; median: number | null; n: number }[];
  rarity: { total: number; rows: { rarity: string; count: number; actual: number; expected: number }[] };
  vitals: Record<'all' | 'mobile' | 'desktop', { lcp: Dist; inp: Dist; cls: Dist }>;
  pack3d: { readyMs: Dist; avgFps: Dist; n3d: number; n2d: number; ratio2d: number | null };
  errors: { total: number; rows: { kind: string; message: string; count: number; visitors: number; lastAtMs: number }[] };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** nearest-rank 백분위. 빈 배열이면 null */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[rank - 1];
}

function dist(values: number[]): Dist {
  return { median: percentile(values, 0.5), p75: percentile(values, 0.75), n: values.length };
}

function addDays(kstDate: string, n: number): string {
  return new Date(Date.parse(`${kstDate}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function retention(firstDates: Map<string, string>, activeDays: Map<string, Set<string>>, today: string, n: number): Rate {
  if (firstDates.size === 0) return { value: null, n: 0, reason: '신규 방문자 0명' };
  let eligible = 0;
  let returned = 0;
  for (const [vid, d0] of firstDates) {
    const target = addDays(d0, n);
    if (target > today) continue;
    eligible += 1;
    if (activeDays.get(vid)?.has(target)) returned += 1;
  }
  if (eligible === 0) return { value: null, n: 0, reason: `아직 ${n}일이 지나지 않음` };
  return { value: Math.round((returned / eligible) * 1000) / 1000, n: eligible, reason: null };
}

const SESSION_BUCKETS: { label: string; maxMs: number }[] = [
  { label: '1분 미만', maxMs: 60_000 },
  { label: '1~5분', maxMs: 5 * 60_000 },
  { label: '5~15분', maxMs: 15 * 60_000 },
  { label: '15~30분', maxMs: 30 * 60_000 },
  { label: '30분 이상', maxMs: Infinity },
];

const COLLECTION_BUCKETS: { label: string; maxDay: number }[] = [
  { label: '첫날', maxDay: 0 },
  { label: '2일차', maxDay: 1 },
  { label: '3~7일차', maxDay: 6 },
  { label: '8~14일차', maxDay: 13 },
  { label: '15일 이상', maxDay: Infinity },
];

function countRows<K extends string>(m: Map<K, number>, key: 'screen'): { screen: K; count: number }[] {
  return [...m.entries()].map(([k, count]) => ({ [key]: k, count }) as { screen: K; count: number }).sort((a, b) => b.count - a.count);
}

export function computeMetrics(events: AnalysisEvent[], nowMs: number, rarityProbabilities: Record<string, number>): MetricsReport {
  const sorted = [...events].sort((a, b) => a.atMs - b.atMs);
  const today = new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);

  // ── 방문자
  const visitors = new Set<string>();
  const activeDays = new Map<string, Set<string>>();
  const firstAt = new Map<string, number>();
  const firstDate = new Map<string, string>();
  const identified = new Set<string>();
  const loggedVisit = new Set<string>();
  for (const e of sorted) {
    visitors.add(e.vid);
    if (!activeDays.has(e.vid)) activeDays.set(e.vid, new Set());
    activeDays.get(e.vid)!.add(e.kstDate);
    if (e.type === 'visit' && e.data.first === true && !firstAt.has(e.vid)) {
      firstAt.set(e.vid, e.atMs);
      firstDate.set(e.vid, e.kstDate);
    }
    if (e.type === 'identify') identified.add(e.vid);
    if (e.type === 'visit' && e.data.loggedIn === true) loggedVisit.add(e.vid);
  }
  let newLoggedIn = 0;
  for (const vid of firstAt.keys()) if (identified.has(vid) || loggedVisit.has(vid)) newLoggedIn += 1;

  // 첫 팩까지
  const firstPackDelays: number[] = [];
  for (const [vid, t0] of firstAt) {
    const p = sorted.find((e) => e.vid === vid && e.type === 'pack' && e.atMs >= t0);
    if (p) firstPackDelays.push(p.atMs - t0);
  }
  const firstPackMedian = percentile(firstPackDelays, 0.5);
  const firstPackMs: Rate =
    firstAt.size === 0
      ? { value: null, n: 0, reason: '신규 방문자 0명' }
      : firstPackDelays.length === 0
        ? { value: null, n: 0, reason: '팩을 연 신규 방문자 0명' }
        : { value: firstPackMedian, n: firstPackDelays.length, reason: null };

  // ── 세션
  const sessions = new Map<string, { first: number; last: number; endMax: number | null; endScreen: ScreenName | null; lastScreenEv: ScreenName | null; endAt: number }>();
  const entries = new Map<ScreenName, number>();
  for (const e of sorted) {
    let s = sessions.get(e.sid);
    if (!s) {
      s = { first: e.atMs, last: e.atMs, endMax: null, endScreen: null, lastScreenEv: null, endAt: -1 };
      sessions.set(e.sid, s);
    }
    s.last = Math.max(s.last, e.atMs);
    if (e.type === 'visit') entries.set('home', (entries.get('home') || 0) + 1);
    if (e.type === 'screen' && typeof e.data.to === 'string') {
      const to = e.data.to as ScreenName;
      entries.set(to, (entries.get(to) || 0) + 1);
      s.lastScreenEv = to;
    }
    if (e.type === 'session_end') {
      const d = num(e.data.durationMs);
      if (d !== null && (s.endMax === null || d > s.endMax)) s.endMax = d;
      if (e.atMs >= s.endAt && typeof e.data.lastScreen === 'string') {
        s.endAt = e.atMs;
        s.endScreen = e.data.lastScreen as ScreenName;
      }
    }
  }
  const durations: number[] = [];
  let noEnd = 0;
  const lastScreens = new Map<ScreenName, number>();
  for (const s of sessions.values()) {
    if (s.endMax === null) noEnd += 1;
    durations.push(s.endMax ?? s.last - s.first);
    const ls = s.endScreen ?? s.lastScreenEv ?? 'home';
    lastScreens.set(ls, (lastScreens.get(ls) || 0) + 1);
  }
  const buckets = SESSION_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const d of durations) {
    const i = SESSION_BUCKETS.findIndex((b) => d < b.maxMs);
    buckets[i === -1 ? buckets.length - 1 : i].count += 1;
  }

  // ── 수집 속도·등급
  const collVals: number[][] = COLLECTION_BUCKETS.map(() => []);
  const rarityCount: Record<string, number> = {};
  let rarityTotal = 0;
  for (const e of sorted) {
    if (e.type !== 'pack') continue;
    const rar = e.data.rarities && typeof e.data.rarities === 'object' ? (e.data.rarities as Record<string, unknown>) : {};
    for (const [k, v] of Object.entries(rar)) {
      const c = num(v) ?? 0;
      if (c <= 0) continue;
      rarityCount[k] = (rarityCount[k] || 0) + c;
      rarityTotal += c;
    }
    const t0 = firstAt.get(e.vid);
    const owned = num(e.data.owned);
    const total = num(e.data.total);
    if (t0 === undefined || owned === null || !total || e.atMs < t0) continue;
    const day = Math.floor((e.atMs - t0) / DAY_MS);
    const bi = COLLECTION_BUCKETS.findIndex((b) => day <= b.maxDay);
    collVals[bi].push(owned / total);
  }
  const rarityKeys = new Set([...Object.keys(rarityProbabilities), ...Object.keys(rarityCount)]);
  const rarityRows = [...rarityKeys]
    .map((rarity) => {
      const count = rarityCount[rarity] || 0;
      return {
        rarity,
        count,
        actual: rarityTotal > 0 ? Math.round((count / rarityTotal) * 10000) / 10000 : 0,
        expected: rarityProbabilities[rarity] ?? 0,
      };
    })
    .sort((a, b) => b.expected - a.expected || b.count - a.count);

  // ── 성능
  const vit = { all: { lcp: [] as number[], inp: [] as number[], cls: [] as number[] }, mobile: { lcp: [] as number[], inp: [] as number[], cls: [] as number[] }, desktop: { lcp: [] as number[], inp: [] as number[], cls: [] as number[] } };
  const ready: number[] = [];
  const fps: number[] = [];
  let n3d = 0;
  let n2d = 0;
  for (const e of sorted) {
    if (e.type === 'vitals') {
      const dev = e.data.device === 'mobile' ? 'mobile' : 'desktop';
      for (const k of ['lcp', 'inp', 'cls'] as const) {
        const v = num(e.data[k]);
        if (v === null) continue;
        vit.all[k].push(v);
        vit[dev][k].push(v);
      }
    }
    if (e.type === 'pack3d') {
      if (e.data.mode === '2d') n2d += 1;
      else {
        n3d += 1;
        const r = num(e.data.readyMs);
        const f = num(e.data.avgFps);
        if (r !== null) ready.push(r);
        if (f !== null) fps.push(f);
      }
    }
  }
  const vitalsOut = (g: { lcp: number[]; inp: number[]; cls: number[] }) => ({ lcp: dist(g.lcp), inp: dist(g.inp), cls: dist(g.cls) });

  // ── 오류
  const errMap = new Map<string, { kind: string; message: string; count: number; vids: Set<string>; lastAtMs: number }>();
  let errTotal = 0;
  for (const e of sorted) {
    if (e.type !== 'error') continue;
    errTotal += 1;
    const kind = String(e.data.kind ?? '');
    const message = String(e.data.message ?? '');
    const key = `${kind}|${message}`;
    let r = errMap.get(key);
    if (!r) {
      r = { kind, message, count: 0, vids: new Set(), lastAtMs: 0 };
      errMap.set(key, r);
    }
    r.count += 1;
    r.vids.add(e.vid);
    r.lastAtMs = Math.max(r.lastAtMs, e.atMs);
  }

  return {
    eventCount: events.length,
    users: {
      visitors: visitors.size,
      newVisitors: firstAt.size,
      newLoggedIn,
      d1: retention(firstDate, activeDays, today, 1),
      d7: retention(firstDate, activeDays, today, 7),
      firstPackMs,
    },
    sessions: {
      count: sessions.size,
      noEnd,
      median: percentile(durations, 0.5),
      p75: percentile(durations, 0.75),
      buckets,
    },
    screens: { entries: countRows(entries, 'screen'), lastScreen: countRows(lastScreens, 'screen') },
    collection: COLLECTION_BUCKETS.map((b, i) => ({ label: b.label, median: percentile(collVals[i], 0.5), n: collVals[i].length })),
    rarity: { total: rarityTotal, rows: rarityRows },
    vitals: { all: vitalsOut(vit.all), mobile: vitalsOut(vit.mobile), desktop: vitalsOut(vit.desktop) },
    pack3d: { readyMs: dist(ready), avgFps: dist(fps), n3d, n2d, ratio2d: n3d + n2d > 0 ? n2d / (n3d + n2d) : null },
    errors: {
      total: errTotal,
      rows: [...errMap.values()]
        .map(({ vids, ...r }) => ({ ...r, visitors: vids.size }))
        .sort((a, b) => b.count - a.count || b.lastAtMs - a.lastAtMs),
    },
  };
}
