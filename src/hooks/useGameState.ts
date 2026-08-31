import React, { useState, useEffect, useCallback } from 'react';
import { GameState, PackHistoryItem } from '../types/game';
import { Card, RevealedCard } from '../types/card';
import { StorageService, createAdminInitialState } from '../services/storageService';
import { CloudSyncService } from '../services/cloudSyncService';
import { AuthService } from '../services/authService';
import { MultiplayerService } from '../services/multiplayerService';
import { GAME_CONFIG, RARITY_CONFIGS } from '../config/gameConfig';
import { sound } from '../services/soundService';
import { getCardById } from '../data/cards';

export function useGameState() {
  const currentUser = AuthService.getCurrentUser();
  const [state, setState] = useState<GameState>(() => {
    return StorageService.loadState(currentUser?.id);
  });

  // Firestore 로딩 중 로컬 빈 상태가 DB를 덮어쓰지 않도록 보호하는 동기화 가드 Ref
  const isSyncingRef = React.useRef(true);
  const activeUserIdRef = React.useRef<string | null>(currentUser?.id || null);
  // 🔑 로그아웃 타이밍 레이스 방지: 현재 로그인 유저 객체를 ref로 유지
  // (AuthService.getCurrentUser()는 logout() 호출 직후 null이 되므로 useEffect에서 직접 참조 불가)
  const activeUserRef = React.useRef<import('../types/auth').UserAccount | null>(currentUser || null);
  // 타 기기로부터 동기화된 상태가 다시 Firestore로 중복 업로드(피드백 루프)되는 것을 방지하기 위한 Ref
  const skipNextCloudSaveRef = React.useRef(false);

  // 1. 상태가 바뀔 때마다 해당 유저 전용 스토리지 및 클라우드(Firestore)에 즉각 자동 동기화
  useEffect(() => {
    // ✅ AuthService.getCurrentUser() 대신 ref를 사용 — 로그아웃 타이밍 레이스 방지
    const user = activeUserRef.current;
    StorageService.saveState(state, user?.id);
    sound.setMuted(state.soundMuted);

    // 타 기기 데이터 동기화로 인한 상태 변동일 경우, Firestore 재저장은 생략하고 락만 해제
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    // 🛡️ Firestore 로딩 중이거나 게스트일 때는 클라우드 덮어쓰기 엄격 차단
    if (isSyncingRef.current) return;

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
        lastMailClaimDate: state.lastMailClaimDate,
      });
    }
  }, [state]);

  // Ref to hold the current Firestore onSnapshot unsubscribe function
  const cloudListenerRef = React.useRef<(() => void) | null>(null);

  // Helper: apply Firestore cloud data to local React state
  const applyCloudData = React.useCallback((cloudData: import('../services/cloudSyncService').CloudGameData) => {
    const userState: GameState = {
      coins: cloudData.coins ?? 1_000_000,
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
      lastMailClaimDate: (cloudData as any).lastMailClaimDate || null,
      packHistory: [],
      soundMuted: false,
      isFirstVisit: false,
      coinReset_v16: true,
      hasClaimedMmuEasterEgg: cloudData.hasClaimedMmuEasterEgg || false,
    };
    StorageService.saveState(userState, activeUserIdRef.current);
    setState(userState);
  }, []);

  // 2. 로그인/로그아웃 시 계정별 스토리지 및 Firestore 즉각 전환 (원자적 읽기/복원)
  useEffect(() => {
    const unsubscribe = AuthService.subscribeAuthState(async (user) => {
      // 이전 Firestore 실시간 구독 해제 (계정 전환, 로그아웃 시 누수 방지)
      if (cloudListenerRef.current) {
        cloudListenerRef.current();
        cloudListenerRef.current = null;
      }

      isSyncingRef.current = true;

      if (user?.isCloudSynced && user.id && user.id !== 'guest') {
        // ✅ [1] 구글/카카오 계정 로그인:
        activeUserIdRef.current = user.id;
        // 🔑 activeUserRef 갱신 — 이후 useEffect([state])가 올바른 유저로 저장하도록
        activeUserRef.current = user;

        const isAdmin = 
          user.id.includes('chip') || 
          user.id.includes('운영자') || 
          (user.displayName && user.displayName.includes('운영자')) || 
          (user.email && (user.email === 'gjffpdlem@gmail.com' || user.email.includes('chip')));

        if (isAdmin) {
          // 👑 운영자(관리자)는 강제로 1억원 + 전도감 보유 상태로 초기화하여 Firestore와 로컬 양쪽에 덮어씀
          const adminState = createAdminInitialState();
          StorageService.clearState(user.id);
          await CloudSyncService.saveUserGameData(user, {
            collection: adminState.collection,
            coins: adminState.coins,
            dust: adminState.dust,
            pityCounter: adminState.pityCount,
            totalPacksOpened: adminState.openedPacksTotal,
            unlockedAchievements: adminState.claimedAchievements,
            claimedSetRewards: adminState.claimedSetRewards,
            claimedMailIds: adminState.claimedMailIds,
            claimedCouponCodes: adminState.claimedCouponCodes,
            hasClaimedMmuEasterEgg: adminState.hasClaimedMmuEasterEgg,
          });
          StorageService.saveState(adminState, user.id);
          setState(adminState);
        } else {
          const cloudData = await CloudSyncService.loadUserGameData(user.id);

          if (cloudData) {
            // 기존 Firestore 클라우드 세이브 데이터 100% 온전히 복원 (초기화 절대 금지)
            applyCloudData(cloudData);
          } else {
            // 신규 가입 유저(Firestore 문서 부재 시): 신규 100만원 기본 데이터 1회 생성 및 즉시 Firestore 저장
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
        }

        // 상태 반영 완료 후 클라우드 동기화 가드 안전 해제, 이후 실시간 구독 시작
        setTimeout(() => {
          isSyncingRef.current = false;

          // 🔴 핵심: 실시간 onSnapshot 구독 시작 — 다른 기기에서 변경 시 즉시 로컬 상태에 반영
          let isFirstSnapshot = true;
          cloudListenerRef.current = CloudSyncService.subscribeUserGameData(
            user.id,
            (freshCloudData) => {
              // 최초 로드 시 수신되는 첫 데이터는 로컬 복구 데이터와 같으므로 생략
              if (isFirstSnapshot) {
                isFirstSnapshot = false;
                return;
              }
              // 만약 이 기기가 마침 직접 Firestore에 쓰는 중이었다면 들어오는 스냅샷 이벤트는 무시
              if (isSyncingRef.current) return;

              // 클라우드로부터 데이터가 새로 왔을 때:
              // 1. skipNextCloudSaveRef 를 true 로 설정하여 useEffect 가 다시 Firestore에 저장 요청을 하지 않도록 방어
              skipNextCloudSaveRef.current = true;
              applyCloudData(freshCloudData);
            }
          );
        }, 300);
      } else {
        // 🚪 [2] 로그아웃: DB는 건드리지 않고, 브라우저 로컬 상태만 게스트 저장 상태로 안전 전환
        // 🔑 activeUserRef를 null로 먼저 설정하여 useEffect([state])가 이후 guestState로 Firestore를 덮어쓰지 않도록 차단
        activeUserRef.current = null;
        activeUserIdRef.current = null;
        CloudSyncService.forceResetHash();
        const guestState = StorageService.loadState('guest');
        setState(guestState);

        // 상태 반영 완료 후 클라우드 동기화 가드 안전 해제
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      }
    });

    return () => {
      unsubscribe();
      // 컴포넌트 언마운트 시 실시간 Firestore 구독도 함께 해제
      if (cloudListenerRef.current) {
        cloudListenerRef.current();
        cloudListenerRef.current = null;
      }
    };
  }, [applyCloudData]);

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
        const isXR = card.rarity === 'XR' || !!card.isMystery;
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
        const isXR = card.rarity === 'XR' || !!card.isMystery;
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

  const claimMail = useCallback((mailId: string, coinsReward: number) => {
    // KST(UTC+9) 기준 오늘 날짜 문자열 생성
    const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    setState(prev => {
      // 데일리 응원 우편은 매일 수령 가능하므로 claimedMailIds에 추가하지 않고 lastMailClaimDate만 갱신
      if (mailId === 'mail_daily_support') {
        if (prev.lastMailClaimDate === kstToday) return prev;
        return {
          ...prev,
          coins: prev.coins + coinsReward,
          lastMailClaimDate: kstToday,
        };
      }

      const alreadyClaimed = (prev.claimedMailIds || []).includes(mailId);
      if (alreadyClaimed) return prev;

      return {
        ...prev,
        coins: prev.coins + coinsReward,
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
      const rCard = getCardById(receivedCardId);
      const isXR = rCard ? (rCard.rarity === 'XR' || !!rCard.isMystery) : false;
      const existing = newCollection[receivedCardId] || 0;
      newCollection[receivedCardId] = isXR ? 1 : existing + 1;

      return {
        ...prev,
        collection: newCollection,
      };
    });
    sound.playLegendaryReveal();
  }, []);

  const dismantleAllDuplicates = useCallback(() => {
    let totalDustGained = 0;
    let dismantledCount = 0;
    const newCollection = { ...state.collection };

    Object.entries(newCollection).forEach(([cardId, count]) => {
      if (count > 1) {
        const card = getCardById(cardId);
        if (card) {
          const rarity = card.rarity;
          const dismantleVal = RARITY_CONFIGS[rarity]?.dustDismantle || 0;
          const duplicatesCount = count - 1;
          totalDustGained += dismantleVal * duplicatesCount;
          dismantledCount += duplicatesCount;
          newCollection[cardId] = 1;
        }
      }
    });

    if (totalDustGained > 0) {
      setState(prev => ({
        ...prev,
        dust: (prev.dust || 0) + totalDustGained,
        collection: newCollection,
      }));
      sound.playVictoryFanfare();
      return { success: true, dustGained: totalDustGained, dismantledCount };
    }
    return { success: false, dustGained: 0, dismantledCount: 0 };
  }, [state.collection]);

  const dismantleSingleCard = useCallback((cardId: string) => {
    const count = state.collection[cardId] || 0;
    if (count <= 1) return { success: false, error: '분해할 중복 카드가 없습니다.' };

    const card = getCardById(cardId);
    if (!card) return { success: false, error: '존재하지 않는 카드입니다.' };

    const rarity = card.rarity;
    const dismantleVal = RARITY_CONFIGS[rarity]?.dustDismantle || 0;

    setState(prev => {
      const newCollection = { ...prev.collection };
      newCollection[cardId] = count - 1;
      return {
        ...prev,
        dust: (prev.dust || 0) + dismantleVal,
        collection: newCollection,
      };
    });

    sound.playLegendaryReveal();
    return { success: true, dustGained: dismantleVal };
  }, [state.collection]);

  const craftCard = useCallback((cardId: string) => {
    const card = getCardById(cardId);
    if (!card) return { success: false, error: '존재하지 않는 카드입니다.' };

    if (card.isSetReward) {
      return { success: false, error: '세트 보상 카드는 제작할 수 없습니다.' };
    }

    const rarityConfig = RARITY_CONFIGS[card.rarity];
    const craftCost = rarityConfig?.dustCraft;
    if (craftCost === null || craftCost === undefined) {
      return { success: false, error: `${card.rarity} 등급 카드는 제작할 수 없습니다.` };
    }

    if ((state.dust || 0) < craftCost) {
      return { success: false, error: `더스트가 부족합니다. (필요: ${craftCost}, 보유: ${state.dust || 0})` };
    }

    setState(prev => {
      const newCollection = { ...prev.collection };
      const isXR = card.rarity === 'XR' || !!card.isMystery;
      const existingCount = newCollection[cardId] || 0;
      newCollection[cardId] = isXR ? 1 : existingCount + 1;

      return {
        ...prev,
        dust: (prev.dust || 0) - craftCost,
        collection: newCollection,
      };
    });

    sound.playMythicReveal();
    return { success: true, card };
  }, [state.dust, state.collection]);

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
    dismantleAllDuplicates,
    dismantleSingleCard,
    craftCard,
    toggleSound,
    resetGame,
    logoutAndResetState,
    dismissFirstVisit,
  };
}
