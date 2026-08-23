import { GameState } from '../types/game';
import { MASTER_CARDS, LEGACY_CARDS, CONCEPT_SETS } from '../data/cards';
import { ACHIEVEMENTS } from '../data/achievements';

const STORAGE_KEY = 'void_archive_gamestate_v1';

// 🌟 모든 카드(615장 마스터 + 280장 레거시 + 세트 보상 카드), 모든 업적, 모든 세트 100% 완전 해금 상태 생성기
export const createFullUnlockedState = (): GameState => {
  const collection: Record<string, number> = {};

  // 1. 모든 마스터 카드 3장씩 보유 (단, XR 초월 카드는 전 우주에 단 1장만 존재)
  MASTER_CARDS.forEach(card => {
    collection[card.id] = (card.rarity === 'XR' || card.id === 'card_xr_transcendent_park_741') ? 1 : 3;
  });

  // 2. 모든 레거시 카드 3장씩 보유
  LEGACY_CARDS.forEach(card => {
    collection[card.id] = 3;
  });

  // 3. 모든 세트 보상 카드도 3장씩 보유
  CONCEPT_SETS.forEach(set => {
    if (set.rewardCard) {
      collection[set.rewardCard.id] = 3;
    }
  });

  return {
    coins: 99_999_999, // 9999만 골드
    dust: 999_999, // 99만 더스트
    collection,
    pityCount: 0,
    lastDailyBonus: new Date().toISOString().split('T')[0],
    packHistory: [],
    openedPacksTotal: 999,
    coinsSpentTotal: 99_999_990,
    soundMuted: false,
    isFirstVisit: false,
    claimedSetRewards: CONCEPT_SETS.map(s => s.setId),
    claimedAchievements: ACHIEVEMENTS.map(a => a.id),
  };
};

export const DEFAULT_INITIAL_STATE: GameState = createFullUnlockedState();

export class StorageService {
  public static loadState(): GameState {
    try {
      const fullState = createFullUnlockedState();
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveState(fullState);
        return fullState;
      }

      const parsed = JSON.parse(data);

      // 기존 스토리지와 병합하되, 모든 카드와 세트/업적이 100% 해금되도록 보장
      const mergedCollection = { ...fullState.collection, ...(parsed.collection || {}) };
      // 누락된 카드가 없도록 전수 보충
      Object.keys(fullState.collection).forEach(cardId => {
        if (!mergedCollection[cardId] || mergedCollection[cardId] < 1) {
          const isXR = cardId === 'card_xr_transcendent_park_741' || fullState.collection[cardId] === 1;
          mergedCollection[cardId] = isXR ? 1 : 3;
        }
      });

      // 👑 XR 박진영 카드는 어떠한 경우에도 단 1장만 소지 가능하도록 강제 클램핑
      const xrCardId = 'card_xr_transcendent_park_741';
      if (mergedCollection[xrCardId]) {
        mergedCollection[xrCardId] = Math.min(1, mergedCollection[xrCardId]);
      }

      const mergedState: GameState = {
        ...fullState,
        ...parsed,
        collection: mergedCollection,
        coins: Math.max(parsed.coins || 0, 99_999_999),
        dust: Math.max(parsed.dust || 0, 999_999),
        openedPacksTotal: Math.max(parsed.openedPacksTotal || 0, 999),
        coinsSpentTotal: Math.max(parsed.coinsSpentTotal || 0, 99_999_990),
        claimedSetRewards: Array.from(new Set([...(parsed.claimedSetRewards || []), ...fullState.claimedSetRewards!])),
        claimedAchievements: Array.from(new Set([...(parsed.claimedAchievements || []), ...fullState.claimedAchievements!])),
        isFirstVisit: false,
      };

      this.saveState(mergedState);
      return mergedState;
    } catch (e) {
      console.warn('Failed to load game state from localStorage, using full unlocked state:', e);
      return createFullUnlockedState();
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
      const fullState = createFullUnlockedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
      return fullState;
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
      return createFullUnlockedState();
    }
  }
}

