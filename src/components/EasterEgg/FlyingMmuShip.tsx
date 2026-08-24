import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { sound } from '../../services/soundService';

interface FlyingMmuShipProps {
  onClaimCoins: (amount: number) => void;
}

export const FlyingMmuShip: React.FC<FlyingMmuShipProps> = ({ onClaimCoins }) => {
  const [hasFlown, setHasFlown] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [showSimpleToast, setShowSimpleToast] = useState(false);

  useEffect(() => {
    // 2.3초 후 화면 밖으로 완전히 벗어나면 소멸 (다시 등장하지 않음)
    const timer = setTimeout(() => {
      setHasFlown(true);
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHit || hasFlown) return;

    setIsHit(true);
    sound.playSecretReveal();
    onClaimCoins(500000);
    setShowSimpleToast(true);

    setTimeout(() => {
      setShowSimpleToast(false);
      setHasFlown(true);
    }, 2800);
  };

  if (hasFlown && !showSimpleToast) return null;

  return (
    <>
      {/* 🛸 2초 빠르기로 우측에서 좌측으로 날아가는 MMU 우주선 */}
      {!hasFlown && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
          <motion.div
            initial={{
              x: '115vw',
              y: '32vh',
              scale: 0.88,
              rotate: -3,
              opacity: 0.95,
            }}
            animate={
              isHit
                ? {
                    x: '-40vw',
                    y: '18vh',
                    scale: 1.15,
                    rotate: -15,
                    opacity: 0,
                    transition: { duration: 0.5, ease: 'easeIn' },
                  }
                : {
                    x: '-140vw',
                    y: '48vh',
                    scale: 0.96,
                    rotate: 3,
                    opacity: 1,
                    transition: { duration: 2.1, ease: 'linear' },
                  }
            }
            onClick={handleClick}
            className="absolute cursor-pointer pointer-events-auto filter drop-shadow-[0_12px_28px_rgba(6,182,212,0.65)] group"
          >
            {/* 엔진 플라즈마 분사광 */}
            <div className="absolute top-1/2 -right-8 w-28 h-10 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-pink-500 blur-md rounded-full pointer-events-none opacity-85" />

            <img
              src="/card-pack-image/MMU-N.png"
              alt="Flying MMU Spaceship"
              className="w-56 sm:w-72 md:w-88 h-auto object-contain transition-transform hover:scale-105"
              draggable={false}
            />

            {/* 타겟 링 오라 */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 border-dashed animate-spin opacity-35 pointer-events-none" />
          </motion.div>
        </div>
      )}

      {/* 🎉 심플한 이스터에그 획득 팝업 뱃지 */}
      <AnimatePresence>
        {showSimpleToast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="bg-black/95 border-2 border-amber-400 px-7 py-4 rounded-2xl shadow-2xl shadow-amber-500/40 backdrop-blur-2xl text-center flex flex-col items-center gap-1.5 pointer-events-auto"
            >
              <div className="flex items-center gap-1.5 text-amber-300 font-mono font-black text-xs uppercase tracking-widest">
                <Sparkles size={14} className="text-yellow-300 animate-spin" />
                <span>이스터에그</span>
              </div>
              <span className="font-mono font-black text-lg sm:text-2xl text-white drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
                500,000 N COIN 획득.
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
