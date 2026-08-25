import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiplayerService } from '../../services/multiplayerService';
import { GlobalPullFeedItem } from '../../types/multiplayer';
import { Sparkles, Megaphone } from 'lucide-react';

export const GlobalTicker: React.FC = () => {
  const [feedItems, setFeedItems] = useState<GlobalPullFeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = MultiplayerService.subscribeGlobalFeed((items) => {
      if (items && items.length > 0) {
        setFeedItems(items);
      }
    });

    return () => unsubscribe();
  }, []);

  // 4초마다 다음 알림으로 부드럽게 롤링 전환
  useEffect(() => {
    if (feedItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % feedItems.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [feedItems.length]);

  if (feedItems.length === 0) return null;

  const currentItem = feedItems[currentIndex] || feedItems[0];
  const rarityColors: Record<string, string> = {
    SSR: 'from-amber-400 to-yellow-500 text-amber-300 border-amber-500/40',
    UR: 'from-purple-400 to-pink-500 text-pink-300 border-pink-500/40',
    LR: 'from-cyan-400 to-blue-500 text-cyan-300 border-cyan-500/40',
    MR: 'from-rose-400 via-purple-400 to-amber-300 text-rose-300 border-rose-500/50',
    XR: 'from-yellow-300 via-pink-400 to-purple-500 text-amber-200 border-amber-300/80',
  };

  const badgeStyle = rarityColors[currentItem.rarity] || 'from-purple-400 to-pink-400 text-purple-300 border-purple-500/40';

  return (
    <div className="w-full bg-void-950/90 border-b border-purple-500/20 backdrop-blur-md px-3 py-1 flex items-center justify-center overflow-hidden z-20 select-none transform-gpu">
      <div className="max-w-4xl w-full flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-shrink-0 text-pink-400 font-mono font-bold text-[11px]">
          <Megaphone size={13} className="animate-pulse text-pink-400" />
          <span className="hidden sm:inline">실시간 전광판</span>
        </div>

        <div className="flex-1 overflow-hidden relative h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id || currentIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex items-center gap-2 font-sans truncate text-[11px] sm:text-xs text-slate-200"
            >
              <span className="font-bold text-slate-300 truncate max-w-[100px] sm:max-w-[150px]">
                🎉 <span className="text-white font-extrabold">{currentItem.userName}</span> 님
              </span>

              <span className="text-slate-400 text-[10px]">획득:</span>

              <span
                className={`px-1.5 py-0.2 rounded border bg-black/40 text-[10px] font-black font-mono tracking-wider ${badgeStyle}`}
              >
                [{currentItem.rarity}]
              </span>

              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-amber-200 truncate max-w-[140px] sm:max-w-[220px]">
                {currentItem.cardName}
              </span>

              <Sparkles size={11} className="text-amber-400 flex-shrink-0" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-[10px] font-mono text-slate-500 hidden md:inline flex-shrink-0">
          LIVE FEED
        </div>
      </div>
    </div>
  );
};
