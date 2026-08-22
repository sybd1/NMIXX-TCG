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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 25 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-void-900 to-black border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col md:flex-row gap-6 items-center"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-void-950/80 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 z-20 cursor-pointer hover:scale-110"
              title="닫기"
            >
              <X size={18} />
            </button>

            {/* Left: Card Visual (대형 고화질 카드) */}
            <div className="flex-shrink-0 flex justify-center py-2">
              <div className="transform hover:scale-105 transition-transform duration-300">
                <CardVisual
                  card={card}
                  finishType={activeFinish}
                  isOwned={isOwned}
                  count={count}
                  size="md"
                  className="w-56 sm:w-64 h-80 sm:h-96"
                />
              </div>
            </div>

            {/* Right: Card Info & Actions */}
            <div className="flex-1 flex flex-col justify-between self-stretch gap-4">
              <div>
                {/* 상단 뱃지 라인 */}
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="font-mono text-xs font-black text-amber-300 bg-black/60 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    NO. #{String(card.collectionNumber).padStart(3, '0')}
                  </span>
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-sm ${config.badgeBg}`}
                  >
                    {card.rarity}
                  </span>
                  <span className="text-xs text-pink-300 font-mono font-bold bg-pink-950/60 px-2.5 py-0.5 rounded-lg border border-pink-500/30">
                    {card.member === 'PARK' ? '박진영' : (card.member === 'NMIXX' ? '단체' : card.member)}
                  </span>
                  {/* 8-Tier Finish 뱃지 */}
                  <span className="text-[10.5px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                    <Sparkle size={11} className="text-yellow-400" />
                    {finishConf?.nameKo || activeFinish}
                  </span>
                  {/* 엔믹스 시그니처 멜로디 재생 버튼 */}
                  {isHighTier && isOwned && (
                    <button
                      onClick={() => sound.playNmixxMelody(card.rarity)}
                      className="text-[10.5px] font-mono font-black text-amber-300 bg-amber-950/90 hover:bg-amber-900 border border-amber-400/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm transition-all hover:scale-105 cursor-pointer"
                      title="엔믹스 시그니처 멜로디 재생"
                    >
                      <Volume2 size={12} className="animate-pulse text-amber-400" />
                      <span>🎵 멜로디</span>
                    </button>
                  )}
                  {/* 소속 부스터 팩 뱃지 */}
                  {card.packCode && (
                    <span className="text-[10.5px] font-mono font-black text-sky-200 bg-sky-950/80 border border-sky-400/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                      📦 {card.packCode} {card.packName ? `(${card.packName})` : ''}
                    </span>
                  )}
                </div>

                {/* 카드 타이틀 */}
                <h2 className="text-xl sm:text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-100 to-amber-200 mb-3">
                  {card.name}
                </h2>

                {/* 카드 정보 그리드 (NO, MEMBER, ERA) */}
                <div className="grid grid-cols-3 gap-2 mb-3.5">
                  <div className="bg-void-950/80 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                    <span className="text-[9.5px] font-mono text-slate-400">NO.</span>
                    <span className="font-mono font-black text-sm text-amber-300">#{String(card.collectionNumber).padStart(3, '0')}</span>
                  </div>
                  <div className="bg-void-950/80 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                    <span className="text-[9.5px] font-mono text-slate-400">MEMBER</span>
                    <span className="font-mono font-black text-sm text-pink-300 truncate max-w-[80px]">
                      {card.member === 'PARK' ? '박진영' : (card.member === 'NMIXX' ? '단체' : card.member)}
                    </span>
                  </div>
                  <div className="bg-void-950/80 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                    <span className="text-[9.5px] font-mono text-slate-400">ERA</span>
                    <span className="font-mono font-bold text-xs text-purple-300 truncate max-w-[80px]">{card.era}</span>
                  </div>
                </div>

                {/* 출현 팩 안내 배너 */}
                <div className="bg-void-950/90 px-3 py-2 rounded-xl border border-sky-500/20 mb-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    📦 출현 카드팩
                  </span>
                  <span className="text-sky-300 font-bold">
                    {card.packCode || 'OP-01'} {card.packName || '1탄 계승되는 의지'}
                  </span>
                </div>

                {/* 설명 & 명대사 */}
                <div className="bg-void-950/70 p-3.5 rounded-2xl border border-white/10 mb-3 flex flex-col gap-2">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {card.description}
                  </p>
                  {card.quote && (
                    <p className="text-[11px] italic text-pink-300/90 font-serif border-l-2 border-pink-400/50 pl-2 py-0.5">
                      "{card.quote}"
                    </p>
                  )}
                </div>

                {/* 보유 수량 안내 */}
                <div className="flex items-center justify-between text-xs font-mono px-3 py-2 bg-void-950/90 rounded-xl border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <Layers size={14} className="text-pink-400" /> 보유 상태
                  </span>
                  {isOwned ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles size={13} /> 소장 중 (x{count}장 보유)
                    </span>
                  ) : (
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <Shield size={13} /> 미보유 (LOCKED)
                    </span>
                  )}
                </div>
              </div>

              {/* 닫기 버튼 */}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-2xl font-serif font-black text-xs sm:text-sm bg-void-800 hover:bg-void-700 text-slate-200 border border-white/15 transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
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
