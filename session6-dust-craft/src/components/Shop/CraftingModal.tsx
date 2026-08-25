import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Rarity, NmixxMember } from '../../types/card';
import { MASTER_CARDS } from '../../data/cards';
import { RARITY_CONFIGS } from '../../config/gameConfig';
import { X, Trash2, Hammer, Search, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { sound } from '../../services/soundService';

interface CraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dust: number;
  collection: Record<string, number>;
  onDismantleAll: () => { success: boolean; dustGained: number; dismantledCount: number };
  onCraftCard: (cardId: string) => { success: boolean; card?: Card; error?: string };
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  onClose,
  dust,
  collection,
  onDismantleAll,
  onCraftCard,
}) => {
  const [activeTab, setActiveTab] = useState<'DISMANTLE' | 'CRAFT'>('DISMANTLE');
  
  // Craft Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<NmixxMember | 'ALL'>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<Rarity | 'ALL'>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'OWNED' | 'MISSING'>('MISSING');
  
  // Notification status
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Calculate duplicates stats
  const duplicatesInfo = useMemo(() => {
    let totalDuplicates = 0;
    let potentialDust = 0;
    const items: { card: Card; count: number; dustPerCard: number; totalDust: number }[] = [];

    MASTER_CARDS.forEach(card => {
      const count = collection[card.id] || 0;
      if (count > 1) {
        const duplicatesCount = count - 1;
        const dustPerCard = RARITY_CONFIGS[card.rarity]?.dustDismantle || 0;
        totalDuplicates += duplicatesCount;
        potentialDust += dustPerCard * duplicatesCount;
        items.push({
          card,
          count: duplicatesCount,
          dustPerCard,
          totalDust: dustPerCard * duplicatesCount
        });
      }
    });

    return { totalDuplicates, potentialDust, items };
  }, [collection]);

  // Filter craftable cards
  const craftableCards = useMemo(() => {
    return MASTER_CARDS.filter(card => {
      // Exclude Set Rewards and cards that cannot be crafted (null dustCraft)
      if (card.isSetReward) return false;
      const craftCost = RARITY_CONFIGS[card.rarity]?.dustCraft;
      if (craftCost === null || craftCost === undefined) return false;

      // Filter by Member
      if (selectedMember !== 'ALL' && card.member !== selectedMember) return false;
      
      // Filter by Rarity
      if (selectedRarity !== 'ALL' && card.rarity !== selectedRarity) return false;

      // Filter by Ownership
      const owned = (collection[card.id] || 0) > 0;
      if (ownershipFilter === 'OWNED' && !owned) return false;
      if (ownershipFilter === 'MISSING' && owned) return false;

      // Filter by Search Term
      if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [selectedMember, selectedRarity, ownershipFilter, searchTerm, collection]);

  const handleDismantleAll = () => {
    if (duplicatesInfo.totalDuplicates === 0) {
      showNotification('error', '분해할 중복 카드가 없습니다.');
      return;
    }

    sound.playClick();
    const result = onDismantleAll();
    if (result.success) {
      showNotification('success', `중복 카드 ${result.dismantledCount}장을 분해하여 ✨ ${result.dustGained} 더스트를 획득했습니다!`);
    } else {
      showNotification('error', '분해 처리에 실패했습니다.');
    }
  };

  const handleCraft = (card: Card) => {
    const cost = RARITY_CONFIGS[card.rarity]?.dustCraft;
    if (!cost) return;

    if (dust < cost) {
      showNotification('error', '보유한 더스트가 부족합니다.');
      return;
    }

    sound.playClick();
    const result = onCraftCard(card.id);
    if (result.success) {
      showNotification('success', `✨ ${card.name} 제작에 성공했습니다!`);
    } else {
      showNotification('error', result.error || '제작 처리에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-5xl h-[85vh] bg-gradient-to-b from-void-900 via-void-950 to-black border border-purple-500/30 rounded-3xl p-6 flex flex-col gap-6 shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Hammer size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-black text-slate-100">크래프팅 & 더스트 공방</h2>
                <p className="text-xs text-slate-400 font-medium">중복 카드를 더스트로 분해하고, 원하는 카드를 확정 제작하세요.</p>
              </div>
            </div>

            {/* Current Dust Display */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-purple-950/45 border border-purple-500/40 px-4 py-2 rounded-2xl shadow-inner">
                <span className="text-purple-400 text-sm">✨</span>
                <span className="font-mono text-base font-black text-purple-300">
                  {dust.toLocaleString()}
                </span>
                <span className="font-mono text-xs font-bold text-purple-400/80">DUST</span>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-void-900 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg border text-sm font-bold font-sans ${
                  notification.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300'
                }`}
              >
                {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs Switch */}
          <div className="flex items-center gap-2 border-b border-void-800 pb-2">
            <button
              onClick={() => setActiveTab('DISMANTLE')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-serif font-black text-xs md:text-sm tracking-wider transition-all cursor-pointer ${
                activeTab === 'DISMANTLE'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white bg-void-900/60 border border-void-800'
              }`}
            >
              <Trash2 size={15} />
              중복 카드 일괄 분해 ({duplicatesInfo.totalDuplicates}장 대기)
            </button>

            <button
              onClick={() => setActiveTab('CRAFT')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-serif font-black text-xs md:text-sm tracking-wider transition-all cursor-pointer ${
                activeTab === 'CRAFT'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-950/50'
                  : 'text-slate-400 hover:text-white bg-void-900/60 border border-void-800'
              }`}
            >
              <Hammer size={15} />
              원하는 카드 확정 제작
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'DISMANTLE' ? (
              <div className="flex flex-col gap-6 p-4 items-center justify-center h-full max-w-2xl mx-auto text-center">
                <div className="w-24 h-24 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-200">보유 중인 중복 카드 일괄 분해</h3>
                <p className="text-slate-400 text-sm max-w-md">
                  수집 보관용 1장을 제외한 모든 중복 수집된 카드를 자동으로 일괄 용해하여 크래프팅 더스트로 전환합니다.
                </p>

                <div className="grid grid-cols-2 gap-4 w-full mt-4 bg-void-900/60 p-6 rounded-2xl border border-void-800">
                  <div className="flex flex-col items-center justify-center p-4 bg-void-950 border border-white/5 rounded-xl">
                    <span className="text-xs text-slate-400 mb-1">분해 대상 카드</span>
                    <span className="text-2xl font-mono font-black text-indigo-300">{duplicatesInfo.totalDuplicates}장</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-void-950 border border-white/5 rounded-xl">
                    <span className="text-xs text-slate-400 mb-1">예상 획득 더스트</span>
                    <span className="text-2xl font-mono font-black text-purple-300">✨ +{duplicatesInfo.potentialDust.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleDismantleAll}
                  disabled={duplicatesInfo.totalDuplicates === 0}
                  className={`w-full py-4 rounded-2xl font-black tracking-wide text-base transition-all mt-6 shadow-lg shadow-purple-950/50 cursor-pointer ${
                    duplicatesInfo.totalDuplicates > 0
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white hover:scale-[1.02]'
                      : 'bg-void-900 border border-void-800 text-slate-500 cursor-not-allowed border-dashed'
                  }`}
                >
                  {duplicatesInfo.totalDuplicates > 0 ? '중복 카드 일괄 분해하기' : '분해할 중복 카드가 없습니다'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 h-full">
                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center gap-3 bg-void-900/50 p-4 rounded-2xl border border-void-800/80">
                  {/* Search Bar */}
                  <div className="flex-1 min-w-[200px] relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="카드 이름으로 검색..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-void-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors font-sans"
                    />
                  </div>

                  {/* Ownership Filter */}
                  <select
                    value={ownershipFilter}
                    onChange={e => setOwnershipFilter(e.target.value as any)}
                    className="bg-void-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="ALL">전체 상태</option>
                    <option value="OWNED">보유 중인 카드</option>
                    <option value="MISSING">미보유 (잠긴 카드)</option>
                  </select>

                  {/* Rarity Filter */}
                  <select
                    value={selectedRarity}
                    onChange={e => setSelectedRarity(e.target.value as any)}
                    className="bg-void-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="ALL">모든 등급</option>
                    <option value="C">C등급 (50 더스트)</option>
                    <option value="UC">UC등급 (150 더스트)</option>
                    <option value="R">R등급 (400 더스트)</option>
                    <option value="SR">SR등급 (1,200 더스트)</option>
                    <option value="SSR">SSR등급 (5,000 더스트)</option>
                    <option value="UR">UR등급 (15,000 더스트)</option>
                    <option value="LR">LR등급 (40,000 더스트)</option>
                  </select>

                  {/* Member Filter */}
                  <select
                    value={selectedMember}
                    onChange={e => setSelectedMember(e.target.value as any)}
                    className="bg-void-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="ALL">모든 멤버</option>
                    <option value="LILY">LILY</option>
                    <option value="HAEWON">HAEWON</option>
                    <option value="SULLYOON">SULLYOON</option>
                    <option value="BAE">BAE</option>
                    <option value="JIWOO">JIWOO</option>
                    <option value="KYUJIN">KYUJIN</option>
                    <option value="NMIXX">단체</option>
                  </select>
                </div>

                {/* Cards Grid */}
                {craftableCards.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                    <Info size={36} className="text-slate-500 mb-2" />
                    <span>조건에 맞는 제작 가능 카드가 없습니다.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pb-6">
                    {craftableCards.map(card => {
                      const cost = RARITY_CONFIGS[card.rarity]?.dustCraft || 0;
                      const isOwned = (collection[card.id] || 0) > 0;
                      const config = RARITY_CONFIGS[card.rarity];
                      
                      return (
                        <div
                          key={card.id}
                          className="bg-void-900 border border-white/10 rounded-2xl p-3 flex flex-col justify-between gap-3 shadow-inner hover:border-purple-500/50 transition-all hover:scale-[1.01]"
                        >
                          <div>
                            {/* Rarity & Member Badge */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${config.badgeBg}`}>
                                {card.rarity}
                              </span>
                              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded-lg border border-purple-500/20 font-bold">
                                {card.member}
                              </span>
                            </div>

                            {/* Card Name */}
                            <h4 className="text-slate-200 text-xs font-bold font-sans line-clamp-1 mb-1">
                              {card.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono">
                              No. #{String(card.collectionNumber).padStart(3, '0')}
                            </p>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleCraft(card)}
                            disabled={dust < cost}
                            className={`w-full py-2 rounded-xl text-[11px] font-mono font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isOwned
                                ? 'bg-void-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/20'
                                : dust >= cost
                                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white'
                                : 'bg-void-950 border border-void-800 text-slate-600 cursor-not-allowed border-dashed'
                            }`}
                          >
                            <Hammer size={12} />
                            <span>{cost.toLocaleString()}</span>
                            {isOwned && <span className="text-[8px] bg-emerald-500/20 px-1 rounded font-bold">보유</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
