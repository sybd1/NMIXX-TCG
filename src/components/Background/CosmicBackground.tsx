import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Compass, CheckCircle2, Zap, Rocket } from 'lucide-react';

interface CosmicBackgroundProps {
  hasClaimedEasterEgg: boolean;
  onClaimEasterEgg: () => { success: boolean; amount: number };
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  hasClaimedEasterEgg,
  onClaimEasterEgg,
}) => {
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showAlreadyClaimedTooltip, setShowAlreadyClaimedTooltip] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  const handleShipClick = () => {
    setIsBoosting(true);
    setTimeout(() => setIsBoosting(false), 1200);

    if (!hasClaimedEasterEgg) {
      const res = onClaimEasterEgg();
      if (res.success) {
        setShowRewardModal(true);
      }
    } else {
      setShowAlreadyClaimedTooltip(true);
      setTimeout(() => setShowAlreadyClaimedTooltip(false), 3000);
    }
  };

  return (
    <>
      {/* 🌌 1. NMIXX MIXXTOPIA Deep Cosmic Space Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu select-none">
        {/* Deep Void Cosmic Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06010d] via-[#0d041e] via-60% to-[#030108]" />

        {/* Dynamic Galactic Nebulae (Pink, Purple, Cyan, Deep Violet) */}
        <div className="absolute -top-32 left-1/4 w-96 sm:w-[36rem] h-96 sm:h-[36rem] rounded-full bg-gradient-to-br from-pink-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute top-1/4 -right-20 w-80 sm:w-[32rem] h-80 sm:h-[32rem] rounded-full bg-gradient-to-bl from-cyan-500/15 via-blue-700/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-[30rem] sm:w-[42rem] h-[30rem] sm:h-[42rem] rounded-full bg-gradient-to-tr from-purple-800/20 via-pink-700/10 to-transparent blur-3xl pointer-events-none" />
        
        {/* Subtle Cybernetic Cosmic Grid & Star Dust */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.75px,transparent_0.75px)] [background-size:28px_28px] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(#ec4899_0.5px,transparent_0.5px)] [background-size:64px_64px] opacity-15" />
      </div>

      {/* 🛸 2. MMU Spaceship Floating in Bottom-Right Corner */}
      <div className="fixed bottom-14 sm:bottom-6 right-2 sm:right-6 z-30 pointer-events-auto">
        <div className="relative group">
          {/* Tooltip on already claimed */}
          <AnimatePresence>
            {showAlreadyClaimedTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute -top-14 right-0 sm:right-4 bg-void-950/95 border border-pink-500/50 px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md text-[11px] font-mono text-slate-200 whitespace-nowrap z-50 flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>MMU 탐사선이 MIXXTOPIA를 향해 순항 중입니다! ✨</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spaceship Ambient Glow Aura */}
          <div
            className={`absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/25 via-pink-500/25 to-purple-600/25 blur-2xl transition-opacity duration-500 pointer-events-none ${
              isBoosting ? 'opacity-100 scale-125' : 'opacity-40 group-hover:opacity-80'
            }`}
          />

          {/* Engine Propulsion Flare Glow */}
          <div
            className={`absolute bottom-6 left-6 w-16 h-16 rounded-full bg-cyan-400 blur-xl pointer-events-none transition-all duration-300 ${
              isBoosting ? 'opacity-100 scale-150' : 'opacity-40 group-hover:opacity-75'
            }`}
          />

          {/* MMU Floating Spaceship Animated Container */}
          <motion.div
            animate={
              isBoosting
                ? {
                    y: [-4, -20, -4],
                    x: [0, 8, 0],
                    scale: [1, 1.08, 1],
                    rotate: [0, -3, 0],
                  }
                : {
                    y: [-4, 6, -4],
                    rotate: [0, 1.5, 0],
                  }
            }
            transition={
              isBoosting
                ? { duration: 1.2, ease: 'easeInOut' }
                : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
            }
            whileHover={{ scale: 1.06, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShipClick}
            className="relative cursor-pointer select-none filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.85)]"
          >
            <img
              src="/card-pack-image/mmu_clean.png"
              alt="MMU Spaceship - NMIXX Lore"
              className="w-48 sm:w-64 md:w-80 h-auto object-contain transition-all duration-300 group-hover:brightness-110"
              draggable={false}
            />

            {/* Lore Indicator Badge on Hover */}
            <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 border border-white/10 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-mono text-cyan-300 flex items-center gap-1">
              <Compass size={10} className="animate-spin" />
              <span>MMU • MIXXTOPIA VESSEL</span>
            </div>

            {/* Unclaimed Easter Egg Secret Twinkle Badge */}
            {!hasClaimedEasterEgg && (
              <div className="absolute -top-1 left-8 sm:left-12 bg-gradient-to-r from-pink-500 via-purple-600 to-amber-400 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-yellow-300 animate-bounce flex items-center gap-1">
                <Sparkles size={10} className="text-yellow-200 animate-spin" />
                <span>SECRET DISCOVERY</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 🎁 3. MMU Easter Egg Reward Celebration Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              className="w-full max-w-md bg-gradient-to-b from-void-900 via-void-950 to-black border-2 border-amber-400/80 rounded-3xl p-6 shadow-2xl shadow-pink-950/80 text-center flex flex-col items-center gap-4 relative overflow-hidden"
            >
              {/* Radiant Particle Aura Background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.25)_0%,transparent_70%)] pointer-events-none animate-pulse" />

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 p-[2px] shadow-2xl shadow-amber-500/40">
                <div className="w-full h-full bg-void-950 rounded-[14px] flex items-center justify-center">
                  <Rocket size={36} className="text-amber-300 animate-bounce" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs font-black text-pink-400 uppercase tracking-widest">
                  [ NMIXX LORE SECRET UNLOCKED ]
                </span>
                <h3 className="font-serif font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
                  MMU 차원 도약 성공!
                </h3>
                <p className="font-sans text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  미지의 세계 MIXXTOPIA를 향해 우주를 항해하는
                  <br />
                  <strong className="text-white font-bold">MMU 탐사선</strong>과의 특별한 조우를 기념합니다!
                </p>
              </div>

              {/* Reward Box */}
              <div className="w-full bg-amber-500/10 border border-amber-400/40 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner">
                <span className="text-[11px] font-mono text-amber-300 font-extrabold flex items-center gap-1">
                  <Zap size={13} className="text-yellow-300" />
                  특별 탐사 지원금 획득
                </span>
                <span className="font-mono font-black text-3xl sm:text-4xl text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.8)]">
                  +500,000 <span className="text-lg sm:text-xl font-bold">N COIN</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 mt-1">
                  (계정당 1회 한정 특별 이스터에그 보상)
                </span>
              </div>

              <button
                onClick={() => setShowRewardModal(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-serif font-black text-base shadow-xl shadow-pink-950/80 cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all"
              >
                지원금 수령 및 항해 계속하기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
