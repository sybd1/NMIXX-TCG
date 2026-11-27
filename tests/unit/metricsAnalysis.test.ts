// specs/026 T004 — 지표 계산 (AC-05, 07~13, 16)
import { describe, expect, it } from 'vitest';
import { computeMetrics, percentile, type AnalysisEvent } from '../../src/services/metricsAnalysis';

const DAY = 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;
// 기준 '지금': KST 2026-11-27 12:00
const NOW = Date.parse('2026-11-27T03:00:00Z');
const kst = (ms: number) => new Date(ms + KST).toISOString().slice(0, 10);

let seq = 0;
function ev(vid: string, sid: string, type: AnalysisEvent['type'], atMs: number, data: Record<string, unknown> = {}): AnalysisEvent {
  seq += 1;
  return { id: `e${seq}`, vid, sid, type, atMs, kstDate: kst(atMs), data };
}

const PROB = { C: 0.5, R: 0.3, SR: 0.2 };

describe('재방문 (REQ-04)', () => {
  it('D1 재방문율과 표본 수 (AC-07)', () => {
    const base = NOW - 10 * DAY;
    const events: AnalysisEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(ev(`v_${i}`, `s_${i}a`, 'visit', base + i * 1000, { first: true, device: 'mobile', loggedIn: false }));
      if (i < 3) events.push(ev(`v_${i}`, `s_${i}b`, 'visit', base + DAY + i * 1000, { first: false, device: 'mobile', loggedIn: false }));
    }
    const r = computeMetrics(events, NOW, PROB);
    expect(r.users.newVisitors).toBe(10);
    expect(r.users.d1).toEqual({ value: 0.3, n: 10, reason: null });
  });

  it('D7 표본 부족은 null과 사유 (AC-08)', () => {
    const first = NOW - 3 * DAY;
    const r = computeMetrics([ev('v_a', 's_a', 'visit', first, { first: true, device: 'desktop', loggedIn: false })], NOW, PROB);
    expect(r.users.d7.value).toBeNull();
    expect(r.users.d7.reason).toBe('아직 7일이 지나지 않음');

    const empty = computeMetrics([ev('v_b', 's_b', 'visit', first, { first: false, device: 'desktop', loggedIn: false })], NOW, PROB);
    expect(empty.users.d1.value).toBeNull();
    expect(empty.users.d1.reason).toBe('신규 방문자 0명');
  });

  it('신규 방문자 중 로그인한 수', () => {
    const t = NOW - DAY;
    const r = computeMetrics(
      [
        ev('v_a', 's_a', 'visit', t, { first: true, device: 'mobile', loggedIn: false }),
        { ...ev('v_a', 's_a', 'identify', t + 1000), uid: 'goog_A' },
        ev('v_b', 's_b', 'visit', t, { first: true, device: 'mobile', loggedIn: false }),
      ],
      NOW,
      PROB,
    );
    expect(r.users.newLoggedIn).toBe(1);
  });

  it('첫 팩까지 시간 중앙값', () => {
    const t = NOW - DAY;
    const r = computeMetrics(
      [
        ev('v_a', 's_a', 'visit', t, { first: true, device: 'mobile', loggedIn: false }),
        ev('v_a', 's_a', 'pack', t + 60_000, { packId: 'op01', packCount: 1, owned: 5, total: 521, rarities: { C: 5 } }),
        ev('v_a', 's_a', 'pack', t + 120_000, { packId: 'op01', packCount: 1, owned: 9, total: 521, rarities: { C: 5 } }),
        ev('v_b', 's_b', 'visit', t, { first: true, device: 'mobile', loggedIn: false }),
        ev('v_b', 's_b', 'pack', t + 180_000, { packId: 'op01', packCount: 1, owned: 5, total: 521, rarities: { C: 5 } }),
      ],
      NOW,
      PROB,
    );
    // 1분, 3분 → nearest-rank 중앙값(plan 4절)은 1분
    expect(r.users.firstPackMs).toEqual({ value: 60_000, n: 2, reason: null });
  });
});

describe('세션 (REQ-02)', () => {
  it('세션 길이: 종료 기록은 최댓값을 쓴다', () => {
    const t = NOW - DAY;
    const r = computeMetrics(
      [
        ev('v_a', 's_a', 'visit', t, { first: false, device: 'mobile', loggedIn: false }),
        ev('v_a', 's_a', 'session_end', t + 60_000, { durationMs: 60_000, lastScreen: 'collection' }),
        ev('v_a', 's_a', 'session_end', t + 300_000, { durationMs: 300_000, lastScreen: 'ranking' }),
      ],
      NOW,
      PROB,
    );
    expect(r.sessions.count).toBe(1);
    expect(r.sessions.median).toBe(300_000);
    expect(r.screens.lastScreen).toEqual([{ screen: 'ranking', count: 1 }]);
  });

  it('세션 길이: 종료 기록이 없으면 마지막 기록까지, 따로 센다 (AC-05)', () => {
    const t = NOW - DAY;
    const r = computeMetrics(
      [
        ev('v_a', 's_a', 'visit', t, { first: false, device: 'mobile', loggedIn: false }),
        ev('v_a', 's_a', 'screen', t + 90_000, { to: 'collection', from: 'home' }),
      ],
      NOW,
      PROB,
    );
    expect(r.sessions.noEnd).toBe(1);
    expect(r.sessions.median).toBe(90_000);
    expect(r.screens.lastScreen).toEqual([{ screen: 'collection', count: 1 }]);
    expect(r.screens.entries.find((s) => s.screen === 'collection')?.count).toBe(1);
    expect(r.screens.entries.find((s) => s.screen === 'home')?.count).toBe(1);
  });
});

describe('수집·등급 (REQ-03, REQ-04)', () => {
  it('등급 비율: 실제·설정·표본 (AC-09)', () => {
    const t = NOW - DAY;
    const r = computeMetrics(
      [ev('v_a', 's_a', 'pack', t, { packId: 'op01', packCount: 2, owned: 10, total: 521, rarities: { C: 7, R: 3 } })],
      NOW,
      PROB,
    );
    expect(r.rarity.total).toBe(10);
    expect(r.rarity.rows).toEqual([
      { rarity: 'C', count: 7, actual: 0.7, expected: 0.5 },
      { rarity: 'R', count: 3, actual: 0.3, expected: 0.3 },
      { rarity: 'SR', count: 0, actual: 0, expected: 0.2 },
    ]);
  });

  it('수집 속도: 첫 방문 후 경과일 구간별 수집률 중앙값', () => {
    const t = NOW - 20 * DAY;
    const r = computeMetrics(
      [
        ev('v_a', 's_a', 'visit', t, { first: true, device: 'mobile', loggedIn: false }),
        ev('v_a', 's_a', 'pack', t + 1000, { packId: 'op01', packCount: 1, owned: 52, total: 520, rarities: { C: 5 } }),
        ev('v_a', 's_b', 'pack', t + 10 * DAY, { packId: 'op01', packCount: 1, owned: 104, total: 520, rarities: { C: 5 } }),
      ],
      NOW,
      PROB,
    );
    const first = r.collection.find((b) => b.label === '첫날');
    const mid = r.collection.find((b) => b.label === '8~14일차');
    expect(first).toMatchObject({ median: 0.1, n: 1 });
    expect(mid).toMatchObject({ median: 0.2, n: 1 });
  });
});

describe('성능 (REQ-05)', () => {
  it('percentile: nearest-rank, 빈 배열은 null', () => {
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile([5, 1, 3, 2, 4], 0.75)).toBe(4);
    expect(percentile([], 0.5)).toBeNull();
  });

  it('vitals 중앙값·75백분위, 기기별 (AC-10)', () => {
    const t = NOW - DAY;
    const lcps = [1000, 2000, 3000, 4000];
    const events = lcps.map((lcp, i) =>
      ev(`v_${i}`, `s_${i}`, 'vitals', t, { device: i < 2 ? 'mobile' : 'desktop', lcp, inp: null, cls: 0.1 }),
    );
    const r = computeMetrics(events, NOW, PROB);
    expect(r.vitals.all.lcp).toEqual({ median: 2000, p75: 3000, n: 4 });
    expect(r.vitals.all.inp).toEqual({ median: null, p75: null, n: 0 });
    expect(r.vitals.mobile.lcp.n).toBe(2);
    expect(r.vitals.desktop.lcp.median).toBe(3000);
  });

  it('3D 준비 시간·평균 프레임 (AC-11)과 2D 대체 비율 (AC-12)', () => {
    const t = NOW - DAY;
    const r = computeMetrics(
      [
        ev('v_a', 's_a', 'pack3d', t, { mode: '3d', readyMs: 100, avgFps: 60, frames: 600 }),
        ev('v_b', 's_b', 'pack3d', t, { mode: '3d', readyMs: 300, avgFps: 30, frames: 300 }),
        ev('v_c', 's_c', 'pack3d', t, { mode: '3d', readyMs: 200, avgFps: 45, frames: 450 }),
        ev('v_d', 's_d', 'pack3d', t, { mode: '2d', readyMs: null, avgFps: null, frames: 0 }),
      ],
      NOW,
      PROB,
    );
    expect(r.pack3d.readyMs.median).toBe(200);
    expect(r.pack3d.avgFps.median).toBe(45);
    expect(r.pack3d.n3d).toBe(3);
    expect(r.pack3d.n2d).toBe(1);
    expect(r.pack3d.ratio2d).toBe(0.25);
  });
});

describe('오류 (REQ-06)', () => {
  it('오류 종류별 횟수와 방문자 수 (AC-13)', () => {
    const t = NOW - DAY;
    const e = (vid: string, message: string, dt: number) =>
      ev(vid, `s_${vid}`, 'error', t + dt, { kind: 'error', message, screen: 'home', version: 'v1' });
    const r = computeMetrics([e('v_a', 'A', 0), e('v_b', 'A', 1000), e('v_a', 'B', 2000)], NOW, PROB);
    expect(r.errors.total).toBe(3);
    expect(r.errors.rows[0]).toMatchObject({ kind: 'error', message: 'A', count: 2, visitors: 2 });
    expect(r.errors.rows[1]).toMatchObject({ message: 'B', count: 1, visitors: 1 });
  });
});

describe('전체 (AC-16)', () => {
  it('빈 입력이면 모든 지표가 비어 있다', () => {
    const r = computeMetrics([], NOW, PROB);
    expect(r.eventCount).toBe(0);
    expect(r.users.newVisitors).toBe(0);
    expect(r.sessions.count).toBe(0);
    expect(r.errors.rows).toEqual([]);
  });
});
