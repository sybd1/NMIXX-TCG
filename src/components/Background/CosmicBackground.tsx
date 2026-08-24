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
    setTimeout(() => setIsBoosting(false), 1400);

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
      {/* 🌌 1. MMU Spaceship Cohesive Deep Cosmic Space Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu select-none">
        {/* Deep Cosmic Void Base (#04020a ~ #0b061a) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05010a] via-[#090417] via-55% to-[#020006]" />

        {/* MMU Hull Reflection & Ambient Cosmic Nebulae */}
        {/* 1) Top-Left Violet Aurora */}
        <div className="absolute -top-40 -left-20 w-[32rem] sm:w-[48rem] h-[32rem] sm:h-[48rem] rounded-full bg-gradient-to-br from-purple-700/20 via-pink-600/10 to-transparent blur-3xl pointer-events-none animate-pulse duration-[10000ms]" />
        
        {/* 2) Center Celestial Cyan Rift (Matching MMU Turbine Core) */}
        <div className="absolute top-1/3 left-1/4 w-[28rem] sm:w-[40rem] h-[28rem] sm:h-[40rem] rounded-full bg-gradient-to-tr from-cyan-600/12 via-sky-500/8 to-transparent blur-3xl pointer-events-none" />

        {/* 3) Bottom-Right Massive Engine Energy Backlight */}
        <div className="absolute -bottom-32 -right-32 w-[36rem] sm:w-[60rem] h-[36rem] sm:h-[60rem] rounded-full bg-gradient-to-tl from-cyan-500/20 via-fuchsia-600/15 to-transparent blur-3xl pointer-events-none" />

        {/* Cosmic Star Dust & Cyber Space Grids */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.8px,transparent_0.8px)] [background-size:32px_32px] opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_0.6px,transparent_0.6px)] [background-size:80px_80px] opacity-20" />
      </div>

      {/* 🛸 2. Giant Floating MMU Spaceship filling bottom-right corner */}
      <div className="fixed -bottom-10 sm:-bottom-20 md:-bottom-28 -right-12 sm:-right-24 md:-right-36 z-20 pointer-events-auto select-none">
        <div className="relative group">
          {/* Tooltip on already claimed */}
          <AnimatePresence>
            {showAlreadyClaimedTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                className="absolute top-12 left-12 sm:left-24 bg-void-950/95 border border-cyan-400/60 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-mono text-cyan-200 whitespace-nowrap z-50 flex items-center gap-2"
              >
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>MMU 탐사선이 MIXXTOPIA를 향해 순항 중입니다! ✨</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Massive Engine Plasma Aura Behind Ship */}
          <div
            className={`absolute inset-10 rounded-full bg-gradient-to-r from-cyan-400/30 via-pink-500/25 to-purple-600/30 blur-3xl transition-all duration-700 pointer-events-none ${
              isBoosting ? 'opacity-100 scale-125' : 'opacity-45 group-hover:opacity-85'
            }`}
          />

          {/* Engine Core Thruster Glow */}
          <div
            className={`absolute bottom-1/4 left-1/4 w-32 sm:w-48 h-32 sm:h-48 rounded-full bg-cyan-300 blur-2xl pointer-events-none transition-all duration-500 ${
              isBoosting ? 'opacity-100 scale-150' : 'opacity-50 group-hover:opacity-90'
            }`}
          />

          {/* Floating MMU Animation Container */}
          <motion.div
            animate={
              isBoosting
                ? {
                    y: [-8, -32, -8],
                    x: [0, 16, 0],
                    scale: [1, 1.05, 1],
                    rotate: [0, -2, 0],
                  }
                : {
                    y: [-12, 16, -12],
                    rotate: [-0.6, 1.0, -0.6],
                  }
            }
            transition={
              isBoosting
                ? { duration: 1.4, ease: 'easeInOut' }
                : { duration: 6.5, repeat: Infinity, ease: 'easeInOut' }
            }
            whileHover={{ scale: 1.03, rotate: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleShipClick}
            className="relative cursor-pointer filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)]"
          >
            {/* 🌟 Giant Original MMU.png */}
            <img
              src="/card-pack-image/MMU.png"
              alt="MMU - NMIXX Lore Spaceship"
              className="w-[480px] sm:w-[720px] md:w-[980px] lg:w-[1240px] xl:w-[1400px] h-auto object-contain transition-all duration-500 group-hover:brightness-110"
              draggable={false}
            />

            {/* Lore Indicator Badge */}
            <div className="absolute top-1/3 left-16 sm:left-32 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80 border border-cyan-400/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono text-cyan-300 flex items-center gap-1.5 shadow-xl pointer-events-none">
              <Compass size={13} className="animate-spin text-cyan-400" />
              <span className="font-extrabold tracking-wider">MMU • MIXXTOPIA FLAGSHIP</span>
            </div>

            {/* Secret Easter Egg Indicator */}
            {!hasClaimedEasterEgg && (
              <div className="absolute top-1/4 left-20 sm:left-40 bg-gradient-to-r from-pink-500 via-purple-600 to-amber-400 text-white font-mono font-black text-[10px] sm:text-xs px-3 py-1 rounded-full shadow-2xl border border-yellow-300 animate-bounce flex items-center gap-1.5 z-40 pointer-events-none">
                <Sparkles size={12} className="text-yellow-200 animate-spin" />
                <span>SECRET EASTER EGG (CLICK!)</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 🎁 3. MMU Easter Egg Reward Celebration Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              className="w-full max-w-md bg-gradient-to-b from-void-900 via-void-950 to-black border-2 border-amber-400/90 rounded-3xl p-6 shadow-2xl shadow-pink-950/90 text-center flex flex-col items-center gap-4 relative overflow-hidden"
            >
              {/* Radiant Particle Aura Background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3)_0%,transparent_70%)] pointer-events-none animate-pulse" />

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 p-[2px] shadow-2xl shadow-amber-500/50">
                <div className="w-full h-full bg-void-950 rounded-[14px] flex items-center justify-center">
                  <Rocket size={38} className="text-amber-300 animate-bounce" />
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
              <div className="w-full bg-amber-500/15 border border-amber-400/50 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner">
                <span className="text-[11px] font-mono text-amber-300 font-extrabold flex items-center gap-1">
                  <Zap size={14} className="text-yellow-300" />
                  특별 탐사 지원금 획득
                </span>
                <span className="font-mono font-black text-3xl sm:text-4xl text-amber-300 drop-shadow-[0_2px_14px_rgba(245,158,11,0.9)]">
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
