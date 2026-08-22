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
  { id: 'NMIXX', name: 'SPECIAL' },
];

const PACK_FILTERS = [
  { id: 'ALL', name: '전체 팩' },
  { id: 'op01', code: 'OP-01', name: '1탄 계승되는 의지' },
  { id: 'op02', code: 'OP-02', name: '2탄 정점결전' },
  { id: 'op03', code: 'OP-03', name: '3탄 강대한 적' },
  { id: 'op04', code: 'OP-04', name: '4탄 신시대의 주역' },
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
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
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
          6인 완전체 SSR 세트 (12종)
          {completedSetsCount > 0 && (
            <span className="bg-black text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black">
              {completedSetsCount}
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

      {/* Concept Sets View */}
      {activeTab === 'CONCEPT_SETS' && (
        <div className="flex flex-col gap-6">
          <div className="bg-void-900/80 p-5 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-black shadow-lg">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-black text-amber-200">
                  NMIXX 6인 완전체 SSR 세트 컬렉션
                </h2>
                <p className="text-xs text-slate-300 font-sans">
                  각 앨범 컨셉의 6명 멤버(릴리, 해원, 설윤, 배이, 지우, 규진) 카드를 모두 수집하면 전설의 <strong className="text-amber-400">SSR급 풀아트 세트 카드</strong>가 완성됩니다!
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs font-bold text-amber-300 whitespace-nowrap bg-black/60 px-4 py-2 rounded-2xl border border-amber-400/30">
              세트 완성 현황: <span className="text-white text-base">{completedSetsCount}</span> / {CONCEPT_SETS.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONCEPT_SETS.map(set => {
              const ownedInSet = set.cardIds.filter(id => (collection[id] || 0) > 0).length;
              const isCompleted = ownedInSet === set.cardIds.length;
              const memberCards = set.cardIds.map(id => MASTER_CARDS.find(c => c.id === id)!);

              return (
                <div
                  key={set.setId}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-4 ${
                    isCompleted
                      ? 'bg-gradient-to-b from-amber-950/40 via-void-900/90 to-void-950 border-amber-400/60 shadow-xl shadow-amber-950/30 ring-1 ring-amber-400/40'
                      : 'bg-void-900/60 border-void-800'
                  }`}
                >
                  {/* Set Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-black text-pink-300 bg-pink-950/80 px-2 py-0.5 rounded border border-pink-500/30">
                        {set.packCode}
                      </span>
                      <h3 className="text-base font-serif font-black text-white mt-1">
                        {set.setTitle}
                      </h3>
                    </div>

                    {isCompleted ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-black text-black bg-gradient-to-r from-amber-400 to-yellow-300 px-3 py-1 rounded-full shadow-lg animate-pulse">
                        <CheckCircle2 size={14} /> COMPLETE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-slate-400 bg-void-950 px-2.5 py-1 rounded-full border border-white/5">
                        <Lock size={12} /> {ownedInSet} / {set.cardIds.length}
                      </span>
                    )}
                  </div>

                  {/* 6 Members Mini Grid */}
                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {memberCards.map(c => {
                      const count = collection[c.id] || 0;
                      const isOwned = count > 0;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCard(c)}
                          className="cursor-pointer transform hover:scale-105 transition-transform"
                        >
                          <CardVisual
                            card={c}
                            isOwned={isOwned}
                            count={count}
                            size="sm"
                            showDetails={false}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* SSR Reward Banner */}
                  <div
                    onClick={() => isCompleted && setSelectedCard(set.rewardCard)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isCompleted
                        ? 'bg-amber-500/20 border-amber-400/50 hover:bg-amber-500/30 cursor-pointer'
                        : 'bg-void-950/60 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">👑</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-serif font-black text-amber-200">
                          {set.rewardCard.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {isCompleted ? '터치하여 SSR 세트 카드 감상하기' : '6명 멤버 카드를 모두 모아 해금하세요'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded border bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 text-amber-200 border-amber-400">
                      SSR
                    </span>
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
