import React, { useState, useRef, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { NavTab } from './types/game';
import { Card, RevealedCard } from './types/card';
import { UserAccount } from './types/auth';
import { GAME_CONFIG, BoosterPackConfig, BOOSTER_PACKS } from './config/gameConfig';
import { RngService } from './services/rngService';
import { sound } from './services/soundService';
import { AuthService } from './services/authService';
import { MultiplayerService } from './services/multiplayerService';

import { CosmicBackground } from './components/Background/CosmicBackground';
import { FlyingMmuShip } from './components/EasterEgg/FlyingMmuShip';
import { Header } from './components/Navigation/Header';
import { GlobalTicker } from './components/Navigation/GlobalTicker';
import { BottomNav } from './components/Navigation/BottomNav';
import { PackOpeningSequence } from './components/Pack/PackOpeningSequence';
import { AuthModal } from './components/Auth/AuthModal';
import { UserProfileModal } from './components/Auth/UserProfileModal';
import { LeaderboardModal } from './components/Multiplayer/LeaderboardModal';
import { MailboxModal } from './components/Multiplayer/MailboxModal';
import { MarketModal } from './components/Multiplayer/MarketModal';

import { HomePage } from './pages/Home/HomePage';
import { CollectionPage } from './pages/Collection/CollectionPage';
import { AchievementsPage } from './pages/Achievements/AchievementsPage';
import { RankingPage } from './pages/Ranking/RankingPage';
// import { PatchNotesPage } from './pages/PatchNotes/PatchNotesPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export const App: React.FC = () => {
  const {
    state,
    commitPackOpening,
    claimMmuEasterEgg,
    claimSetReward,
    claimAchievement,
    claimXrCard,
    claimMail,
    redeemCouponCode,
    applyTradeResult,
    toggleSound,
    resetGame,
    logoutAndResetState,
    dismissFirstVisit,
    addCoins,
    dismantleAllDuplicates,
    dismantleSingleCard,
    craftCard,
  } = useGameState();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [user, setUser] = useState<UserAccount | null>(() => AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // AuthService의 인증 상태 변화를 App component 내부 user state에 동기화
  useEffect(() => {
    const unsub = AuthService.subscribeAuthState((updatedUser) => {
      setUser(updatedUser);
    });
    return () => unsub();
  }, []);

  // 중복 로그인 세션 차단 경고창 상태 관리
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  const [openingState, setOpeningState] = useState<{
    cards: RevealedCard[];
    pack: BoosterPackConfig;
    packCount: number;
    cost: number;
    packResults: { cards: Card[]; newPity: number }[];
  } | null>(null);

  // 개봉 중복 호출 방지용 락
  const isOpeningLockRef = useRef(false);

  // 📱 모바일 브라우저 뒤로가기 (History API & popstate) 라우팅 연동
  useEffect(() => {
    // 초기 히스토리 상태 설정
    window.history.replaceState({ app: 'nmixx_tcg', tab: 'home' }, '');

    const handlePopState = () => {
      // 1순위: 카드팩 개봉 중이면 팩 개봉 화면 종료
      if (openingState) {
        setOpeningState(null);
        isOpeningLockRef.current = false;
        return;
      }

      // 2순위: 열린 모달이 있으면 해당 모달 닫기
      if (isAuthModalOpen || isProfileModalOpen || isLeaderboardOpen || isMailboxOpen || isMarketOpen) {
        setIsAuthModalOpen(false);
        setIsProfileModalOpen(false);
        setIsLeaderboardOpen(false);
        setIsMailboxOpen(false);
        setIsMarketOpen(false);
        return;
      }

      // 3순위: 서브 탭(컬렉션, 업적, 설정 등)에 있으면 메인 홈으로 복귀
      if (currentTab !== 'home') {
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [openingState, isAuthModalOpen, isProfileModalOpen, isLeaderboardOpen, isMailboxOpen, isMarketOpen, currentTab]);

  // 실시간 세션 감시 (onSnapshot 리스너)
  useEffect(() => {
    if (!user || user.id === 'guest' || !user.isCloudSynced) return;

    // Firebase Firestore가 설정되어 있을 때만 실행
    const checkSession = async () => {
      const { doc, onSnapshot } = await import('firebase/firestore');
      const { db, isFirebaseConfigured } = await import('./config/firebase');

      if (!isFirebaseConfigured || !db) return;

      const userDocRef = doc(db, 'nmixx_tcg_users', user.id);
      
      const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.data();
        if (data && data.sessionId && user.sessionId) {
          // Firestore의 sessionId와 로컬의 sessionId가 다르면 중복 로그인 발생으로 판단
          if (data.sessionId !== user.sessionId) {
            setIsSessionLocked(true);
          }
        }
      }, (error) => {
        console.warn('[SessionMonitor] Firestore snapshot warning:', error);
      });

      return unsubscribe;
    };

    let unsubPromise = checkSession();
    return () => {
      unsubPromise.then((unsub) => {
        if (unsub) unsub();
      });
    };
  }, [user]);

  // 세션이 잠겨 강제 로그아웃될 시 로컬에 저장하고 클리어 처리
  useEffect(() => {
    if (isSessionLocked) {
      // 팩 개봉 및 모든 모달 즉시 닫기
      setOpeningState(null);
      isOpeningLockRef.current = false;
      setIsAuthModalOpen(false);
      setIsProfileModalOpen(false);
      setIsLeaderboardOpen(false);
      setIsMailboxOpen(false);
      setIsMarketOpen(false);

      // 메인 홈 화면으로 리다이렉트
      setCurrentTab('home');
    }
  }, [isSessionLocked]);

  // ⌨️ 글로벌 고속 ESC 키 핸들러: 카드팩 개봉 중, 탭 화면, 모달 등 어디서나 ESC를 누르면 0ms 즉시 메인 팩오픈 화면으로 복귀
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 중복 로그인 잠금 상태면 ESC 닫기 방지
        if (isSessionLocked) return;

        // 1. 팩 개봉 화면 즉시 탈출 & 락 해제
        setOpeningState(null);
        isOpeningLockRef.current = false;

        // 2. 열려있는 모든 모달 즉시 닫기
        setIsAuthModalOpen(false);
        setIsProfileModalOpen(false);
        setIsLeaderboardOpen(false);
        setIsMailboxOpen(false);
        setIsMarketOpen(false);

        // 3. 메인 팩오픈 화면으로 즉시 전환
        setCurrentTab('home');
      }
    };

    // Capture phase(true)로 등록하여 어떤 요소보다 최우선으로 즉시 가로채 처리
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isSessionLocked]);

  // 미수령 우편 수 계산
  const unreadMailCount = MultiplayerService.getMailList(state.claimedMailIds || []).filter(
    (m) => !m.isClaimed
  ).length;

  // 1팩 개봉 로직 (5장) - 트랜잭션 분리
  const handleOpenSinglePack = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (isOpeningLockRef.current) return;
    if (state.coins < GAME_CONFIG.PACK_COST_SINGLE) return;

    isOpeningLockRef.current = true;
    sound.playClick();

    const result = RngService.generatePack(state.pityCount, pack.id, state.collection);
    const tempCollection = { ...state.collection };
    const revealed: RevealedCard[] = result.cards.map((c, idx) => {
      const existing = tempCollection[c.id] || 0;
      tempCollection[c.id] = (c.rarity === 'XR' || !!c.isMystery) ? 1 : existing + 1;
      return {
        ...c,
        instanceId: `${c.id}_${Date.now()}_0_${idx}`,
        isNew: existing === 0,
        duplicateCount: tempCollection[c.id],
        isFlipped: false,
      };
    });

    try {
      window.history.pushState({ screen: 'pack-opening' }, '');
    } catch (e) {}

    setOpeningState({
      cards: revealed,
      pack,
      packCount: 1,
      cost: GAME_CONFIG.PACK_COST_SINGLE,
      packResults: [result],
    });
  };

  // 5팩 개봉 로직 (25장) - 트랜잭션 분리
  const handleOpenFivePacks = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (isOpeningLockRef.current) return;
    if (state.coins < GAME_CONFIG.PACK_COST_FIVE) return;

    isOpeningLockRef.current = true;
    sound.playClick();

    let currentPity = state.pityCount;
    const tempCollection = { ...state.collection };
    const packResults: { cards: Card[]; newPity: number }[] = [];
    const allRevealedCards: RevealedCard[] = [];

    for (let i = 0; i < 5; i++) {
      const result = RngService.generatePack(currentPity, pack.id, tempCollection);
      currentPity = result.newPity;
      result.cards.forEach((c, idx) => {
        const existing = tempCollection[c.id] || 0;
        tempCollection[c.id] = (c.rarity === 'XR' || !!c.isMystery) ? 1 : existing + 1;
        allRevealedCards.push({
          ...c,
          instanceId: `${c.id}_${Date.now()}_${i}_${idx}`,
          isNew: existing === 0,
          duplicateCount: tempCollection[c.id],
          isFlipped: false,
        });
      });
      packResults.push(result);
    }

    try {
      window.history.pushState({ screen: 'pack-opening' }, '');
    } catch (e) {}

    setOpeningState({
      cards: allRevealedCards,
      pack,
      packCount: 5,
      cost: GAME_CONFIG.PACK_COST_FIVE,
      packResults,
    });
  };

  // 10팩 개봉 로직 (50장) - 트랜잭션 분리
  const handleOpenTenPacks = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (isOpeningLockRef.current) return;
    if (state.coins < GAME_CONFIG.PACK_COST_TEN) return;

    isOpeningLockRef.current = true;
    sound.playClick();

    let currentPity = state.pityCount;
    const tempCollection = { ...state.collection };
    const packResults: { cards: Card[]; newPity: number }[] = [];
    const allRevealedCards: RevealedCard[] = [];

    for (let i = 0; i < 10; i++) {
      const result = RngService.generatePack(currentPity, pack.id, tempCollection);
      currentPity = result.newPity;
      result.cards.forEach((c, idx) => {
        const existing = tempCollection[c.id] || 0;
        tempCollection[c.id] = (c.rarity === 'XR' || !!c.isMystery) ? 1 : existing + 1;
        allRevealedCards.push({
          ...c,
          instanceId: `${c.id}_${Date.now()}_${i}_${idx}`,
          isNew: existing === 0,
          duplicateCount: tempCollection[c.id],
          isFlipped: false,
        });
      });
      packResults.push(result);
    }

    try {
      window.history.pushState({ screen: 'pack-opening' }, '');
    } catch (e) {}

    setOpeningState({
      cards: allRevealedCards,
      pack,
      packCount: 10,
      cost: GAME_CONFIG.PACK_COST_TEN,
      packResults,
    });
  };

  const handleSelectTab = (tab: NavTab) => {
    sound.playClick();
    if (tab !== currentTab) {
      try {
        window.history.pushState({ tab }, '');
      } catch (e) {}
      setCurrentTab(tab);
    }
  };

  const handleOpenModalWithHistory = (openFn: () => void, modalName: string) => {
    sound.playClick();
    try {
      window.history.pushState({ modal: modalName }, '');
    } catch (e) {}
    openFn();
  };

  return (
    <div className="relative min-h-screen bg-[#070210] text-slate-100 flex flex-col justify-between pb-16 md:pb-0 overflow-x-hidden">
      {/* 🌌 NMIXX MIXXTOPIA 코스믹 심우주 배경 */}
      <CosmicBackground />

      {/* 🛸 팩오픈 화면 첫 입장 시 2.5초간 중앙을 날아가는 MMU 우주선 이스터에그 (계정당 1회 50만 N COIN) */}
      {currentTab === 'home' && (
        <FlyingMmuShip onClaimEasterEgg={claimMmuEasterEgg} />
      )}

      {/* 1. Header Navigation */}
      <Header
        coins={state.coins}
        soundMuted={state.soundMuted}
        onToggleSound={toggleSound}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        user={user}
        onOpenAuth={() => handleOpenModalWithHistory(() => setIsAuthModalOpen(true), 'auth')}
        onOpenProfile={() => handleOpenModalWithHistory(() => setIsProfileModalOpen(true), 'profile')}
        onOpenLeaderboard={() => handleOpenModalWithHistory(() => setIsLeaderboardOpen(true), 'leaderboard')}
        onOpenMarket={() => handleOpenModalWithHistory(() => setIsMarketOpen(true), 'market')}
        onOpenMailbox={() => handleOpenModalWithHistory(() => setIsMailboxOpen(true), 'mailbox')}
        unreadMailCount={unreadMailCount}
      />

      {/* 📢 2. Real-time Global High-Tier Pull Ticker */}
      <GlobalTicker />

      {/* 3. Main Page View Container */}
      <main className="relative z-10 flex-1 flex flex-col w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {currentTab === 'home' && (
          <HomePage
            coins={state.coins}
            pityCount={state.pityCount}
            isFirstVisit={state.isFirstVisit}
            collection={state.collection}
            onOpenSingle={handleOpenSinglePack}
            onOpenFive={handleOpenFivePacks}
            onOpenTen={handleOpenTenPacks}
            onDismissFirstVisit={dismissFirstVisit}
          />
        )}

        {currentTab === 'collection' && (
          <CollectionPage
            collection={state.collection}
            claimedSetRewards={state.claimedSetRewards || []}
            onClaimSetReward={claimSetReward}
            onClaimXrCard={claimXrCard}
            onAddCoins={addCoins}
            dust={state.dust || 0}
            onDismantleAll={dismantleAllDuplicates}
            onDismantleSingle={dismantleSingleCard}
            onCraftCard={craftCard}
          />
        )}

        {currentTab === 'achievements' && (
          <AchievementsPage state={state} onClaimReward={claimAchievement} />
        )}

        {currentTab === 'ranking' && (
          <RankingPage currentUserId={user?.id} collection={state.collection} />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            state={state}
            onToggleSound={toggleSound}
            onResetGame={resetGame}
            onRedeemCoupon={redeemCouponCode}
          />
        )}

        {/* {currentTab === 'patch-notes' && <PatchNotesPage />} */}
      </main>

      {/* 🔮 3.5. Web Disclaimer Footer */}
      <footer className="relative z-10 w-full text-center py-4 px-4 mt-auto mb-16 md:mb-6 select-none">
        <p className="text-[10px] sm:text-xs font-mono text-slate-500/80 tracking-wider">
          본 웹사이트는 비영리 팬 창작물이며, 모든 이미지 및 지식재산권은 원저작권자(소속사)에 있습니다.
        </p>
      </footer>

      {/* 4. Cinematic Pack Opening Sequence Modal */}
      {openingState && (
        <PackOpeningSequence
          cards={openingState.cards}
          pack={openingState.pack}
          packCount={openingState.packCount}
          cost={openingState.cost}
          coins={state.coins}
          pityCount={state.pityCount}
          collection={state.collection}
          onCommitOpening={() => {
            commitPackOpening(openingState.cost, openingState.packResults);
          }}
          onFinish={() => {
            isOpeningLockRef.current = false;
            setOpeningState(null);
          }}
          onOpenPackCount={(targetCount) => {
            const currentPack = openingState.pack;
            isOpeningLockRef.current = false;
            if (targetCount === 1) handleOpenSinglePack(currentPack);
            else if (targetCount === 5) handleOpenFivePacks(currentPack);
            else if (targetCount === 10) handleOpenTenPacks(currentPack);
          }}
          onOpenAnother={() => {
            const count = openingState.packCount;
            const currentPack = openingState.pack;
            isOpeningLockRef.current = false;
            if (count === 1) handleOpenSinglePack(currentPack);
            else if (count === 5) handleOpenFivePacks(currentPack);
            else if (count === 10) handleOpenTenPacks(currentPack);
          }}
          canAffordAnother={state.coins >= openingState.cost}
        />
      )}

      {/* 5. Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />

      {/* 6. Google & Kakao 소셜 로그인 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(loggedUser) => setUser(loggedUser)}
      />

      {/* 7. 유저 프로필 모달 */}
      {user && (
        <UserProfileModal
          user={user}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateUser={(updated) => setUser(updated)}
          onLogout={() => {
            setUser(null);
            logoutAndResetState();
            setCurrentTab('home');
            setIsProfileModalOpen(false);
            sound.playClick();
          }}
        />
      )}

      {/* 🏆 8. 글로벌 리더보드 & 명예의 전당 모달 */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={user?.id}
      />

      {/* 🎁 9. 공식 우편함 & 쿠폰 모달 */}
      <MailboxModal
        isOpen={isMailboxOpen}
        onClose={() => setIsMailboxOpen(false)}
        claimedMailIds={state.claimedMailIds || []}
        lastMailClaimDate={state.lastMailClaimDate}
        onClaimMail={claimMail}
        onRedeemCoupon={redeemCouponCode}
      />

      {/* 🔄 10. 중복 카드 1:1 교환소 모달 */}
      <MarketModal
        isOpen={isMarketOpen}
        onClose={() => setIsMarketOpen(false)}
        collection={state.collection}
        onTradeCompleted={applyTradeResult}
      />

      {/* ⚠️ 11. 중복 로그인 경고 팝업 모달 */}
      {isSessionLocked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-[#150d22] border-2 border-red-500/80 rounded-2xl w-full max-w-md p-6 text-center shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-scaleUp">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">중복 로그인 감지</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              다른 기기에서 로그인이 감지되어<br />
              이 세션은 강제로 로그아웃됩니다.
            </p>
            <button
              onClick={() => {
                setIsSessionLocked(false);
                setUser(null);
                logoutAndResetState();
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] transition text-white font-semibold rounded-xl shadow-lg shadow-red-600/30"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
