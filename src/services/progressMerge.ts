// 카카오 사용자가 연결될 때 로컬·클라우드 중 남길 진행 결정 (specs/023 REQ-05, DEC-029)
import type { GameState } from '../types/game';

/** DEC-028 규칙 배포 시각 = ruleset d4e4458c release updateTime. 이 뒤로 카카오 클라우드 저장이 멈췄다 */
export const RULES_CUTOFF_MS = Date.parse('2026-11-25T15:13:46.798Z');

export type ProgressChoice = 'local' | 'cloud';

/**
 * - 로컬 없음 → cloud (AC-12)
 * - 클라우드 진행 없음 → local
 * - 로컬 시각 있음 → 더 늦은 쪽, 같으면 cloud (AC-11b)
 * - 로컬 시각 없음(기능 023 이전 저장본) → 클라우드가 기준 시각 이전이면 local, 아니면 cloud (AC-11, AC-11a)
 */
export function chooseKakaoProgress(
  local: Pick<GameState, 'localSavedAt'> | null,
  cloudLastSavedAtMs: number | null,
  cutoffMs: number = RULES_CUTOFF_MS,
): ProgressChoice {
  if (!local) return 'cloud';
  if (cloudLastSavedAtMs === null) return 'local';
  if (typeof local.localSavedAt === 'number') {
    return local.localSavedAt > cloudLastSavedAtMs ? 'local' : 'cloud';
  }
  return cloudLastSavedAtMs < cutoffMs ? 'local' : 'cloud';
}

/** Firestore Timestamp({toMillis}·{seconds,nanoseconds})나 숫자를 ms로. 알 수 없으면 null */
export function timestampToMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000);
  }
  return null;
}

/**
 * 진행이 실제로 있는 저장본인지. 저장 시각이 없는 초기 상태(새 기기에서 만들어진 빈 저장본)가
 * "더 최근 로컬"로 판단되어 클라우드 진행을 덮는 일을 막는다 (specs/023 AC-11 전제: 로컬 "진행")
 */
export function hasProgress(state: Pick<GameState, 'openedPacksTotal' | 'collection'> | null | undefined): boolean {
  if (!state) return false;
  if ((state.openedPacksTotal || 0) > 0) return true;
  return Object.values(state.collection || {}).some((n) => n > 0);
}

/** 저장 시각을 바꿀지 판단할 진행 필드 서명 (plan 3절 localSavedAt 갱신 규칙) */
export function progressSignature(state: GameState): string {
  return JSON.stringify([
    state.collection,
    state.coins,
    state.dust,
    state.pityCount,
    state.openedPacksTotal,
    state.claimedAchievements || [],
    state.claimedSetRewards || [],
    state.claimedMailIds || [],
    state.claimedCouponCodes || [],
    !!state.hasClaimedMmuEasterEgg,
    state.lastMailClaimDate ?? null,
  ]);
}
