import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../../types/multiplayer';
import { MultiplayerService } from '../../services/multiplayerService';
import { Trophy, X, Sparkles, User } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      MultiplayerService.fetchLeaderboard(50).then((list) => {
        // 게스트 제외, 실제 연동 계정만 랭킹 표출
        const validList = list.filter((e) => e.uid && e.uid !== 'guest');
        setEntries(validList);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl select-text">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="relative w-full max-w-2xl bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-amber-500/40 p-5 sm:p-7 rounded-3xl shadow-2xl shadow-amber-950/60 flex flex-col gap-4 max-h-[90vh] overflow-hidden"
      >
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-void-800 hover:bg-void-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
        >
          <X size={18} />
        </button>

        {/* 헤더 타이틀 */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-lg shadow-amber-500/30">
              <Trophy size={20} className="text-black fill-black" />
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-amber-300">
              글로벌 수집가 랭킹 (Top 50)
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            소셜 계정 연동을 완료한 엔써(NSWER)들의 실시간 카드 도감 수집률 순위입니다.
          </p>
        </div>

        {/* 랭킹 목록 */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span>실시간 랭킹 데이터 집계 중...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 font-mono text-xs gap-2">
              <Sparkles size={24} className="text-amber-500/50" />
              <span>아직 등록된 랭커가 없습니다. 소셜 로그인 후 최초의 주인공이 되어보세요!</span>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = entry.rank || idx + 1;
              const isCurrentUser = currentUserId && entry.uid === currentUserId;

              // 1, 2, 3위 메달 뱃지 스타일
              const rankBadge =
                rank === 1
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black shadow-lg shadow-amber-500/40'
                  : rank === 2
                  ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-black font-black shadow-md'
                  : rank === 3
                  ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white font-bold shadow-md'
                  : 'bg-void-950 text-slate-400 border border-white/10 font-bold';

              return (
                <div
                  key={entry.uid || idx}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-purple-950/60 border-pink-500/60 shadow-lg shadow-pink-950/40'
                      : 'bg-void-950/60 border-white/10 hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 순위 번호 */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-mono flex-shrink-0 ${rankBadge}`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>

                    {/* 아바타 */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-400/40 flex-shrink-0 bg-black">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <User size={18} />
                        </div>
                      )}
                    </div>

                    {/* 닉네임 */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded bg-pink-500/30 border border-pink-400 text-pink-300 text-[10px] font-mono font-bold">
                            나
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        개봉 팩: <span className="text-slate-300 font-bold">{entry.totalPacksOpened?.toLocaleString() || 0}</span>회
                      </span>
                    </div>
                  </div>

                  {/* 수집률 및 보유 카드 수 */}
                  <div className="flex flex-col items-end flex-shrink-0 pl-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm sm:text-base font-serif font-black text-amber-300">
                        {entry.collectionRate || 0}%
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                      <span className="text-pink-300 font-bold">{entry.uniqueCardCount || 0}</span> / 651장
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
