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

  // 휠 스크롤 쿨다운 제어
  const lastScrollTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 250) return;

    if (e.deltaY > 20 || e.deltaX > 20) {
      if (selectedIndex < BOOSTER_PACKS.length - 1) {
        setSelectedIndex(prev => prev + 1);
        sound.playClick();
        lastScrollTime.current = now;
      }
    } else if (e.deltaY < -20 || e.deltaX < -20) {
      if (selectedIndex > 0) {
        setSelectedIndex(prev => prev - 1);
        sound.playClick();
        lastScrollTime.current = now;
      }
    }
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(prev => prev - 1);
      sound.playClick();
    }
  };

  const handleNext = () => {
    if (selectedIndex < BOOSTER_PACKS.length - 1) {
      setSelectedIndex(prev => prev + 1);
      sound.playClick();
    }
  };

  // 키보드 좌우 방향키로도 팩 전환 지원
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

  // 2. 메인 팩 오픈 화면 (3D CoverFlow 스크롤 캐러셀 + 하단 연동 타이포그래피)
  return (
    <div
      onWheel={handleWheel}
      className="flex-1 flex flex-col items-center justify-between px-3 sm:px-4 py-3 sm:py-5 max-w-4xl mx-auto w-full select-none overflow-hidden"
    >
      {/* ── [상단 영역: 3D 커버플로우 카드팩 스크롤러] ── */}
      <div className="w-full flex flex-col items-center relative my-auto">
        {/* 상단 팩 인디케이터 바 */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 z-20">
          {BOOSTER_PACKS.map((pack, idx) => {
            const isCurrent = idx === selectedIndex;
            return (
              <button
                key={pack.id}
                onClick={() => {
                  setSelectedIndex(idx);
                  sound.playClick();
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg border border-pink-400/60 scale-105'
                    : 'bg-void-900/80 text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20'
                }`}
              >
                <span>{pack.code}</span>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* 3D 커버플로우 인터랙티브 뷰 (스크롤/드래그 지원) */}
        <div className="relative w-full h-[280px] sm:h-[330px] flex items-center justify-center overflow-visible perspective-[1200px]">
          {/* 좌측 이전 버튼 */}
          <button
            disabled={selectedIndex === 0}
            onClick={handlePrev}
            className={`absolute left-0 sm:left-4 z-40 p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md shadow-xl transition-all cursor-pointer ${
              selectedIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 hover:bg-black/90 active:scale-95'
            }`}
            title="이전 팩 (Scroll Up / ←)"
          >
            <ChevronLeft size={20} />
          </button>

          {/* 우측 다음 버튼 */}
          <button
            disabled={selectedIndex === BOOSTER_PACKS.length - 1}
            onClick={handleNext}
            className={`absolute right-0 sm:right-4 z-40 p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md shadow-xl transition-all cursor-pointer ${
              selectedIndex === BOOSTER_PACKS.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 hover:bg-black/90 active:scale-95'
            }`}
            title="다음 팩 (Scroll Down / →)"
          >
            <ChevronRight size={20} />
          </button>

          {/* 팩 뒷편 반응형 테마 오라 글로우 */}
          <div
            key={`glow-${selectedPack.id}`}
            className={`absolute w-72 sm:w-88 h-72 sm:h-88 rounded-full bg-gradient-to-r ${selectedPack.gradient} blur-3xl opacity-50 pointer-events-none -z-10 transition-all duration-700`}
          />

          {/* 5대 부스터 팩 3D 스택 렌더링 */}
          <div className="relative w-full h-full flex items-center justify-center">
            {BOOSTER_PACKS.map((pack, idx) => {
              const offset = idx - selectedIndex;
              const isCenter = offset === 0;
              const isVisible = Math.abs(offset) <= 2;

              if (!isVisible) return null;

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
                    x: offset * (typeof window !== 'undefined' && window.innerWidth < 640 ? 120 : 180),
                    scale: isCenter ? 1 : 0.8,
                    rotateY: offset * -25,
                    opacity: isCenter ? 1 : 0.45,
                    zIndex: isCenter ? 30 : 20 - Math.abs(offset),
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 26,
                  }}
                  className={`absolute flex items-center justify-center ${
                    isCenter ? 'cursor-pointer' : 'cursor-pointer hover:opacity-75'
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

        <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1.5 opacity-75">
          <span>🖱️ 마우스 휠 스크롤 또는 좌우 버튼으로 팩 전환</span>
        </div>
      </div>

      {/* ── [중간 영역: 카드팩 설명 타이포그래피 & 수집률 대시보드] ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPack.id}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-xl bg-void-950/90 border border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl my-2 flex flex-col gap-2"
        >
          {/* 타이틀 & 팩 코드 */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono text-[10px] sm:text-xs font-black">
                {selectedPack.code}
              </span>
              <h2 className="font-serif font-black text-sm sm:text-base text-white truncate tracking-tight">
                {selectedPack.name}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-400">
                수집률
              </span>
              <span className="text-amber-300 font-mono font-black text-xs bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                {currentStats.percentage}%
              </span>
            </div>
          </div>

          {/* 슬로건 & 설명 타이포그래피 */}
          <div className="flex flex-col gap-1 text-left">
            <p className="text-xs sm:text-sm font-serif italic text-amber-200 font-bold leading-tight">
              "{selectedPack.slogan}"
            </p>
            <p className="text-[10.5px] sm:text-xs font-sans text-slate-300 leading-snug">
              {selectedPack.description}
            </p>
          </div>

          {/* 수집 진척도 게이지 바 */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Trophy size={11} className="text-amber-400" />
                보유 현황
              </span>
              <span className="font-bold text-slate-200">
                <strong className="text-pink-300">{currentStats.owned}</strong> / {currentStats.total}장
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentStats.percentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400"
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── [최하단 영역: 1팩 / 5팩 / 10팩 개봉 버튼 (점진적 화려한 뱃지)] ── */}
      <div className="w-full max-w-xl flex flex-col gap-2 mt-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {/* 1 Pack: 3,800 N COIN (클래식 네온 사이버 뱃지) */}
          <button
            disabled={!canAffordSingle}
            onClick={() => onOpenSingle(selectedPack)}
            className={`relative py-3 px-3 rounded-2xl font-serif font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden cursor-pointer ${
              canAffordSingle
                ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-cyan-200 border border-cyan-400/50 shadow-lg shadow-cyan-950/40 hover:scale-[1.03] hover:border-cyan-300 active:scale-95'
                : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-cyan-300 font-mono text-[9px] uppercase tracking-wider font-extrabold">
              <Sparkles size={11} />
              <span>[ 5 CARDS ]</span>
            </div>
            <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
              1팩 개봉
            </span>
            <span className="font-mono text-[10.5px] font-black text-cyan-300">
              3,800 N
            </span>
          </button>

          {/* 5 Packs: 17,100 N COIN (화려한 로열 마젠타 & 10% DISCOUNT 뱃지) */}
          <button
            disabled={!canAffordFive}
            onClick={() => onOpenFive(selectedPack)}
            className={`relative py-3 px-3 rounded-2xl font-serif font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden cursor-pointer ${
              canAffordFive
                ? 'bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-900 text-pink-200 border border-pink-400/60 shadow-xl shadow-fuchsia-950/60 hover:scale-[1.03] hover:border-pink-300 active:scale-95 ring-1 ring-pink-500/30'
                : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-pink-300 font-mono text-[9px] uppercase tracking-wider font-extrabold">
              <Zap size={11} className="text-pink-400" />
              <span>[ 25 CARDS • 10% OFF ]</span>
            </div>
            <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
              5팩 연속 개봉
            </span>
            <span className="font-mono text-[10.5px] font-black text-pink-300">
              17,100 N
            </span>
          </button>

          {/* 10 Packs: 34,200 N COIN (극상의 골드 앰버 & 선셋 크림슨 & MAX LUCK 뱃지) */}
          <button
            disabled={!canAffordTen}
            onClick={() => onOpenTen(selectedPack)}
            className={`relative py-3 px-3 rounded-2xl font-serif font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden cursor-pointer ${
              canAffordTen
                ? 'bg-gradient-to-br from-amber-600 via-rose-600 to-amber-500 text-yellow-100 border-2 border-yellow-300 shadow-2xl shadow-amber-950/80 hover:scale-[1.04] hover:border-white active:scale-95 ring-2 ring-yellow-400/60 animate-pulse'
                : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-amber-200 font-mono text-[9.5px] uppercase tracking-wider font-black">
              <Flame size={12} className="text-yellow-300 animate-bounce" />
              <span>[ 50 CARDS • MAX LUCK 🔥 ]</span>
            </div>
            <span className="font-black text-white text-xs sm:text-sm tracking-wider drop-shadow-md">
              10팩 대량 개봉
            </span>
            <span className="font-mono text-[11px] font-black text-yellow-200 drop-shadow">
              34,200 N
            </span>
          </button>
        </div>

        {/* Pity Progress Bar */}
        <div className="w-full bg-void-900/90 border border-void-800 px-3.5 py-2 rounded-xl flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-amber-400" />
            천장 보장 (50팩 시 SSR+ 확정)
          </span>
          <div className="flex items-center gap-2">
            <div className="w-20 sm:w-28 h-2 bg-void-950 rounded-full overflow-hidden border border-white/10">
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
