import React from 'react';
import { ACHIEVEMENT_CATEGORY_META, AchievementCategory } from '../../data/achievements';

const GLOW: Record<AchievementCategory, string> = {
  PACK_SETS: 'shadow-[0_0_10px_rgba(251,191,36,0.85)] border-amber-200/80 bg-gradient-to-br from-amber-400/40 to-yellow-600/30',
  RARITY: 'shadow-[0_0_10px_rgba(244,114,182,0.85)] border-pink-200/80 bg-gradient-to-br from-pink-500/40 to-purple-600/30',
  SPENDING: 'shadow-[0_0_10px_rgba(250,204,21,0.8)] border-yellow-200/80 bg-gradient-to-br from-yellow-300/40 to-amber-600/30',
  PACKS: 'shadow-[0_0_10px_rgba(56,189,248,0.8)] border-sky-200/80 bg-gradient-to-br from-sky-400/40 to-indigo-600/30',
};

interface AchievementBadgesProps {
  badges?: string[];
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ badges }) => {
  if (!badges || badges.length === 0) return null;

  const ordered = ACHIEVEMENT_CATEGORY_META.filter(meta => badges.includes(meta.id));
  if (ordered.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0">
      {ordered.map(meta => (
        <span
          key={meta.id}
          title={`${meta.label} 전부 달성`}
          className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full border text-[12px] sm:text-[13px] leading-none ${GLOW[meta.id]}`}
        >
          {meta.icon}
        </span>
      ))}
    </span>
  );
};
