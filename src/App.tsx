import React, { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { NavTab } from './types/game';
import { Card, RevealedCard } from './types/card';
import { GAME_CONFIG, BoosterPackConfig, BOOSTER_PACKS } from './config/gameConfig';
import { RngService } from './services/rngService';
import { sound } from './services/soundService';

import { Header } from './components/Navigation/Header';
import { BottomNav } from './components/Navigation/BottomNav';
import { PackOpeningSequence } from './components/Pack/PackOpeningSequence';

import { HomePage } from './pages/Home/HomePage';
import { CollectionPage } from './pages/Collection/CollectionPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export const App: React.FC = () => {
  const {
    state,
    spendCoins,
    addPackResult,
    addMultiplePacksResult,
    claimMysteryBox,
    claimSetReward,
    claimXrCard,
    toggleSound,
    resetGame,
    dismissFirstVisit,
  } = useGameState();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [openingState, setOpeningState] = useState<{
    cards: RevealedCard[];
    pack: BoosterPackConfig;
    packCount: number;
    cost: number;
  } | null>(null);

  // 1팩 개봉 로직 (5장)
  const handleOpenSinglePack = (pack: BoosterPackConfig = BOOSTER_PACKS[0]) => {
    if (!spendCoins(GAME_CONFIG.PACK_COST_SINGLE)) return;

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
    if (!spendCoins(GAME_CONFIG.PACK_COST_FIVE)) return;

    sound.playClick();

    let currentPity = state.pityCount;
    const tempCollection = { ...state.collection };
    const packResults: { cards: Card[]; newPity: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const result = RngService.generatePack(currentPity, pack.id, tempCollection);
      currentPity = result.newPity;
      result.cards.forEach(c => {
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
    if (!spendCoins(GAME_CONFIG.PACK_COST_TEN)) return;

    sound.playClick();

    let currentPity = state.pityCount;
    const tempCollection = { ...state.collection };
    const packResults: { cards: Card[]; newPity: number }[] = [];

    for (let i = 0; i < 10; i++) {
      const result = RngService.generatePack(currentPity, pack.id, tempCollection);
      currentPity = result.newPity;
      result.cards.forEach(c => {
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
      {/* 🌌 NMIXX MIXXTOPIA 글로벌 앰비언트 우주 배경 (모바일 초경량화 GPU 가속) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d041e] via-[#14082e] to-[#04010a]" />

        {/* 몽환적인 3대 오로라 네뷸라 글로우 오라 (블러 최적화로 모바일 발열/렉 방지) */}
        <div className="absolute -top-20 left-1/4 w-72 sm:w-[30rem] h-72 sm:h-[30rem] rounded-full bg-pink-600/20 blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 -right-16 w-64 sm:w-[28rem] h-64 sm:h-[28rem] rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 sm:w-[32rem] h-80 sm:h-[32rem] rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />

        {/* 미세 별빛 입자 효과 */}
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
      />

      {/* 2. Main Page View Container */}
      <main className="relative z-10 flex-1 flex flex-col">
        {currentTab === 'home' && (
          <HomePage
            coins={state.coins}
            pityCount={state.pityCount}
            isFirstVisit={state.isFirstVisit}
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
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            state={state}
            onToggleSound={toggleSound}
            onResetGame={resetGame}
          />
        )}
      </main>

      {/* 3. Cinematic Pack Opening Sequence Modal */}
      {openingState && (
        <PackOpeningSequence
          cards={openingState.cards}
          pack={openingState.pack}
          packCount={openingState.packCount}
          cost={openingState.cost}
          coins={state.coins}
          pityCount={state.pityCount}
          onFinish={() => setOpeningState(null)}
          onOpenPackCount={(targetCount) => {
            const currentPack = openingState.pack;
            setOpeningState(null);
            setTimeout(() => {
              if (targetCount === 1) handleOpenSinglePack(currentPack);
              else if (targetCount === 5) handleOpenFivePacks(currentPack);
              else if (targetCount === 10) handleOpenTenPacks(currentPack);
            }, 100);
          }}
          onOpenAnother={() => {
            const count = openingState.packCount;
            const currentPack = openingState.pack;
            setOpeningState(null);
            setTimeout(() => {
              if (count === 1) handleOpenSinglePack(currentPack);
              else if (count === 5) handleOpenFivePacks(currentPack);
              else if (count === 10) handleOpenTenPacks(currentPack);
            }, 100);
          }}
          canAffordAnother={state.coins >= openingState.cost}
        />
      )}

      {/* 4. Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          sound.playClick();
          setCurrentTab(tab);
        }}
      />
    </div>
  );
};
export default App;
