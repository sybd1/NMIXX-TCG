import React, { useState } from 'react';
import { Card, Rarity } from '../../types/card';
import { MASTER_CARDS } from '../../data/cards';
import { CardVisual } from '../../components/Card/CardVisual';
import { CardModal } from '../../components/Card/CardModal';
import { ArrowUpDown } from 'lucide-react';

interface CollectionPageProps {
  collection: Record<string, number>;
}

type SortOption = 'OWNED_FIRST' | 'NUMBER' | 'RARITY' | 'POWER' | 'OWNED_COUNT';

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

export const CollectionPage: React.FC<CollectionPageProps> = ({
  collection,
}) => {
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('OWNED_FIRST');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // 수집 통계 계산
  const ownedUniqueCount = Object.keys(collection).filter(id => collection[id] > 0).length;
  const totalCardsCount = MASTER_CARDS.length;
  const completionPercentage = Math.round((ownedUniqueCount / totalCardsCount) * 100);

  // 필터링 및 정렬 (보유 카드 우선 정렬 추가)
  const filteredCards = MASTER_CARDS.filter(card => {
    const matchMember = selectedMember === 'ALL' || card.member === selectedMember;
    const matchRarity = selectedRarity === 'ALL' || card.rarity === selectedRarity;
    return matchMember && matchRarity;
  }).sort((a, b) => {
    const aCount = collection[a.id] || 0;
    const bCount = collection[b.id] || 0;
    const aOwned = aCount > 0;
    const bOwned = bCount > 0;

    if (sortBy === 'OWNED_FIRST') {
      // 보유한 카드가 맨 앞으로 오고, 그 안에서 도감 번호순
      if (aOwned && !bOwned) return -1;
      if (!aOwned && bOwned) return 1;
      return a.collectionNumber - b.collectionNumber;
    }
    if (sortBy === 'OWNED_COUNT') {
      // 보유 수량 많은 순서대로 정렬
      if (bCount !== aCount) return bCount - aCount;
      return a.collectionNumber - b.collectionNumber;
    }
    if (sortBy === 'NUMBER') {
      return a.collectionNumber - b.collectionNumber;
    }
    if (sortBy === 'RARITY') {
      return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
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
          <h1 className="font-serif text-2xl md:text-3xl font-black text-slate-100 mb-1">
            NMIXX COLLECTION ARCHIVE
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

      {/* Filter & Sort Bar */}
      <div className="flex flex-col gap-3 bg-void-950/60 p-4 rounded-2xl border border-void-800/80">
        {/* Member Filters */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-void-800/80 pb-3">
          <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">MEMBER:</span>
          {MEMBERS.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedMember === m.id
                  ? 'bg-pink-600/30 text-pink-200 border border-pink-500/40 shadow-sm'
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
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
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
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
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
              className="bg-void-900 border border-void-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none focus:border-pink-500 font-bold"
            >
              <option value="OWNED_FIRST">보유한 카드 우선 (내가 가진 카드 순)</option>
              <option value="OWNED_COUNT">보유 수량 많은순 (중복 카드순)</option>
              <option value="NUMBER">도감 번호순 (NUMBER #001~#200)</option>
              <option value="RARITY">희귀도순 (RARITY 높은순)</option>
              <option value="POWER">공격력순 (POWER 높은순)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-items-center">
        {filteredCards.map(card => {
          const count = collection[card.id] || 0;
          const isOwned = count > 0;

          return (
            <CardVisual
              key={card.id}
              card={card}
              isOwned={isOwned}
              count={count}
              size="sm"
              onClick={() => setSelectedCard(card)}
            />
          );
        })}
      </div>

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
