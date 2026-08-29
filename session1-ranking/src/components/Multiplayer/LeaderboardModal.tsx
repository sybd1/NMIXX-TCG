import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../../types/multiplayer';
import { MultiplayerService } from '../../services/multiplayerService';
import { Trophy, X, Sparkles, User, ArrowLeft } from 'lucide-react';
import { CardVisual } from '../Card/CardVisual';
import { MASTER_CARDS } from '../../data/cards';
import { Card } from '../../types/card';

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

  // 클릭된 유저 정보 및 카드 컬렉션 상태
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [userCollection, setUserCollection] = useState<Record<string, number>>({});
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      MultiplayerService.fetchLeaderboard(50, currentUserId).then((list) => {
        setEntries(list);
        setIsLoading(false);
      });
    } else {
      setSelectedUser(null);
      setUserCollection({});
    }
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (selectedUser) {
      setIsFetchingUser(true);
      MultiplayerService.fetchUserCollection(selectedUser.uid).then((col) => {
        setUserCollection(col || {});
        setIsFetchingUser(false);
      });
    } else {
      setUserCollection({});
    }
  }, [selectedUser]);

  // 대표 카드 산출: XR 제외, 고등급(MR -> LR -> UR -> SSR -> SR -> R -> UC -> C) 및 전투력(Power) 높은 순 탑 3
  const getTopCards = (collectionMap: Record<string, number>): Card[] => {
    const ownedCards = MASTER_CARDS.filter(c => (collectionMap[c.id] || 0) > 0);
    // XR 카드 및 미스터리 카드 필터링 제외
    const filtered = ownedCards.filter(c => c.rarity !== 'XR' && !c.isMystery);

    const rankOrder: Record<string, number> = { C: 1, UC: 2, R: 3, SR: 4, SSR: 5, UR: 6, LR: 7, MR: 8 };

    return filtered
      .sort((a, b) => {
        const rankA = rankOrder[a.rarity] || 0;
        const rankB = rankOrder[b.rarity] || 0;
        if (rankB !== rankA) {
          return rankB - rankA;
        }
        return b.power - a.power;
      })
      .slice(0, 3);
  };

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
          className="absolute top-4 right-4 p-2 rounded-full bg-void-800 hover:bg-void-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10 z-10"
        >
          <X size={18} />
        </button>

        {selectedUser ? (
          /* ─────────────────────────────────────────────────────────────────
             🔎 유저 상세 정보 화면 (대표 카드 3장 노출)
             ───────────────────────────────────────────────────────────────── */
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => setSelectedUser(null)}
              className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors self-start cursor-pointer bg-void-800 hover:bg-void-700 px-3 py-1.5 rounded-xl border border-white/5 z-10"
            >
              <ArrowLeft size={14} />
              <span>랭킹 목록으로 돌아가기</span>
            </button>

            {/* 기본 프로필 */}
            <div className="flex flex-col items-center gap-2 mt-1">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/80 bg-black flex-shrink-0">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <User size={30} />
                  </div>
                )}
              </div>
              <h3 className="font-serif text-lg font-black text-amber-200">
                {selectedUser.displayName}
              </h3>
              <div className="px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                RANK #{selectedUser.rank}
              </div>
            </div>

            {/* 수집 스펙 시트 */}
            <div className="grid grid-cols-3 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 mt-1 font-sans">
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-mono text-slate-400">도감 수집률</span>
                <span className="text-sm font-serif font-black text-amber-300 mt-0.5">
                  {selectedUser.collectionRate}%
                </span>
              </div>
              <div className="flex flex-col items-center text-center border-x border-white/10">
                <span className="text-[10px] font-mono text-slate-400">보유 카드 종류</span>
                <span className="text-sm font-serif font-black text-slate-200 mt-0.5">
                  {selectedUser.uniqueCardCount} / 521장
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-mono text-slate-400">개봉 팩 수</span>
                <span className="text-sm font-serif font-black text-pink-400 mt-0.5">
                  {selectedUser.totalPacksOpened}회
                </span>
              </div>
            </div>

            {/* 대표 카드 (XR 제외 고등급 탑3) */}
            <div className="flex flex-col gap-2 mt-2">
              <h4 className="text-xs font-mono font-bold text-amber-400/80 flex items-center gap-1.5 pl-1">
                <Sparkles size={12} className="text-amber-400" />
                대표 카드 (XR 제외 최고 희귀도 Top 3)
              </h4>

              {isFetchingUser ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-slate-400 font-mono text-xs">
                  <div className="w-6 h-6 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                  <span>카드 정보를 불러오는 중...</span>
                </div>
              ) : (() => {
                const topCards = getTopCards(userCollection);
                if (topCards.length === 0) {
                  return (
                    <div className="text-center py-12 bg-black/25 rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-mono">
                      보유 중인 대표 카드가 존재하지 않습니다.
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-3 gap-3.5 mt-1">
                    {topCards.map((card, idx) => (
                      <div key={card.id || idx} className="flex flex-col items-center gap-2">
                        <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 hover:border-amber-400/40 transition-colors">
                          <CardVisual
                            card={card}
                            size="sm"
                            className="w-full pointer-events-none select-none"
                            showDetails={false}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs font-mono text-slate-300 text-center truncate w-full px-1">
                          {card.name.replace('[보상] ', '')}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             🏆 랭킹 목록 리스트 화면
             ───────────────────────────────────────────────────────────────── */
          <div className="flex flex-col gap-4 overflow-hidden h-full">
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
                소셜 계정 연동을 완료한 엔써(NSWER)들의 실시간 카드 도감 수집률 순위입니다. 항목이나 프로필 배지를 터치해 정보를 확인해보세요.
              </p>
            </div>

            {/* 랭커 리스트 */}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(entry);
                      }}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] hover:bg-void-900/85 relative z-10 pointer-events-auto ${
                        isCurrentUser
                          ? 'bg-purple-950/60 border-pink-500/60 shadow-lg shadow-pink-950/40'
                          : 'bg-void-950/60 border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* 순위 번호 (계정 랭킹 배지) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(entry);
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-mono flex-shrink-0 cursor-pointer ${rankBadge}`}
                        >
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </div>

                        {/* 아바타 (계정 아바타 배지) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(entry);
                          }}
                          className="w-10 h-10 rounded-full overflow-hidden border border-purple-400/40 flex-shrink-0 bg-black cursor-pointer"
                        >
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
                          <span className="text-pink-300 font-bold">{entry.uniqueCardCount || 0}</span> / 521장
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
