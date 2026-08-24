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
    coins: 1_000_000, // 게스트 기본 머니 100만원
    dust: 0,
    collection: {}, // 게스트 기본 컬렉션 0장 (클린 상태)
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
    hasClaimedMmuEasterEgg: false,
  };
};

export const DEFAULT_INITIAL_STATE: GameState = createGuestInitialState();

export class StorageService {
  private static getStorageKey(userId?: string | null): string | null {
    if (userId && userId !== 'guest') {
      return `nmixx_tcg_user_${userId}`;
    }
    return null; // 게스트는 영구 저장 키 없음
  }

  public static loadState(userId?: string | null): GameState {
    // 👤 게스트(비로그인): 새로고침이나 재접속 시 데이터 영구 저장 없이 무조건 클린 초기 상태 반환
    if (!userId || userId === 'guest') {
      return createGuestInitialState();
    }

    try {
      const key = this.getStorageKey(userId);
      if (!key) return createGuestInitialState();

      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (!data) {
        const fresh = createGuestInitialState();
        this.saveState(fresh, userId);
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
      console.warn('Failed to load user state, returning fresh default:', e);
      return createGuestInitialState();
    }
  }

  public static saveState(state: GameState, userId?: string | null): void {
    // 🚫 게스트(비로그인) 데이터는 로컬스토리지에 일절 저장하지 않음
    if (!userId || userId === 'guest') {
      return;
    }

    try {
      if (typeof window === 'undefined') return;
      const key = this.getStorageKey(userId);
      if (key) {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('Failed to save user state to localStorage:', e);
    }
  }

  public static clearState(userId?: string | null): GameState {
    try {
      const key = this.getStorageKey(userId);
      if (key && typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
      return createGuestInitialState();
    } catch (e) {
      console.warn('Failed to clear state:', e);
      return createGuestInitialState();
    }
  }
}
