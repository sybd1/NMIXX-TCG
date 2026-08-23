import React, { useState, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { NavTab } from './types/game';
import { Card, RevealedCard } from './types/card';
import { UserAccount } from './types/auth';
import { GAME_CONFIG, BoosterPackConfig, BOOSTER_PACKS } from './config/gameConfig';
import { RngService } from './services/rngService';
import { sound } from './services/soundService';
import { AuthService } from './services/authService';
import { MultiplayerService } from './services/multiplayerService';

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
import { PatchNotesPage } from './pages/PatchNotes/PatchNotesPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export const App: React.FC = () => {
  const {
    state,
    spendCoins,
    addPackResult,
    addMultiplePacksResult,
    claimMysteryBox,
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
  } = useGameState();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [user, setUser] = useState<UserAccount | null>(() => AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const [openingState, setOpeningState] = useState<{
    cards: RevealedCard[];
    pack: BoosterPackConfig;
    packCount: number;
    cost: number;
  } | null>(null);

  // 개봉 중복 호출 방지용 락
  const isOpeningLockRef = useRef(false);

  // 미수령 우편 수 계산
  const unreadMailCount = MultiplayerService.getMailList(state.claimedMailIds || []).filter(
    (m) => !m.isClaimed
  ).length;

  // 1팩 개봉 로직 (5장)
  const handleOpenSinglePack = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (isOpeningLockRef.current) return;
    if (!spendCoins(GAME_CONFIG.PACK_COST_SINGLE)) return;

    isOpeningLockRef.current = true;
    sound.playClick();
    const result = RngService.generatePack(state.pityCount, pack.id, state.collection);
    const revealed = addPackResult(result.cards, result.newPity);
    setOpeningState({
      cards: revealed,
      pack,
      packCount: 1,
      cost: GAME_CONFIG.PACK_COST_SINGLE,
    });
  };

  // 5팩 개봉 로직 (25장)
  const handleOpenFivePacks = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (isOpeningLockRef.current) return;
    if (!spendCoins(GAME_CONFIG.PACK_COST_FIVE)) return;

    isOpeningLockRef.current = true;
    sound.playClick();

    let currentPity = state.pityCount;
    const tempCollection = { ...state.collection };
    const packResults: { cards: Card[]; newPity: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const result = RngService.generatePack(currentPity, pack.id, tempCollection);
      currentPity = result.newPity;
      result.cards.forEach((c) => {
        tempCollection[c.id] = (tempCollection[c.id] || 0) + 1;
      });
      packResults.push(result);
    }

    const allRevealedCards = addMultiplePacksResult(packResults);
    setOpeningState({
      cards: allRevealedCards,
      pack,
      packCount: 5,
      cost: GAME_CONFIG.PACK_COST_FIVE,
    });
  };

  // 10팩 개봉 로직 (50장)
  const handleOpenTenPacks = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (isOpeningLockRef.current) return;
    if (!spendCoins(GAME_CONFIG.PACK_COST_TEN)) return;

    isOpeningLockRef.current = true;
    sound.playClick();

    let currentPity = state.pityCount;
    const tempCollection = { ...state.collection };
    const packResults: { cards: Card[]; newPity: number }[] = [];

    for (let i = 0; i < 10; i++) {
      const result = RngService.generatePack(currentPity, pack.id, tempCollection);
      currentPity = result.newPity;
      result.cards.forEach((c) => {
        tempCollection[c.id] = (tempCollection[c.id] || 0) + 1;
      });
      packResults.push(result);
    }

    const allRevealedCards = addMultiplePacksResult(packResults);
    setOpeningState({
      cards: allRevealedCards,
      pack,
      packCount: 10,
      cost: GAME_CONFIG.PACK_COST_TEN,
    });
  };

  return (
    <div className="relative min-h-screen bg-[#070210] text-slate-100 flex flex-col justify-between pb-16 md:pb-0 overflow-x-hidden">
      {/* 🌌 NMIXX MIXXTOPIA 글로벌 앰비언트 우주 배경 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d041e] via-[#14082e] to-[#04010a]" />
        <div className="absolute -top-20 left-1/4 w-72 sm:w-[30rem] h-72 sm:h-[30rem] rounded-full bg-pink-600/20 blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 -right-16 w-64 sm:w-[28rem] h-64 sm:h-[28rem] rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 sm:w-[32rem] h-80 sm:h-[32rem] rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      {/* 1. Header Navigation */}
      <Header
        coins={state.coins}
        soundMuted={state.soundMuted}
        onToggleSound={toggleSound}
        onClaimMysteryBox={claimMysteryBox}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          sound.playClick();
          setCurrentTab(tab);
        }}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenMarket={() => setIsMarketOpen(true)}
        onOpenMailbox={() => setIsMailboxOpen(true)}
        unreadMailCount={unreadMailCount}
      />

      {/* 📢 2. Real-time Global High-Tier Pull Ticker */}
      <GlobalTicker />

      {/* 3. Main Page View Container */}
      <main className="relative z-10 flex-1 flex flex-col">
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
          />
        )}

        {currentTab === 'achievements' && (
          <AchievementsPage state={state} onClaimReward={claimAchievement} />
        )}

        {currentTab === 'patch-notes' && <PatchNotesPage />}

        {currentTab === 'settings' && (
          <SettingsPage
            state={state}
            onToggleSound={toggleSound}
            onResetGame={resetGame}
          />
        )}
      </main>

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
        onSelectTab={(tab) => {
          sound.playClick();
          setCurrentTab(tab);
        }}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
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
    </div>
  );
};
export default App;
