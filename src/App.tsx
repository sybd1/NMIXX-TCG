import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    canClaimDailyBonus,
    claimDailyBonus,
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
    const result = RngService.generatePack(state.pityCount);
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
    const packResults: { cards: Card[]; newPity: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const result = RngService.generatePack(currentPity);
      currentPity = result.newPity;
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
    const packResults: { cards: Card[]; newPity: number }[] = [];

    for (let i = 0; i < 10; i++) {
      const result = RngService.generatePack(currentPity);
      currentPity = result.newPity;
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
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d041e] via-[#14082e] to-[#04010a]" />

        {/* 몽환적인 3대 오로라 네뷸라 글로우 오라 */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.45, 0.25], x: [-20, 20, -20] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 left-1/5 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-pink-600/30 via-purple-600/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2], y: [15, -25, 15] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 -right-20 w-[30rem] h-[30rem] rounded-full bg-gradient-to-bl from-cyan-500/25 via-indigo-600/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-16 left-1/3 w-[34rem] h-[34rem] rounded-full bg-gradient-to-t from-fuchsia-600/25 via-rose-600/15 to-transparent blur-3xl"
        />

        {/* 배경 은은한 회전 NMIXX 홀로그램 인장 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.035]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
            className="w-[800px] h-[800px] rounded-full border border-white flex items-center justify-center"
          >
            <div className="w-[550px] h-[550px] rounded-full border border-pink-400 flex items-center justify-center">
              <div className="w-[350px] h-[350px] rounded-full border border-purple-400" />
            </div>
          </motion.div>
        </div>

        {/* 미세 별빛 입자 효과 */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      {/* 1. Header Navigation */}
      <Header
        coins={state.coins}
        soundMuted={state.soundMuted}
        onToggleSound={toggleSound}
        canClaimDaily={canClaimDailyBonus()}
        onClaimDaily={claimDailyBonus}
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
          onFinish={() => setOpeningState(null)}
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
