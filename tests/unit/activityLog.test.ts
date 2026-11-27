// specs/024 T002 — 이용자 행동 로그 (AC-01~03, 05, 07, 11, 13)
import { describe, expect, it, vi } from 'vitest';
import {
  buildActivityEvent,
  createActivityLogger,
  kstDateString,
  shouldLog,
  summarizeRarities,
  type ActivityLoggerDeps,
} from '../../src/services/activityLog';
import type { UserAccount } from '../../src/types/auth';

const user = (over: Partial<UserAccount> = {}): UserAccount => ({
  id: 'goog_A',
  provider: 'google',
  email: 'a@example.com',
  displayName: '엔써A',
  avatarUrl: '',
  createdAt: 0,
  lastLoginAt: 0,
  isCloudSynced: true,
  securityHash: '',
  ...over,
});

const NOW = Date.parse('2026-11-25T16:30:00Z'); // KST 2026-11-26 01:30

function deps(over: Partial<ActivityLoggerDeps> = {}): ActivityLoggerDeps {
  return {
    isLocal: () => false,
    now: () => NOW,
    sessionId: 's_test',
    addEvent: vi.fn(async () => undefined),
    queryOldIds: vi.fn(async () => []),
    listIds: vi.fn(async () => []),
    deleteIds: vi.fn(async () => undefined),
    ...over,
  };
}

describe('kstDateString', () => {
  it('KST(UTC+9) 기준 날짜', () => {
    expect(kstDateString(NOW)).toBe('2026-11-26');
    expect(kstDateString(Date.parse('2026-11-26T14:59:59Z'))).toBe('2026-11-26');
    expect(kstDateString(Date.parse('2026-11-26T15:00:00Z'))).toBe('2026-11-27');
  });
});

describe('shouldLog (AC-03)', () => {
  it('로그인·클라우드 연동 이용자만', () => {
    expect(shouldLog(user(), false)).toBe(true);
    expect(shouldLog(user({ provider: 'kakao', id: 'kakao_1' }), false)).toBe(true);
  });
  it('게스트·비연동·비로그인·localhost 제외', () => {
    expect(shouldLog(null, false)).toBe(false);
    expect(shouldLog(user({ id: 'guest', provider: 'guest' }), false)).toBe(false);
    expect(shouldLog(user({ isCloudSynced: false }), false)).toBe(false);
    expect(shouldLog(user(), true)).toBe(false);
  });
});

describe('buildActivityEvent', () => {
  it('팩 개봉 이벤트 모양 (AC-01)', () => {
    const e = buildActivityEvent('goog_A', 'pack_open', { packId: 'op01', packCount: 5, cost: 500, rarities: { R: 20, SSR: 5 } }, 's1', NOW);
    expect(e).toEqual({
      uid: 'goog_A',
      type: 'pack_open',
      kstDate: '2026-11-26',
      sessionId: 's1',
      data: { packId: 'op01', packCount: 5, cost: 500, rarities: { R: 20, SSR: 5 } },
    });
    expect(Object.keys(e)).not.toContain('at');
  });
  it('세션·로그인·로그아웃 이벤트 모양 (AC-02)', () => {
    expect(buildActivityEvent('goog_A', 'session_start', {}, 's1', NOW).data).toEqual({});
    expect(buildActivityEvent('goog_A', 'login', { provider: 'google' }, 's1', NOW).data).toEqual({ provider: 'google' });
    expect(buildActivityEvent('goog_A', 'logout', {}, 's1', NOW).type).toBe('logout');
  });
  it('보상 이벤트 모양 (AC-07)', () => {
    expect(buildActivityEvent('goog_A', 'set_reward', { setId: 's', coins: 1 }, 's1', NOW).data).toEqual({ setId: 's', coins: 1 });
    expect(buildActivityEvent('goog_A', 'achievement', { achievementId: 'a', coins: 2 }, 's1', NOW).type).toBe('achievement');
    expect(buildActivityEvent('goog_A', 'xr_card', { cardId: 'x' }, 's1', NOW).data).toEqual({ cardId: 'x' });
    expect(buildActivityEvent('goog_A', 'coupon', { code: 'C', coins: 3 }, 's1', NOW).data).toEqual({ code: 'C', coins: 3 });
    expect(buildActivityEvent('goog_A', 'mail', { mailId: 'm', coins: 4 }, 's1', NOW).data).toEqual({ mailId: 'm', coins: 4 });
  });
});

describe('summarizeRarities', () => {
  it('등급별 장수', () => {
    expect(summarizeRarities([{ rarity: 'R' }, { rarity: 'SSR' }, { rarity: 'R' }])).toEqual({ R: 2, SSR: 1 });
    expect(summarizeRarities([])).toEqual({});
  });
});

describe('createActivityLogger', () => {
  it('log: 본인 uid로 한 번 쓴다 (AC-01)', async () => {
    const d = deps();
    const logger = createActivityLogger(d);
    expect(logger.log(user(), 'login', { provider: 'google' })).toBeUndefined();
    await Promise.resolve();
    expect(d.addEvent).toHaveBeenCalledTimes(1);
    expect(d.addEvent).toHaveBeenCalledWith(expect.objectContaining({ uid: 'goog_A', type: 'login', sessionId: 's_test' }));
  });

  it('log: 기록 대상이 아니면 쓰지 않는다 (AC-03)', async () => {
    const d = deps({ isLocal: () => true });
    createActivityLogger(d).log(user(), 'session_start', {});
    createActivityLogger(deps()).log(null, 'session_start', {});
    await Promise.resolve();
    expect(d.addEvent).not.toHaveBeenCalled();
  });

  it('logActivity는 예외를 밖으로 던지지 않는다 (AC-05)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rejecting = deps({ addEvent: vi.fn(async () => Promise.reject(new Error('permission-denied'))) });
    const throwing = deps({
      addEvent: vi.fn(() => {
        throw new Error('sync throw');
      }),
    });
    expect(() => createActivityLogger(rejecting).log(user(), 'logout', {})).not.toThrow();
    expect(() => createActivityLogger(throwing).log(user(), 'logout', {})).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    warn.mockRestore();
  });

  it('logAndWait: 기다리고 실패는 삼킨다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ok = deps();
    await createActivityLogger(ok).logAndWait(user(), 'logout', {});
    expect(ok.addEvent).toHaveBeenCalledTimes(1);
    const bad = deps({ addEvent: vi.fn(async () => Promise.reject(new Error('denied'))) });
    await expect(createActivityLogger(bad).logAndWait(user(), 'logout', {})).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it('purgeOld: 1년(365일) 전 기준으로 최대 100개를 지운다 (AC-10)', async () => {
    const d = deps({ queryOldIds: vi.fn(async () => ['e1', 'e2']) });
    await createActivityLogger(d).purgeOld(user());
    expect(d.queryOldIds).toHaveBeenCalledWith('goog_A', NOW - 365 * 24 * 60 * 60 * 1000, 100);
    expect(d.deleteIds).toHaveBeenCalledWith(['e1', 'e2']);
  });

  it('purgeOld: 지울 것이 없으면 삭제를 부르지 않는다', async () => {
    const d = deps();
    await createActivityLogger(d).purgeOld(user());
    expect(d.deleteIds).not.toHaveBeenCalled();
  });

  it('purgeOldActivity는 실패를 삼킨다 (AC-11)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = deps({ queryOldIds: vi.fn(async () => Promise.reject(new Error('index building'))) });
    await expect(createActivityLogger(d).purgeOld(user())).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it('purgeOld: 기록 대상이 아니면 아무것도 하지 않는다', async () => {
    const d = deps();
    await createActivityLogger(d).purgeOld(user({ id: 'guest', provider: 'guest' }));
    expect(d.queryOldIds).not.toHaveBeenCalled();
  });

  it('deleteAll: 빌 때까지 지운다', async () => {
    const pages = [['a', 'b'], ['c'], []];
    const d = deps({ listIds: vi.fn(async () => pages.shift() ?? []) });
    await createActivityLogger(d).deleteAll('goog_A');
    expect(d.deleteIds).toHaveBeenNthCalledWith(1, ['a', 'b']);
    expect(d.deleteIds).toHaveBeenNthCalledWith(2, ['c']);
    expect(d.deleteIds).toHaveBeenCalledTimes(2);
  });

  it('deleteAllActivity는 실패를 던진다 (AC-13)', async () => {
    const d = deps({ listIds: vi.fn(async () => Promise.reject(new Error('offline'))) });
    await expect(createActivityLogger(d).deleteAll('goog_A')).rejects.toThrow('offline');
  });
});
