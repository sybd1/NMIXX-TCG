import React, { useState, useEffect, useCallback } from 'react';
import { GameState, PackHistoryItem } from '../types/game';
import { Card, RevealedCard } from '../types/card';
import { StorageService } from '../services/storageService';
import { CloudSyncService } from '../services/cloudSyncService';
import { AuthService } from '../services/authService';
import { MultiplayerService } from '../services/multiplayerService';
import { GAME_CONFIG } from '../config/gameConfig';
import { sound } from '../services/soundService';

export function useGameState() {
  const currentUser = AuthService.getCurrentUser();
  const [state, setState] = useState<GameState>(() => {
    const loaded = StorageService.loadState(currentUser?.id);
    if (loaded.coins < GAME_CONFIG.INITIAL_COINS) {
      loaded.coins = GAME_CONFIG.INITIAL_COINS;
    }
    return loaded;
  });

  // 현재 활성화된 유저 ID 추적 Ref
  const activeUserIdRef = React.useRef<string | null>(currentUser?.id || null);

  // 1. 상태가 바뀔 때마다 해당 유저 전용 스토리지 및 클라우드(Firestore)에 자동 동기화
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    StorageService.saveState(state, user?.id);
    sound.setMuted(state.soundMuted);

    if (user?.isCloudSynced && user.id && user.id !== 'guest') {
      CloudSyncService.saveUserGameData(user, {
        collection: state.collection,
        coins: state.coins,
        dust: state.dust,
        pityCounter: state.pityCount,
        totalPacksOpened: state.openedPacksTotal,
        unlockedAchievements: state.claimedAchievements || [],
        claimedSetRewards: state.claimedSetRewards || [],
        claimedMailIds: state.claimedMailIds || [],
        claimedCouponCodes: state.claimedCouponCodes || [],
        hasClaimedMmuEasterEgg: state.hasClaimedMmuEasterEgg,
      });
    }
  }, [state]);

  // 2. 로그인/로그아웃 시 계정별 스토리지 및 Firestore 즉각 전환
  useEffect(() => {
    const unsubscribe = AuthService.subscribeAuthState(async (user) => {
      if (user?.isCloudSynced && user.id && user.id !== 'guest') {
        // ✅ [1] 구글/카카오 계정 로그인:
        activeUserIdRef.current = user.id;
        const cloudData = await CloudSyncService.loadUserGameData(user.id);
        
        if (cloudData) {
          // 기존 Firestore 클라우드 세이브 데이터 100% 온전히 복원
          const userState: GameState = {
            coins: cloudData.coins ?? GAME_CONFIG.INITIAL_COINS,
            dust: cloudData.dust ?? 0,
            collection: cloudData.collection || {},
            pityCount: cloudData.pityCounter ?? 0,
            openedPacksTotal: cloudData.totalPacksOpened ?? 0,
            coinsSpentTotal: 0,
            claimedAchievements: cloudData.unlockedAchievements || [],
            claimedSetRewards: cloudData.claimedSetRewards || [],
            claimedMailIds: cloudData.claimedMailIds || [],
            claimedCouponCodes: cloudData.claimedCouponCodes || [],
            lastDailyBonus: null,
            packHistory: [],
            soundMuted: false,
            isFirstVisit: false,
            coinReset_v16: true,
            hasClaimedMmuEasterEgg: cloudData.hasClaimedMmuEasterEgg || false,
          };
          StorageService.saveState(userState, user.id);
          setState(userState);
        } else {
          // 신규 가입 유저: 클린 기본 데이터로 Firestore 초기 세이브 생성 및 적용
          const freshState = StorageService.loadState(user.id);
          await CloudSyncService.saveUserGameData(user, {
            collection: freshState.collection,
            coins: freshState.coins,
            dust: freshState.dust,
            pityCounter: freshState.pityCount,
            totalPacksOpened: freshState.openedPacksTotal,
            unlockedAchievements: freshState.claimedAchievements,
            claimedSetRewards: freshState.claimedSetRewards,
            claimedMailIds: freshState.claimedMailIds,
            claimedCouponCodes: freshState.claimedCouponCodes,
            hasClaimedMmuEasterEgg: freshState.hasClaimedMmuEasterEgg,
          });
          StorageService.saveState(freshState, user.id);
          setState(freshState);
        }
      } else {
        // 🚪 [2] 로그아웃: 게스트 클린 초기 상태로 즉각 전환 (이전 유저 데이터 완전 소거)
        activeUserIdRef.current = null;
        CloudSyncService.forceResetHash();
        const guestState = StorageService.loadState('guest');
        setState(guestState);
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

  // 원자적 카드팩 개봉 트랜잭션: 재화 차감 + 인벤토리 갱신 + 천장 반영을 단 1회의 트랜잭션으로 커밋
  const commitPackOpening = useCallback((cost: number, packResults: { cards: Card[]; newPity: number }[]) => {
    if (state.coins < cost) return { success: false, revealed: [] };

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

        newCollection[card.id] = isXR ? 1 : existingCount + 1;

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
      coins: prev.coins - cost,
      coinsSpentTotal: (prev.coinsSpentTotal || 0) + cost,
      collection: newCollection,
      pityCount: finalPity,
      openedPacksTotal: prev.openedPacksTotal + packResults.length,
      packHistory: [...historyItems.reverse(), ...prev.packHistory].slice(0, 50),
    }));

    return { success: true, revealed };
  }, [state.coins, state.collection, state.pityCount]);

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

  const claimMmuEasterEgg = useCallback(() => {
    const currentUser = AuthService.getCurrentUser();
    const userKey = currentUser?.id || 'guest';
    const storageKey = `nmixx_mmu_claimed_${userKey}`;
    const alreadyClaimedLocal = typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true';

    if (state.hasClaimedMmuEasterEgg || alreadyClaimedLocal) {
      return { success: false, amount: 0 };
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (e) {}
    }

    setState(prev => {
      const nextState = {
        ...prev,
        coins: prev.coins + 500000,
        hasClaimedMmuEasterEgg: true,
      };
      StorageService.saveState(nextState);
      return nextState;
    });

    sound.playSecretReveal();
    return { success: true, amount: 500000 };
  }, [state.hasClaimedMmuEasterEgg]);

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
    const currentUser = AuthService.getCurrentUser();
    const claimedCoupons = state.claimedCouponCodes || [];
    const result = MultiplayerService.redeemCoupon(code, claimedCoupons, currentUser);

    if (result.success && result.reward) {
      setState(prev => ({
        ...prev,
        coins: prev.coins + result.reward!.coinsReward,
        dust: (prev.dust || 0) + (result.reward!.dustReward || 0),
        claimedCouponCodes: [...(prev.claimedCouponCodes || []), result.reward!.code],
      }));

      if (result.isSecret) {
        sound.playVictoryFanfare();
      } else {
        sound.playMythicReveal();
      }
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
    const user = AuthService.getCurrentUser();
    CloudSyncService.forceResetHash();
    const freshState = StorageService.clearState(user?.id);
    setState(freshState);
  }, []);

  const logoutAndResetState = useCallback(() => {
    CloudSyncService.forceResetHash();
    const guestState = StorageService.loadState('guest');
    setState(guestState);
  }, []);

  return {
    state,
    canAffordCoins,
    spendCoins,
    addPackResult,
    addMultiplePacksResult,
    commitPackOpening,
    canClaimDailyBonus,
    claimDailyBonus,
    claimMmuEasterEgg,
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
    logoutAndResetState,
    dismissFirstVisit,
  };
}
