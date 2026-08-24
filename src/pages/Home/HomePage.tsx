import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pack3D } from '../../components/Pack/Pack3D';
import { GAME_CONFIG, BOOSTER_PACKS, BoosterPackConfig } from '../../config/gameConfig';
import { MASTER_CARDS } from '../../data/cards';
import { sound } from '../../services/soundService';
import { Sparkles, ShieldAlert, Zap, Trophy, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

interface HomePageProps {
  coins: number;
  pityCount: number;
  isFirstVisit: boolean;
  collection?: Record<string, number>;
  onOpenSingle: (pack: BoosterPackConfig) => void;
  onOpenFive: (pack: BoosterPackConfig) => void;
  onOpenTen: (pack: BoosterPackConfig) => void;
  onDismissFirstVisit: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  coins,
  pityCount,
  isFirstVisit,
  collection = {},
  onOpenSingle,
  onOpenFive,
  onOpenTen,
  onDismissFirstVisit,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const selectedPack = BOOSTER_PACKS[selectedIndex] || BOOSTER_PACKS[0];

  // 팩별 수집 현황 계산 함수
  const getPackCollectionStats = (packId: string) => {
    const packCards = MASTER_CARDS.filter(c => c.packId === packId);
    const total = packCards.length || 100;
    const owned = packCards.filter(c => (collection[c.id] || 0) > 0).length;
    const percentage = Math.round((owned / total) * 1000) / 10;
    return { owned, total, percentage };
  };

  const currentStats = getPackCollectionStats(selectedPack.id);

  // 팩 구매 가능 여부 계산 (3,800 N / 17,100 N / 34,200 N)
  const canAffordSingle = coins >= GAME_CONFIG.PACK_COST_SINGLE;
  const canAffordFive = coins >= GAME_CONFIG.PACK_COST_FIVE;
  const canAffordTen = coins >= GAME_CONFIG.PACK_COST_TEN;
  const pityProgress = Math.min(100, (pityCount / GAME_CONFIG.PITY_THRESHOLD) * 100);

  const totalPacks = BOOSTER_PACKS.length;

  // 휠 스크롤 즉각 반응 (원형 무한 360도 루프)
  const lastScrollTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 70) return;

    if (e.deltaY > 15 || e.deltaX > 15) {
      setSelectedIndex(prev => (prev + 1) % totalPacks);
      sound.playClick();
      lastScrollTime.current = now;
    } else if (e.deltaY < -15 || e.deltaX < -15) {
      setSelectedIndex(prev => (prev - 1 + totalPacks) % totalPacks);
      sound.playClick();
      lastScrollTime.current = now;
    }
  };

  const handlePrev = () => {
    setSelectedIndex(prev => (prev - 1 + totalPacks) % totalPacks);
    sound.playClick();
  };

  const handleNext = () => {
    setSelectedIndex(prev => (prev + 1) % totalPacks);
    sound.playClick();
  };

  // 키보드 좌우 방향키 지원 (무한 루프)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  // 1. 첫 방문 웰컴 모드
  if (isFirstVisit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-sky-400 p-[2px] shadow-2xl">
            <div className="w-full h-full bg-void-950 rounded-[22px] flex items-center justify-center">
              <span className="text-pink-400 font-serif font-black text-3xl">N</span>
            </div>
          </div>

          <h1 className="font-serif font-black text-3xl md:text-5xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200">
            NMIXX TCG
          </h1>

          <p className="font-serif italic text-lg md:text-xl text-slate-200 max-w-md leading-relaxed">
            "Every card has a story.
            <br />
            <span className="text-pink-400 font-bold">Some cards have a secret."</span>
          </p>

          <p className="text-xs font-mono text-slate-400 tracking-wider">
            릴리 • 해원 • 설윤 • 배이 • 지우 • 규진 — 6인의 올라운더를 수집하세요!
          </p>

          <button
            onClick={() => {
              onDismissFirstVisit();
              onOpenSingle(selectedPack);
            }}
            className="mt-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-serif font-black text-lg tracking-widest shadow-2xl shadow-pink-950/80 transform hover:scale-105 transition-all cursor-pointer"
          >
            [ OPEN YOUR FIRST PACK ]
          </button>
        </motion.div>
      </div>
    );
  }

  // 2. 메인 팩 오픈 화면
  return (
    <div
      onWheel={handleWheel}
      className="flex-1 flex flex-col items-center justify-between px-3 sm:px-4 pt-4 sm:pt-6 pb-2 sm:pb-3 max-w-4xl mx-auto w-full select-none overflow-hidden"
    >
      {/* ── [상단 영역: 3D 커버플로우 카드팩 스크롤러 (원형 무한 360 루프)] ── */}
      <div className="w-full flex flex-col items-center relative my-auto pt-2 sm:pt-3">
        {/* 3D 커버플로우 뷰 */}
        <div className="relative w-full h-[310px] sm:h-[360px] flex items-center justify-center overflow-visible perspective-[1200px]">
          {/* 좌측 이전 버튼 (무한 루프) */}
          <button
            onClick={handlePrev}
            className="absolute left-0 sm:left-4 z-40 p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-110 hover:bg-black/90 active:scale-95"
            title="이전 팩 (Scroll Up / ←)"
          >
            <ChevronLeft size={22} />
          </button>

          {/* 우측 다음 버튼 (무한 루프) */}
          <button
            onClick={handleNext}
            className="absolute right-0 sm:right-4 z-40 p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-110 hover:bg-black/90 active:scale-95"
            title="다음 팩 (Scroll Down / →)"
          >
            <ChevronRight size={22} />
          </button>

          {/* 팩 뒷편 반응형 테마 오라 글로우 */}
          <div
            key={`glow-${selectedPack.id}`}
            className={`absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-gradient-to-r ${selectedPack.gradient} blur-3xl opacity-55 pointer-events-none -z-10 transition-all duration-500`}
          />

          {/* 5대 부스터 팩 3D 스택 렌더링 (원형 최단거리 루프) */}
          <div className="relative w-full h-full flex items-center justify-center">
            {BOOSTER_PACKS.map((pack, idx) => {
              // 원형 모듈로 최단 거리 계산 (-2, -1, 0, 1, 2)
              let offset = (idx - selectedIndex) % totalPacks;
              if (offset > totalPacks / 2) offset -= totalPacks;
              if (offset < -totalPacks / 2) offset += totalPacks;

              const isCenter = offset === 0;

              return (
                <motion.div
                  key={pack.id}
                  onClick={() => {
                    if (!isCenter) {
                      setSelectedIndex(idx);
                      sound.playClick();
                    }
                  }}
                  initial={false}
                  animate={{
                    x: offset * (typeof window !== 'undefined' && window.innerWidth < 640 ? 125 : 190),
                    scale: isCenter ? 1 : 0.78,
                    rotateY: offset * -26,
                    opacity: isCenter ? 1 : 0.4,
                    zIndex: isCenter ? 30 : 20 - Math.abs(offset),
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className={`absolute flex items-center justify-center ${
                    isCenter ? 'cursor-pointer' : 'cursor-pointer hover:opacity-70'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <Pack3D
                    pack={pack}
                    onClick={() => {
                      if (isCenter) onOpenSingle(pack);
                      else setSelectedIndex(idx);
                    }}
                    disabled={isCenter ? !canAffordSingle : false}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400/80 mt-1 flex items-center gap-1.5">
          <span>🖱️ 마우스 휠 스크롤로 팩 무한 순환 전환</span>
        </div>
      </div>

      {/* ── [중간 영역: 중앙 타이포그래피 (8% 축소) & 수집률 (5% 확대)] ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPack.id}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-xl flex flex-col items-center text-center mt-2 sm:mt-3 mb-1 px-2"
        >
          {/* 팩 이름 대형 중앙 타이포그래피 (약 8% 축소하여 정갈하고 세련되게) */}
          <h2 className="font-serif font-black text-lg sm:text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            {selectedPack.name}
          </h2>

          {/* 슬로건 및 설명글 (약 8% 축소) */}
          <p className="font-serif italic text-[11px] sm:text-xs text-pink-300 font-bold mt-0.5 max-w-md drop-shadow">
            "{selectedPack.slogan}"
          </p>
          <p className="font-sans text-[10px] sm:text-[11px] text-slate-300/85 max-w-lg mt-0.5 leading-snug">
            {selectedPack.description}
          </p>

          {/* 수집 진척도 게이지 바 (약 5% 확대하여 가독성 강화) */}
          <div className="w-full max-w-md mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1 font-semibold">
                <Trophy size={12} className="text-amber-400" />
                수집률 <strong className="text-amber-300 font-black text-xs sm:text-sm">{currentStats.percentage}%</strong>
              </span>
              <span className="font-mono text-xs">
                <strong className="text-pink-300 font-bold">{currentStats.owned}</strong> / {currentStats.total}장
              </span>
            </div>
            <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentStats.percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400"
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── [최하단 영역: 1팩 / 5팩 / 10팩 개봉 버튼 (칸띄움/줄바꿈 방지 및 정돈된 뱃지)] ── */}
      <div className="w-full max-w-xl flex flex-col gap-2 mt-auto">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* 1 Pack: 3,800 N COIN (1단계: 사이언 네온 순차 발광 - 0.0s 딜레이) */}
          <motion.button
            disabled={!canAffordSingle}
            onClick={() => onOpenSingle(selectedPack)}
            animate={
              canAffordSingle
                ? {
                    boxShadow: [
                      '0 0 0px rgba(6,182,212,0)',
                      '0 0 22px rgba(6,182,212,0.75)',
                      '0 0 0px rgba(6,182,212,0)',
                    ],
                    borderColor: [
                      'rgba(6,182,212,0.3)',
                      'rgba(103,232,249,0.9)',
                      'rgba(6,182,212,0.3)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 3.6, repeat: Infinity, delay: 0.0, ease: 'easeInOut' }}
            whileHover={canAffordSingle ? { scale: 1.03 } : {}}
            whileTap={canAffordSingle ? { scale: 0.95 } : {}}
            className={`relative py-2.5 sm:py-3 px-1.5 sm:px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden cursor-pointer whitespace-nowrap border ${
              canAffordSingle
                ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-cyan-200 shadow-lg shadow-cyan-950/40'
                : 'bg-void-900 text-slate-600 border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-0.5 text-cyan-300 font-mono text-[8.5px] sm:text-[9.5px] uppercase tracking-tight font-extrabold">
              <Sparkles size={10} />
              <span>5 CARDS</span>
            </div>
            <span className="font-serif font-black text-white text-xs sm:text-sm tracking-tight leading-tight">
              1팩 개봉
            </span>
            <span className="font-mono text-[10px] sm:text-xs font-black text-cyan-300 leading-none">
              3,800 N
            </span>
          </motion.button>

          {/* 5 Packs: 17,100 N COIN (2단계: 로열 마젠타 순차 발광 - 1.2s 딜레이) */}
          <motion.button
            disabled={!canAffordFive}
            onClick={() => onOpenFive(selectedPack)}
            animate={
              canAffordFive
                ? {
                    boxShadow: [
                      '0 0 0px rgba(236,72,153,0)',
                      '0 0 24px rgba(236,72,153,0.85)',
                      '0 0 0px rgba(236,72,153,0)',
                    ],
                    borderColor: [
                      'rgba(236,72,153,0.3)',
                      'rgba(244,114,182,0.95)',
                      'rgba(236,72,153,0.3)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 3.6, repeat: Infinity, delay: 1.2, ease: 'easeInOut' }}
            whileHover={canAffordFive ? { scale: 1.03 } : {}}
            whileTap={canAffordFive ? { scale: 0.95 } : {}}
            className={`relative py-2.5 sm:py-3 px-1.5 sm:px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden cursor-pointer whitespace-nowrap border ${
              canAffordFive
                ? 'bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-900 text-pink-200 shadow-xl shadow-fuchsia-950/60 ring-1 ring-pink-500/30'
                : 'bg-void-900 text-slate-600 border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-0.5 text-pink-300 font-mono text-[8.5px] sm:text-[9.5px] uppercase tracking-tight font-extrabold">
              <Zap size={10} className="text-pink-400" />
              <span>25 CARDS • 10% OFF</span>
            </div>
            <span className="font-serif font-black text-white text-xs sm:text-sm tracking-tight leading-tight">
              5팩 연속
            </span>
            <span className="font-mono text-[10px] sm:text-xs font-black text-pink-300 leading-none">
              17,100 N
            </span>
          </motion.button>

          {/* 10 Packs: 34,200 N COIN (3단계: 골드 앰버 순차 발광 - 2.4s 딜레이) */}
          <motion.button
            disabled={!canAffordTen}
            onClick={() => onOpenTen(selectedPack)}
            animate={
              canAffordTen
                ? {
                    boxShadow: [
                      '0 0 0px rgba(245,158,11,0)',
                      '0 0 28px rgba(245,158,11,0.95)',
                      '0 0 0px rgba(245,158,11,0)',
                    ],
                    borderColor: [
                      'rgba(251,191,36,0.5)',
                      'rgba(254,240,138,1.0)',
                      'rgba(251,191,36,0.5)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 3.6, repeat: Infinity, delay: 2.4, ease: 'easeInOut' }}
            whileHover={canAffordTen ? { scale: 1.04 } : {}}
            whileTap={canAffordTen ? { scale: 0.95 } : {}}
            className={`relative py-2.5 sm:py-3 px-1.5 sm:px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden cursor-pointer whitespace-nowrap border-2 ${
              canAffordTen
                ? 'bg-gradient-to-br from-amber-600 via-rose-600 to-amber-500 text-yellow-100 shadow-2xl shadow-amber-950/80 ring-2 ring-yellow-400/50'
                : 'bg-void-900 text-slate-600 border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-0.5 text-amber-200 font-mono text-[8.5px] sm:text-[9.5px] uppercase tracking-tight font-black">
              <Flame size={11} className="text-yellow-300 animate-bounce" />
              <span>50 CARDS • MAX LUCK 🔥</span>
            </div>
            <span className="font-serif font-black text-white text-xs sm:text-sm tracking-tight leading-tight drop-shadow">
              10팩 대량
            </span>
            <span className="font-mono text-[10.5px] sm:text-xs font-black text-yellow-200 leading-none drop-shadow">
              34,200 N
            </span>
          </motion.button>
        </div>

        {/* Pity Progress Bar */}
        <div className="w-full bg-void-900/90 border border-void-800 px-3 py-1.5 rounded-xl flex items-center justify-between text-[10.5px] font-mono">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-amber-400" />
            천장 보장 (50팩 시 SSR+ 확정)
          </span>
          <div className="flex items-center gap-2">
            <div className="w-20 sm:w-28 h-1.5 bg-void-950 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-amber-400"
                style={{ width: `${pityProgress}%` }}
              />
            </div>
            <span className="text-amber-300 font-bold text-xs">
              {pityCount} / {GAME_CONFIG.PITY_THRESHOLD}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
