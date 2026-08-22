import { GameState } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';

const STORAGE_KEY = 'void_archive_gamestate_v1';

export const DEFAULT_INITIAL_STATE: GameState = {
  coins: GAME_CONFIG.INITIAL_COINS, // 1억원
  dust: GAME_CONFIG.INITIAL_DUST,
  collection: {},
  pityCount: 0,
  lastDailyBonus: null,
  packHistory: [],
  openedPacksTotal: 0,
  soundMuted: false,
  isFirstVisit: true,
};

export class StorageService {
  public static loadState(): GameState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return DEFAULT_INITIAL_STATE;
      const parsed = JSON.parse(data);
      
      // 코인이 1억원 미만으로 남아있던 기존 유저도 1억원으로 넉넉하게 업데이트
      const coins = typeof parsed.coins === 'number' && parsed.coins >= GAME_CONFIG.INITIAL_COINS
        ? parsed.coins 
        : GAME_CONFIG.INITIAL_COINS;

      return {
        ...DEFAULT_INITIAL_STATE,
        ...parsed,
        coins,
      };
    } catch (e) {
      console.warn('Failed to load game state from localStorage, using default:', e);
      return DEFAULT_INITIAL_STATE;
    }
  }

  public static saveState(state: GameState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save game state to localStorage:', e);
    }
  }

  public static clearState(): GameState {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    return DEFAULT_INITIAL_STATE;
  }
}
