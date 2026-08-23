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

      {/* 3. Achievements List */}
      <div className="flex flex-col gap-3.5">
        {filteredAchievements.map(ach => {
          const { current, target, percentage, isCompleted } = getAchievementProgress(ach);
          const isClaimed = claimedList.includes(ach.id);

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 shadow-xl ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-950/40 via-void-900/90 to-void-950 border-emerald-500/50 shadow-emerald-950/30'
                  : 'bg-void-900/80 border-void-800/90 hover:border-white/20'
              }`}
            >
              {/* 좌측: 아이콘 및 기본 정보 */}
              <div className="flex items-center gap-4 min-w-[260px] flex-1">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                    isCompleted
                      ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border-emerald-400/60 shadow-lg shadow-emerald-950/50'
                      : 'bg-black/60 border-white/10 text-slate-400'
                  }`}
                >
                  {ach.icon}
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-black text-sm sm:text-base text-slate-100">
                      {ach.title}
                    </h3>
                    <span className="text-[10.5px] font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      🪙 +{ach.rewardCoins.toLocaleString()} COIN
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* 중앙: 진행도 바 & 수치 */}
              <div className="flex flex-col gap-1.5 w-full md:w-64 lg:w-72">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 font-bold">진행도</span>
                  <span className="text-slate-200 font-bold">
                    <strong className="text-pink-300">{current.toLocaleString()}</strong> / {target.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-white/10 relative">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                        : 'bg-gradient-to-r from-pink-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>

              {/* 🌟 우측 끝: 가시성 극대화 퍼센테이지(%) 및 보상 액션 영역 */}
              <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0 border-t md:border-t-0 border-white/10 pt-2.5 md:pt-0">
                {/* 큼직하고 눈에 확 띄는 퍼센트 배지 */}
                <div
                  className={`px-3.5 py-1.5 rounded-2xl font-mono text-sm sm:text-base font-black tracking-tight border shadow-md flex items-center justify-center min-w-[85px] sm:min-w-[95px] ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-emerald-950/60'
                      : 'bg-void-950 text-purple-300 border-purple-500/30'
                  }`}
                >
                  {isCompleted ? '100%' : `${percentage}%`}
                </div>

                {/* 보상 버튼 / 완료 뱃지 */}
                {isCompleted ? (
                  isClaimed ? (
                    <div className="px-4 py-2 rounded-xl bg-void-950 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      <span>수령 완료</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onClaimReward(ach.id, ach.rewardCoins)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-mono font-black text-xs shadow-lg shadow-rose-950/60 flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer border border-white/40 animate-bounce"
                    >
                      <Gift size={15} className="text-yellow-200" />
                      <span>보상 받기</span>
                    </button>
                  )
                ) : (
                  <div className="px-3.5 py-2 rounded-xl bg-black/50 text-slate-500 font-mono font-bold text-xs border border-white/5 flex items-center gap-1.5">
                    <Lock size={13} />
                    <span>진행 중</span>
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
