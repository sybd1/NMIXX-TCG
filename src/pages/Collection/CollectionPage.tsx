import React, { useState } from 'react';
import { Card, Rarity } from '../../types/card';
import { MASTER_CARDS, CONCEPT_SETS } from '../../data/cards';
import { CardVisual } from '../../components/Card/CardVisual';
import { CardModal } from '../../components/Card/CardModal';
import { ArrowUpDown, Crown, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface CollectionPageProps {
  collection: Record<string, number>;
}

type TabType = 'ALL_CARDS' | 'CONCEPT_SETS';
type SortOption = 'OWNED_HIGH_RARITY' | 'RARITY_DESC' | 'OWNED_FIRST' | 'NUMBER' | 'POWER' | 'OWNED_COUNT';

const RARITY_ORDER: Record<Rarity, number> = {
  MR: 8,
  LR: 7,
  UR: 6,
  SSR: 5,
  SR: 4,
  R: 3,
  UC: 2,
  C: 1,
};

const MEMBERS: { id: string; name: string }[] = [
  { id: 'ALL', name: '전체 멤버' },
  { id: 'LILY', name: '릴리' },
  { id: 'HAEWON', name: '해원' },
  { id: 'SULLYOON', name: '설윤' },
  { id: 'BAE', name: '배이' },
  { id: 'JIWOO', name: '지우' },
  { id: 'KYUJIN', name: '규진' },
  { id: 'NMIXX', name: '단체' },
];

const PACK_FILTERS = [
  { id: 'ALL', name: '전체 팩' },
  { id: 'op01', code: 'OP-01', name: '1탄 계승되는 의지' },
  { id: 'op02', code: 'OP-02', name: '2탄 정점결전' },
  { id: 'op03', code: 'OP-03', name: '3탄 Blue Valentine' },
  { id: 'op04', code: 'OP-04', name: '4탄 ZERO FRONTIER' },
];

export const CollectionPage: React.FC<CollectionPageProps> = ({
  collection,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ALL_CARDS');
  const [selectedPack, setSelectedPack] = useState<string>('ALL');
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('OWNED_HIGH_RARITY');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // 수집 통계 계산
  const ownedUniqueCount = Object.keys(collection).filter(id => collection[id] > 0).length;
  const totalCardsCount = MASTER_CARDS.length;
  const completionPercentage = Math.round((ownedUniqueCount / totalCardsCount) * 100);

  // 완성된 세트 수 계산
  const completedSetsCount = CONCEPT_SETS.filter(set =>
    set.cardIds.every(id => (collection[id] || 0) > 0)
  ).length;

  // 필터링 및 정렬 (보유 카드 중 높은 등급 순 정렬 지원)
  const filteredCards = MASTER_CARDS.filter(card => {
    const matchPack = selectedPack === 'ALL' || card.packId === selectedPack;
    const matchMember = selectedMember === 'ALL' || card.member === selectedMember;
    const matchRarity = selectedRarity === 'ALL' || card.rarity === selectedRarity;
    return matchPack && matchMember && matchRarity;
  }).sort((a, b) => {
    const aCount = collection[a.id] || 0;
    const bCount = collection[b.id] || 0;
    const aOwned = aCount > 0;
    const bOwned = bCount > 0;

    if (sortBy === 'OWNED_HIGH_RARITY') {
      // 1. 보유한 카드가 우선
      if (aOwned && !bOwned) return -1;
      if (!aOwned && bOwned) return 1;
      // 2. 보유한 카드 내에서 높은 희귀도순 (MR -> LR -> UR -> SSR -> SR...)
      if (aOwned && bOwned) {
        if (RARITY_ORDER[b.rarity] !== RARITY_ORDER[a.rarity]) {
          return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        }
        return b.power - a.power;
      }
      return a.collectionNumber - b.collectionNumber;
    }

    if (sortBy === 'RARITY_DESC') {
      // 전체 높은 희귀도순
      if (RARITY_ORDER[b.rarity] !== RARITY_ORDER[a.rarity]) {
        return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      }
      return a.collectionNumber - b.collectionNumber;
    }

    if (sortBy === 'OWNED_FIRST') {
      if (aOwned && !bOwned) return -1;
      if (!aOwned && bOwned) return 1;
      return a.collectionNumber - b.collectionNumber;
    }

    if (sortBy === 'OWNED_COUNT') {
      if (bCount !== aCount) return bCount - aCount;
      return a.collectionNumber - b.collectionNumber;
    }

    if (sortBy === 'NUMBER') {
      return a.collectionNumber - b.collectionNumber;
    }

    if (sortBy === 'POWER') {
      return b.power - a.power;
    }

    return 0;
  });

  return (
    <div className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-void-900/80 border border-void-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-black text-slate-100 mb-1 flex items-center gap-2.5">
            NMIXX COLLECTION ARCHIVE
            {completedSetsCount > 0 && (
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Crown size={13} /> {completedSetsCount} 세트 완성!
              </span>
            )}
          </h1>
          <p className="text-xs font-mono text-slate-400">
            총 {totalCardsCount}장의 NMIXX 공식 카드 중 {ownedUniqueCount}종 획득 완료
          </p>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-2 min-w-[240px]">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400">COLLECTION PROGRESS</span>
            <span className="text-pink-300 font-bold">
              {ownedUniqueCount} / {totalCardsCount} ({completionPercentage}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-void-950 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main View Switch Tabs */}
      <div className="flex items-center gap-2 border-b border-void-800 pb-2">
        <button
          onClick={() => setActiveTab('ALL_CARDS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-serif font-black text-xs md:text-sm tracking-wider transition-all cursor-pointer ${
            activeTab === 'ALL_CARDS'
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-950/50'
              : 'text-slate-400 hover:text-white bg-void-900/60 border border-void-800'
          }`}
        >
          <Sparkles size={15} />
          전체 카드 도감 (600종)
        </button>

        <button
          onClick={() => setActiveTab('CONCEPT_SETS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-serif font-black text-xs md:text-sm tracking-wider transition-all cursor-pointer ${
            activeTab === 'CONCEPT_SETS'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-950/50'
              : 'text-slate-400 hover:text-white bg-void-900/60 border border-void-800'
          }`}
        >
          <Crown size={15} />
          NMIXX 세트 카드 (6종)
          {completedSetsCount > 0 && (
            <span className="bg-black text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-black shadow-sm">
              {completedSetsCount} / 6
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ALL_CARDS' && (
        <>
          {/* Filter & Sort Bar */}
          <div className="flex flex-col gap-3 bg-void-950/60 p-4 rounded-2xl border border-void-800/80">
            {/* Booster Pack Filters */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-void-800/80 pb-3">
              <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">BOOSTER:</span>
              {PACK_FILTERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPack(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedPack === p.id
                      ? 'bg-pink-600/30 text-pink-200 border border-pink-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white bg-void-900 border border-transparent'
                  }`}
                >
                  {p.code ? `[${p.code}] ${p.name}` : p.name}
                </button>
              ))}
            </div>

            {/* Member Filters */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-void-800/80 pb-3">
              <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">MEMBER:</span>
              {MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedMember === m.id
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white bg-void-900 border border-transparent'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* Rarity Filters & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">RARITY:</span>
                <button
                  onClick={() => setSelectedRarity('ALL')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                    selectedRarity === 'ALL'
                      ? 'bg-amber-600/30 text-amber-200 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white bg-void-900 border border-transparent'
                  }`}
                >
                  ALL
                </button>
                {(['C', 'UC', 'R', 'SR', 'SSR', 'UR', 'LR', 'MR'] as Rarity[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRarity(r)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      selectedRarity === r
                        ? 'bg-amber-600/30 text-amber-200 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white bg-void-900 border border-transparent'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-void-900 border border-void-800 text-amber-300 text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none focus:border-pink-500 font-black cursor-pointer shadow-sm"
                >
                  <option value="OWNED_HIGH_RARITY">👑 보유 카드 중 높은 등급순 (MR → LR → UR...)</option>
                  <option value="RARITY_DESC">💎 전체 희귀도 높은순 (MR → LR → UR...)</option>
                  <option value="OWNED_FIRST">보유한 카드 우선 (도감 번호순)</option>
                  <option value="OWNED_COUNT">보유 수량 많은순 (중복 카드순)</option>
                  <option value="NUMBER">도감 번호순 (#001 ~ #600)</option>
                  <option value="POWER">공격력순 (POWER 높은순)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
            {filteredCards.map(card => {
              const count = collection[card.id] || 0;
              const isOwned = count > 0;

              return (
                <div key={card.id} className="card-content-visibility w-full flex justify-center">
                  <CardVisual
                    card={card}
                    isOwned={isOwned}
                    count={count}
                    size="sm"
                    onClick={() => setSelectedCard(card)}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Concept Sets View (와이드 시원한 레이아웃 & 폰트 안 무너지게 최적화) */}
      {activeTab === 'CONCEPT_SETS' && (
        <div className="flex flex-col gap-8 w-full">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-void-900 via-void-950 to-void-900 p-6 sm:p-7 rounded-3xl border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black flex items-center justify-center font-black shadow-xl flex-shrink-0">
                <Crown size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300">
                  NMIXX 세트 카드 컬렉션 (6종)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  각 세트의 6명 멤버(릴리, 해원, 설윤, 배이, 지우, 규진) 카드를 모두 수집하면 전설의 <strong className="text-amber-300 font-bold">보상 세트 카드 (UR 1종 / SSR 1종 / SR 2종 / R 2종)</strong>가 완성됩니다!
                </p>
              </div>
            </div>
            <div className="text-left md:text-right font-mono text-xs font-bold text-amber-300 whitespace-nowrap bg-black/80 px-5 py-3 rounded-2xl border border-amber-400/40 flex-shrink-0 shadow-lg">
              세트 완성 현황: <span className="text-white text-lg font-black">{completedSetsCount}</span> / {CONCEPT_SETS.length} COMPLETED
            </div>
          </div>

          {/* 6개 세트 와이드 리스트 */}
          <div className="flex flex-col gap-8 w-full">
            {CONCEPT_SETS.map((set, sIdx) => {
              const ownedInSet = set.cardIds.filter(id => (collection[id] || 0) > 0).length;
              const isCompleted = ownedInSet === set.cardIds.length;
              const memberCards = set.cardIds.map(id => MASTER_CARDS.find(c => c.id === id)!);
              const r = set.rewardCard.rarity;

              const badgeColors: Record<Rarity, string> = {
                UR: 'from-red-950 via-rose-900 to-red-950 text-rose-100 border-red-400 ring-1 ring-red-400/50',
                SSR: 'from-amber-950 via-yellow-900 to-amber-950 text-amber-200 border-amber-400',
                SR: 'from-purple-950 via-indigo-900 to-purple-950 text-purple-200 border-purple-400',
                R: 'from-sky-950 via-blue-900 to-sky-950 text-sky-200 border-sky-400',
                C: 'from-slate-900 to-slate-950 text-slate-300 border-slate-600',
                UC: 'from-emerald-950 to-teal-950 text-emerald-300 border-emerald-500',
                LR: 'from-pink-950 to-rose-950 text-pink-200 border-pink-400',
                MR: 'from-amber-500 to-cyan-400 text-black border-white',
              };

              return (
                <div
                  key={set.setId}
                  className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col gap-6 w-full ${
                    isCompleted
                      ? 'bg-gradient-to-b from-amber-950/30 via-void-900/90 to-void-950 border-amber-400/60 shadow-2xl shadow-amber-950/40 ring-1 ring-amber-400/50'
                      : 'bg-void-900/70 border-void-800'
                  }`}
                >
                  {/* Set Header Bar (와이드 & 줄바꿈 방지) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-slate-400 font-mono text-xs font-bold mr-1">
                        #{sIdx + 1}
                      </span>
                      <span className={`text-[11px] font-mono font-black px-2.5 py-1 rounded-lg border bg-gradient-to-r ${badgeColors[r] || badgeColors.SSR} shadow-md`}>
                        {r} SET
                      </span>
                      <span className="text-[10.5px] font-mono font-black text-pink-300 bg-pink-950/80 px-2.5 py-1 rounded-lg border border-pink-500/30">
                        {set.packCode}
                      </span>
                      <h3 className="text-lg sm:text-xl font-serif font-black text-white ml-1">
                        {set.setTitle}
                      </h3>
                    </div>

                    {isCompleted ? (
                      <span className="flex items-center gap-2 text-xs sm:text-sm font-mono font-black text-black bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-1.5 rounded-full shadow-xl animate-pulse whitespace-nowrap self-start sm:self-auto">
                        <CheckCircle2 size={16} /> SET COMPLETE!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-slate-300 bg-void-950 px-3.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap self-start sm:self-auto">
                        <Lock size={14} className="text-slate-400" /> 수집 현황: <strong className="text-pink-400">{ownedInSet}</strong> / {set.cardIds.length}
                      </span>
                    )}
                  </div>

                  {/* 6 Members Grid (널찍하고 시원한 6열 그리드) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
                    {memberCards.map(c => {
                      const count = collection[c.id] || 0;
                      const isOwned = count > 0;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCard(c)}
                          className="w-full flex justify-center cursor-pointer transform hover:scale-105 transition-transform"
                        >
                          <CardVisual
                            card={c}
                            isOwned={isOwned}
                            count={count}
                            size="sm"
                            className="w-full h-56 sm:h-64"
                            showDetails={true}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Reward Banner (대형 보상 세트 카드 인스펙터 바) */}
                  <div
                    onClick={() => isCompleted && setSelectedCard(set.rewardCard)}
                    className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                      isCompleted
                        ? 'bg-amber-500/20 border-amber-400/60 hover:bg-amber-500/30 cursor-pointer shadow-lg'
                        : 'bg-void-950/60 border-white/5 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                        {r === 'UR' ? '💎' : (r === 'SSR' ? '👑' : '✨')}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-serif font-black text-amber-200">
                            {set.rewardCard.name}
                          </span>
                          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border bg-gradient-to-r ${badgeColors[r] || badgeColors.SSR}`}>
                            {r}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {isCompleted ? '👉 터치하여 전설의 풀아트 세트 카드를 감상하세요!' : '6명의 멤버 카드를 모두 수집하면 이 보상 세트 카드가 해금됩니다.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto font-mono text-xs">
                      <span className="text-amber-400 font-black bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 whitespace-nowrap">
                        ⚡ POWER {set.rewardCard.power.toLocaleString()}
                      </span>
                      <span className="text-yellow-300 font-black bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 whitespace-nowrap">
                        💎 COST {set.rewardCard.cost}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      <CardModal
        card={selectedCard}
        count={selectedCard ? collection[selectedCard.id] || 0 : 0}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
};
