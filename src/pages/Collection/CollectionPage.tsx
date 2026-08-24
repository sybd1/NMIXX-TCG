import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Rarity } from '../../types/card';
import { MASTER_CARDS, LEGACY_CARDS, CONCEPT_SETS } from '../../data/cards';
import { CardVisual } from '../../components/Card/CardVisual';
import { CardModal } from '../../components/Card/CardModal';
import { sound } from '../../services/soundService';
import { ArrowUpDown, Crown, Sparkles, CheckCircle2, Lock, Landmark, PartyPopper } from 'lucide-react';

interface CollectionPageProps {
  collection: Record<string, number>;
  claimedSetRewards?: string[];
  onClaimSetReward?: (setId: string, coins: number) => void;
  onClaimXrCard?: (cardId: string) => void;
  onAddCoins?: (amount: number) => void;
}

type TabType = 'ALL_CARDS' | 'CONCEPT_SETS';
type SortOption = 'OWNED_HIGH_RARITY' | 'OWNED_FIRST' | 'UNOWNED_FIRST' | 'NUMBER' | 'RARITY' | 'OWNED_COUNT';
type SortDirection = 'ASC' | 'DESC';
type OwnershipFilter = 'ALL' | 'OWNED_ONLY' | 'UNOWNED_ONLY';

const RARITY_ORDER: Record<Rarity, number> = {
  XR: 9,
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
  { id: 'PARK', name: '박진영' },
];

const PACK_FILTERS = [
  { id: 'ALL', code: 'ALL', name: '전체 팩' },
  { id: 'op01', code: 'NX-01', name: 'NX 01 - Fe3O4: FORWARD' },
  { id: 'op02', code: 'NX-02', name: 'NX 02 - 2025 NEW ERA' },
  { id: 'op03', code: 'NX-03', name: 'NX 03 - Blue Valentine' },
  { id: 'op04', code: 'NX-04', name: 'NX 04 - ZERO FRONTIER' },
];

export const CollectionPage: React.FC<CollectionPageProps> = ({
  collection,
  claimedSetRewards = [],
  onClaimSetReward,
  onClaimXrCard,
  onAddCoins,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ALL_CARDS');
  const [selectedPack, setSelectedPack] = useState<string>('ALL');
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('OWNED_HIGH_RARITY');
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showXrCelebrationModal, setShowXrCelebrationModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 24; // 1페이지당 24장으로 렌더링 최적화

  // 필터나 정렬 기준이 변경되면 1페이지로 자동 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPack, selectedMember, selectedRarity, ownershipFilter, sortBy, sortDirection]);

  // XR 카드 보유 여부 & 멤버 필터 탭 동적 계산 (획득 전까지 박진영 숨김)
  const xrCard = MASTER_CARDS.find(c => c.rarity === 'XR');
  const isXrOwned = xrCard ? (collection[xrCard.id] || 0) > 0 : false;
  const availableMembers = MEMBERS.filter(m => m.id !== 'PARK' || isXrOwned);

  // 🎺 COLLECTION 페이지 진입 시: XR 초월 카드 해금 조건 달성 여부 자동 검사 및 빵빠레 습득 이벤트!
  useEffect(() => {
    const baseMasterCards = MASTER_CARDS.filter(c => c.rarity !== 'XR');
    const targetXr = MASTER_CARDS.find(c => c.rarity === 'XR');
    if (!targetXr) return;

    const ownedBaseCount = baseMasterCards.filter(c => (collection[c.id] || 0) > 0).length;
    const isAllBaseCollected = ownedBaseCount >= baseMasterCards.length;
    const isAlreadyOwned = (collection[targetXr.id] || 0) > 0;

    // 조건을 달성했고 아직 XR 카드를 습득하지 않은 경우: 빵빠레 울리며 자동 습득 이벤트 발생!
    if (isAllBaseCollected && !isAlreadyOwned) {
      sound.playVictoryFanfare();
      setShowXrCelebrationModal(true);
      if (onClaimXrCard) {
        onClaimXrCard(targetXr.id);
      }
    }
  }, [collection, onClaimXrCard]);

  // 기존 보유 유저의 Legacy 소장 카드 보존
  const ownedLegacyCards = LEGACY_CARDS.filter(c => (collection[c.id] || 0) > 0);
  const allViewableCards = [...MASTER_CARDS, ...ownedLegacyCards];

  // 수집 통계 계산 (공식 651장 기준 정밀 계산)
  const ownedOfficialCount = MASTER_CARDS.filter(c => (collection[c.id] || 0) > 0).length;
  const ownedUniqueCount = ownedOfficialCount;
  const totalCardsCount = MASTER_CARDS.length;
  const completionPercentage = Math.round((ownedOfficialCount / totalCardsCount) * 100);

  // 완성된 세트 수 계산
  const completedSetsCount = CONCEPT_SETS.filter(set =>
    set.cardIds.every(id => (collection[id] || 0) > 0)
  ).length;

  // 필터링 및 오름차순/내림차순 정렬 (useMemo로 651장 고속 메모이제이션)
  const filteredCards = useMemo(() => {
    return allViewableCards.filter(card => {
      const aCount = collection[card.id] || 0;
      const isOwned = aCount > 0;

      // 1. 보유 상태 필터 (전체 / 모은 카드만 / 못 모은 카드만)
      if (ownershipFilter === 'OWNED_ONLY' && !isOwned) return false;
      if (ownershipFilter === 'UNOWNED_ONLY' && isOwned) return false;

      // 2. 팩 / 멤버 / 레어도 필터
      const matchPack = selectedPack === 'ALL' || card.packId === selectedPack;
      const matchMember = selectedMember === 'ALL' || card.member === selectedMember;
      const matchRarity = selectedRarity === 'ALL' || card.rarity === selectedRarity;
      return matchPack && matchMember && matchRarity;
    }).sort((a, b) => {
      const aCount = collection[a.id] || 0;
      const bCount = collection[b.id] || 0;
      const aOwned = aCount > 0;
      const bOwned = bCount > 0;

      const dirMultiplier = sortDirection === 'ASC' ? -1 : 1;

      // 1. 보유 카드 중 높은 등급순 (또는 낮은 등급순)
      if (sortBy === 'OWNED_HIGH_RARITY') {
        if (aOwned && !bOwned) return -1;
        if (!aOwned && bOwned) return 1;
        if (aOwned && bOwned) {
          if (RARITY_ORDER[b.rarity] !== RARITY_ORDER[a.rarity]) {
            return (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) * dirMultiplier;
          }
          return (a.collectionNumber - b.collectionNumber) * (sortDirection === 'ASC' ? -1 : 1);
        }
        return (a.collectionNumber - b.collectionNumber) * (sortDirection === 'ASC' ? -1 : 1);
      }

      // 2. 모은 카드 우선 (보유순)
      if (sortBy === 'OWNED_FIRST') {
        if (aOwned && !bOwned) return -1;
        if (!aOwned && bOwned) return 1;
        return (a.collectionNumber - b.collectionNumber) * (sortDirection === 'ASC' ? -1 : 1);
      }

      // 3. 아직 못 모은 카드 우선 (미보유순)
      if (sortBy === 'UNOWNED_FIRST') {
        if (!aOwned && bOwned) return -1;
        if (aOwned && !bOwned) return 1;
        return (a.collectionNumber - b.collectionNumber) * (sortDirection === 'ASC' ? -1 : 1);
      }

      // 4. 도감 번호순 (오름차순 #001~ / 내림차순 #600~)
      if (sortBy === 'NUMBER') {
        return sortDirection === 'ASC'
          ? a.collectionNumber - b.collectionNumber
          : b.collectionNumber - a.collectionNumber;
      }

      // 5. 등급/희귀도순 (MR~C / C~MR)
      if (sortBy === 'RARITY') {
        if (RARITY_ORDER[b.rarity] !== RARITY_ORDER[a.rarity]) {
          return (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) * dirMultiplier;
        }
        return a.collectionNumber - b.collectionNumber;
      }

      // 6. 보유 수량순 (많은순 / 적은순)
      if (sortBy === 'OWNED_COUNT') {
        if (bCount !== aCount) {
          return (bCount - aCount) * dirMultiplier;
        }
        return a.collectionNumber - b.collectionNumber;
      }

      return 0;
    });
  }, [allViewableCards, collection, ownershipFilter, selectedPack, selectedMember, selectedRarity, sortBy, sortDirection]);

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
            {ownedLegacyCards.length > 0 && (
              <span className="text-[11px] font-mono font-black text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/40 shadow-sm flex items-center gap-1">
                <Landmark size={12} /> Legacy 소장품 {ownedLegacyCards.length}종
              </span>
            )}
          </h1>
          <p className="text-xs font-mono text-slate-400">
            총 {totalCardsCount}장의 NMIXX 공식 카드 중 {ownedOfficialCount}종 획득 완료
            {ownedLegacyCards.length > 0 && ` (+구버전 소장용 ${ownedLegacyCards.length}종 보관 중)`}
          </p>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-2 min-w-[240px]">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400">COLLECTION PROGRESS</span>
            <span className="text-pink-300 font-bold">
              {ownedOfficialCount} / {totalCardsCount} ({completionPercentage}%)
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
          전체 카드 도감 ({totalCardsCount}종)
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

      {/* 👑 [XR] TRANSCENDENT 궁극의 초월 카드 해금 배너 */}
      {(() => {
        const baseMasterCards = MASTER_CARDS.filter(c => c.rarity !== 'XR');
        const xrCard = MASTER_CARDS.find(c => c.rarity === 'XR');
        if (!xrCard) return null;

        const ownedBaseCount = baseMasterCards.filter(c => (collection[c.id] || 0) > 0).length;
        const isAllBaseCollected = ownedBaseCount >= baseMasterCards.length;
        const isXrOwned = (collection[xrCard.id] || 0) > 0;

        return (
          <div className="relative overflow-hidden bg-gradient-to-r from-rose-950/80 via-purple-950/80 to-void-950 border border-rose-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-rose-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
              {/* 좌측: XR 카드 미니 비주얼 */}
              <div
                onClick={() => isXrOwned && setSelectedCard(xrCard)}
                className={`flex-shrink-0 cursor-pointer ${isXrOwned ? 'hover:scale-105 transition-transform' : ''}`}
              >
                <CardVisual
                  card={xrCard}
                  isOwned={isXrOwned}
                  count={isXrOwned ? collection[xrCard.id] || 1 : 0}
                  size="sm"
                  className="w-32 h-44 sm:w-36 sm:h-52 shadow-2xl"
                  showDetails={false}
                />
              </div>

              {/* 중앙: 설명 & 프로그레스 */}
              <div className="flex-1 flex flex-col gap-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <span className="text-xs font-black tracking-widest bg-gradient-to-r from-rose-500 via-purple-500 to-amber-400 text-white px-2.5 py-0.5 rounded-full border border-white/40 shadow-lg animate-pulse">
                    👑 XR TRANSCENDENT
                  </span>
                  <h2 className="font-serif font-black text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-purple-100 to-amber-200">
                    {isXrOwned ? xrCard.name : '[XR] 초월 카드'}
                  </h2>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {isXrOwned
                    ? '축하합니다! 모든 카드를 정복하여 유일무이한 궁극의 [XR] 초월 카드를 획득하셨습니다!'
                    : '이 카드를 제외한 모든 카드를 수집하면 자동으로 획득 할 수 있습니다.'}
                </p>

                {/* 진척도 바 */}
                <div className="flex flex-col gap-1 mt-1 max-w-md mx-auto md:mx-0">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-rose-300 font-bold">초월 카드 해금 조건</span>
                    <span className="text-amber-300 font-black">
                      {ownedBaseCount} / {baseMasterCards.length} ({Math.round((ownedBaseCount / baseMasterCards.length) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-rose-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, (ownedBaseCount / baseMasterCards.length) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 우측: 액션 버튼 */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                {isXrOwned ? (
                  <button
                    onClick={() => setSelectedCard(xrCard)}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono font-black text-xs shadow-lg shadow-emerald-950/60 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer border border-emerald-400/40"
                  >
                    <CheckCircle2 size={16} />
                    <span>초월 카드 획득 완료!</span>
                  </button>
                ) : isAllBaseCollected ? (
                  <button
                    onClick={() => onClaimXrCard && onClaimXrCard(xrCard.id)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-mono font-black text-sm shadow-2xl shadow-rose-950/80 animate-bounce flex items-center gap-2 hover:scale-110 transition-all cursor-pointer border-2 border-white ring-4 ring-rose-500/60"
                  >
                    <Crown size={18} />
                    <span>👑 XR 초월 카드 해금하기!</span>
                  </button>
                ) : (
                  <div className="px-4 py-2.5 rounded-2xl bg-black/60 text-slate-400 font-mono font-bold text-xs border border-white/10 flex items-center gap-2">
                    <Lock size={14} className="text-slate-500" />
                    <span>모든 카드 수집 시 해금</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'ALL_CARDS' && (
        <>
          {/* Filter & Sort Bar */}
          <div className="flex flex-col gap-3.5 bg-void-950/70 p-4 sm:p-5 rounded-2xl border border-void-800/80 shadow-xl">
            {/* 1. 수집 상태 필터 (전체 / 모은 카드 / 아직 못 모은 카드) */}
            <div className="flex flex-wrap items-center gap-2 border-b border-void-800/80 pb-3">
              <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">COLLECTION:</span>
              <button
                onClick={() => setOwnershipFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  ownershipFilter === 'ALL'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md border border-pink-400/40'
                    : 'text-slate-400 hover:text-white bg-void-900 border border-white/5'
                }`}
              >
                <span>전체 보기</span>
                <span className="text-[10px] font-black opacity-80 font-mono">({totalCardsCount})</span>
              </button>

              <button
                onClick={() => setOwnershipFilter('OWNED_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  ownershipFilter === 'OWNED_ONLY'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-md ring-1 ring-emerald-500/40'
                    : 'text-slate-400 hover:text-emerald-300 bg-void-900 border border-white/5'
                }`}
              >
                <span>🎉 모은 카드만</span>
                <span className="text-[10px] font-black text-emerald-400 font-mono">({ownedUniqueCount})</span>
              </button>

              <button
                onClick={() => setOwnershipFilter('UNOWNED_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  ownershipFilter === 'UNOWNED_ONLY'
                    ? 'bg-slate-700/50 text-slate-200 border border-slate-500/50 shadow-md ring-1 ring-slate-400/40'
                    : 'text-slate-400 hover:text-slate-200 bg-void-900 border border-white/5'
                }`}
              >
                <span>🔒 못 모은 카드만</span>
                <span className="text-[10px] font-black text-slate-400 font-mono">({totalCardsCount - ownedUniqueCount})</span>
              </button>
            </div>

            {/* 2. Booster Pack Filters */}
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

            {/* 3. Member Filters (XR 획득 전까지 박진영 숨김) */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-void-800/80 pb-3">
              <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">MEMBER:</span>
              {availableMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedMember === m.id
                      ? (m.id === 'PARK'
                          ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white border border-white shadow-lg shadow-rose-950/60 font-black'
                          : 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm')
                      : (m.id === 'PARK'
                          ? 'bg-gradient-to-r from-rose-950/60 to-purple-950/60 text-rose-200 border border-rose-500/40 hover:text-white'
                          : 'text-slate-400 hover:text-white bg-void-900 border border-transparent')
                  }`}
                >
                  {m.id === 'PARK' ? '👑 박진영' : m.name}
                </button>
              ))}
            </div>

            {/* 4. Rarity Filters & Sort Controls */}
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
                {(['C', 'UC', 'R', 'SR', 'SSR', 'UR', 'LR', 'MR', 'XR'] as Rarity[]).map(r => (
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

              {/* Sort Dropdown & Direction Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-void-900 border border-void-800 rounded-xl px-2.5 py-1 shadow-sm">
                  <ArrowUpDown size={13} className="text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-amber-300 text-xs font-mono focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="OWNED_HIGH_RARITY">👑 보유 카드 중 높은 등급순</option>
                    <option value="OWNED_FIRST">📦 모은 카드 우선</option>
                    <option value="UNOWNED_FIRST">🔒 아직 못 모은 카드 우선</option>
                    <option value="NUMBER">🔢 도감 번호순 (#001 ~ #{totalCardsCount})</option>
                    <option value="RARITY">💎 등급/희귀도순 (MR ↔ C)</option>
                    <option value="OWNED_COUNT">🃏 보유 수량순 (중복 카드순)</option>
                  </select>
                </div>

                {/* 오름차순 / 내림차순 토글 버튼 */}
                <button
                  onClick={() => setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-void-900 hover:bg-void-800 border border-amber-400/40 text-amber-300 text-xs font-mono font-black transition-all hover:scale-105 shadow-sm"
                  title="정렬 방향 전환"
                >
                  <span>{sortDirection === 'ASC' ? '▲ 오름차순' : '▼ 내림차순'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 페이지네이션 슬라이싱 & 고속 렌더링 & 스마트 페이지 네비게이터 */}
          {(() => {
            const totalFilteredCount = filteredCards.length;
            const totalPages = Math.max(1, Math.ceil(totalFilteredCount / ITEMS_PER_PAGE));
            const validPage = Math.min(Math.max(1, currentPage), totalPages);
            const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
            const paginatedCards = filteredCards.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            // 스마트 페이지 번호 생성 로직 (1, 2, 3, 4, 5... 이전/다음)
            const getPageNumbers = () => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (validPage > 3) pages.push('...');
                
                const start = Math.max(2, validPage - 1);
                const end = Math.min(totalPages - 1, validPage + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                
                if (validPage < totalPages - 2) pages.push('...');
                pages.push(totalPages);
              }
              return pages;
            };

            const handlePageChange = (page: number) => {
              if (page < 1 || page > totalPages) return;
              setCurrentPage(page);
              sound.playClick();
              // 부드럽게 상단으로 스크롤 이동
              window.scrollTo({ top: 380, behavior: 'smooth' });
            };

            return (
              <>
                {/* 상단 미니 페이지 현황 안내 */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2">
                  <span>
                    총 <strong className="text-pink-300 font-bold">{totalFilteredCount}</strong>장 중{' '}
                    <strong className="text-amber-300">{totalFilteredCount > 0 ? startIndex + 1 : 0}</strong> -{' '}
                    <strong className="text-amber-300">{Math.min(startIndex + ITEMS_PER_PAGE, totalFilteredCount)}</strong>번째 카드
                  </span>
                  <span>
                    페이지 <strong className="text-white font-bold">{validPage}</strong> / {totalPages}
                  </span>
                </div>

                {/* Cards Grid (1페이지당 24장만 렌더링하여 초고속 반응속도 유지) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
                  {paginatedCards.map(card => {
                    const isXR = card.rarity === 'XR' || card.id === 'card_xr_transcendent_park_741';
                    const rawCount = collection[card.id] || 0;
                    const count = isXR ? Math.min(1, rawCount) : rawCount;
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

                {/* 하단 스마트 페이지네이션 컨트롤러 바 */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-6 py-4 px-3 bg-void-950/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                    {/* 이전 페이지 버튼 */}
                    <button
                      disabled={validPage === 1}
                      onClick={() => handlePageChange(validPage - 1)}
                      className={`px-3 sm:px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1 ${
                        validPage === 1
                          ? 'text-slate-600 bg-void-900 border border-white/5 cursor-not-allowed'
                          : 'text-slate-200 bg-void-900 hover:bg-void-800 hover:text-white border border-white/15 cursor-pointer hover:scale-105'
                      }`}
                    >
                      ◀ 이전
                    </button>

                    {/* 페이지 번호 버튼들 (1, 2, 3, 4 ...) */}
                    {getPageNumbers().map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-slate-500 font-mono text-xs select-none">
                            •••
                          </span>
                        );
                      }

                      const pageNum = p as number;
                      const isCurrent = pageNum === validPage;

                      return (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                            isCurrent
                              ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white shadow-lg shadow-pink-950/60 border border-white/40 scale-105'
                              : 'text-slate-300 bg-void-900 hover:bg-void-800 hover:text-white border border-white/10 hover:scale-105'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* 다음 페이지 버튼 */}
                    <button
                      disabled={validPage === totalPages}
                      onClick={() => handlePageChange(validPage + 1)}
                      className={`px-3 sm:px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1 ${
                        validPage === totalPages
                          ? 'text-slate-600 bg-void-900 border border-white/5 cursor-not-allowed'
                          : 'text-slate-200 bg-void-900 hover:bg-void-800 hover:text-white border border-white/15 cursor-pointer hover:scale-105'
                      }`}
                    >
                      다음 ▶
                    </button>
                  </div>
                )}
              </>
            );
          })()}
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
              const isCompleted = set.cardIds.length > 0 && ownedInSet === set.cardIds.length;
              const memberCards = set.cardIds
                .map(id => MASTER_CARDS.find(c => c.id === id))
                .filter((c): c is Card => !!c);
              const r = set.rewardCard.rarity;
              const isClaimed = claimedSetRewards.includes(set.setId);

              if (memberCards.length === 0) return null;



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
                      <span className="text-[10.5px] font-mono font-black text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-500/30">
                        📦 {set.packCode} {set.packName ? `• ${set.packName}` : ''}
                      </span>
                      <h3 className="text-lg sm:text-xl font-serif font-black text-white ml-1">
                        {set.setTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {isCompleted ? (
                        isClaimed ? (
                          <span className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/40 whitespace-nowrap shadow-lg">
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            <span>+{set.rewardCoins.toLocaleString()} N COIN 수령 완료</span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onClaimSetReward) {
                                onClaimSetReward(set.setId, set.rewardCoins);
                              }
                            }}
                            className="flex items-center gap-2 text-xs sm:text-sm font-mono font-black text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-yellow-300 hover:to-amber-300 px-5 py-2 rounded-full shadow-2xl shadow-amber-500/50 animate-bounce hover:scale-105 transition-all cursor-pointer border border-white"
                          >
                            <Sparkles size={16} className="text-black" />
                            <span>🎁 +{set.rewardCoins.toLocaleString()} N COIN 받기!</span>
                          </button>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-slate-300 bg-void-950 px-3.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap">
                          <Lock size={14} className="text-slate-400" /> 수집 현황: <strong className="text-pink-400">{ownedInSet}</strong> / {set.cardIds.length}
                          <span className="text-amber-300 ml-1 font-extrabold">(완성 시 +{set.rewardCoins.toLocaleString()} N COIN)</span>
                        </span>
                      )}
                    </div>
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

                  {/* Reward Banner (대형 보상 세트 카드 및 머니 보상 인스펙터 바) */}
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
                          <span className="text-xs font-mono font-black text-amber-300 bg-black/70 px-2 py-0.5 rounded-lg border border-amber-500/30">
                            🪙 +{set.rewardCoins.toLocaleString()} N COIN 지급
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {isCompleted ? '👉 터치하여 전설의 풀아트 세트 카드를 감상하세요!' : '6명의 멤버 카드를 모두 수집하면 게임 머니와 전설의 세트 카드가 해금됩니다.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
                      <span className="text-amber-300 font-black bg-black/60 px-3 py-1.5 rounded-xl border border-amber-500/30 whitespace-nowrap">
                        ✨ SPECIAL FULL-ART
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🎺 [XR] 초월 카드 (박진영 카드) 빵빠레 자동 습득 축하 시네마틱 팝업 모달 */}
      <AnimatePresence>
        {showXrCelebrationModal && xrCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            {/* 앰비언트 배경 블러 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowXrCelebrationModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />

            {/* 🎊 화려한 팡파레 컨페티 폭죽 효과 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-rose-600/30 blur-3xl animate-pulse" />
              <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-amber-400/25 blur-3xl animate-pulse" />
            </div>

            {/* 메인 축하 모달 박스 */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative z-20 w-full max-w-2xl bg-gradient-to-b from-[#1a052e] via-void-950 to-black border-2 border-rose-400/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(244,63,94,0.5)] flex flex-col items-center text-center gap-5"
            >
              {/* 상단 팡파레 축하 헤더 */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 via-purple-500 to-amber-400 text-white font-mono font-black text-xs sm:text-sm shadow-xl animate-bounce">
                  <PartyPopper size={16} />
                  <span>🎺 축하합니다! 모든 카드 수집 달성!</span>
                  <Crown size={16} />
                </div>

                <h2 className="font-serif font-black text-2xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-amber-200 to-yellow-100 drop-shadow-md">
                  [XR] 궁극의 초월 카드 획득!
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-lg leading-relaxed">
                  모든 카드를 정복한 마스터 엔써에게 바치는 궁극의 신의 카드!
                  <br />
                  <strong className="text-rose-300 font-bold">👑 초월 카드 (박진영)</strong>가 컬렉션에 자동으로 지급되었습니다!
                </p>
              </div>

              {/* 초대형 거대 3D 박진영 초월 카드 비주얼 */}
              <div className="relative transform hover:scale-105 transition-transform duration-300 my-1">
                <CardVisual
                  card={xrCard}
                  finishType="TRANSCENDENT_COSMIC"
                  isOwned={true}
                  count={1}
                  size="lg"
                  className="w-64 sm:w-76 h-[370px] sm:h-[450px] shadow-[0_0_40px_rgba(244,63,94,0.6)]"
                />
              </div>

              {/* 하단 확인 버튼 */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowXrCelebrationModal(false);
                }}
                className="w-full max-w-md py-3.5 px-8 rounded-2xl font-serif font-black text-sm sm:text-base bg-gradient-to-r from-rose-600 via-amber-500 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-2xl shadow-rose-950/80 flex items-center justify-center gap-2 hover:scale-105 transition-all cursor-pointer border-2 border-white ring-4 ring-rose-500/50"
              >
                <Sparkles size={18} className="text-yellow-200" />
                <span>박진영 초월 카드 컬렉션에 보관하기</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Card Detail Modal */}
      <CardModal
        card={selectedCard}
        count={selectedCard ? collection[selectedCard.id] || 0 : 0}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onAddCoins={onAddCoins}
      />
    </div>
  );
};
