import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../types/card';
import { CardVisual } from './CardVisual';
import { RARITY_CONFIGS } from '../../config/gameConfig';

interface CardFlipProps {
  card: Card;
  isFlipped: boolean;
  isNew?: boolean;
  duplicateCount?: number;
  onFlip?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isPreRevealing?: boolean; // 마지막 5번째 카드 공개 전 서스펜스 글로우
}

export const CardFlip: React.FC<CardFlipProps> = React.memo(({
  card,
  isFlipped,
  isNew = false,
  duplicateCount = 1,
  onFlip,
  size = 'md',
  isPreRevealing = false,
}) => {
  const config = RARITY_CONFIGS[card.rarity];

  const sizeClasses = {
    sm: 'w-36 h-52',
    md: 'w-48 sm:w-52 h-72 sm:h-76',
    lg: 'w-64 h-92',
  }[size];

  return (
    <div
      className={`relative ${sizeClasses} cursor-pointer select-none will-change-transform transform-gpu`}
      style={{ perspective: 1200, contain: 'layout style' }}
      onClick={onFlip}
    >
      {/* 5번째 카드 공개 전 Rarity에 맞는 은은한 후광(Pre-Reveal Glow) */}
      {isPreRevealing && !isFlipped && (
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-3 rounded-3xl blur-xl pointer-events-none z-0"
          style={{ backgroundColor: config.glowColor }}
        />
      )}

      {/* 3D 회전 컨테이너 */}
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          ease: [0.23, 1, 0.32, 1], // easeOutQuint
        }}
      >
        {/* --- 1. CARD BACK (카드 뒷면) --- */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl z-10"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="w-full h-full rounded-2xl border-2 border-pink-500/40 bg-gradient-to-br from-void-900 via-void-950 to-black p-3 flex flex-col items-center justify-between group hover:border-pink-400 transition-colors shadow-inner">
            {/* 배경 룬 패턴 */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:12px_12px]" />

            <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest text-pink-300 font-bold">
              <span>NMIXX</span>
              <span>TCG</span>
            </div>

            {/* 중앙 3D 인장 엠블럼 */}
            <div className="relative w-20 h-20 rounded-full border-2 border-pink-400/50 bg-void-900/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <div className="w-14 h-14 rounded-full border border-purple-400/40 flex items-center justify-center bg-black/50">
                <svg viewBox="0 0 100 100" className="w-9 h-9 text-pink-400">
                  <polygon
                    points="15,85 30,20 50,55 70,20 85,85 65,85 50,50 35,85"
                    fill="currentColor"
                  />
                  <circle cx="50" cy="78" r="8" fill="#facc15" />
                </svg>
              </div>
            </div>

            <div className="text-[9.5px] font-serif tracking-wider text-slate-300 font-black text-center">
              NMIXX 계승되는 의지
            </div>
          </div>
        </div>

        {/* --- 2. CARD FRONT (카드 앞면) --- */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl z-20"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardVisual
            card={card}
            isOwned={true}
            isNew={isNew}
            count={duplicateCount}
            size={size}
            className="w-full h-full"
          />
        </div>
      </motion.div>
    </div>
  );
});
