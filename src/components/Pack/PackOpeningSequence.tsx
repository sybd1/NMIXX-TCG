import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevealedCard, Rarity } from '../../types/card';
import { PackOpeningState } from '../../types/game';
import { CardFlip } from '../Card/CardFlip';
import { CardModal } from '../Card/CardModal';
import { SecretRevealEffect } from '../RevealAnimation/SecretRevealEffect';
import { sound } from '../../services/soundService';
import { Home, X, Zap, Sparkles } from 'lucide-react';
import { BoosterPackConfig, BOOSTER_PACKS, RARITY_CONFIGS } from '../../config/gameConfig';
import { MASTER_CARDS } from '../../data/cards';

interface PackOpeningSequenceProps {
  cards: RevealedCard[];
  pack?: BoosterPackConfig;
  packCount?: number;
  cost?: number;
  coins?: number;
  pityCount?: number;
  collection?: Record<string, number>;
  onFinish: () => void;
  onOpenAnother: () => void;
  onOpenPackCount?: (count: 1 | 5 | 10) => void;
  canAffordAnother?: boolean;
}

export const PackOpeningSequence: React.FC<PackOpeningSequenceProps> = ({
  cards,
  pack = BOOSTER_PACKS[0],
  packCount = Math.max(1, Math.round(cards.length / 5)),
  cost = 100,
  coins = 100_000_000,
  pityCount = 0,
  collection = {},
  onFinish,
  onOpenAnother,
  onOpenPackCount,
}) => {
  const [step, setStep] = useState<PackOpeningState>('DIM_BG');
  // 중복 카드를 x2, x3로 합치고, NEW 카드를 맨 앞으로 모아서 고등급 순으로 정렬
  const mergeDuplicateCards = (rawCards: RevealedCard[]) => {
    const cardMap = new Map<string, RevealedCard>();
    const countsMap = new Map<string, number>();

    rawCards.forEach(card => {
      const currentCount = countsMap.get(card.id) || 0;
      countsMap.set(card.id, currentCount + 1);

      if (!cardMap.has(card.id)) {
        cardMap.set(card.id, { ...card });
      } else {
        const existing = cardMap.get(card.id)!;
        if (card.isNew) existing.isNew = true;
      }
    });

    const mergedList: RevealedCard[] = [];
    cardMap.forEach((card, id) => {
      mergedList.push({
        ...card,
        duplicateCount: countsMap.get(id) || 1,
      });
    });

    const rank: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, SSR: 5, UR: 6, LR: 7, MR: 8, XR: 9 };

    return mergedList.sort((a, b) => {
      // 1순위: 새로 획득한 카드 (NEW) 맨 앞으로 모음
      if (a.isNew !== b.isNew) {
        return a.isNew ? -1 : 1;
      }
      // 2순위: 높은 등급 우선
      if (rank[b.rarity] !== rank[a.rarity]) {
        return rank[b.rarity] - rank[a.rarity];
      }
      // 3순위: 중복 획득 수량이 많은 순 (x5 > x3 > x2 ...)
      return (b.duplicateCount || 1) - (a.duplicateCount || 1);
    });
  };

  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>(() => mergeDuplicateCards(cards));
  const [activeSpecialReveal, setActiveSpecialReveal] = useState<Rarity | null>(null);
  const [jackpotModalCard, setJackpotModalCard] = useState<RevealedCard | null>(null);
  const [selectedDetailCard, setSelectedDetailCard] = useState<RevealedCard | null>(null);

  // 새로운 카드가 들어왔을 때 상태 초기화 및 중복 합산 정렬
  useEffect(() => {
    setRevealedCards(mergeDuplicateCards(cards));
    setStep('DIM_BG');
    setJackpotModalCard(null);
    setSelectedDetailCard(null);
    const timer = setTimeout(() => setStep('PACK_ENTER'), 300);
    return () => clearTimeout(timer);
  }, [cards]);

  // 사용자가 팩을 직접 클릭했을 때 팩 뜯기 애니메이션 시작
  const handleStartOpening = () => {
    if (step !== 'PACK_ENTER') return;

    sound.playPackShake();
    setStep('PACK_SHAKE');

    setTimeout(() => {
      sound.playPackGlow();
      setStep('PACK_GLOW');
    }, 450);

    setTimeout(() => {
      sound.playPackTear();
      setStep('PACK_TEAR');
    }, 900);

    setTimeout(() => {
      sound.playCardDeal();
      setStep('CARDS_DEALT');
    }, 1650);
  };

  // 키보드 Spacebar / Enter 원터치 단축키 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (jackpotModalCard) {
          e.preventDefault();
          setJackpotModalCard(null);
          return;
        }
        if (selectedDetailCard) {
          e.preventDefault();
          setSelectedDetailCard(null);
          return;
        }

        if (step === 'PACK_ENTER') {
          e.preventDefault();
          handleStartOpening();
        } else if (['CARDS_DEALT', 'REVEALING'].includes(step)) {
          e.preventDefault();
          handleRevealAll();
        } else if (step === 'SUMMARY') {
          e.preventDefault();
          if (coins >= cost) {
            if (onOpenPackCount) onOpenPackCount(packCount as (1 | 5 | 10));
            else onOpenAnother();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, jackpotModalCard, selectedDetailCard, coins, cost, packCount]);

  // 카드 클릭 핸들러 (미공개 시 뒤집기, 이미 뒤집힌 후 클릭 시 상세 모달 열람)
  const handleCardClick = (index: number) => {
    const card = revealedCards[index];
    if (!card) return;

    if (card.isFlipped) {
      // 이미 뒤집힌 상태에서 클릭 시 상세 정보 모달 열기!
      setSelectedDetailCard(card);
      return;
    }

    // 9단계 Rarity별 사운드 & 특수 연출 재생
    if (card.rarity === 'MR') {
      sound.playSecretReveal();
      setActiveSpecialReveal('MR');
      setJackpotModalCard(card);
    } else if (card.rarity === 'LR') {
      sound.playMythicReveal();
      setActiveSpecialReveal('LR');
      setJackpotModalCard(card);
    } else if (card.rarity === 'UR') {
      sound.playLegendaryReveal();
      setActiveSpecialReveal('UR');
      setJackpotModalCard(card);
    } else if (card.rarity === 'SSR') {
      sound.playLegendaryReveal();
      setActiveSpecialReveal('SSR');
      setJackpotModalCard(card);
    } else if (card.rarity === 'SR') {
      sound.playEpicReveal();
    } else if (card.rarity === 'R') {
      sound.playRareReveal();
    } else {
      sound.playCardFlip();
    }

    setRevealedCards(prev => {
      const next = [...prev];
      next[index] = { ...next[index], isFlipped: true };
      return next;
    });

    // 모든 카드가 뒤집혔는지 확인
    const allFlipped = revealedCards.every((c, i) => (i === index ? true : c.isFlipped));
    if (allFlipped) {
      setTimeout(() => setStep('SUMMARY'), 600);
    }
  };

  // 모든 카드 한번에 뒤집기 (즉시 전체 공개 및 최고 등급 팝업)
  const handleRevealAll = () => {
    const highestCard = [...revealedCards].sort((a, b) => {
      const rank: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, SSR: 5, UR: 6, LR: 7, MR: 8, XR: 9 };
      return rank[b.rarity] - rank[a.rarity];
    })[0];

    sound.playEpicReveal();
    if (['MR', 'LR', 'UR', 'SSR', 'XR'].includes(highestCard?.rarity)) {
      setActiveSpecialReveal(highestCard.rarity);
      setJackpotModalCard(highestCard);
    }

    // 모든 카드를 즉시 뒤집기
    setRevealedCards(prev => prev.map(c => ({ ...c, isFlipped: true })));
    // 즉시 SUMMARY 상태로 전환하여 추가 오픈 버튼 노출
    setStep('SUMMARY');
  };

  const flippedCount = revealedCards.filter(c => c.isFlipped).length;
  const totalCount = revealedCards.length;

  // Rarity 통계 집계
  const rarityStats: Partial<Record<Rarity, number>> = {};
  revealedCards.forEach(c => {
    rarityStats[c.rarity] = (rarityStats[c.rarity] || 0) + 1;
  });

  // 현재 개봉 중인 부스터 팩의 실시간 수집률
  const currentPackId = pack?.id || 'op01';
  const packMasterCards = MASTER_CARDS.filter(c => c.packId === currentPackId);
  const packTotalCards = packMasterCards.length || 150;
  const packOwnedCards = packMasterCards.filter(c => (collection[c.id] || 0) > 0).length;
  const packProgressPct = Math.round((packOwnedCards / packTotalCards) * 1000) / 10;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#070210] overflow-y-auto py-5 px-3 select-none">
      {/* 🌌 NMIXX MIXXTOPIA 앰비언트 우주 네뷸라 배경 효과 (GPU 가속 최적화) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
        {/* 심우주 그라데이션 베이스 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d041e] via-[#14082e] to-[#04010a]" />

        {/* 몽환적인 오로라 네뷸라 글로우 오라 (모바일 GPU 최적화) */}
        <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-pink-600/25 blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />

        {/* 미세 별빛 입자 효과 */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      {/* 상단 고정 네비게이션: 메인 나가기 & 실시간 잔여 코인 */}
      <div className="sticky top-0 z-30 w-full max-w-4xl flex items-center justify-between pointer-events-auto bg-void-950/85 backdrop-blur-xl px-3 sm:px-4 py-2 rounded-2xl border border-white/15 shadow-2xl shadow-purple-950/40 mb-2 gap-2 flex-wrap sm:flex-nowrap">
        <button
          onClick={onFinish}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-void-900/90 hover:bg-void-800 text-slate-200 border border-white/20 text-xs font-mono font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
        >
          <Home size={14} className="text-pink-400" />
          <span className="hidden xs:inline">메인으로</span>
        </button>

        {/* 🪙 실시간 보유 게임 머니 (코인) HUD */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono text-xs sm:text-sm font-black shadow-inner shadow-amber-950/40">
          <span className="text-amber-400 text-sm">🪙</span>
          <span className="tracking-tight text-white">{coins.toLocaleString()}</span>
          <span className="text-[10px] text-amber-300 font-extrabold">COIN</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 border border-pink-500/30 text-xs font-mono">
            <span className="text-pink-400 font-black">[{pack.code}]</span>
            <span className="text-slate-300 font-bold hidden md:inline truncate max-w-[110px]">{pack.name}</span>
            <span className="text-amber-300 font-extrabold ml-0.5">({totalCount}장)</span>
          </div>

          <button
            onClick={onFinish}
            className="p-1.5 rounded-full bg-void-900/90 hover:bg-void-800 text-slate-300 hover:text-white border border-white/20 transition-colors cursor-pointer"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 👑 초대형 실시간 천장(Pity) & 팩별 실시간 수집률 대시보드 HUD */}
      <div className="relative z-20 w-full max-w-4xl px-4 py-2.5 mb-2 bg-gradient-to-r from-purple-950/90 via-void-950 to-purple-950/90 backdrop-blur-xl rounded-2xl border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.35)] flex flex-col gap-2 pointer-events-auto">
        {/* 1. 천장 게이지 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black text-[11px] shadow-md shadow-amber-500/40">
                👑
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-amber-300 drop-shadow">
                  SSR+ 확정 천장
                </span>
                <span className="text-[10px] font-mono text-purple-300 font-bold hidden sm:inline">
                  (50회 시 미보유 SSR+ 100% 확정)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[11px] text-slate-300 font-bold">
                확정까지 <strong className="text-amber-300 font-black">{Math.max(0, 50 - pityCount)}</strong>회 남음
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-purple-500 text-black font-mono font-black text-xs shadow-md border border-white/50">
                {pityCount} / 50
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-black/90 rounded-full overflow-hidden border border-purple-400/50 shadow-inner relative p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 shadow-[0_0_15px_rgba(236,72,153,0.9)] transition-all duration-500 relative"
              style={{ width: `${Math.min(100, (pityCount / 50) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. 📦 현재 개봉 중인 팩 전용 실시간 수집률 Bar */}
        <div className="flex flex-col gap-1 pt-1.5 border-t border-purple-500/20">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-200 font-bold flex items-center gap-1.5">
              <span>📦</span>
              <span>[{pack.code}] {pack.name} 팩 수집률</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-pink-300 font-black">{packOwnedCards}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-300 font-bold">{packTotalCards}장</span>
              <span className="ml-1 text-amber-300 bg-amber-950/90 px-2 py-0.2 rounded-md border border-amber-500/40 text-[10.5px] font-black">
                {packProgressPct}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-black/90 rounded-full overflow-hidden border border-white/10 relative p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-pink-500 to-amber-400 transition-all duration-500"
              style={{ width: `${packProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 1. SECRET / MYTHIC / LEGENDARY 시네마틱 오버레이 */}
      <AnimatePresence>
        {activeSpecialReveal && (
          <SecretRevealEffect
            rarity={activeSpecialReveal}
            onComplete={() => setActiveSpecialReveal(null)}
          />
        )}
      </AnimatePresence>

      {/* 2. 팩 개봉 시네마틱 애니메이션 (STEP 1 ~ STEP 5) */}
      {['DIM_BG', 'PACK_ENTER', 'PACK_SHAKE', 'PACK_GLOW', 'PACK_TEAR'].includes(step) && (
        <div className="relative z-10 flex flex-col items-center justify-center my-auto select-none">
          <motion.div
            initial={{ scale: 0.7, y: 70, opacity: 0 }}
            animate={
              step === 'PACK_SHAKE'
                ? { scale: 1, y: 0, opacity: 1, x: [-8, 8, -6, 6, -3, 3, 0] }
                : step === 'PACK_GLOW'
                ? { scale: 1.08, y: -8, opacity: 1 }
                : step === 'PACK_TEAR'
                ? { scale: 1.05, y: 30, opacity: 1 }
                : { scale: 1, y: 0, opacity: 1 }
            }
            whileHover={step === 'PACK_ENTER' ? { scale: 1.05, y: -6 } : {}}
            whileTap={step === 'PACK_ENTER' ? { scale: 0.96 } : {}}
            onClick={handleStartOpening}
            transition={{
              duration: step === 'PACK_SHAKE' ? 0.8 : 0.4,
              ease: 'easeInOut',
            }}
            className={`relative w-64 sm:w-72 h-[410px] sm:h-[430px] rounded-2xl [perspective:1200px] group ${
              step === 'PACK_ENTER' ? 'cursor-pointer' : ''
            }`}
          >
            {/* 팩 앰비언트 글로우 오라 */}
            <div
              className={`absolute -inset-4 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-500 ${
                step === 'PACK_GLOW' || step === 'PACK_TEAR' ? 'animate-pulse scale-110 opacity-100' : ''
              }`}
            />

            {/* 🌟 팩 찢기 단계 (PACK_TEAR): 팩 상단에서 솟구쳐 나오는 3D 카드 덱 (Ejecting Cards Stack) */}
            {step === 'PACK_TEAR' && (
              <div className="absolute inset-x-0 -top-20 z-40 flex items-center justify-center pointer-events-none [transform-style:preserve-3d]">
                {/* 5장의 카드가 비스듬히 부채꼴로 솟구쳐 나오는 연출 */}
                {[
                  { delay: 0.05, x: -35, y: -130, rot: -10, scale: 0.95 },
                  { delay: 0.1, x: -18, y: -110, rot: -5, scale: 0.97 },
                  { delay: 0.15, x: 0, y: -90, rot: 0, scale: 1.0 },
                  { delay: 0.2, x: 18, y: -70, rot: 5, scale: 1.02 },
                  { delay: 0.25, x: 35, y: -50, rot: 10, scale: 1.05 },
                ].map((pos, idx) => {
                  const cardItem = revealedCards[idx] || revealedCards[0];
                  return (
                    <motion.div
                      key={idx}
                      initial={{ y: 40, opacity: 0, scale: 0.6, rotate: 0 }}
                      animate={{
                        y: pos.y,
                        x: pos.x,
                        opacity: 1,
                        scale: pos.scale,
                        rotate: pos.rot,
                      }}
                      transition={{
                        duration: 0.55,
                        delay: pos.delay,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="absolute w-40 sm:w-44 h-56 sm:h-64 rounded-xl border-2 border-white shadow-[0_15px_35px_rgba(0,0,0,0.9)] overflow-hidden bg-black"
                      style={{
                        zIndex: 10 + idx,
                        transformOrigin: 'bottom center',
                      }}
                    >
                      {/* 대표 카드 이미지 & 등급 뱃지 */}
                      {cardItem && (
                        <>
                          <img
                            src={cardItem.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 border border-white/30 text-[9px] font-mono font-black text-amber-300">
                            {cardItem.rarity}
                          </div>
                          <div className="absolute bottom-1.5 inset-x-1.5 text-center font-serif font-black text-[10px] text-white truncate drop-shadow">
                            {cardItem.name}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}

                {/* 찢어질 때 터져나오는 은박/황금빛 스파크 파티클 (Foil Flakes & Sparks) */}
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className="foil-flake rounded-sm"
                    style={{
                      left: `${20 + (i * 4)}%`,
                      top: '10px',
                      width: `${4 + (i % 4) * 2}px`,
                      height: `${4 + (i % 3) * 2}px`,
                      ['--tw-translate-x' as string]: `${(i - 8) * 18}px`,
                      ['--tw-translate-y' as string]: `${-40 - (i % 5) * 16}px`,
                      animationDelay: `${(i % 5) * 0.04}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* 실물 TCG 규격 포일 팩 메인 본체 */}
            <div className="relative w-full h-full rounded-2xl border border-white/40 bg-black flex flex-col justify-between overflow-hidden shadow-2xl [transform-style:preserve-3d]">
              
              {/* 🌟 1. 최상단 비닐 톱니 압착 실링 (Sawtooth Crimped Top Seal) - 찢어질 때 대각선으로 날아감! */}
              <motion.div
                animate={
                  step === 'PACK_TEAR'
                    ? {
                        x: 180,
                        y: -90,
                        rotate: 35,
                        opacity: 0,
                        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                      }
                    : { x: 0, y: 0, rotate: 0, opacity: 1 }
                }
                className="relative z-30 w-full bg-gradient-to-b from-slate-700 via-slate-900 to-black/95 border-b border-white/25 px-3 pt-2.5 pb-2 flex flex-col items-center shadow-lg pack-crimped-top"
              >
                {/* 톱니형 압착 엠보싱 패턴 레이어 */}
                <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.3)_0px,rgba(255,255,255,0.3)_2px,transparent_2px,transparent_6px)] pointer-events-none" />
                
                {/* V자형 뜯는 홈 (Tear Notch Indicators) */}
                <div className="absolute -left-0.5 top-3 w-2 h-3 bg-black border-r border-white/40 [clip-path:polygon(0%_0%,100%_50%,0%_100%)] shadow-sm" />
                <div className="absolute -right-0.5 top-3 w-2 h-3 bg-black border-l border-white/40 [clip-path:polygon(100%_0%,0%_50%,100%_100%)] shadow-sm" />

                {/* 마트 매대 걸이용 타원형 행거 홀 (Sombrero Hanger Hole) */}
                <div className="w-8 h-2.5 rounded-full bg-black/95 border border-white/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] mb-1 z-10 flex items-center justify-center">
                  <div className="w-3 h-0.5 rounded-full bg-white/30" />
                </div>

                {/* 상단 메타 뱃지 (팩 코드 & 공식 라이선스 마크) */}
                <div className="w-full flex justify-between items-center z-10 text-[8.5px] font-mono font-black tracking-wider">
                  <span className="text-amber-300 bg-black/80 px-2 py-0.5 rounded border border-amber-500/50 shadow-sm">
                    [{pack.code}]
                  </span>
                  <span className="text-slate-200 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded border border-white/25 shadow-sm">
                    <span className="text-pink-400 font-extrabold">JYP</span>
                    <span className="opacity-40">|</span>
                    <span className="text-emerald-400 font-extrabold">ALL AGES</span>
                  </span>
                </div>
              </motion.div>

              {/* 🌟 찢어진 경계면 은박 안감 (Silver Foil Jagged Inner Lining) */}
              {step === 'PACK_TEAR' && (
                <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-r from-slate-200 via-white to-slate-400 border-b-2 border-white shadow-md z-25 [clip-path:polygon(0%_0%,15%_100%,30%_20%,45%_90%,60%_10%,75%_100%,90%_30%,100%_100%,100%_0%)]" />
              )}

              {/* 2. 중앙 메인 아트워크 & 은박 주름/오로라 레이어 */}
              <div className="relative flex-1 w-full overflow-hidden flex flex-col justify-between p-3">
                {/* 팩 커버 고화질 이미지 */}
                <img
                  src={pack.image}
                  alt={pack.name}
                  style={{ objectPosition: pack.objectPosition || 'center 20%' }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />

                {/* 실제 포일 비닐 구김/주름 음영 (Foil Wrinkle Creases) */}
                <div className="absolute inset-0 foil-wrinkle-texture opacity-70 pointer-events-none" />

                {/* 홀로그래픽 오로라 반사광 (Holographic Foil Sheen) */}
                <div className="absolute inset-0 foil-holo-sheen opacity-60 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />

                {/* 비닐 호일 입체 명암 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none" />

                {/* 인터랙티브 대각선 메탈릭 광택 스위프 (Metallic Shimmer Foil Swipe) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none z-10" />

                {/* 팩 개봉 시 빛 방출 (PACK_GLOW 단계) */}
                {step === 'PACK_GLOW' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.4, 1, 0.8], scale: [1, 1.5, 1.3] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-t from-transparent via-pink-400/60 to-amber-300/80 blur-2xl pointer-events-none z-20"
                  />
                )}

                {/* 중앙 상단: 믹스토피아 공식 TCG 로고 엠블렘 워터마크 */}
                <div className="relative z-20 flex justify-center mt-1">
                  <span className="text-[9px] font-mono font-black tracking-widest text-white/95 uppercase bg-black/70 backdrop-blur-md px-3 py-0.5 rounded-full border border-pink-400/50 shadow-md">
                    ✨ NMIXX OFFICIAL TRADING CARD GAME
                  </span>
                </div>

                {/* 중앙 하단: 굵직한 메탈릭 골드/실버 타이틀 밴드 (2단 표기: NX 01 / Fe3O4: FORWARD) */}
                <div className="relative z-20 flex flex-col items-center justify-center text-center bg-black/85 backdrop-blur-md py-2 px-3.5 rounded-2xl border border-white/25 shadow-2xl mt-auto mb-1">
                  <span className="font-mono text-[10px] sm:text-[11px] font-black tracking-widest text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] uppercase mb-0.5">
                    {pack.code.replace('-', ' ')}
                  </span>

                  <h3 className="font-serif text-[15.5px] sm:text-[17px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] whitespace-nowrap truncate max-w-full">
                    {pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-0.5 max-w-full truncate">
                    <span className="text-[8px] text-pink-300 font-mono font-bold tracking-wider uppercase bg-pink-950/80 px-1.5 py-0.2 rounded border border-pink-500/30 flex-shrink-0">
                      {pack.subtitle.split(' • ')[0]}
                    </span>
                    <span className="text-[8px] text-slate-300 font-serif italic truncate">
                      {pack.slogan}
                    </span>
                  </div>

                  {/* 하단 스펙 정보 바 (TCG 규격 박스) */}
                  <div className="w-full flex items-center justify-between border-t border-white/10 pt-1.5 mt-1.5 text-[7px] sm:text-[7.5px] font-mono text-slate-300">
                    <span className="text-amber-300 font-bold">전 {pack.totalCards}종 + 특수 레어</span>
                    <span className="text-pink-300 font-bold">1팩 5장입</span>
                    <span className="text-cyan-300 font-bold">정규 부스터</span>
                  </div>
                </div>
              </div>

              {/* 3. 최하단 비닐 톱니 압착 실링 (Sawtooth Crimped Bottom Seal) + 라이선스 카피라이트 */}
              <div className="relative z-30 w-full bg-gradient-to-t from-slate-700 via-slate-900 to-black/95 border-t border-white/25 px-3 pt-2 pb-2.5 flex flex-col shadow-inner pack-crimped-bottom">
                {/* 하단 톱니형 압착 엠보싱 패턴 */}
                <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.3)_0px,rgba(255,255,255,0.3)_2px,transparent_2px,transparent_6px)] pointer-events-none" />

                {/* 가격 및 오픈 가이드 */}
                <div className="w-full flex justify-between items-center z-10 text-[9.5px] font-mono text-slate-200">
                  <span className="font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {packCount === 1 ? '5 CARDS INSIDE' : `${packCount * 5} CARDS COMING UP!`}
                  </span>
                  <span className="text-amber-300 font-black tracking-tight">{cost} COIN</span>
                </div>

                {/* 카피라이트 */}
                <div className="w-full text-center text-[6.5px] font-mono text-slate-400 mt-0.5 z-10 tracking-wider">
                  ©JYP ENTERTAINMENT. MADE IN MIXXTOPIA
                </div>
              </div>
            </div>
          </motion.div>

          {/* 터치 안내 가이드 버튼 */}
          {step === 'PACK_ENTER' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: [0, -4, 0] }}
              transition={{ y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }}
              onClick={handleStartOpening}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-serif font-black text-xs sm:text-sm tracking-wider shadow-2xl shadow-pink-950/80 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer border border-white/30"
            >
              <Sparkles size={16} className="text-yellow-300 animate-spin" />
              <span>👆 카드팩을 터치하여 개봉하기!</span>
            </motion.button>
          )}

          {step !== 'PACK_ENTER' && (
            <div className="mt-4 text-xs font-mono text-pink-300 font-bold tracking-widest uppercase animate-pulse flex items-center gap-2 bg-void-950/80 px-4 py-1.5 rounded-full border border-pink-500/30">
              <Sparkles size={14} className="text-amber-400 animate-spin" />
              <span>OPENING {packCount} BOOSTER PACKS...</span>
            </div>
          )}
        </div>
      )}

      {/* 3. 카드 딜링 및 공개 (STEP 6, 7, 8) */}
      {['CARDS_DEALT', 'REVEALING', 'SUMMARY'].includes(step) && (
        <div className="relative z-10 w-full max-w-6xl flex flex-col items-center gap-5 my-auto pb-24">
          {/* 상단 힌트 & Rarity 요약 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-5xl px-3 py-2 bg-void-950/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg gap-3">
            <div className="text-sm font-mono text-slate-200 font-bold flex items-center gap-2">
              {step === 'SUMMARY' ? (
                <span className="text-amber-300 flex items-center gap-2 text-sm sm:text-base font-serif font-black">
                  <Sparkles size={18} className="text-pink-400" /> NMIXX {packCount}팩 ({cards.length}장 획득 • {revealedCards.length}종 정리) 개봉 완료!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  카드를 터치하여 공개하세요 ({flippedCount}/{totalCount}종)
                </span>
              )}
            </div>

            {/* SUMMARY 단계 8단계 Rarity 통계 배지 */}
            {step === 'SUMMARY' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(['MR', 'LR', 'UR', 'SSR', 'SR', 'R', 'UC', 'C'] as Rarity[]).map(r => {
                  const cnt = rarityStats[r];
                  if (!cnt) return null;
                  const cfg = RARITY_CONFIGS[r];
                  return (
                    <span
                      key={r}
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${cfg.badgeBg}`}
                    >
                      {r} x{cnt}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 카드 그리드 컨테이너 (1팩: 5열 그리드 / 5팩, 10팩: 반응형 다중 열 그리드) */}
          <div
            className={`w-full max-w-6xl p-3 max-h-[64vh] overflow-y-auto custom-scrollbar grid gap-3 sm:gap-4 justify-items-center bg-black/30 backdrop-blur-md rounded-3xl border border-white/5 shadow-inner ${
              totalCount <= 5
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            }`}
          >
            {revealedCards.map((card, index) => {
              const isFifthCard = (index + 1) % 5 === 0;
              const hasFlipped = card.isFlipped;
              const isJackpotTier = ['SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity);

              return (
                <motion.div
                  key={card.instanceId}
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: isJackpotTier && hasFlipped ? 1.06 : 1 }}
                  transition={{
                    delay: Math.min(0.15, index * 0.008),
                    duration: 0.25,
                    ease: 'easeOut',
                  }}
                  className={`flex justify-center transform-gpu relative ${
                    isJackpotTier && hasFlipped ? 'z-20' : ''
                  }`}
                >
                  {/* SSR 이상 잭팟 카드 테두리 황금 오라 후광 */}
                  {isJackpotTier && hasFlipped && (
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 blur-md opacity-70 animate-pulse pointer-events-none" />
                  )}

                  <CardFlip
                    card={card}
                    isFlipped={hasFlipped}
                    isNew={card.isNew}
                    duplicateCount={card.duplicateCount}
                    isPreRevealing={isFifthCard && !hasFlipped}
                    onFlip={() => handleCardClick(index)}
                    size={totalCount > 10 ? 'sm' : 'md'}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* 🌟 SSR+ 초대형 시네마틱 잭팟 줌인 팝업 모달 (거대하게 확대하여 획득을 확실하게 인지) */}
          <AnimatePresence>
            {jackpotModalCard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl select-none"
                onClick={() => setJackpotModalCard(null)}
              >
                {/* 1. 배경 회전 360도 초호화 라이트 빔 레이 (Light Ray Sunburst) */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                  style={{
                    background: jackpotModalCard.rarity === 'MR'
                      ? 'radial-gradient(circle at center, rgba(6,182,212,0.3) 0%, rgba(168,85,247,0.25) 35%, transparent 70%)'
                      : jackpotModalCard.rarity === 'LR'
                      ? 'radial-gradient(circle at center, rgba(234,179,8,0.35) 0%, rgba(245,158,11,0.2) 40%, transparent 70%)'
                      : jackpotModalCard.rarity === 'UR'
                      ? 'radial-gradient(circle at center, rgba(244,63,94,0.35) 0%, rgba(236,72,153,0.25) 40%, transparent 70%)'
                      : jackpotModalCard.rarity === 'XR'
                      ? 'radial-gradient(circle at center, rgba(244,63,94,0.4) 0%, rgba(250,204,21,0.3) 40%, transparent 75%)'
                      : 'radial-gradient(circle at center, rgba(245,158,11,0.3) 0%, rgba(234,179,8,0.2) 35%, transparent 70%)',
                  }}
                >
                  {/* 회전하는 12줄기 썬버스트 빔 */}
                  <div className="w-[800px] sm:w-[1200px] h-[800px] sm:h-[1200px] opacity-25 bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.4)_0deg_15deg,transparent_15deg_30deg)] animate-spin [animation-duration:20s]" />
                  {/* 중앙 충격파 펄스 링 */}
                  <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full border-2 border-white/40 animate-ping [animation-duration:2s]" />
                </div>

                <motion.div
                  initial={{ scale: 0.2, y: 100, rotateY: 180, opacity: 0 }}
                  animate={{ scale: 1, y: 0, rotateY: 0, opacity: 1 }}
                  exit={{ scale: 0.3, y: 60, opacity: 0 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 190, mass: 1.1 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 max-w-lg w-full"
                >
                  {/* 상단 잭팟 축하 배너 */}
                  <div className="text-center flex flex-col items-center gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-black font-mono text-xs sm:text-sm shadow-[0_0_25px_rgba(250,204,21,0.8)] border-2 border-white"
                    >
                      <Sparkles size={16} className="text-yellow-200 animate-spin" />
                      <span className="tracking-wider">
                        {jackpotModalCard.rarity === 'MR'
                          ? '🌌 MYTHIC JACKPOT REVELATION!'
                          : jackpotModalCard.rarity === 'LR'
                          ? '👑 24K GOLD LEGENDARY REVEAL!'
                          : jackpotModalCard.rarity === 'UR'
                          ? '💎 ULTRA RARE PRISM DISCOVERY!'
                          : jackpotModalCard.rarity === 'XR'
                          ? '👑 TRANSCENDENT MASTER UNLOCK!'
                          : '✨ SUPER SPECIAL RARE JACKPOT!'}
                      </span>
                    </motion.div>

                    <h2 className="font-serif font-black text-xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 drop-shadow-[0_2px_15px_rgba(250,204,21,0.9)] mt-1">
                      [{jackpotModalCard.rarity}] {jackpotModalCard.name}
                    </h2>

                    {jackpotModalCard.isNew && (
                      <span className="text-xs sm:text-sm font-black font-mono px-3.5 py-0.5 rounded-full bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.9)] animate-bounce mt-0.5">
                        🎉 NEW DISCOVERY (신규 획득!)
                      </span>
                    )}
                  </div>

                  {/* 🌟 1.45배 거대 스케일업 3D 카드 + 후광 글로우 오라 ('두둥' 임팩트) */}
                  <div className="relative transform-gpu scale-110 sm:scale-135 my-3 sm:my-5">
                    {/* 카드 뒤 강력한 글로우 링 */}
                    <div
                      className="absolute -inset-4 rounded-3xl blur-xl opacity-85 animate-pulse"
                      style={{
                        background: jackpotModalCard.rarity === 'MR'
                          ? 'radial-gradient(circle, rgba(6,182,212,0.9) 0%, rgba(168,85,247,0.7) 100%)'
                          : jackpotModalCard.rarity === 'LR'
                          ? 'radial-gradient(circle, rgba(234,179,8,0.9) 0%, rgba(245,158,11,0.7) 100%)'
                          : jackpotModalCard.rarity === 'UR'
                          ? 'radial-gradient(circle, rgba(244,63,94,0.95) 0%, rgba(236,72,153,0.7) 100%)'
                          : 'radial-gradient(circle, rgba(245,158,11,0.9) 0%, rgba(234,179,8,0.7) 100%)',
                      }}
                    />

                    <CardFlip
                      card={jackpotModalCard}
                      isFlipped={true}
                      isNew={jackpotModalCard.isNew}
                      duplicateCount={jackpotModalCard.duplicateCount}
                      size="lg"
                    />
                  </div>

                  {/* 하단 닫기 / 컬렉션 추가 버튼 */}
                  <button
                    onClick={() => setJackpotModalCard(null)}
                    className="mt-2 sm:mt-4 px-9 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-serif font-black text-sm sm:text-base tracking-wider shadow-2xl shadow-pink-950/90 flex items-center gap-2.5 hover:scale-105 transition-all cursor-pointer border-2 border-white ring-4 ring-amber-400/60"
                  >
                    <Sparkles size={18} className="text-yellow-200" />
                    <span>카드 획득 확인 (계속하기)</span>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* 4. 마우스 이동 최소화 & 제자리 연속 클릭 스마트 퀵 컨트롤러 바 */}
      <div className="fixed bottom-3 sm:bottom-5 inset-x-0 z-40 flex flex-col items-center justify-center pointer-events-none px-3">
        {step === 'PACK_ENTER' && (
          <motion.button
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={handleStartOpening}
            className="pointer-events-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-serif font-black text-sm sm:text-base tracking-wider shadow-2xl shadow-pink-950/90 flex items-center gap-2.5 hover:scale-105 transition-all cursor-pointer border-2 border-white ring-4 ring-pink-500/40"
          >
            <Sparkles size={18} className="text-yellow-300 animate-spin" />
            <span>📦 카드팩 개봉하기 (Space / Touch)</span>
          </motion.button>
        )}

        {['CARDS_DEALT', 'REVEALING'].includes(step) && flippedCount < totalCount && (
          <motion.button
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={handleRevealAll}
            className="pointer-events-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-serif font-black text-sm sm:text-base tracking-wider shadow-2xl shadow-purple-950/90 flex items-center gap-2.5 hover:scale-105 transition-all cursor-pointer border-2 border-white ring-4 ring-amber-400/40"
          >
            <Zap size={18} className="text-yellow-300" />
            <span>⚡ 카드 모두 공개하기 (Space / Click)</span>
          </motion.button>
        )}

        {(step === 'SUMMARY' || (['CARDS_DEALT', 'REVEALING'].includes(step) && flippedCount === totalCount)) && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 bg-black/85 backdrop-blur-xl p-2.5 rounded-3xl border border-white/20 shadow-2xl"
          >
            {/* 현재 열었던 팩 바로 다시 열기 (메인 액션) */}
            <button
              disabled={coins < cost}
              onClick={() => (onOpenPackCount ? onOpenPackCount(packCount as (1 | 5 | 10)) : onOpenAnother())}
              className={`px-5 py-2.5 rounded-2xl font-serif font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                coins >= cost
                  ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white shadow-lg shadow-pink-950/60 hover:scale-105 cursor-pointer border border-white/40 ring-2 ring-pink-500/40'
                  : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
              }`}
            >
              <Sparkles size={16} className="text-yellow-300" />
              <span>🔁 {packCount}팩 다시 열기 ({cost} COIN / Space)</span>
            </button>

            {/* 1팩 더 열기 */}
            {packCount !== 1 && (
              <button
                disabled={coins < 100}
                onClick={() => (onOpenPackCount ? onOpenPackCount(1) : onOpenAnother())}
                className="px-3.5 py-2 rounded-xl bg-void-800 hover:bg-void-700 text-slate-200 border border-white/15 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer"
              >
                1팩 (100)
              </button>
            )}

            {/* 5팩 더 열기 */}
            {packCount !== 5 && (
              <button
                disabled={coins < 480}
                onClick={() => (onOpenPackCount ? onOpenPackCount(5) : onOpenAnother())}
                className="px-3.5 py-2 rounded-xl bg-void-800 hover:bg-void-700 text-purple-200 border border-purple-500/30 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer"
              >
                5팩 (480)
              </button>
            )}

            {/* 10팩 더 열기 */}
            {packCount !== 10 && (
              <button
                disabled={coins < 900}
                onClick={() => (onOpenPackCount ? onOpenPackCount(10) : onOpenAnother())}
                className="px-3.5 py-2 rounded-xl bg-void-800 hover:bg-void-700 text-amber-200 border border-amber-500/30 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer"
              >
                10팩 (900)
              </button>
            )}

            {/* 메인으로 */}
            <button
              onClick={onFinish}
              className="px-4 py-2 rounded-xl bg-void-900 hover:bg-void-800 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer hover:scale-105"
            >
              <Home size={14} className="text-pink-400" />
              <span>메인</span>
            </button>
          </motion.div>
        )}
      </div>
        </div>
      )}

      {/* 5. 카드 오픈 후 클릭 시 상세 모달 뷰어 (스펙 인스펙터, 풀아트 고화질 사진 확대, 멜로디 재생) */}
      <CardModal
        card={selectedDetailCard}
        count={selectedDetailCard?.duplicateCount || 1}
        isOpen={!!selectedDetailCard}
        onClose={() => setSelectedDetailCard(null)}
      />
    </div>
  );
};
