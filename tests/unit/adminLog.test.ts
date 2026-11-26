// specs/025 T003 — 운영자 조회 화면 순수 로직 (AC-05~10)
import { describe, expect, it } from 'vitest';
import {
  ADMIN_FETCH_LIMIT,
  capEvents,
  describeEvent,
  filterByType,
  formatKst,
  rangeStartMs,
  summarizeByDay,
  summarizeMembers,
  type AdminEvent,
} from '../../src/services/adminLog';

// 2026-11-26 20:30 KST
const NOW = Date.parse('2026-11-26T11:30:00Z');
const KST_MIDNIGHT_1126 = Date.parse('2026-11-25T15:00:00Z');

let n = 0;
const e = (uid: string, type: AdminEvent['type'], atMs: number, data: Record<string, unknown> = {}, kstDate = '2026-11-26'): AdminEvent => ({
  id: `e${n++}`,
  uid,
  type,
  atMs,
  kstDate,
  data,
});

describe('rangeStartMs', () => {
  it('KST 자정 기준', () => {
    expect(rangeStartMs('today', NOW)).toBe(KST_MIDNIGHT_1126);
    expect(rangeStartMs('7d', NOW)).toBe(KST_MIDNIGHT_1126 - 6 * 86400000);
    expect(rangeStartMs('30d', NOW)).toBe(KST_MIDNIGHT_1126 - 29 * 86400000);
  });
});

describe('formatKst', () => {
  it('MM-DD HH:mm (KST)', () => {
    expect(formatKst(NOW)).toBe('11-26 20:30');
  });
});

describe('summarizeByDay (AC-05)', () => {
  it('날짜별 접속 회원·로그인·팩·보상, 최신 날짜 먼저', () => {
    const rows = summarizeByDay([
      e('goog_A', 'session_start', NOW),
      e('goog_A', 'pack_open', NOW, { packCount: 5 }),
      e('kakao_1', 'login', NOW, { provider: 'kakao' }),
      e('kakao_1', 'pack_open', NOW, { packCount: 1 }),
      e('kakao_1', 'mail', NOW, { mailId: 'm', coins: 1 }),
      e('goog_A', 'achievement', NOW, {}),
      e('goog_B', 'session_start', NOW - 86400000, {}, '2026-11-25'),
      e('goog_B', 'coupon', NOW - 86400000, {}, '2026-11-25'),
    ]);
    expect(rows).toEqual([
      { kstDate: '2026-11-26', activeUsers: 2, logins: 1, packs: 6, rewards: 2 },
      { kstDate: '2026-11-25', activeUsers: 1, logins: 0, packs: 0, rewards: 1 },
    ]);
  });
  it('빈 입력 (AC-09)', () => {
    expect(summarizeByDay([])).toEqual([]);
    expect(summarizeMembers([])).toEqual([]);
  });
});

describe('summarizeMembers (AC-06)', () => {
  it('마지막 활동 최신순, 계정 종류·이벤트 수·팩 수', () => {
    const rows = summarizeMembers([
      e('goog_A', 'session_start', NOW - 5000),
      e('goog_A', 'pack_open', NOW - 4000, { packCount: 3 }),
      e('kakao_1', 'login', NOW - 1000),
      e('weird', 'login', NOW - 9000),
    ]);
    expect(rows).toEqual([
      { uid: 'kakao_1', provider: 'kakao', events: 1, packs: 0, lastAtMs: NOW - 1000 },
      { uid: 'goog_A', provider: 'google', events: 2, packs: 3, lastAtMs: NOW - 4000 },
      { uid: 'weird', provider: 'other', events: 1, packs: 0, lastAtMs: NOW - 9000 },
    ]);
  });
});

describe('describeEvent (AC-07)', () => {
  it('팩 개봉 요약 (등급은 장수 많은 순)', () => {
    expect(describeEvent(e('u', 'pack_open', NOW, { packId: 'op01', packCount: 1, cost: 3800, rarities: { R: 4, SSR: 1 } }))).toBe(
      'op01 1팩 · 3,800코인 · R 4, SSR 1',
    );
  });
  it('종류별 요약', () => {
    expect(describeEvent(e('u', 'login', NOW, { provider: 'kakao' }))).toBe('카카오');
    expect(describeEvent(e('u', 'login', NOW, { provider: 'google' }))).toBe('구글');
    expect(describeEvent(e('u', 'session_start', NOW))).toBe('');
    expect(describeEvent(e('u', 'set_reward', NOW, { setId: 's1', coins: 500 }))).toBe('s1 · 500코인');
    expect(describeEvent(e('u', 'achievement', NOW, { achievementId: 'a1', coins: 20 }))).toBe('a1 · 20코인');
    expect(describeEvent(e('u', 'xr_card', NOW, { cardId: 'c' }))).toBe('c');
    expect(describeEvent(e('u', 'coupon', NOW, { code: 'HI', coins: 1000 }))).toBe('HI · 1,000코인');
    expect(describeEvent(e('u', 'mail', NOW, { mailId: 'm1', coins: 0 }))).toBe('m1 · 0코인');
  });
  it('부가 정보가 비어도 깨지지 않는다', () => {
    expect(describeEvent(e('u', 'pack_open', NOW, {}))).toBe('? 0팩 · 0코인');
  });
});

describe('filterByType (AC-08)', () => {
  it('전체 또는 한 종류', () => {
    const list = [e('a', 'login', NOW), e('a', 'pack_open', NOW), e('b', 'login', NOW)];
    expect(filterByType(list, 'all')).toHaveLength(3);
    expect(filterByType(list, 'login').map((x) => x.uid)).toEqual(['a', 'b']);
  });
});

describe('capEvents (AC-10)', () => {
  it('상한을 넘으면 2,000건만 쓰고 capped', () => {
    const many = Array.from({ length: ADMIN_FETCH_LIMIT + 1 }, (_, i) => e('a', 'login', NOW - i));
    const r = capEvents(many);
    expect(ADMIN_FETCH_LIMIT).toBe(2000);
    expect(r.events).toHaveLength(2000);
    expect(r.capped).toBe(true);
    expect(capEvents(many.slice(0, 10)).capped).toBe(false);
  });
});
