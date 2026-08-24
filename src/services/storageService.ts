import { GameState } from '../types/game';
import { MASTER_CARDS } from '../data/cards';

const STORAGE_KEY = 'nmixx_tcg_gamestate_v2';

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
  const initialCollection = isLocalServer() ? getAllCardsCollection() : {};
  return {
    coins: 1_000_000, // 게스트 기본 머니 100만원
    dust: 0,
    collection: initialCollection,
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

      // 💻 로컬 서버일 경우 모든 카드가 최소 1장 이상 있도록 자동 보장
      if (isLocalServer()) {
        parsed.collection = parsed.collection || {};
        for (const card of MASTER_CARDS) {
          if (!parsed.collection[card.id] || parsed.collection[card.id] < 1) {
            parsed.collection[card.id] = 1;
          }
        }
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
