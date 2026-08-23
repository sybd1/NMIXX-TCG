import { useState, useEffect, useCallback } from 'react';
import { GameState, PackHistoryItem } from '../types/game';
import { Card, RevealedCard } from '../types/card';
import { StorageService } from '../services/storageService';
import { GAME_CONFIG } from '../config/gameConfig';
import { sound } from '../services/soundService';

export function useGameState() {
  const [state, setState] = useState<GameState>(() => StorageService.loadState());

  // 상태가 바뀔 때마다 localStorage에 자동 영속화
  useEffect(() => {
    StorageService.saveState(state);
    sound.setMuted(state.soundMuted);
  }, [state]);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const nextMuted = !prev.soundMuted;
      sound.setMuted(nextMuted);
      if (!nextMuted) sound.playClick();
      return { ...prev, soundMuted: nextMuted };
    });
  }, []);

  const dismissFirstVisit = useCallback(() => {
    setState(prev => ({ ...prev, isFirstVisit: false }));
  }, []);

  const canAffordCoins = useCallback((amount: number) => {
    return state.coins >= amount;
  }, [state.coins]);

  // 다중 팩 개봉 시 모든 카드들을 컬렉션에 추가하고 모든 카드의 RevealedCard 배열 생성
  const addMultiplePacksResult = useCallback((packResults: { cards: Card[]; newPity: number }[]) => {
    const revealed: RevealedCard[] = [];
    const newCollection = { ...state.collection };
    const historyItems: PackHistoryItem[] = [];
    let finalPity = state.pityCount;

    packResults.forEach((pack, pIdx) => {
      finalPity = pack.newPity;
      let highestRarity = pack.cards[0].rarity;

      pack.cards.forEach((card, cIdx) => {
        const existingCount = newCollection[card.id] || 0;
        const isNew = existingCount === 0;

        newCollection[card.id] = existingCount + 1;

        revealed.push({
          ...card,
          instanceId: `${card.id}_${Date.now()}_${pIdx}_${cIdx}`,
          isNew,
          duplicateCount: newCollection[card.id],
          isFlipped: false,
        });

        highestRarity = card.rarity;
      });

      const hasMR = pack.cards.some(c => c.rarity === 'MR');
      const hasLR = pack.cards.some(c => c.rarity === 'LR');
      const hasUR = pack.cards.some(c => c.rarity === 'UR');
      const hasSSR = pack.cards.some(c => c.rarity === 'SSR');

      historyItems.push({
        id: `pack_${Date.now()}_${pIdx}`,
        timestamp: Date.now() + pIdx,
        packName: `${GAME_CONFIG.PACK_INFO.name} (${pIdx + 1}/${packResults.length})`,
        cards: pack.cards,
        highestRarity,
        hasMR,
        hasLR,
        hasUR,
        hasSSR,
      });
    });

    setState(prev => ({
      ...prev,
      collection: newCollection,
      pityCount: finalPity,
      openedPacksTotal: prev.openedPacksTotal + packResults.length,
      packHistory: [...historyItems.reverse(), ...prev.packHistory].slice(0, 50),
    }));

    return revealed;
  }, [state.collection, state.pityCount]);

  // 단일 팩 헬퍼
  const addPackResult = useCallback((cards: Card[], newPity: number) => {
    return addMultiplePacksResult([{ cards, newPity }]);
  }, [addMultiplePacksResult]);

  const spendCoins = useCallback((amount: number) => {
    if (state.coins < amount) return false;
    setState(prev => ({
      ...prev,
      coins: prev.coins - amount,
      coinsSpentTotal: (prev.coinsSpentTotal || 0) + amount,
    }));
    return true;
  }, [state.coins]);

  const canClaimDailyBonus = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.lastDailyBonus !== today;
  }, [state.lastDailyBonus]);

  const claimDailyBonus = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    if (state.lastDailyBonus === today) return false;

    setState(prev => ({
      ...prev,
      coins: prev.coins + GAME_CONFIG.DAILY_BONUS_COINS,
      lastDailyBonus: today,
    }));

    sound.playLegendaryReveal();
    return true;
  }, [state.lastDailyBonus]);

  const claimMysteryBox = useCallback(() => {
    setState(prev => ({
      ...prev,
      coins: prev.coins + 10000,
    }));
    sound.playMythicReveal();
    return 10000;
  }, []);

  const claimSetReward = useCallback((setId: string, coinsAmount: number) => {
    setState(prev => {
      const alreadyClaimed = (prev.claimedSetRewards || []).includes(setId);
      if (alreadyClaimed) return prev;
      return {
        ...prev,
        coins: prev.coins + coinsAmount,
        claimedSetRewards: [...(prev.claimedSetRewards || []), setId],
      };
    });
    sound.playMythicReveal();
  }, []);

  const claimAchievement = useCallback((achievementId: string, rewardCoins: number) => {
    setState(prev => {
      const alreadyClaimed = (prev.claimedAchievements || []).includes(achievementId);
      if (alreadyClaimed) return prev;
      return {
        ...prev,
        coins: prev.coins + rewardCoins,
        claimedAchievements: [...(prev.claimedAchievements || []), achievementId],
      };
    });
    sound.playLegendaryReveal();
  }, []);

  const claimXrCard = useCallback((cardId: string) => {
    setState(prev => {
      const currentCount = prev.collection[cardId] || 0;
      if (currentCount > 0) return prev;
      return {
        ...prev,
        collection: {
          ...prev.collection,
          [cardId]: 1,
        },
      };
    });
    sound.playSecretReveal();
  }, []);

  const addCoins = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      coins: prev.coins + amount,
    }));
  }, []);

  const resetGame = useCallback(() => {
    const freshState = StorageService.clearState();
    setState(freshState);
  }, []);

  return {
    state,
    canAffordCoins,
    spendCoins,
    addPackResult,
    addMultiplePacksResult,
    canClaimDailyBonus,
    claimDailyBonus,
    claimMysteryBox,
    claimSetReward,
    claimAchievement,
    claimXrCard,
    addCoins,
    toggleSound,
    resetGame,
    dismissFirstVisit,
  };
}
