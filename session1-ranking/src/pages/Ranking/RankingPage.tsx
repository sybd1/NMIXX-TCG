import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../../types/multiplayer';
import { MultiplayerService } from '../../services/multiplayerService';
import { Trophy, Sparkles, User, RefreshCw, Flame, Share2 } from 'lucide-react';
import { ShareBadgeModal } from '../../components/Share/ShareBadgeModal';
import { AuthService } from '../../services/authService';
import { MASTER_CARDS } from '../../data/cards';

interface RankingPageProps {
  currentUserId?: string;
  collection?: Record<string, number>;
}

export const RankingPage: React.FC<RankingPageProps> = ({ currentUserId, collection = {} }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    const list = await MultiplayerService.fetchLeaderboard(50, currentUserId);
    setEntries(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();
  }, [currentUserId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const list = await MultiplayerService.fetchLeaderboard(50, currentUserId);
    setEntries(list);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const topRanker = entries.length > 0 ? entries[0] : null;
  const currentUser = AuthService.getCurrentUser();

  // 내 랭킹 엔트리
  const myEntry = entries.find(e => e.uid === currentUserId) || null;
  const myRank = myEntry?.rank || null;

  // 보유 카드 중 최고 등급 3장 (XR > LR > MR > UR > SSR > SR > R)
  const RARITY_ORDER = ['XR', 'LR', 'MR', 'UR', 'SSR', 'SR', 'R'];
  const topCards = MASTER_CARDS
    .filter(c => (collection[c.id] || 0) > 0)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))
    .slice(0, 3)
    .map(c => ({ id: c.id, image: c.image || '', rarity: c.rarity, name: c.name }));

  const myUniqueCount = myEntry?.uniqueCardCount ?? Object.values(collection).filter(v => v > 0).length;
  const myCollectionRate = myEntry?.collectionRate ?? Math.round((myUniqueCount / 521) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 flex flex-col gap-6 select-text">
      {/* 🏆 상단 헤더 배너 */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shadow-md">
          <Trophy size={14} className="text-amber-400" />
          <span>GLOBAL HALL OF FAME</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-amber-300">
          글로벌 수집가 랭킹 (Top 50)
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md font-sans">
          소셜 계정 연동을 완료한 엔써(NSWER)들의 실시간 카드 도감 수집률 순위입니다.
        </p>

        {/* 새로고침 & 공유 버튼 */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-void-900 hover:bg-void-800 border border-white/10 text-slate-300 text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-pink-400' : 'text-slate-400'} />
            <span>{isRefreshing ? '데이터 갱신 중...' : '실시간 순위 새로고침'}</span>
          </button>

          {/* 🔗 내 배지 공유 버튼 */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-900/60 to-purple-900/60 hover:from-pink-800/70 hover:to-purple-800/70 border border-pink-500/40 text-pink-300 text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          >
            <Share2 size={13} className="text-pink-400" />
            <span>내 배지 공유</span>
          </button>
        </div>
      </div>

      {/* 👑 1위 독점 하이라이트 쇼케이스 카드 */}
      {topRanker && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full relative rounded-3xl bg-gradient-to-r from-amber-950/60 via-void-900 to-purple-950/60 border-2 border-amber-500/50 p-5 sm:p-7 shadow-2xl shadow-amber-950/40 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trophy size={120} className="text-amber-300" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/30 overflow-hidden flex items-center justify-center bg-black">
                  {topRanker.avatarUrl ? (
                    <img src={topRanker.avatarUrl} alt={topRanker.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-amber-400" />
                  )}
                </div>
                <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-sm flex items-center justify-center shadow-lg border border-black">
                  🥇
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    전 세계 1위
                  </span>
                  {currentUserId && topRanker.uid === currentUserId && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-pink-500/30 text-pink-300 border border-pink-400">
                      나
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-black text-lg sm:text-2xl text-white mt-0.5">
                  {topRanker.displayName}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  누적 개봉: <span className="text-amber-200 font-bold">{topRanker.totalPacksOpened?.toLocaleString() || 0}</span>팩
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end items-center text-center sm:text-right">
              <div className="flex items-baseline gap-1.5">
                <Flame size={18} className="text-amber-400" />
                <span className="font-serif font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400">
                  {topRanker.collectionRate || 0}%
                </span>
              </div>
              <span className="text-xs font-mono text-slate-300 font-bold mt-0.5">
                도감 보유: <span className="text-pink-300 font-black">{topRanker.uniqueCardCount || 0}</span> / 521장
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 📋 전체 랭킹 목록 */}
      <div className="w-full flex flex-col gap-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 font-mono text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span>실시간 랭킹 데이터를 집계하고 있습니다...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 font-mono text-xs gap-3">
            <Sparkles size={32} className="text-amber-500/50" />
            <span>아직 등록된 랭커가 없습니다. 소셜 로그인 후 최초의 주인공이 되어보세요!</span>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const rank = entry.rank || idx + 1;
            const isCurrentUser = currentUserId && entry.uid === currentUserId;

            const rankBadge =
              rank === 1
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black shadow-lg shadow-amber-500/40 text-sm'
                : rank === 2
                ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-black font-black shadow-md text-sm'
                : rank === 3
                ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white font-bold shadow-md text-sm'
                : 'bg-void-900 text-slate-400 border border-white/10 font-bold text-xs';

            return (
              <motion.div
                key={entry.uid || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-purple-950/70 via-void-900 to-pink-950/70 border-pink-500/70 shadow-xl shadow-pink-950/40 scale-[1.01]'
                    : 'bg-void-950/80 border-white/10 hover:border-amber-500/40 hover:bg-void-900/60'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* 순위 */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono flex-shrink-0 ${rankBadge}`}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </div>

                  {/* 아바타 */}
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-purple-400/40 flex-shrink-0 bg-black">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <User size={20} />
                      </div>
                    )}
                  </div>

                  {/* 닉네임 & 상세 */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-serif font-black text-sm sm:text-base text-slate-100 truncate">
                        {entry.displayName}
                      </span>
                      {isCurrentUser && (
                        <span className="px-2 py-0.2 rounded-full bg-pink-500/30 border border-pink-400 text-pink-300 text-[10px] font-mono font-bold">
                          나
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      개봉 팩: <span className="text-slate-200 font-bold">{entry.totalPacksOpened?.toLocaleString() || 0}</span>회
                    </span>
                  </div>
                </div>

                {/* 수집률 & 카드 수 */}
                <div className="flex flex-col items-end flex-shrink-0 pl-2 gap-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-serif font-black text-amber-300">
                      {entry.collectionRate || 0}%
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    <span className="text-pink-300 font-bold">{entry.uniqueCardCount || 0}</span> / 521장
                  </span>
                  {/* 내 항목에만 공유 버튼 표시 */}
                  {isCurrentUser && (
                    <button
                      onClick={() => setIsShareOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/35 border border-pink-500/40 text-pink-300 text-[10px] font-mono font-bold transition-all hover:scale-105 cursor-pointer"
                    >
                      <Share2 size={10} />
                      공유
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* 🔗 공유 배지 모달 */}
      <ShareBadgeModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        user={currentUser}
        rank={myRank}
        totalRankers={entries.length}
        uniqueCardCount={myUniqueCount}
        collectionRate={myCollectionRate}
        topCards={topCards}
      />
    </div>
  );
};
