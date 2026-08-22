import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pack3D } from '../../components/Pack/Pack3D';
import { GAME_CONFIG, BOOSTER_PACKS, BoosterPackConfig } from '../../config/gameConfig';
import { Sparkles, ShieldAlert, Zap, Layers } from 'lucide-react';

interface HomePageProps {
  coins: number;
  pityCount: number;
  isFirstVisit: boolean;
  onOpenSingle: (pack: BoosterPackConfig) => void;
  onOpenFive: (pack: BoosterPackConfig) => void;
  onOpenTen: (pack: BoosterPackConfig) => void;
  onDismissFirstVisit: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  coins,
  pityCount,
  isFirstVisit,
  onOpenSingle,
  onOpenFive,
  onOpenTen,
  onDismissFirstVisit,
}) => {
  const [selectedPack, setSelectedPack] = useState<BoosterPackConfig>(BOOSTER_PACKS[0]);

  // 팩 구매 가능 여부 계산
  const canAffordSingle = coins >= GAME_CONFIG.PACK_COST_SINGLE;
  const canAffordFive = coins >= GAME_CONFIG.PACK_COST_FIVE;
  const canAffordTen = coins >= GAME_CONFIG.PACK_COST_TEN;
  const pityProgress = Math.min(100, (pityCount / GAME_CONFIG.PITY_THRESHOLD) * 100);

  // 1. 첫 방문 웰컴 모드
  if (isFirstVisit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-sky-400 p-[2px] shadow-2xl">
            <div className="w-full h-full bg-void-950 rounded-[22px] flex items-center justify-center">
              <span className="text-pink-400 font-serif font-black text-3xl">N</span>
            </div>
          </div>

          <h1 className="font-serif font-black text-3xl md:text-5xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200">
            NMIXX TCG
          </h1>

          <p className="font-serif italic text-lg md:text-xl text-slate-200 max-w-md leading-relaxed">
            "Every card has a story.
            <br />
            <span className="text-pink-400 font-bold">Some cards have a secret."</span>
          </p>

          <p className="text-xs font-mono text-slate-400 tracking-wider">
            릴리 • 해원 • 설윤 • 배이 • 지우 • 규진 — 6인의 올라운더를 수집하세요!
          </p>

          <button
            onClick={() => {
              onDismissFirstVisit();
              onOpenSingle(selectedPack);
            }}
            className="mt-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-serif font-black text-lg tracking-widest shadow-2xl shadow-pink-950/80 transform hover:scale-105 transition-all"
          >
            [ OPEN YOUR FIRST PACK ]
          </button>
        </motion.div>
      </div>
    );
  }

  // 2. 메인 팩 오픈 화면 (원피스 카드게임 스타일 4대 부스터 팩 셀렉터)
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto w-full">
      {/* Booster Pack Series Selector (OP-01 ~ OP-04) */}
      <div className="w-full max-w-2xl flex flex-wrap items-center justify-center gap-2 mb-4 bg-void-900/90 border border-void-800 p-2 rounded-2xl backdrop-blur-md shadow-lg">
        {BOOSTER_PACKS.map(pack => {
          const isSelected = selectedPack.id === pack.id;
          return (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack)}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md border border-pink-400/50 scale-[1.03]'
                  : 'bg-void-950/70 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/15'
              }`}
            >
              <span className="text-[10px] text-pink-300 font-extrabold tracking-wider">
                {pack.code}
              </span>
              <span className="font-serif truncate max-w-[130px]">
                {pack.name.replace('NMIXX ', '')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Pack Subtitle & Slogan */}
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-900 border border-pink-500/30 text-pink-300 font-mono text-[10.5px] font-extrabold mb-1">
          <Layers size={12} />
          <span>{selectedPack.subtitle}</span>
        </div>
        <p className="text-xs font-serif italic text-slate-300">
          "{selectedPack.slogan}"
        </p>
      </div>

      {/* 3D Booster Pack Visual with Dynamic Cosmic Aura & Magic Ring (GPU 가속) */}
      <div className="relative my-3 flex items-center justify-center transform-gpu">
        {/* 팩 뒷편 반응형 테마 글로우 오라 */}
        <div
          key={`glow-${selectedPack.id}`}
          className={`absolute w-72 h-80 rounded-full bg-gradient-to-r ${selectedPack.gradient} blur-2xl opacity-60 pointer-events-none -z-10 transition-all duration-500`}
        />

        {/* 팩 뒷편 신비로운 회전 마법진 인장 링 */}
        <div className="absolute w-64 sm:w-76 h-64 sm:h-76 rounded-full border border-pink-400/20 border-dashed pointer-events-none -z-10 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border border-purple-400/25 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border border-amber-300/20" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPack.id}
            initial={{ opacity: 0, scale: 0.95, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotateY: 15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10"
          >
            <Pack3D
              pack={selectedPack}
              onClick={() => onOpenSingle(selectedPack)}
              disabled={!canAffordSingle}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons (1팩 / 5팩 / 10팩) */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xl my-3">
        {/* 1 Pack (5장) */}
        <button
          disabled={!canAffordSingle}
          onClick={() => onOpenSingle(selectedPack)}
          className={`w-full py-3.5 px-4 rounded-2xl font-serif font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            canAffordSingle
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-xl shadow-pink-950/60 transform hover:-translate-y-0.5'
              : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Sparkles size={16} />
          <span>1팩 (100 COIN)</span>
        </button>

        {/* 5 Packs (25장) */}
        <button
          disabled={!canAffordFive}
          onClick={() => onOpenFive(selectedPack)}
          className={`w-full py-3.5 px-4 rounded-2xl font-serif font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            canAffordFive
              ? 'bg-void-800 hover:bg-void-700 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/30 transform hover:-translate-y-0.5'
              : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Zap size={16} className="text-purple-400" />
          <span>5팩 (480 COIN)</span>
        </button>

        {/* 10 Packs (50장) */}
        <button
          disabled={!canAffordTen}
          onClick={() => onOpenTen(selectedPack)}
          className={`w-full py-3.5 px-4 rounded-2xl font-serif font-black text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            canAffordTen
              ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-fuchsia-600 hover:from-amber-500 hover:to-fuchsia-500 text-yellow-100 shadow-xl shadow-rose-950/50 transform hover:-translate-y-0.5'
              : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Sparkles size={16} className="text-yellow-300" />
          <span>10팩 (900 COIN)</span>
        </button>
      </div>

      {/* Pity Progress Bar */}
      <div className="w-full max-w-xl bg-void-900/90 border border-void-800 p-3.5 rounded-2xl mt-1">
        <div className="flex justify-between items-center text-xs font-mono mb-2">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-400" />
            천장 보장 시스템 (PITY PROGRESS)
          </span>
          <span className="text-amber-300 font-bold">
            {pityCount} / {GAME_CONFIG.PITY_THRESHOLD}
          </span>
        </div>
        <div className="w-full h-2 bg-void-950 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-500"
            style={{ width: `${pityProgress}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1.5 text-right">
          50팩 도달 시 최소 1장 SSR 이상 확정 등장
        </div>
      </div>
    </div>
  );
};
