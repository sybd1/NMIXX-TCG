import { GameState } from '../types/game';

const STORAGE_KEY = 'nmixx_tcg_gamestate_v2';

/**
 * 🌟 게스트(비로그인) 기본 초기 상태 생성기
 * - 기본 지급 머니: 1,000,000 COIN (100만원)
 * - 카드 도감: 0장 (팩 개봉을 통해 수집 시작)
 */
export const createGuestInitialState = (): GameState => {
  return {
    coins: 1_000_000, // 게스트 기본 머니 100만원
    dust: 0,
    collection: {}, // 0장에서 시작
    pityCount: 0,
    lastDailyBonus: null,
    packHistory: [],
    openedPacksTotal: 0,
    coinsSpentTotal: 0,
    soundMuted: false,
    isFirstVisit: false,
    claimedSetRewards: [],
    claimedAchievements: [],
    claimedMailIds: [],
    claimedCouponCodes: [],
    coinReset_v16: true,
  };
};

export const DEFAULT_INITIAL_STATE: GameState = createGuestInitialState();

export class StorageService {
  public static loadState(): GameState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        const fresh = createGuestInitialState();
        this.saveState(fresh);
        return fresh;
      }

      const parsed: GameState = JSON.parse(data);

      // 과거 99,999,999 개발자 머니나 잔존 데이터가 있을 경우 100만원으로 초기화
      if (!parsed.coinReset_v16 || parsed.coins > 10_000_000) {
        parsed.coins = 1_000_000;
        parsed.coinReset_v16 = true;
      }

      // XR 박진영 카드는 최대 1장 제한
      const xrCardId = 'card_xr_transcendent_park_741';
      if (parsed.collection && parsed.collection[xrCardId]) {
        parsed.collection[xrCardId] = Math.min(1, parsed.collection[xrCardId]);
      }

      return parsed;
    } catch (e) {
      console.warn('Failed to load state, returning guest default:', e);
      return createGuestInitialState();
    }
  }

  public static saveState(state: GameState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  public static clearState(): GameState {
    try {
      const fresh = createGuestInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      // 구버전 스토리지 키 정리
      localStorage.removeItem('void_archive_gamestate_v1');
      return fresh;
    } catch (e) {
      console.warn('Failed to clear state:', e);
      return createGuestInitialState();
    }
  }
}
