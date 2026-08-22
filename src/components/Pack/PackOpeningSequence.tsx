import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevealedCard, Rarity } from '../../types/card';
import { PackOpeningState } from '../../types/game';
import { CardFlip } from '../Card/CardFlip';
import { SecretRevealEffect } from '../RevealAnimation/SecretRevealEffect';
import { sound } from '../../services/soundService';
import { ArrowRight, Home, X, Zap, Sparkles } from 'lucide-react';
import { BoosterPackConfig, BOOSTER_PACKS, RARITY_CONFIGS } from '../../config/gameConfig';

interface PackOpeningSequenceProps {
  cards: RevealedCard[];
  pack?: BoosterPackConfig;
  packCount?: number;
  cost?: number;
  coins?: number;
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
  onFinish,
  onOpenAnother,
  onOpenPackCount,
}) => {
  const [step, setStep] = useState<PackOpeningState>('DIM_BG');
  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>(cards);
  const [activeSpecialReveal, setActiveSpecialReveal] = useState<Rarity | null>(null);

  // 새로운 카드가 들어왔을 때 상태 초기화
  useEffect(() => {
    setRevealedCards(cards);
    setStep('DIM_BG');
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
    }, 700);

    setTimeout(() => {
      sound.playPackTear();
      setStep('PACK_TEAR');
    }, 1300);

    setTimeout(() => {
      sound.playCardDeal();
      setStep('CARDS_DEALT');
    }, 1800);
  };

  // 개별 카드 뒤집기 핸들러 (최적화)
  const handleFlipCard = (index: number) => {
    if (revealedCards[index]?.isFlipped) return;

    const card = revealedCards[index];

    // 8단계 Rarity별 사운드 & 특수 연출 재생
    if (card.rarity === 'MR') {
      sound.playSecretReveal();
      setActiveSpecialReveal('MR');
    } else if (card.rarity === 'LR') {
      sound.playMythicReveal();
      setActiveSpecialReveal('LR');
    } else if (card.rarity === 'UR') {
      sound.playLegendaryReveal();
      setActiveSpecialReveal('UR');
    } else if (card.rarity === 'SSR') {
      sound.playLegendaryReveal();
      setActiveSpecialReveal('SSR');
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

  // 모든 카드 한번에 뒤집기 (즉시 전체 공개 및 결과 버튼 활성화)
  const handleRevealAll = () => {
    const highestCard = [...revealedCards].sort((a, b) => {
      const rank: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, SSR: 5, UR: 6, LR: 7, MR: 8 };
      return rank[b.rarity] - rank[a.rarity];
    })[0];

    sound.playEpicReveal();
    if (['MR', 'LR', 'UR', 'SSR'].includes(highestCard?.rarity)) {
      setActiveSpecialReveal(highestCard.rarity);
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

      {/* 상단 고정 네비게이션: 메인 나가기 & 실시간 잔여 코인 표시 */}
      <div className="sticky top-0 z-30 w-full max-w-6xl flex items-center justify-between pointer-events-auto bg-void-950/80 backdrop-blur-xl px-3 sm:px-4 py-2.5 rounded-2xl border border-white/15 shadow-2xl shadow-purple-950/40 mb-4 gap-2 flex-wrap sm:flex-nowrap">
        <button
          onClick={onFinish}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-void-900/90 hover:bg-void-800 text-slate-200 border border-white/20 text-xs font-mono font-bold transition-all shadow-md hover:scale-105"
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
            <span className="text-slate-300 font-bold hidden md:inline truncate max-w-[120px]">{pack.name}</span>
            <span className="text-amber-300 font-extrabold ml-0.5">({totalCount}장)</span>
          </div>

          <button
            onClick={onFinish}
            className="p-1.5 rounded-full bg-void-900/90 hover:bg-void-800 text-slate-300 hover:text-white border border-white/20 transition-colors"
            title="닫기"
          >
            <X size={17} />
          </button>
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
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <motion.div
            initial={{ scale: 0.7, y: 70, opacity: 0 }}
            animate={
              step === 'PACK_SHAKE'
                ? { scale: 1, y: 0, opacity: 1, x: [-8, 8, -6, 6, -3, 3, 0] }
                : step === 'PACK_GLOW'
                ? { scale: 1.08, y: -8, opacity: 1 }
                : step === 'PACK_TEAR'
                ? { scale: 1.25, opacity: 0 }
                : { scale: 1, y: 0, opacity: 1 }
            }
            whileHover={step === 'PACK_ENTER' ? { scale: 1.05, y: -6 } : {}}
            whileTap={step === 'PACK_ENTER' ? { scale: 0.96 } : {}}
            onClick={handleStartOpening}
            transition={{
              duration: step === 'PACK_SHAKE' ? 0.8 : 0.4,
              ease: 'easeInOut',
            }}
            className={`relative w-64 sm:w-72 h-96 sm:h-[410px] rounded-2xl select-none [perspective:1000px] group ${
              step === 'PACK_ENTER' ? 'cursor-pointer' : ''
            }`}
          >
            {/* 팩 앰비언트 글로우 오라 */}
            <div
              className={`absolute -inset-3 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-500 animate-pulse`}
            />

            {/* 실물 TCG 규격 포일 팩 메인 본체 */}
            <div className="relative w-full h-full rounded-2xl border-2 border-pink-400/50 bg-black p-4 flex flex-col justify-between overflow-hidden shadow-2xl">
              {/* 팩 커버 고화질 이미지 */}
              <img
                src={pack.image}
                alt={pack.name}
                style={{ objectPosition: pack.objectPosition || 'center 20%' }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
              />

              {/* 팩 포일 광택 및 입체 명암 */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/90 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

              {/* 팩 개봉 시 빛 방출 (PACK_GLOW 단계) */}
              {step === 'PACK_GLOW' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0.4, 1, 0.8], scale: [1, 1.5, 1.3] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-t from-transparent via-pink-400/60 to-amber-300/80 blur-2xl pointer-events-none z-20"
                />
              )}

              {/* 상단 봉인 지퍼/주름 */}
              <div className="relative z-10 flex justify-between items-center border-b border-white/20 pb-2 bg-black/50 backdrop-blur-sm -mx-2 -mt-1 px-3 pt-1 rounded-t-xl">
                <div className="flex gap-1.5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1.5 h-2.5 bg-pink-500/80 rounded-sm shadow-sm" />
                  ))}
                </div>
                <span className="font-mono text-[9.5px] tracking-widest text-pink-300 font-black uppercase drop-shadow">
                  [{pack.code}] NMIXX TCG
                </span>
              </div>

              {/* 중앙 얼굴 노출 공간 확보 */}
              <div className="flex-1 min-h-[160px]" />

              {/* 하단 콤팩트 글래스모피즘 타이틀 밴드 (한 칸 밑으로 하단 배치 & 한 줄 완벽 렌더링) */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center bg-black/85 backdrop-blur-md py-1.5 px-2.5 rounded-2xl border border-white/20 shadow-2xl mb-1 w-full overflow-hidden">
                <h3 className="font-serif text-[13.5px] sm:text-[15px] font-black tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200 drop-shadow-md whitespace-nowrap truncate max-w-full">
                  {pack.name.replace(/^NMIXX\s*/i, 'NMIXX ')}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 max-w-full truncate">
                  <span className="text-[8.5px] text-pink-300 font-mono font-bold tracking-wider uppercase bg-pink-950/80 px-1.5 py-0.5 rounded border border-pink-500/30 flex-shrink-0">
                    {pack.subtitle.split(' • ')[0]}
                  </span>
                  <span className="text-[8.5px] text-slate-300 font-serif italic truncate">
                    {pack.slogan}
                  </span>
                </div>
              </div>

              {/* 하단 팩 정보 */}
              <div className="relative z-10 border-t border-white/20 pt-2 flex justify-between items-center text-[10px] font-mono text-slate-200 bg-black/60 backdrop-blur-sm -mx-2 -mb-1 px-3 pb-1.5 rounded-b-xl">
                <span className="font-bold">
                  {packCount === 1 ? '5 CARDS INSIDE' : `${packCount * 5} CARDS COMING UP!`}
                </span>
                <span className="text-amber-300 font-black">{cost} COIN</span>
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
        <div className="relative z-10 w-full max-w-6xl flex flex-col items-center gap-5 my-auto">
          {/* 상단 힌트 & Rarity 요약 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-5xl px-3 py-2 bg-void-950/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg gap-3">
            <div className="text-sm font-mono text-slate-200 font-bold flex items-center gap-2">
              {step === 'SUMMARY' ? (
                <span className="text-amber-300 flex items-center gap-2 text-sm sm:text-base font-serif font-black">
                  <Sparkles size={18} className="text-pink-400" /> NMIXX {packCount}팩 ({totalCount}장) 개봉 완료!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  카드를 터치하여 공개하세요 ({flippedCount}/{totalCount})
                </span>
              )}
            </div>

            {/* 모두 공개 버튼 */}
            {step !== 'SUMMARY' && (
              <button
                onClick={handleRevealAll}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white text-xs font-bold font-mono transition-all shadow-lg shadow-pink-950/60 flex items-center gap-2 hover:scale-105"
              >
                <Zap size={14} className="text-yellow-300" />
                <span>모두 공개 (Reveal All)</span>
                <ArrowRight size={14} />
              </button>
            )}

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

              return (
                <motion.div
                  key={card.instanceId}
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{
                    delay: Math.min(0.15, index * 0.008),
                    duration: 0.25,
                    ease: 'easeOut',
                  }}
                  className="flex justify-center transform-gpu"
                >
                  <CardFlip
                    card={card}
                    isFlipped={hasFlipped}
                    isNew={card.isNew}
                    duplicateCount={card.duplicateCount}
                    isPreRevealing={isFifthCard && !hasFlipped}
                    onFlip={() => handleFlipCard(index)}
                    size={totalCount > 10 ? 'sm' : 'md'}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* 4. 하단 액션 버튼 (카드가 모두 공개된 후에만 등장!) */}
          {(step === 'SUMMARY' || flippedCount === totalCount) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-col items-center gap-2.5 mt-1 w-full max-w-4xl px-2"
            >
              {/* 추가 개봉 버튼 그룹 (1팩 / 5팩 / 10팩) */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                {/* 1팩 더 열기 */}
                <button
                  disabled={coins < 100}
                  onClick={() => (onOpenPackCount ? onOpenPackCount(1) : onOpenAnother())}
                  className={`px-4 py-2.5 rounded-2xl font-serif font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                    coins >= 100
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-950/60 hover:scale-105 cursor-pointer'
                      : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Sparkles size={15} />
                  <span>1팩 더 열기 (100 COIN)</span>
                </button>

                {/* 5팩 더 열기 */}
                <button
                  disabled={coins < 480}
                  onClick={() => (onOpenPackCount ? onOpenPackCount(5) : onOpenAnother())}
                  className={`px-4 py-2.5 rounded-2xl font-serif font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                    coins >= 480
                      ? 'bg-void-800 hover:bg-void-700 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/40 hover:scale-105 cursor-pointer'
                      : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Zap size={15} className="text-purple-400" />
                  <span>5팩 더 열기 (480 COIN)</span>
                </button>

                {/* 10팩 더 열기 */}
                <button
                  disabled={coins < 900}
                  onClick={() => (onOpenPackCount ? onOpenPackCount(10) : onOpenAnother())}
                  className={`px-4 py-2.5 rounded-2xl font-serif font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                    coins >= 900
                      ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-fuchsia-600 hover:from-amber-500 hover:to-fuchsia-500 text-yellow-100 shadow-lg shadow-rose-950/50 hover:scale-105 cursor-pointer'
                      : 'bg-void-900 text-slate-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Sparkles size={15} className="text-yellow-300" />
                  <span>10팩 더 열기 (900 COIN)</span>
                </button>

                {/* 메인 페이지로 돌아가는 버튼 */}
                <button
                  onClick={onFinish}
                  className="px-5 py-2.5 rounded-2xl bg-void-900/90 hover:bg-void-800 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all border border-white/20 flex items-center gap-2 shadow-md hover:scale-105 cursor-pointer"
                >
                  <Home size={15} className="text-pink-400" />
                  <span>메인으로</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
