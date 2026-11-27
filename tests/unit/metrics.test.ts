// specs/026 T003 — 분석·성능 기록 (AC-01~04, 06, 13~15)
import { describe, expect, it, vi } from 'vitest';
import { createMetricsLogger, sanitizeErrorMessage, type MetricsDeps } from '../../src/services/metrics';

const NOW = Date.parse('2026-11-27T03:00:00Z'); // KST 2026-11-27 12:00

function deps(over: Partial<MetricsDeps> = {}) {
  let t = NOW;
  const d: MetricsDeps & { advance(ms: number): void } = {
    isLocal: () => false,
    now: () => t,
    sessionId: 's_test',
    visitor: () => ({ id: 'v_abc123', first: true }),
    addMetric: vi.fn(async () => undefined),
    advance(ms: number) {
      t += ms;
    },
    ...over,
  };
  return d;
}

const calls = (d: MetricsDeps) => (d.addMetric as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);

describe('기록 공통', () => {
  it('visit: 방문자 ID·세션 ID·KST 날짜를 붙인다', () => {
    const d = deps();
    createMetricsLogger(d).visit({ device: 'mobile', loggedIn: false });
    expect(calls(d)[0]).toEqual({
      vid: 'v_abc123',
      sid: 's_test',
      type: 'visit',
      kstDate: '2026-11-27',
      data: { first: true, device: 'mobile', loggedIn: false },
    });
  });

  it('localhost에서는 아무것도 기록하지 않는다', () => {
    const d = deps({ isLocal: () => true });
    const m = createMetricsLogger(d);
    m.visit({ device: 'desktop', loggedIn: false });
    m.screen('collection');
    m.error('error', 'x', 'v1');
    m.identify('goog_A');
    expect(d.addMetric).not.toHaveBeenCalled();
  });

  it('기록 실패는 밖으로 던지지 않고 다시 보내지 않는다 (AC-03)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = deps({ addMetric: vi.fn(async () => Promise.reject(new Error('denied'))) });
    const m = createMetricsLogger(d);
    expect(() => m.screen('collection')).not.toThrow();
    const sync = deps({
      addMetric: vi.fn(() => {
        throw new Error('sync');
      }),
    });
    expect(() => createMetricsLogger(sync).screen('collection')).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(d.addMetric).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('화면 이동 (REQ-01)', () => {
  it('screen: 화면이 바뀌면 to·from을 기록한다 (AC-01)', () => {
    const d = deps();
    const m = createMetricsLogger(d);
    m.screen('collection');
    expect(calls(d)[0]).toMatchObject({ type: 'screen', data: { to: 'collection', from: 'home' } });
    expect(m.currentScreen()).toBe('collection');
  });

  it('screen: 같은 화면이면 기록하지 않는다 (AC-02)', () => {
    const d = deps();
    const m = createMetricsLogger(d);
    m.screen('home');
    m.screen('collection');
    m.screen('collection');
    expect(d.addMetric).toHaveBeenCalledTimes(1);
  });
});

describe('세션 종료 (REQ-02)', () => {
  it('sessionEnd: 경과 시간과 마지막 화면 (AC-04)', () => {
    const d = deps();
    const m = createMetricsLogger(d);
    m.screen('ranking');
    d.advance(5 * 60 * 1000);
    m.sessionEnd();
    expect(calls(d)[1]).toMatchObject({ type: 'session_end', data: { durationMs: 300000, lastScreen: 'ranking' } });
  });
});

describe('팩·성능 (REQ-03, REQ-05)', () => {
  it('pack: 수집 종류 수와 전체 수를 남긴다 (AC-06)', () => {
    const d = deps();
    createMetricsLogger(d).pack({ packId: 'op01', packCount: 1, owned: 123, total: 521, rarities: { C: 4, R: 1 } });
    expect(calls(d)[0]).toMatchObject({ type: 'pack', data: { owned: 123, total: 521 } });
  });

  it('pack3d는 세션당 10건까지', () => {
    const d = deps();
    const m = createMetricsLogger(d);
    for (let i = 0; i < 15; i++) m.pack3d({ mode: '3d', readyMs: 100, avgFps: 60, frames: 60 });
    expect(d.addMetric).toHaveBeenCalledTimes(10);
  });

  it('vitals는 세션당 한 번만 기록한다', () => {
    const d = deps();
    const m = createMetricsLogger(d);
    m.vitals({ device: 'desktop', lcp: 1200, inp: 80, cls: 0.01 });
    m.vitals({ device: 'desktop', lcp: 1300, inp: 90, cls: 0.02 });
    expect(d.addMetric).toHaveBeenCalledTimes(1);
  });
});

describe('오류 (REQ-06)', () => {
  it('error: 메시지를 자르고 이메일·계정 ID를 가린다 (AC-13)', () => {
    const msg = `fail for a.b@example.com goog_ABCdef123 kakao_998877 ${'x'.repeat(300)}`;
    const out = sanitizeErrorMessage(msg);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out).not.toContain('example.com');
    expect(out).not.toContain('goog_ABC');
    expect(out).not.toContain('kakao_99');
    expect(out.startsWith('fail for *** *** ***')).toBe(true);

    const d = deps();
    const m = createMetricsLogger(d);
    m.screen('collection');
    m.error('error', msg, 'v1.6.3');
    expect(calls(d)[1]).toMatchObject({ type: 'error', data: { kind: 'error', screen: 'collection', version: 'v1.6.3' } });
    expect((calls(d)[1].data as { message: string }).message.length).toBeLessThanOrEqual(200);
  });

  it('error: 세션당 5건, 같은 메시지는 1건 (AC-14)', () => {
    const same = deps();
    const m1 = createMetricsLogger(same);
    for (let i = 0; i < 100; i++) m1.error('error', 'boom', 'v1');
    expect(same.addMetric).toHaveBeenCalledTimes(1);

    const many = deps();
    const m2 = createMetricsLogger(many);
    for (let i = 0; i < 10; i++) m2.error('rejection', `boom ${i}`, 'v1');
    expect(many.addMetric).toHaveBeenCalledTimes(5);
  });

  it('error 기록 실패가 다시 error를 만들지 않는다 (AC-15)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = deps({ addMetric: vi.fn(async () => Promise.reject(new Error('quota'))) });
    const m = createMetricsLogger(d);
    m.error('error', 'boom', 'v1');
    await new Promise((r) => setTimeout(r, 0));
    expect(d.addMetric).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('계정 연결', () => {
  it('identify: 계정 ID를 uid에 담는다', () => {
    const d = deps();
    createMetricsLogger(d).identify('goog_A');
    expect(calls(d)[0]).toMatchObject({ type: 'identify', uid: 'goog_A', data: {} });
  });
});
