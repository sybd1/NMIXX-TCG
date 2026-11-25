// specs/023 T006 — 카카오 재연결 시 남길 진행 결정 (REQ-05, AC-11·11a·11b·12, DEC-029)
import { describe, expect, it } from 'vitest';
import { RULES_CUTOFF_MS, chooseKakaoProgress, hasProgress, progressSignature, timestampToMillis } from '../../src/services/progressMerge';
import type { GameState } from '../../src/types/game';

const t = (iso: string) => Date.parse(iso);

describe('chooseKakaoProgress', () => {
  it('기준 시각은 DEC-028 ruleset 게시 시각', () => {
    expect(RULES_CUTOFF_MS).toBe(Date.parse('2026-11-25T15:13:46.798Z'));
  });

  it('시각 없는 로컬 + 배포 전 클라우드 → local (AC-11)', () => {
    expect(chooseKakaoProgress({}, t('2026-10-31T13:43:31Z'))).toBe('local');
  });

  it('시각 없는 로컬 + 배포 후 클라우드 → cloud (AC-11a)', () => {
    expect(chooseKakaoProgress({}, t('2026-11-27T00:00:00Z'))).toBe('cloud');
  });

  it('둘 다 시각 있음 → 늦은 쪽 (AC-11b)', () => {
    expect(chooseKakaoProgress({ localSavedAt: t('2026-11-28T00:00:00Z') }, t('2026-11-27T00:00:00Z'))).toBe('local');
    expect(chooseKakaoProgress({ localSavedAt: t('2026-11-26T00:00:00Z') }, t('2026-11-27T00:00:00Z'))).toBe('cloud');
  });

  it('같으면 cloud (AC-11b)', () => {
    const same = t('2026-11-27T00:00:00Z');
    expect(chooseKakaoProgress({ localSavedAt: same }, same)).toBe('cloud');
  });

  it('로컬 없음 → cloud, 클라우드 없음 → local (AC-12)', () => {
    expect(chooseKakaoProgress(null, t('2026-10-31T00:00:00Z'))).toBe('cloud');
    expect(chooseKakaoProgress({}, null)).toBe('local');
    expect(chooseKakaoProgress({ localSavedAt: 1 }, null)).toBe('local');
  });

  it('기준 시각을 바꿔 줄 수 있다', () => {
    expect(chooseKakaoProgress({}, 100, 50)).toBe('cloud');
    expect(chooseKakaoProgress({}, 100, 200)).toBe('local');
  });
});

describe('timestampToMillis', () => {
  it('Firestore Timestamp·숫자·없음', () => {
    expect(timestampToMillis({ toMillis: () => 1234 })).toBe(1234);
    expect(timestampToMillis({ seconds: 2, nanoseconds: 500_000_000 })).toBe(2500);
    expect(timestampToMillis(42)).toBe(42);
    expect(timestampToMillis(undefined)).toBeNull();
    expect(timestampToMillis(null)).toBeNull();
    expect(timestampToMillis('2026-01-01')).toBeNull();
  });
});

describe('hasProgress', () => {
  it('빈 초기 저장본은 진행이 아니다', () => {
    expect(hasProgress(null)).toBe(false);
    expect(hasProgress({ openedPacksTotal: 0, collection: {} })).toBe(false);
    expect(hasProgress({ openedPacksTotal: 0, collection: { a: 0 } })).toBe(false);
  });
  it('팩을 열었거나 카드가 있으면 진행이다', () => {
    expect(hasProgress({ openedPacksTotal: 1, collection: {} })).toBe(true);
    expect(hasProgress({ openedPacksTotal: 0, collection: { a: 1 } })).toBe(true);
  });
});

describe('progressSignature', () => {
  const base = {
    coins: 1, dust: 0, collection: { a: 1 }, pityCount: 0, lastDailyBonus: null, lastMailClaimDate: null,
    packHistory: [], openedPacksTotal: 1, soundMuted: false, isFirstVisit: false,
  } as GameState;
  it('진행 필드가 바뀌면 달라지고, 화면 설정·저장 시각은 무시한다', () => {
    expect(progressSignature({ ...base, coins: 2 })).not.toBe(progressSignature(base));
    expect(progressSignature({ ...base, soundMuted: true, localSavedAt: 99 })).toBe(progressSignature(base));
  });
});
