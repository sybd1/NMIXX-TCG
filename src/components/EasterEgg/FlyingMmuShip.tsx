import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { sound } from '../../services/soundService';

interface FlyingMmuShipProps {
  onClaimCoins: (amount: number) => void;
}

export const FlyingMmuShip: React.FC<FlyingMmuShipProps> = ({ onClaimCoins }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [hasFlown, setHasFlown] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [showSimpleToast, setShowSimpleToast] = useState(false);

  useEffect(() => {
    // 1. 접속 후 3초 뒤에 비행 시작
    const startTimer = setTimeout(() => {
      setIsStarted(true);
    }, 3000);

    // 2. 비행 시작(3초) + 비행 시간(2.5초) + 여유(0.5초) = 6초 후 완전 소멸
    const endTimer = setTimeout(() => {
      setHasFlown(true);
    }, 6000);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHit || hasFlown || !isStarted) return;

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
      {/* 🛸 접속 3초 후 2.5초 빠르기로 화면 정중앙을 수평 횡단하는 MMU 우주선 */}
      {!hasFlown && isStarted && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
          <motion.div
            initial={{
              x: '115vw',
              y: '-50%',
              top: '50%',
              scale: 0.95,
              rotate: 0,
              opacity: 0.95,
            }}
            animate={
              isHit
                ? {
                    x: '-40vw',
                    y: '-65%',
                    top: '50%',
                    scale: 1.1,
                    rotate: -12,
                    opacity: 0,
                    transition: { duration: 0.5, ease: 'easeIn' },
                  }
                : {
                    x: '-135vw',
                    y: '-50%',
                    top: '50%',
                    scale: 1.0,
                    rotate: 0,
                    opacity: 1,
                    transition: { duration: 2.5, ease: 'linear' },
                  }
            }
            onClick={handleClick}
            className="absolute cursor-pointer pointer-events-auto filter drop-shadow-[0_15px_35px_rgba(6,182,212,0.65)] group"
          >
            {/* 엔진 플라즈마 분사광 */}
            <div className="absolute top-1/2 -right-12 w-44 h-16 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-pink-500 blur-lg rounded-full pointer-events-none opacity-90" />

            {/* 정밀 축소된 MMU 우주선 이미지 */}
            <img
              src="/card-pack-image/MMU-N.png"
              alt="Center Flying MMU Spaceship"
              className="w-[320px] sm:w-[480px] md:w-[640px] lg:w-[840px] xl:w-[980px] h-auto object-contain transition-transform hover:scale-[1.03]"
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
