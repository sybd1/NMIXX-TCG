import { GameState } from '../types/game';
import { MASTER_CARDS } from '../data/cards';

/**
 * 💻 로컬 서버(개발 환경) 여부 확인 함수
 * - localhost, 127.0.0.1, 로컬 IP 또는 DEV 모드에서만 true 반환
 * - 라이브 배포(nmixx-tcg.vercel.app 등)에서는 false 반환
 */
export const isLocalServer = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local') ||
    import.meta.env.DEV
  );
};

/**
 * 🎴 모든 카드가 1장씩 포함된 전체 컬렉션 생성기 (로컬 테스트 전용)
 */
export const getAllCardsCollection = (): Record<string, number> => {
  const col: Record<string, number> = {};
  for (const card of MASTER_CARDS) {
    col[card.id] = 1;
  }
  return col;
};

/**
 * 🌟 게스트(비로그인) 기본 초기 상태 생성기
 * - 기본 지급 머니: 1,000,000 COIN (100만원)
 * - 카드 도감: 로컬 서버일 경우 모든 카드 보유, 라이브 서버일 경우 0장에서 시작
 */
export const createGuestInitialState = (): GameState => {
  return {
    coins: 1_000_000,
    dust: 0,
    collection: {},
    pityCount: 0,
    lastDailyBonus: null,
    lastMailClaimDate: null,
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
    hasClaimedMmuEasterEgg: false,
  };
};

export const DEFAULT_INITIAL_STATE: GameState = createGuestInitialState();

export class StorageService {
  private static getStorageKey(userId?: string | null): string {
    if (userId && userId !== 'guest') {
      return `nmixx_tcg_user_${userId}`;
    }
    return 'nmixx_tcg_guest';
  }

  public static loadState(userId?: string | null): GameState {
    try {
      const key = this.getStorageKey(userId);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      
      // 저장된 데이터가 전혀 없는 '순수 최초 접속자'에게만 초기 기본 데이터 생성 및 1회 저장
      if (!data) {
        const fresh = createGuestInitialState();
        this.saveState(fresh, userId);
        return fresh;
      }

      const parsed: GameState = JSON.parse(data);

      // XR 박진영 카드는 최대 1장 제한
      const xrCardId = 'card_xr_transcendent_park_741';
      if (parsed.collection && parsed.collection[xrCardId]) {
        parsed.collection[xrCardId] = Math.min(1, parsed.collection[xrCardId]);
      }

      return parsed;
    } catch (e) {
      console.warn('Failed to load state, returning fresh default:', e);
      return createGuestInitialState();
    }
  }

  public static saveState(state: GameState, userId?: string | null): void {
    try {
      if (typeof window === 'undefined') return;
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  public static clearState(userId?: string | null): GameState {
    try {
      const key = this.getStorageKey(userId);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
      return createGuestInitialState();
    } catch (e) {
      console.warn('Failed to clear state:', e);
      return createGuestInitialState();
    }
  }
}
