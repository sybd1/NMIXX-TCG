import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardTradeListing } from '../../types/multiplayer';
import { MultiplayerService } from '../../services/multiplayerService';
import { AuthService } from '../../services/authService';
import { sound } from '../../services/soundService';
import { MASTER_CARDS } from '../../data/cards';
import { CardVisual } from '../Card/CardVisual';
import { ArrowLeftRight, Plus, RefreshCw, X, Check, AlertCircle } from 'lucide-react';

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Record<string, number>;
  onTradeCompleted: (offeredCardId: string, receivedCardId: string) => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  isOpen,
  onClose,
  collection,
  onTradeCompleted,
}) => {
  const [listings, setListings] = useState<CardTradeListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MARKET' | 'CREATE'>('MARKET');

  // 등록 폼 상태
  const [selectedOfferCardId, setSelectedOfferCardId] = useState<string>('');
  const [selectedWantedCardId, setSelectedWantedCardId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const currentUser = AuthService.getCurrentUser();

  const loadListings = async () => {
    setIsLoading(true);
    const list = await MultiplayerService.fetchTradeListings();
    setListings(list);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadListings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 내가 2장 이상 보유한 중복 카드 목록 (XR 제외)
  const duplicateCards = MASTER_CARDS.filter(
    (c) => (collection[c.id] || 0) >= 2 && c.rarity !== 'XR'
  );

  // 내가 아직 미보유한 위시 카드 목록
  const unownedCards = MASTER_CARDS.filter(
    (c) => (collection[c.id] || 0) === 0 && c.rarity !== 'XR'
  );

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferCardId || !selectedWantedCardId) {
      setFeedback({ success: false, message: '제공할 카드와 원하는 카드를 모두 선택해 주세요.' });
      return;
    }

    const offerCard = MASTER_CARDS.find((c) => c.id === selectedOfferCardId);
    const wantedCard = MASTER_CARDS.find((c) => c.id === selectedWantedCardId);
    if (!offerCard || !wantedCard) return;

    setIsSubmitting(true);
    const result = await MultiplayerService.createTradeListing(
      currentUser || {
        id: 'guest',
        provider: 'guest',
        email: 'guest@nmixx-tcg.local',
        displayName: '엔써_익명',
        avatarUrl: '/cards/card_001.jpg',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        isCloudSynced: false,
        securityHash: '',
      },
      offerCard,
      wantedCard
    );

    setIsSubmitting(false);
    if (result.success) {
      sound.playLegendaryReveal();
      setFeedback({ success: true, message: '🎉 거래소에 카드가 성공적으로 등록되었습니다!' });
      setSelectedOfferCardId('');
      setSelectedWantedCardId('');
      loadListings();
      setTimeout(() => setActiveTab('MARKET'), 1200);
    } else {
      setFeedback({ success: false, message: result.error || '거래 등록 실패' });
    }
  };

  const handleExchange = async (listing: CardTradeListing) => {
    // 내가 원하는 카드(listing.wantedCardId)를 최소 1장 이상 보유하고 있는지 확인
    const myOwnedWantedCount = collection[listing.wantedCardId] || 0;
    if (myOwnedWantedCount < 1) {
      sound.playClick();
      alert(`교환에 필요한 [${listing.wantedCardName}] 카드를 보유하고 있지 않습니다.`);
      return;
    }

    sound.playMythicReveal();
    const success = await MultiplayerService.completeTrade(
      listing.id,
      currentUser || {
        id: 'guest',
        provider: 'guest',
        email: 'guest@nmixx-tcg.local',
        displayName: '엔써_교환자',
        avatarUrl: '/cards/card_002.jpg',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        isCloudSynced: false,
        securityHash: '',
      }
    );

    if (success) {
      // 내 인벤토리에서 listing.wantedCardId 차감하고 listing.offeredCardId 획득
      onTradeCompleted(listing.wantedCardId, listing.offeredCardId);
      loadListings();
      alert(`🎉 [${listing.offeredCardName}] 카드로의 1:1 맞교환이 성공적으로 완료되었습니다!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl select-text">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="relative w-full max-w-3xl bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-cyan-500/40 p-5 sm:p-7 rounded-3xl shadow-2xl shadow-cyan-950/60 flex flex-col gap-4 max-h-[90vh] overflow-hidden"
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
            <span className="p-2 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-black shadow-lg shadow-cyan-500/30">
              <ArrowLeftRight size={20} className="text-black" />
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-pink-100 to-amber-200">
              실시간 엔써 중복 카드 1:1 교환소
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            남는 중복 카드를 올리고 내가 없는 위시 카드와 실시간으로 맞교환하세요!
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center justify-between gap-2 p-1 bg-void-950 rounded-2xl border border-white/10">
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => {
                setActiveTab('MARKET');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'MARKET'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw size={13} />
              <span>실시간 등록 매물 ({listings.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('CREATE');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'CREATE'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus size={13} />
              <span>내 중복 카드 거래 등록</span>
            </button>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'MARKET' ? (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[300px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 font-mono text-xs">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>실시간 거래소 매물 조회 중...</span>
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 font-mono text-xs gap-2">
                <AlertCircle size={24} className="text-cyan-500/50" />
                <span>현재 등록된 교환 매물이 없습니다. 최초로 카드를 등록해 보세요!</span>
              </div>
            ) : (
              listings.map((item) => {
                const isMyListing = currentUser && item.sellerUid === currentUser.id;
                const canTrade = (collection[item.wantedCardId] || 0) >= 1 && !isMyListing;

                const offerCard = MASTER_CARDS.find((c) => c.id === item.offeredCardId);
                const wantedCard = MASTER_CARDS.find((c) => c.id === item.wantedCardId);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-void-950/70 border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    {/* 판매자 정보 */}
                    <div className="flex items-center gap-2.5 self-start sm:self-center min-w-[120px]">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-cyan-400/40 flex-shrink-0 bg-black">
                        <img
                          src={item.sellerAvatar || '/cards/card_001.jpg'}
                          alt={item.sellerName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {item.sellerName}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          {isMyListing ? '(내가 등록한 매물)' : '엔써 교환 요청'}
                        </span>
                      </div>
                    </div>

                    {/* 교환 매물 카드 카드 비교 뷰 */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-1">
                      {/* 1. 상대방이 주는 카드 */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          [상대가 주는 카드]
                        </span>
                        {offerCard && (
                          <div className="w-16 sm:w-20">
                            <CardVisual card={offerCard} isOwned={true} size="sm" />
                          </div>
                        )}
                        <span className="text-[11px] font-mono text-slate-300 font-bold text-center truncate max-w-[100px]">
                          {item.offeredCardName}
                        </span>
                      </div>

                      <div className="p-2 rounded-full bg-void-800 border border-white/10 text-cyan-300">
                        <ArrowLeftRight size={16} />
                      </div>

                      {/* 2. 상대방이 원하는 카드 */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono text-pink-400 font-bold">
                          [상대가 원하는 카드]
                        </span>
                        {wantedCard && (
                          <div className="w-16 sm:w-20">
                            <CardVisual
                              card={wantedCard}
                              isOwned={(collection[item.wantedCardId] || 0) > 0}
                              count={collection[item.wantedCardId] || 0}
                              size="sm"
                            />
                          </div>
                        )}
                        <span className="text-[11px] font-mono text-slate-300 font-bold text-center truncate max-w-[100px]">
                          {item.wantedCardName}
                        </span>
                      </div>
                    </div>

                    {/* 교환 실행 버튼 */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 w-full sm:w-auto">
                      {isMyListing ? (
                        <span className="px-4 py-2 rounded-xl bg-void-800 border border-white/10 text-slate-400 text-xs font-mono font-bold text-center w-full sm:w-auto">
                          대기 중
                        </span>
                      ) : (
                        <button
                          disabled={!canTrade}
                          onClick={() => handleExchange(item)}
                          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto shadow-md ${
                            canTrade
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/30 hover:scale-105 cursor-pointer'
                              : 'bg-void-800 text-slate-500 cursor-not-allowed border border-white/5'
                          }`}
                        >
                          <Check size={13} />
                          <span>{canTrade ? '맞교환하기' : '보유 카드 없음'}</span>
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">
                        내 보유: <span className="text-white font-bold">{collection[item.wantedCardId] || 0}</span>장
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ➕ 내 중복 카드 거래 등록 탭 */
          <form onSubmit={handleCreateListing} className="flex flex-col gap-4 flex-1 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. 내가 상대에게 줄 중복 카드 선택 */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-void-950/80 border border-emerald-500/30">
                <label className="text-xs font-mono font-bold text-emerald-300">
                  1. 내가 제공할 중복 카드 (2장 이상 보유)
                </label>
                {duplicateCards.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-4 text-center">
                    거래 가능한 중복 카드(2장 이상)가 없습니다.
                  </p>
                ) : (
                  <select
                    value={selectedOfferCardId}
                    onChange={(e) => setSelectedOfferCardId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black border border-emerald-500/40 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">제공할 카드 선택...</option>
                    {duplicateCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.rarity}] {c.name} (보유: {collection[c.id]}장)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. 내가 받고 싶은 위시 카드 선택 */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-void-950/80 border border-pink-500/30">
                <label className="text-xs font-mono font-bold text-pink-300">
                  2. 내가 받고 싶은 위시 카드 (미보유)
                </label>
                <select
                  value={selectedWantedCardId}
                  onChange={(e) => setSelectedWantedCardId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-pink-500/40 text-slate-100 font-mono text-xs focus:outline-none focus:border-pink-400"
                >
                  <option value="">받고 싶은 카드 선택...</option>
                  {(unownedCards.length > 0 ? unownedCards : MASTER_CARDS.filter(c => c.rarity !== 'XR')).map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.rarity}] {c.name} ({c.member})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-sans flex items-center gap-2 ${
                  feedback.success
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                }`}
              >
                <span>{feedback.success ? '🎉' : '⚠️'}</span>
                <span>{feedback.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || duplicateCards.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 text-white font-mono text-sm font-black shadow-lg shadow-purple-950/60 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '거래소 등록 처리 중...' : '교환소에 1:1 맞교환 매물 등록하기'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
