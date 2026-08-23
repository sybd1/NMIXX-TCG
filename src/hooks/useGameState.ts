import { useState, useEffect, useCallback } from 'react';
import { GameState, PackHistoryItem } from '../types/game';
import { Card, RevealedCard } from '../types/card';
import { StorageService } from '../services/storageService';
import { CloudSyncService } from '../services/cloudSyncService';
import { AuthService } from '../services/authService';
import { MultiplayerService } from '../services/multiplayerService';
import { GAME_CONFIG } from '../config/gameConfig';
import { sound } from '../services/soundService';

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
    const loaded = StorageService.loadState();
    if (loaded.coins < GAME_CONFIG.INITIAL_COINS) {
      loaded.coins = GAME_CONFIG.INITIAL_COINS;
    }
    return loaded;
  });

  // 1. 상태가 바뀔 때마다 localStorage 및 클라우드(Firestore)에 자동 동기화
  useEffect(() => {
    StorageService.saveState(state);
    sound.setMuted(state.soundMuted);

    const currentUser = AuthService.getCurrentUser();
    if (currentUser?.isCloudSynced) {
      CloudSyncService.saveUserGameData(currentUser, {
        collection: state.collection,
        coins: state.coins,
        dust: state.dust,
        pityCounter: state.pityCount,
        totalPacksOpened: state.openedPacksTotal,
        unlockedAchievements: state.claimedAchievements,
      });
    }
  }, [state]);

  // 2. 로그인 시 클라우드 데이터 자동 복원 및 병합
  useEffect(() => {
    const unsubscribe = AuthService.subscribeAuthState(async (user) => {
      if (user?.isCloudSynced && user.id) {
        const cloudData = await CloudSyncService.loadUserGameData(user.id);
        if (cloudData) {
          setState(prev => {
            // 로컬과 클라우드 컬렉션 스마트 병합 (더 큰 수량 우선)
            const mergedCollection: Record<string, number> = { ...prev.collection };
            Object.entries(cloudData.collection || {}).forEach(([cardId, count]) => {
              const isXR = cardId === 'card_xr_transcendent_park_741';
              const maxCount = Math.max(mergedCollection[cardId] || 0, count);
              mergedCollection[cardId] = isXR ? Math.min(1, maxCount) : maxCount;
            });

            return {
              ...prev,
              collection: mergedCollection,
              coins: Math.max(prev.coins, cloudData.coins ?? 0, GAME_CONFIG.INITIAL_COINS),
              dust: Math.max(prev.dust, cloudData.dust ?? prev.dust),
              pityCount: cloudData.pityCounter ?? prev.pityCount,
              openedPacksTotal: Math.max(prev.openedPacksTotal, cloudData.totalPacksOpened ?? prev.openedPacksTotal),
              claimedAchievements: Array.from(new Set([...(prev.claimedAchievements || []), ...(cloudData.unlockedAchievements || [])])),
            };
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

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
        const isXR = card.rarity === 'XR' || card.id === 'card_xr_transcendent_park_741';
        const existingCount = newCollection[card.id] || 0;
        const isNew = existingCount === 0;

        // 👑 XR 카드는 어떠한 경우에도 단 1장만 소지 가능
        newCollection[card.id] = isXR ? 1 : existingCount + 1;

        // 📢 고등급 카드(SSR+) 획득 시 실시간 글로벌 전광판 자동 브로드캐스트
        if (['SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity)) {
          const currentUser = AuthService.getCurrentUser();
          MultiplayerService.broadcastHighTierPull(
            currentUser?.displayName || '익명의 엔써',
            currentUser?.id || 'guest',
            card
          );
        }

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

  const claimMail = useCallback((mailId: string, coinsReward: number, dustReward: number = 0) => {
    setState(prev => {
      const alreadyClaimed = (prev.claimedMailIds || []).includes(mailId);
      if (alreadyClaimed) return prev;

      return {
        ...prev,
        coins: prev.coins + coinsReward,
        dust: (prev.dust || 0) + dustReward,
        claimedMailIds: [...(prev.claimedMailIds || []), mailId],
      };
    });
    sound.playLegendaryReveal();
  }, []);

  const redeemCouponCode = useCallback((code: string) => {
    const claimedCoupons = state.claimedCouponCodes || [];
    const result = MultiplayerService.redeemCoupon(code, claimedCoupons);

    if (result.success && result.reward) {
      setState(prev => ({
        ...prev,
        coins: prev.coins + result.reward!.coinsReward,
        dust: (prev.dust || 0) + (result.reward!.dustReward || 0),
        claimedCouponCodes: [...(prev.claimedCouponCodes || []), result.reward!.code],
      }));
      sound.playMythicReveal();
    }

    return result;
  }, [state.claimedCouponCodes]);

  const applyTradeResult = useCallback((offeredCardId: string, receivedCardId: string) => {
    setState(prev => {
      const newCollection = { ...prev.collection };
      // 제공한 카드 1장 차감
      if (newCollection[offeredCardId] > 0) {
        newCollection[offeredCardId] = Math.max(0, newCollection[offeredCardId] - 1);
      }
      // 교환받은 카드 1장 추가
      const isXR = receivedCardId === 'card_xr_transcendent_park_741';
      const existing = newCollection[receivedCardId] || 0;
      newCollection[receivedCardId] = isXR ? 1 : existing + 1;

      return {
        ...prev,
        collection: newCollection,
      };
    });
    sound.playLegendaryReveal();
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
    claimMail,
    redeemCouponCode,
    applyTradeResult,
    addCoins,
    toggleSound,
    resetGame,
    dismissFirstVisit,
  };
}
