import React, { useState, useEffect, useRef } from 'react';
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
import { BoosterPackThreeView } from './BoosterPackThreeView';

interface PackOpeningSequenceProps {
  cards: RevealedCard[];
  pack?: BoosterPackConfig;
  packCount?: number;
  cost?: number;
  coins?: number;
  pityCount?: number;
  collection?: Record<string, number>;
  onCommitOpening?: () => void;
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
  onCommitOpening,
  onFinish,
  onOpenAnother,
  onOpenPackCount,
}) => {
  const [step, setStep] = useState<PackOpeningState>('DIM_BG');
  const hasCommittedRef = useRef(false);

  const ensureCommitted = () => {
    if (!hasCommittedRef.current) {
      hasCommittedRef.current = true;
      if (onCommitOpening) {
        onCommitOpening();
      }
    }
  };

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
      const isXR = card.rarity === 'XR' || card.id === 'card_xr_transcendent_park_741';
      mergedList.push({
        ...card,
        duplicateCount: isXR ? 1 : (countsMap.get(id) || 1),
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

  // 🌟 실제 카드 상세 모달(CardModal) 연동 및 SSR+ 자동 팝업 큐 (Auto-Trigger Queue)
  const [selectedDetailCard, setSelectedDetailCard] = useState<RevealedCard | null>(null);
  const [showcaseQueue, setShowcaseQueue] = useState<RevealedCard[]>([]);
  const [showcaseIndex, setShowcaseIndex] = useState<number>(0);

  // 단계 전환 시점 및 연타 방지 타이머
  const stepEnterTimeRef = useRef<number>(Date.now());
  const lastActionTimeRef = useRef<number>(0);
  const isReopeningRef = useRef<boolean>(false);

  useEffect(() => {
    stepEnterTimeRef.current = Date.now();
  }, [step]);

  // 🌟 1. 하드웨어 가속 이미지 사전 로드 & 비동기 디코딩 (Preload & Decode)
  useEffect(() => {
    cards.forEach(card => {
      if (card.image) {
        const img = new Image();
        img.src = card.image;
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {});
        }
      }
    });

    const merged = mergeDuplicateCards(cards);
    setRevealedCards(merged);
    setStep('DIM_BG');
    setSelectedDetailCard(null);
    setShowcaseQueue([]);
    setShowcaseIndex(0);
    stepEnterTimeRef.current = Date.now();
    isReopeningRef.current = false;
    const timer = setTimeout(() => setStep('PACK_ENTER'), 300);
    return () => clearTimeout(timer);
  }, [cards]);

  // ⌨️ ESC 키 입력 시 팩 개봉 화면 즉시 종료 및 홈 복귀
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onFinish]);

  // 🌟 Step 1: 팩 개봉 즉시 팩에 든 모든 카드가 그리드로 차례대로 깔림 (전체 카드 순차 노출)
  const handleStartOpening = () => {
    if (step !== 'PACK_ENTER') return;

    ensureCommitted();
    sound.playPackTear();
    setStep('PACK_TEAR');

    // 팩 찢기 애니메이션 700ms 후 -> 전체 카드가 먼저 그리드에 깔리는 CARDS_DEALT로 100% 직행!
    setTimeout(() => {
      sound.playCardDeal();
      setStep('CARDS_DEALT');
    }, 700);
  };

  // 🌟 Step 2: 모든 카드가 공개된 직후 SSR+ 고등급 카드 상세 모달(CardModal) 자동 호출
  const checkAndTriggerHighTierModal = (currentFlippedCards: RevealedCard[]) => {
    const highTierCards = currentFlippedCards.filter(c => ['SSR', 'UR', 'LR', 'MR', 'XR'].includes(c.rarity));

    if (highTierCards.length > 0) {
      // 🌟 SSR+ 카드가 존재할 경우 400ms 후 첫 번째 고등급 카드의 실제 CardModal을 직접 호출!
      setTimeout(() => {
        setShowcaseQueue(highTierCards);
        setShowcaseIndex(0);
        setSelectedDetailCard(highTierCards[0]);
      }, 400);
    } else {
      // 일반 카드만 있는 경우 바로 최종 결과 SUMMARY로 이동
      setTimeout(() => {
        setStep('SUMMARY');
      }, 400);
    }
  };

  // 카드 상세 모달 닫기 또는 다중 SSR+ 다음 카드로 순차 전환
  const handleCloseOrNextDetailCard = () => {
    if (showcaseQueue.length > 0 && showcaseIndex < showcaseQueue.length - 1) {
      // 큐에 다음 SSR+ 카드가 남아있는 경우 순차적으로 다음 CardModal 오픈!
      const nextIdx = showcaseIndex + 1;
      setShowcaseIndex(nextIdx);
      setSelectedDetailCard(showcaseQueue[nextIdx]);
    } else {
      // 모든 고등급 모달 확인 완료 ➡️ 모달 닫고 최종 결과 화면(SUMMARY)으로 복귀!
      setShowcaseQueue([]);
      setSelectedDetailCard(null);
      setStep('SUMMARY');
    }
  };

  // 개별 카드 뒤집기 핸들러
  const handleCardClick = (index: number) => {
    ensureCommitted();
    const card = revealedCards[index];
    if (!card) return;

    if (card.isFlipped) {
      // 이미 뒤집힌 카드 클릭 시 단독 상세 모달 열기
      setShowcaseQueue([]);
      setSelectedDetailCard(card);
      return;
    }

    // 카드 뒤집기 사운드
    if (card.rarity === 'SR') sound.playEpicReveal();
    else if (card.rarity === 'R') sound.playRareReveal();
    else sound.playCardFlip();

    const updated = [...revealedCards];
    updated[index] = { ...updated[index], isFlipped: true };
    setRevealedCards(updated);

    // 모든 카드가 뒤집혔는지 확인
    const allFlipped = updated.every(c => c.isFlipped);
    if (allFlipped) {
      checkAndTriggerHighTierModal(updated);
    }
  };

  // 모든 카드 한번에 뒤집기
  const handleRevealAll = () => {
    ensureCommitted();
    sound.playEpicReveal();
    const updated = revealedCards.map(c => ({ ...c, isFlipped: true }));
    setRevealedCards(updated);
    checkAndTriggerHighTierModal(updated);
  };

  // 키보드 Spacebar / Enter / ESC 원터치 단축키 지원 (연타 / 꾹 누름 스킵 버그 방지 & ESC 메인화면 나가기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🌟 ESC 키: 카드 상세 모달 닫기 또는 모든 시퀀스가 종료된 후(SUMMARY)에만 메인화면 나가기
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        if (selectedDetailCard) {
          handleCloseOrNextDetailCard();
          return;
        }
        // 🛑 시퀀스 진행 중에는 ESC 나가기 절대 차단! 모든 카드가 공개되고 SUMMARY 상태에 도달했을 때만 나가기 허용!
        if (step === 'SUMMARY') {
          sound.playClick();
          onFinish();
          return;
        }
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        // 1. 키 꾹 누름(repeat) 차단
        if (e.repeat) {
          e.preventDefault();
          return;
        }

        const now = Date.now();
        // 2. 연타 스팸 방지 (250ms 쿨다운)
        if (now - lastActionTimeRef.current < 250) {
          e.preventDefault();
          return;
        }

        // 🌟 카드 상세 모달(CardModal)이 열려있을 때: 모달 닫기 또는 다음 SSR+ 카드로 전환
        if (selectedDetailCard) {
          // 모달 오픈 직후 최소 350ms 스킵 방지 보호
          if (now - stepEnterTimeRef.current < 350) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          lastActionTimeRef.current = now;
          handleCloseOrNextDetailCard();
          return;
        }

        // 단계별 제어
        if (step === 'PACK_ENTER') {
          e.preventDefault();
          lastActionTimeRef.current = now;
          handleStartOpening();
        } else if (step === 'PACK_TEAR') {
          // 팩 찢는 중에는 키 입력 무시
          e.preventDefault();
        } else if (['CARDS_DEALT', 'REVEALING'].includes(step)) {
          // 카드가 화면에 세팅된 후 최소 350ms가 지나야 전체 공개 가능
          if (now - stepEnterTimeRef.current < 350) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          lastActionTimeRef.current = now;
          handleRevealAll();
        } else if (step === 'SUMMARY') {
          if (isReopeningRef.current) {
            e.preventDefault();
            return;
          }
          // 요약 화면 진입 후 최소 500ms가 지나야 재개봉 가능
          if (now - stepEnterTimeRef.current < 500) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          lastActionTimeRef.current = now;
          if (coins >= cost) {
            isReopeningRef.current = true;
            if (onOpenPackCount) onOpenPackCount(packCount as (1 | 5 | 10));
            else onOpenAnother();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, selectedDetailCard, showcaseIndex, showcaseQueue, coins, cost, packCount, onFinish]);

  const flippedCount = revealedCards.filter(c => c.isFlipped).length;
  const totalCount = revealedCards.length;

  // Rarity 통계 집계
  const rarityStats: Partial<Record<Rarity, number>> = {};
  revealedCards.forEach(c => {
    rarityStats[c.rarity] = (rarityStats[c.rarity] || 0) + 1;
  });

  const currentPackId = pack?.id || 'op01';
  const packMasterCards = MASTER_CARDS.filter(c => c.packId === currentPackId);
  const packTotalCards = packMasterCards.length || 150;
  const packOwnedCards = packMasterCards.filter(c => (collection[c.id] || 0) > 0).length;
  const packProgressPct = Math.round((packOwnedCards / packTotalCards) * 1000) / 10;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#070210] overflow-y-auto py-5 px-3 select-none">
      {/* 🌌 NMIXX MIXXTOPIA 앰비언트 우주 배경 (GPU 하드웨어 가속 최적화) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d041e] via-[#14082e] to-[#04010a]" />
        <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-pink-600/20 blur-xl pointer-events-none" />
        <div className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-cyan-500/15 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 rounded-full bg-purple-600/15 blur-xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      {/* 상단 고정 네비게이션: 메인 나가기 & 실시간 잔여 코인 */}
      <div className="sticky top-0 z-30 w-full max-w-4xl flex items-center justify-between pointer-events-auto bg-void-950/90 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-white/15 shadow-xl mb-2 gap-2 flex-wrap sm:flex-nowrap transform-gpu">
        <button
          onClick={onFinish}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-void-900 hover:bg-void-800 text-slate-200 border border-white/20 text-xs font-mono font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
        >
          <Home size={14} className="text-pink-400" />
          <span className="hidden xs:inline">{step === 'SUMMARY' ? '메인으로 (ESC)' : '메인으로'}</span>
        </button>

        {/* 🪙 실시간 보유 코인 */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono text-xs sm:text-sm font-black shadow-inner">
          <span className="text-amber-400 text-sm">🪙</span>
          <span className="tracking-tight text-white">{coins.toLocaleString()}</span>
          <span className="text-[10px] text-amber-300 font-extrabold">N COIN</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 border border-pink-500/30 text-xs font-mono">
            <span className="text-pink-400 font-black">[{pack.code}]</span>
            <span className="text-slate-300 font-bold hidden md:inline truncate max-w-[110px]">{pack.name}</span>
            <span className="text-amber-300 font-extrabold ml-0.5">({totalCount}장)</span>
          </div>

          <button
            onClick={onFinish}
            className="p-1.5 rounded-full bg-void-900 hover:bg-void-800 text-slate-300 hover:text-white border border-white/20 transition-colors cursor-pointer"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 👑 천장(Pity) & 팩별 실시간 수집률 대시보드 HUD */}
      <div className="relative z-20 w-full max-w-4xl px-4 py-2.5 mb-2 bg-gradient-to-r from-purple-950/90 via-void-950 to-purple-950/90 backdrop-blur-md rounded-2xl border border-purple-500/40 shadow-lg flex flex-col gap-2 pointer-events-auto transform-gpu">
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

          <div className="w-full h-2.5 bg-black/90 rounded-full overflow-hidden border border-purple-400/50 relative p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 shadow-[0_0_15px_rgba(236,72,153,0.9)] transition-all duration-500"
              style={{ width: `${Math.min(100, (pityCount / 50) * 100)}%` }}
            />
          </div>
        </div>

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

      {/* 🌟 1. 시네마틱 전체화면 레이저/오로라 오버레이 */}
      <AnimatePresence>
        {activeSpecialReveal && (
          <SecretRevealEffect
            rarity={activeSpecialReveal}
            onComplete={() => setActiveSpecialReveal(null)}
          />
        )}
      </AnimatePresence>

      {/* 🌟 2. 팩 개봉 단계 (PACK_ENTER, PACK_TEAR) */}
      {['DIM_BG', 'PACK_ENTER', 'PACK_SHAKE', 'PACK_GLOW', 'PACK_TEAR'].includes(step) && (
        <div className="relative z-10 flex flex-col items-center justify-center my-auto select-none transform-gpu">
          <motion.div
            initial={{ scale: 0.7, y: 70, opacity: 0 }}
            animate={
              step === 'PACK_TEAR'
                ? { scale: 1.05, y: 30, opacity: 1 }
                : { scale: 1, y: 0, opacity: 1 }
            }
            whileHover={step === 'PACK_ENTER' ? { scale: 1.05, y: -6 } : {}}
            whileTap={step === 'PACK_ENTER' ? { scale: 0.96 } : {}}
            onClick={handleStartOpening}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={`relative w-64 sm:w-72 h-[410px] sm:h-[430px] rounded-2xl [perspective:1200px] will-change-transform transform-gpu group ${
              step === 'PACK_ENTER' ? 'cursor-pointer' : ''
            }`}
          >
            <div
              className={`absolute -inset-4 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300 ${
                step === 'PACK_TEAR' ? 'animate-pulse scale-110 opacity-100' : ''
              }`}
            />

            {/* 팩 찢기 은박 파티클 */}
            {step === 'PACK_TEAR' && (
              <div className="absolute inset-x-0 -top-10 z-40 flex items-center justify-center pointer-events-none [transform-style:preserve-3d]">
                {[...Array(18)].map((_, i) => (
                  <div
                    key={i}
                    className="foil-flake rounded-sm"
                    style={{
                      left: `${15 + (i * 4.2)}%`,
                      top: '10px',
                      width: `${4 + (i % 4) * 2}px`,
                      height: `${4 + (i % 3) * 2}px`,
                      ['--tw-translate-x' as string]: `${(i - 9) * 22}px`,
                      ['--tw-translate-y' as string]: `${-50 - (i % 5) * 18}px`,
                      animationDelay: `${(i % 5) * 0.03}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* 3D 부스터 팩 */}
            <BoosterPackThreeView
              pack={pack}
              onClick={handleStartOpening}
              className="w-full h-full rounded-2xl overflow-hidden drop-shadow-2xl"
            />
          </motion.div>

          {step === 'PACK_ENTER' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: [0, -4, 0] }}
              transition={{ y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }}
              onClick={handleStartOpening}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-serif font-black text-xs sm:text-sm tracking-wider shadow-2xl shadow-pink-950/80 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer border border-white/30 transform-gpu"
            >
              <Sparkles size={16} className="text-yellow-300 animate-spin" />
              <span>👆 카드팩을 터치하여 개봉하기! (Space)</span>
            </motion.button>
          )}

          {step === 'PACK_TEAR' && (
            <div className="mt-4 text-xs font-mono text-pink-300 font-bold tracking-widest uppercase animate-pulse flex items-center gap-2 bg-void-950/80 px-4 py-1.5 rounded-full border border-pink-500/30">
              <Sparkles size={14} className="text-amber-400 animate-spin" />
              <span>OPENING {packCount} BOOSTER PACKS...</span>
            </div>
          )}
        </div>
      )}

      {/* 🌟 3. Step 1: 전체 카드 순차 노출 (All Cards Reveal in Grid) */}
      {['CARDS_DEALT', 'REVEALING', 'SUMMARY'].includes(step) && (
        <div className="relative z-10 w-full max-w-6xl flex flex-col items-center gap-5 my-auto pb-24 transform-gpu">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-5xl px-3 py-2 bg-void-950/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg gap-3 transform-gpu">
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

          {/* 카드 그리드 컨테이너 (GPU 가속 최적화) */}
          <div
            className={`w-full max-w-6xl p-3 max-h-[64vh] overflow-y-auto custom-scrollbar grid gap-3 sm:gap-4 justify-items-center bg-black/25 backdrop-blur-sm rounded-3xl border border-white/5 shadow-inner transform-gpu ${
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
                  initial={{ y: 35, opacity: 0, scale: 0.88 }}
                  animate={{ y: 0, opacity: 1, scale: isJackpotTier && hasFlipped ? 1.05 : 1 }}
                  transition={{
                    delay: Math.min(0.25, index * 0.05),
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`flex justify-center will-change-transform transform-gpu relative ${
                    isJackpotTier && hasFlipped ? 'z-20' : ''
                  }`}
                >
                  {/* 고등급 카드 황금 테두리 오라 */}
                  {isJackpotTier && hasFlipped && (
                    <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 blur-sm opacity-60 animate-pulse pointer-events-none" />
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

          {/* 퀵 컨트롤러 바 (모바일 세이프 에어리어 및 뷰포트 고정) */}
          <div className="fixed bottom-0 inset-x-0 z-50 flex flex-col items-center justify-center pointer-events-none px-3 pb-[max(env(safe-area-inset-bottom,16px),16px)] pt-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent transform-gpu">
            {['CARDS_DEALT', 'REVEALING'].includes(step) && flippedCount < totalCount && (
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                onClick={handleRevealAll}
                className="pointer-events-auto w-full max-w-sm sm:max-w-md min-h-[50px] px-6 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 active:scale-95 text-white font-serif font-black text-sm sm:text-base tracking-wider shadow-2xl shadow-purple-950/90 flex items-center justify-center gap-2 hover:scale-105 transition-all cursor-pointer border-2 border-white ring-4 ring-amber-400/40 transform-gpu touch-manipulation"
              >
                <Zap size={20} className="text-yellow-300 animate-pulse" />
                <span>⚡ 카드 모두 공개하기</span>
              </motion.button>
            )}

            {(step === 'SUMMARY' || (['CARDS_DEALT', 'REVEALING'].includes(step) && flippedCount === totalCount)) && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pointer-events-auto w-full max-w-lg flex flex-wrap items-center justify-center gap-2 bg-black/90 backdrop-blur-2xl p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl transform-gpu"
              >
                <button
                  disabled={coins < cost}
                  onClick={() => (onOpenPackCount ? onOpenPackCount(packCount as (1 | 5 | 10)) : onOpenAnother())}
                  className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl font-serif font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
                    coins >= cost
                      ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 active:scale-95 text-white shadow-lg shadow-pink-950/60 hover:scale-105 cursor-pointer border border-white/40 ring-2 ring-pink-500/40'
                      : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Sparkles size={16} className="text-yellow-300" />
                  <span>🔁 {packCount}팩 다시 열기 ({cost.toLocaleString()} N)</span>
                </button>

                {packCount !== 1 && (
                  <button
                    disabled={coins < 3800}
                    onClick={() => (onOpenPackCount ? onOpenPackCount(1) : onOpenAnother())}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-void-800 hover:bg-void-700 active:scale-95 text-slate-200 border border-white/15 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer touch-manipulation"
                  >
                    1팩 (3,800 N)
                  </button>
                )}

                {packCount !== 5 && (
                  <button
                    disabled={coins < 17100}
                    onClick={() => (onOpenPackCount ? onOpenPackCount(5) : onOpenAnother())}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-void-800 hover:bg-void-700 active:scale-95 text-purple-200 border border-purple-500/30 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer touch-manipulation"
                  >
                    5팩 (17,100 N)
                  </button>
                )}

                {packCount !== 10 && (
                  <button
                    disabled={coins < 34200}
                    onClick={() => (onOpenPackCount ? onOpenPackCount(10) : onOpenAnother())}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-void-800 hover:bg-void-700 active:scale-95 text-amber-200 border border-amber-500/30 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer touch-manipulation"
                  >
                    10팩 (34,200 N)
                  </button>
                )}

                <button
                  onClick={onFinish}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-void-900 hover:bg-void-800 active:scale-95 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all border border-white/20 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 touch-manipulation"
                >
                  <Home size={14} className="text-pink-400" />
                  <span>메인 홈</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 🌟 4. 실제 도감/인벤토리와 100% 동일한 '카드 상세 모달(CardModal)' 팝업 */}
      <CardModal
        card={selectedDetailCard}
        count={selectedDetailCard?.duplicateCount || 1}
        isOpen={!!selectedDetailCard}
        onClose={handleCloseOrNextDetailCard}
      />
    </div>
  );
};
