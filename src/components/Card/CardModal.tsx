import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../types/card';
import { CardVisual } from './CardVisual';
import { RARITY_CONFIGS } from '../../config/gameConfig';
import { X } from 'lucide-react';

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
  if (!card) return null;

  const config = RARITY_CONFIGS[card.rarity];
  const isOwned = count > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-2xl bg-void-900 border border-void-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 items-center"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Left: Card Visual */}
            <div className="flex-shrink-0 flex justify-center">
              <CardVisual
                card={card}
                isOwned={isOwned}
                count={count}
                size="lg"
              />
            </div>

            {/* Right: Card Info & Actions */}
            <div className="flex-1 flex flex-col justify-between self-stretch">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    #{String(card.collectionNumber).padStart(3, '0')}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeBg}`}
                  >
                    {card.rarity}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {card.theme}
                  </span>
                </div>

                <h2 className="text-2xl font-serif font-bold text-slate-100 mb-3">
                  {card.name}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed mb-4 bg-void-950/60 p-3.5 rounded-xl border border-white/5">
                  {card.description}
                </p>

                {card.quote && (
                  <p className="text-xs italic text-amber-300/90 font-serif mb-4 border-l-2 border-amber-400/40 pl-3 py-0.5">
                    {card.quote}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mb-6">
                  <div>
                    보유 수량:{' '}
                    <span className="text-white font-bold text-sm">x{count}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex pt-4 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-void-800 hover:bg-void-700 text-slate-200 border border-white/10 transition-all shadow-md"
                >
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
