import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../types/card';
import { CardVisual } from './CardVisual';
import { RARITY_CONFIGS, FINISH_CONFIGS, RARITY_TO_FINISH } from '../../config/gameConfig';
import { sound } from '../../services/soundService';
import { X, Sparkles, Layers, Shield, Sparkle, Volume2 } from 'lucide-react';

interface CardModalProps {
  card: Card | null;
  count: number;
  isOpen: boolean;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  count,
  isOpen,
  onClose,
}) => {
  const isHighTier = card ? ['SR', 'SSR', 'UR', 'LR', 'MR'].includes(card.rarity) : false;
  const isOwned = count > 0;

  useEffect(() => {
    if (isOpen && card && isOwned && isHighTier) {
      sound.playNmixxMelody(card.rarity);
    }
  }, [isOpen, card, isOwned, isHighTier]);

  if (!card) return null;

  const config = RARITY_CONFIGS[card.rarity];
  const activeFinish = card.finishType || RARITY_TO_FINISH[card.rarity] || 'MATTE';
  const finishConf = FINISH_CONFIGS[activeFinish];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-text">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Box (1.3배 이상 대형 확장 & 시원한 가독성) */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 25 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-4xl lg:max-w-5xl max-h-[94vh] overflow-y-auto bg-gradient-to-b from-void-900 via-void-950 to-black border-2 border-white/20 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col md:flex-row gap-7 lg:gap-10 items-center"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-void-950/90 hover:bg-white/15 text-slate-300 hover:text-white transition-all border border-white/20 z-20 cursor-pointer hover:scale-110 shadow-lg"
              title="닫기"
            >
              <X size={22} />
            </button>

            {/* Left: Card Visual (1.3배 이상 대형 고화질 3D 카드) */}
            <div className="flex-shrink-0 flex justify-center py-2">
              <div className="transform hover:scale-105 transition-transform duration-300">
                <CardVisual
                  card={card}
                  finishType={activeFinish}
                  isOwned={isOwned}
                  count={count}
                  size="lg"
                  className="w-64 sm:w-76 lg:w-[330px] h-[380px] sm:h-[460px] lg:h-[490px]"
                />
              </div>
            </div>

            {/* Right: Card Info & Actions (1.3배 대형 폰트 & 뛰어난 가독성) */}
            <div className="flex-1 flex flex-col justify-between self-stretch gap-4 sm:gap-5">
              <div>
                {/* 상단 뱃지 라인 */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-3.5">
                  <span className="font-mono text-xs sm:text-sm font-black text-amber-300 bg-black/70 px-3 py-1 rounded-xl border border-amber-500/40 shadow-sm">
                    NO. #{String(card.collectionNumber).padStart(3, '0')}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-xl border shadow-md ${config.badgeBg}`}
                  >
                    {card.rarity}
                  </span>
                  <span className="text-xs sm:text-sm text-pink-200 font-mono font-black bg-pink-950/80 px-3 py-1 rounded-xl border border-pink-500/40 shadow-sm">
                    {card.theme?.includes('심볼') || card.theme?.includes('로고')
                      ? '⚓ 공식 심볼'
                      : (card.member === 'PARK' ? '👑 박진영' : (card.member === 'NMIXX' ? '✨ 단체' : card.member))}
                  </span>
                  {/* 8-Tier Finish 뱃지 */}
                  <span className="text-xs sm:text-sm font-mono font-black text-amber-200 bg-amber-950/80 border border-amber-500/50 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Sparkle size={13} className="text-yellow-400" />
                    {finishConf?.nameKo || activeFinish}
                  </span>
                  {/* 엔믹스 시그니처 멜로디 재생 버튼 */}
                  {isHighTier && isOwned && (
                    <button
                      onClick={() => sound.playNmixxMelody(card.rarity)}
                      className="text-xs sm:text-sm font-mono font-black text-amber-200 bg-gradient-to-r from-amber-900 via-pink-900 to-purple-900 hover:from-amber-800 hover:to-purple-800 border border-amber-400/60 px-3.5 py-1 rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-105 cursor-pointer"
                      title="엔믹스 시그니처 멜로디 재생"
                    >
                      <Volume2 size={15} className="animate-pulse text-amber-300" />
                      <span>🎵 멜로디 듣기</span>
                    </button>
                  )}
                </div>

                {/* 카드 타이틀 (크고 웅장한 폰트) */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-100 to-amber-200 mb-4 leading-tight">
                  {card.name}
                </h2>

                {/* 카드 정보 그리드 (NO, MEMBER, ERA) */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
                  <div className="bg-void-950/90 p-2.5 sm:p-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-inner">
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400">NO.</span>
                    <span className="font-mono font-black text-base sm:text-lg text-amber-300">
                      #{String(card.collectionNumber).padStart(3, '0')}
                    </span>
                  </div>
                  <div className="bg-void-950/90 p-2.5 sm:p-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-inner">
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400">
                      {card.theme?.includes('심볼') || card.theme?.includes('로고') ? 'TYPE' : 'MEMBER'}
                    </span>
                    <span className="font-mono font-black text-base sm:text-lg text-pink-300 truncate max-w-[120px]">
                      {card.theme?.includes('심볼') || card.theme?.includes('로고')
                        ? '엠블렘'
                        : (card.member === 'PARK' ? '박진영' : (card.member === 'NMIXX' ? '단체' : card.member))}
                    </span>
                  </div>
                  <div className="bg-void-950/90 p-2.5 sm:p-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-inner">
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400">ERA</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-purple-300 truncate max-w-[120px]">
                      {card.era}
                    </span>
                  </div>
                </div>

                {/* 출현 팩 안내 배너 */}
                <div className="bg-void-950/90 px-4 py-2.5 rounded-2xl border border-sky-500/30 mb-4 flex items-center justify-between text-xs sm:text-sm font-mono shadow-inner">
                  <span className="text-slate-300 flex items-center gap-2 font-bold">
                    {card.rarity === 'XR' ? '👑 획득 경로' : '📦 출현 카드팩'}
                  </span>
                  <span className="text-xs font-mono font-bold text-pink-300">
                    [{card.packCode || 'NX-01'}] {card.packName || '1탄 계승되는 의지'}
                  </span>
                </div>

                {/* 설명 & 명대사 (글자가 시원시원하게 잘 읽히는 대형 폰트) */}
                <div className="bg-void-950/80 p-4 sm:p-5 rounded-2xl border border-white/15 mb-4 flex flex-col gap-2.5 shadow-inner">
                  <p className="text-sm sm:text-base font-sans font-medium text-slate-100 leading-relaxed">
                    {card.description}
                  </p>
                  {card.quote && (
                    <p className="text-xs sm:text-sm italic text-pink-300 font-serif border-l-4 border-pink-500 pl-3 py-1 font-semibold leading-normal">
                      "{card.quote}"
                    </p>
                  )}
                </div>

                {/* 보유 수량 안내 */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono px-4 py-3 bg-void-950/90 rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-slate-300 flex items-center gap-2 font-bold">
                    <Layers size={16} className="text-pink-400" /> 보유 상태
                  </span>
                  {isOwned ? (
                    <span className="text-emerald-300 font-black flex items-center gap-1.5 text-xs sm:text-sm">
                      <Sparkles size={15} className="text-emerald-400" /> 소장 중 (x{count}장 보유)
                    </span>
                  ) : (
                    <span className="text-slate-500 font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                      <Shield size={15} /> 미보유 (LOCKED)
                    </span>
                  )}
                </div>
              </div>

              {/* 닫기 버튼 */}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-2xl font-serif font-black text-sm sm:text-base bg-gradient-to-r from-void-800 to-void-700 hover:from-void-700 hover:to-void-600 text-white border border-white/20 transition-all shadow-xl hover:scale-[1.02] cursor-pointer"
                >
                  닫기 (CLOSE)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
