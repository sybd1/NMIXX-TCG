import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Rarity } from '../../types/card';

interface SecretRevealEffectProps {
  rarity: Rarity;
  onComplete?: () => void;
}

export const SecretRevealEffect: React.FC<SecretRevealEffectProps> = ({
  rarity,
  onComplete,
}) => {
  useEffect(() => {
    if (rarity === 'MR') {
      // 신화 (0.05%) 전용 대규모 프리즘 파티클 폭발
      const duration = 3500;
      const animationEnd = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors: ['#facc15', '#ec4899', '#38bdf8', '#a855f7', '#ffffff'],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors: ['#facc15', '#ec4899', '#38bdf8', '#a855f7', '#ffffff'],
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        } else if (onComplete) {
          onComplete();
        }
      };
      frame();
    } else if (rarity === 'LR') {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#f43f5e', '#a855f7', '#ffffff'],
      });
      if (onComplete) setTimeout(onComplete, 2200);
    } else if (rarity === 'UR') {
      confetti({
        particleCount: 90,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f87171', '#fecaca', '#ffffff'],
      });
      if (onComplete) setTimeout(onComplete, 1800);
    } else if (rarity === 'SSR') {
      confetti({
        particleCount: 70,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff'],
      });
      if (onComplete) setTimeout(onComplete, 1400);
    }
  }, [rarity, onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
      {/* Background Flash */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className={`absolute inset-0 ${
          rarity === 'MR'
            ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-cyan-400'
            : rarity === 'LR'
            ? 'bg-pink-500'
            : rarity === 'UR'
            ? 'bg-red-500'
            : 'bg-amber-400'
        }`}
      />

      {/* Center Cinematic Banner */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="relative z-10 text-center"
      >
        <h1
          className={`font-serif text-5xl md:text-7xl font-black tracking-widest uppercase drop-shadow-[0_0_35px_rgba(255,255,255,0.8)] ${
            rarity === 'MR'
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 animate-pulse'
              : rarity === 'LR'
              ? 'text-pink-300'
              : rarity === 'UR'
              ? 'text-rose-400'
              : 'text-amber-300'
          }`}
        >
          {rarity === 'MR'
            ? '★ MYTHIC RARE ★'
            : rarity === 'LR'
            ? '★ LEGEND RARE ★'
            : rarity === 'UR'
            ? '★ ULTRA RARE ★'
            : '★ SUPER SPECIAL RARE ★'}
        </h1>
        <p className="font-mono text-sm md:text-base text-white/90 tracking-widest mt-2 font-bold drop-shadow">
          {rarity === 'MR'
            ? '0.05% 극악의 신화 카드 발견!'
            : rarity === 'LR'
            ? '0.15% 전설급 카드 강림!'
            : rarity === 'UR'
            ? '0.30% 극희귀 카드 획득!'
            : '0.50% 특급 희귀 카드 획득!'}
        </p>
      </motion.div>
    </div>
  );
};
