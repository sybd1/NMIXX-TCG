import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Achievement, AchievementCategory, ACHIEVEMENTS } from '../../data/achievements';
import { MASTER_CARDS, getCardsByRarity } from '../../data/cards';
import { GameState } from '../../types/game';
import { sound } from '../../services/soundService';
import { Trophy, CheckCircle2, Gift, Lock } from 'lucide-react';

interface AchievementsPageProps {
  state: GameState;
  onClaimReward: (achievementId: string, rewardCoins: number) => void;
}

export const AchievementsPage: React.FC<AchievementsPageProps> = ({
  state,
  onClaimReward,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL');

  const collection = state.collection || {};
  const openedPacks = state.openedPacksTotal || 0;
  const coinsSpent = state.coinsSpentTotal || (openedPacks * 100);
  const claimedList = state.claimedAchievements || [];

  // 각 업적의 현재 진행 수치 및 목표 수치 계산
  const getAchievementProgress = (ach: Achievement): { current: number; target: number; percentage: number; isCompleted: boolean } => {
    let current = 0;
    let target = ach.targetValue;

    if (ach.type === 'PACK_COUNT') {
      current = openedPacks;
    } else if (ach.type === 'PACK_SET' && ach.targetPackId) {
      const packCards = MASTER_CARDS.filter(c => c.packId === ach.targetPackId);
      target = packCards.length;
      current = packCards.filter(c => (collection[c.id] || 0) > 0).length;
    } else if (ach.type === 'RARITY_SET' && ach.targetRarity) {
      if (ach.targetRarity === 'XR') {
        const xrCard = MASTER_CARDS.find(c => c.rarity === 'XR');
        target = 1;
        current = xrCard && (collection[xrCard.id] || 0) > 0 ? 1 : 0;
      } else {
        const rarityCards = getCardsByRarity(ach.targetRarity);
        target = rarityCards.length;
        current = rarityCards.filter(c => (collection[c.id] || 0) > 0).length;
      }
    } else if (ach.type === 'COIN_SPENT') {
      current = coinsSpent;
    }

    const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0;
    const isCompleted = current >= target;

    return { current, target, percentage, isCompleted };
  };

  // 카테고리 필터링
  const filteredAchievements = ACHIEVEMENTS.filter(ach => {
    if (selectedCategory === 'ALL') return true;
    return ach.category === selectedCategory;
  });

  // 전체 업적 달성 통계
  const completedTotalCount = ACHIEVEMENTS.filter(ach => getAchievementProgress(ach).isCompleted).length;
  const overallPercentage = Math.round((completedTotalCount / ACHIEVEMENTS.length) * 100);

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6 select-text">
      {/* 1. Header & Overall Stats Banner */}
      <div className="bg-gradient-to-r from-void-900 via-void-950 to-void-900 border border-amber-500/40 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black flex items-center justify-center font-black shadow-xl shadow-amber-950/60 flex-shrink-0 animate-pulse">
            <Trophy size={30} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300">
              NMIXX ACHIEVEMENTS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-sans">
              카드팩 개봉, 팩 전종 수집, 레어도 정복 및 소비 업적을 달성하고 대량의 골드 보상을 획득하세요!
            </p>
          </div>
        </div>

        {/* 전체 달성률 인디케이터 */}
        <div className="w-full md:w-auto min-w-[240px] bg-black/70 p-4 rounded-2xl border border-amber-500/30 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-bold">업적 달성률</span>
            <span className="text-amber-300 font-black text-sm">
              {completedTotalCount} / {ACHIEVEMENTS.length} ({overallPercentage}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-black/90 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Category Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-void-950/80 p-2 rounded-2xl border border-white/10 shadow-lg">
        {[
          { id: 'ALL', label: '🏆 전체 업적', count: ACHIEVEMENTS.length },
          { id: 'PACKS', label: '📦 팩 개봉', count: ACHIEVEMENTS.filter(a => a.category === 'PACKS').length },
          { id: 'PACK_SETS', label: '🏴‍☠️ 팩 전종 수집', count: ACHIEVEMENTS.filter(a => a.category === 'PACK_SETS').length },
          { id: 'RARITY', label: '👑 레어도 정복', count: ACHIEVEMENTS.filter(a => a.category === 'RARITY').length },
          { id: 'SPENDING', label: '🪙 머니 소비', count: ACHIEVEMENTS.filter(a => a.category === 'SPENDING').length },
        ].map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                sound.playClick();
                setSelectedCategory(cat.id as AchievementCategory | 'ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white shadow-lg shadow-pink-950/60 scale-105 border border-white/30'
                  : 'text-slate-400 hover:text-white bg-void-900/90 border border-white/5 hover:bg-void-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-80">({cat.count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Steam Style Compact Achievements List */}
      <div className="flex flex-col gap-2">
        {filteredAchievements.map(ach => {
          const { current, target, percentage, isCompleted } = getAchievementProgress(ach);
          const isClaimed = claimedList.includes(ach.id);

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-950/40 via-void-900/90 to-void-950 border-emerald-500/40 shadow-emerald-950/20'
                  : 'bg-void-950/80 border-void-800/80 hover:border-white/20 hover:bg-void-900/60'
              }`}
            >
              {/* 좌측: 스팀 스타일 정사각 엠블렘 & 메인 퀘스트 텍스트 */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {/* 스팀 스타일 스퀘어 엠블렘 박스 */}
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border shadow-inner ${
                    isCompleted
                      ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border-emerald-400/60 shadow-emerald-950/40'
                      : 'bg-black/60 border-white/10 opacity-70 grayscale-[30%]'
                  }`}
                >
                  {ach.icon}
                </div>

                {/* 퀘스트 텍스트 & 설명 (스팀 계층 구조) */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-black text-sm sm:text-[15px] text-white truncate tracking-tight">
                      {ach.title}
                    </h3>
                    <span className="text-[10px] font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                      <span>🪙</span>
                      <span>+{ach.rewardCoins.toLocaleString()}</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans truncate">
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* 중앙-우측: 스팀 스타일 슬림 진척도 바 & 수치 */}
              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                {/* 인라인 진척도 수치 & 슬림 바 */}
                <div className="flex flex-col gap-1 w-32 sm:w-40 lg:w-48">
                  <div className="flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-slate-400 font-bold">진행도</span>
                    <span className="font-bold">
                      <strong className="text-pink-300">{current.toLocaleString()}</strong>
                      <span className="text-slate-500"> / </span>
                      <span className="text-slate-300">{target.toLocaleString()}</span>
                    </span>
                  </div>
                  {/* 슬림 게이지 바 */}
                  <div className="w-full h-1.5 bg-black/90 rounded-full overflow-hidden border border-white/10 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : 'bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                {/* 스팀 스타일 퍼센트 뱃지 */}
                <span
                  className={`px-2.5 py-1 rounded-xl font-mono text-xs sm:text-sm font-black border flex items-center justify-center min-w-[55px] sm:min-w-[62px] ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                      : 'bg-black/50 text-amber-300 border-white/10'
                  }`}
                >
                  {isCompleted ? '100%' : `${percentage}%`}
                </span>

                {/* 보상 수령 버튼 / 완료 뱃지 */}
                {isCompleted ? (
                  isClaimed ? (
                    <div className="px-3 py-1.5 rounded-xl bg-void-950 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span className="hidden sm:inline">완료</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onClaimReward(ach.id, ach.rewardCoins)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-mono font-black text-xs shadow-md shadow-rose-950/60 flex items-center gap-1 hover:scale-105 transition-all cursor-pointer border border-white/30 animate-pulse"
                    >
                      <Gift size={13} className="text-yellow-200" />
                      <span>수령</span>
                    </button>
                  )
                ) : (
                  <div className="px-2.5 py-1.5 rounded-xl bg-black/40 text-slate-500 font-mono font-bold text-[11px] border border-white/5 flex items-center gap-1">
                    <Lock size={11} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
