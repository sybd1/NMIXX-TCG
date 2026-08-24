import React, { useRef, useCallback } from 'react';
import { Card, FinishType } from '../../types/card';
import { RARITY_CONFIGS, RARITY_TO_FINISH } from '../../config/gameConfig';
import { sound } from '../../services/soundService';

interface CardVisualProps {
  card: Card;
  finishType?: FinishType;
  isOwned?: boolean;
  count?: number;
  isNew?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showDetails?: boolean;
}

// 멤버별 시그니처 컬러 및 포지션 라벨 (all-member는 단체로 표기)
const MEMBER_INFO: Record<string, { nameKo: string; position: string; color: string; bgBadge: string }> = {
  LILY: { nameKo: '릴리', position: 'MAIN VOCAL', color: '#38bdf8', bgBadge: 'bg-sky-500/30 text-sky-200 border-sky-400' },
  HAEWON: { nameKo: '해원', position: 'LEADER / LEAD VOCAL', color: '#a855f7', bgBadge: 'bg-purple-500/30 text-purple-200 border-purple-400' },
  SULLYOON: { nameKo: '설윤', position: 'LEAD VOCAL / VISUAL', color: '#f472b6', bgBadge: 'bg-pink-500/30 text-pink-200 border-pink-400' },
  BAE: { nameKo: '배이', position: 'VOCAL / DANCER', color: '#fbbf24', bgBadge: 'bg-amber-500/30 text-amber-200 border-amber-400' },
  JIWOO: { nameKo: '지우', position: 'MAIN RAPPER / DANCER', color: '#ef4444', bgBadge: 'bg-rose-500/30 text-rose-200 border-rose-400' },
  KYUJIN: { nameKo: '규진', position: 'MAIN DANCER / RAPPER', color: '#22c55e', bgBadge: 'bg-emerald-500/30 text-emerald-200 border-emerald-400' },
  NMIXX: { nameKo: '단체', position: 'ALL-ROUNDER', color: '#ec4899', bgBadge: 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400' },
  PARK: { nameKo: '박진영', position: 'PRODUCER / FOUNDER', color: '#f43f5e', bgBadge: 'bg-rose-600/40 text-rose-100 border-rose-400 font-black' },
};

const FINISH_CLASS_MAP: Record<FinishType, string> = {
  MATTE: 'finish-matte',
  GLOSSY: 'finish-glossy',
  SILVER_STAMPING: 'finish-silver-stamping',
  RAINBOW_FOIL: 'finish-rainbow-foil',
  SHATTERED_GLASS: 'finish-shattered-glass',
  PRISM_GLITTER: 'finish-prism-glitter',
  TEXTURE_GOLD: 'finish-texture-gold',
  COSMIC_GHOST: 'finish-cosmic-ghost',
  TRANSCENDENT_COSMIC: 'finish-transcendent-cosmic',
};

// 고등급 카드 전용 금빛 라이브 파티클 생성 데이터
const GOLD_PARTICLES = [
  { left: '15%', size: 4, delay: '0s', duration: '3.2s' },
  { left: '35%', size: 6, delay: '0.8s', duration: '4.0s' },
  { left: '55%', size: 5, delay: '1.6s', duration: '3.5s' },
  { left: '75%', size: 7, delay: '0.4s', duration: '4.5s' },
  { left: '88%', size: 4, delay: '2.1s', duration: '3.8s' },
  { left: '25%', size: 5, delay: '2.7s', duration: '4.2s' },
];

export const CardVisual: React.FC<CardVisualProps> = React.memo(({
  card,
  finishType,
  isOwned = true,
  count = 1,
  isNew = false,
  size = 'md',
  className = '',
  onClick,
  showDetails = true,
}) => {
  const effectiveFinish = finishType || card.finishType || RARITY_TO_FINISH[card.rarity] || 'MATTE';
  const finishClass = FINISH_CLASS_MAP[effectiveFinish] || 'finish-matte';
  const config = RARITY_CONFIGS[card.rarity] || RARITY_CONFIGS.C;
  const memberInfo = MEMBER_INFO[card.member] || MEMBER_INFO.NMIXX;

  const isHighTier = ['SR', 'SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity);
  const isXR = card.rarity === 'XR' || card.id === 'card_xr_transcendent_park_741';
  const effectiveCount = isXR ? Math.min(1, count) : count;
  const isXrMystery = card.rarity === 'XR' && !isOwned;

  // ─────────────────────────────────────────────────────────────────
  // simeydotme/pokemon-cards-css 수식 직접 이식
  // clamp(v, min=0, max=100) / round(v, precision=3) / adjust(v, fromMin, fromMax, toMin, toMax)
  // ─────────────────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [interacting, setInteracting] = React.useState(false);
  const [springVars, setSpringVars] = React.useState({
    pointerX:  50,   // --pointer-x  (glare x position, %)
    pointerY:  50,   // --pointer-y  (glare y position, %)
    bgX:       50,   // --background-x (constrained background shift)
    bgY:       50,   // --background-y
    rotateX:    0,   // --rotate-x  (deg, card tilt)
    rotateY:    0,   // --rotate-y
    pFromCenter: 0,  // --pointer-from-center (0–1, distance from card center)
    opacity:    0,   // --card-opacity (glare/shine layer opacity)
  });

  const clampVal  = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
  const roundVal  = (v: number, p = 3) => parseFloat(v.toFixed(p));
  // remap value from one range to another (from simeydotme Math.js)
  const adjust    = (val: number, fromMin: number, fromMax: number, toMin: number, toMax: number) =>
    toMin + (toMax - toMin) * ((val - fromMin) / (fromMax - fromMin));

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current) return;

    const rect  = cardRef.current.getBoundingClientRect();
    const absX  = clientX - rect.left;
    const absY  = clientY - rect.top;

    // 0–100 percent within card (clamped) — exact from Card.svelte
    const px = clampVal(roundVal((100 / rect.width)  * absX));
    const py = clampVal(roundVal((100 / rect.height) * absY));

    // center: -50 to +50 relative to card center
    const cx = px - 50;
    const cy = py - 50;

    // rotate: same formula as simeydotme (max ~14 deg at edge)
    const rotX = roundVal(-(cx / 3.5));
    const rotY = roundVal( cy / 3.5);

    // background-x/y: clamped to 37–63% range (reduces excessive parallax)
    const bgX = adjust(px, 0, 100, 37, 63);
    const bgY = adjust(py, 0, 100, 33, 67);

    // pointer-from-center: 0 (center) → 1 (corner) — exact from dynamicStyles
    const pFromCenter = clampVal(
      Math.sqrt(cy * cy + cx * cx) / 50, 0, 1
    );

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        setSpringVars({ pointerX: px, pointerY: py, bgX, bgY, rotateX: rotX, rotateY: rotY, pFromCenter, opacity: 1 });
        rafIdRef.current = null;
      });
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handlePointerEnter = () => setInteracting(true);

  const handlePointerLeave = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setInteracting(false);
    // spring-like reset: reset to neutral
    setSpringVars({ pointerX: 50, pointerY: 50, bgX: 50, bgY: 50, rotateX: 0, rotateY: 0, pFromCenter: 0, opacity: 0 });
  };

  const handleClick = () => {
    if (isOwned && isHighTier) sound.playNmixxMelody(card.rarity);
    if (onClick) onClick();
  };


  // size prop에 따른 기본 치수
  const defaultSizeClass = className.includes('w-') ? '' : {
    sm: 'w-36 h-52 text-xs',
    md: 'w-48 sm:w-52 h-72 sm:h-76 text-sm',
    lg: 'w-64 h-92 text-base',
  }[size];

  // 9단계 Rarity 테두리 및 대폭 강화된 SSR+ 고등급 프레임 스타일
  const rarityBorders: Record<Card['rarity'], string> = {
    C: isOwned ? 'border-[1.5px] border-slate-600/90 hover:border-slate-400 shadow-md' : 'border-[1.5px] border-slate-800/90',
    UC: isOwned ? 'border-[1.5px] border-emerald-400 hover:border-emerald-200 shadow-glow-uc ring-1 ring-emerald-400/40' : 'border-[1.5px] border-emerald-950/80',
    R: isOwned ? 'border-2 border-sky-400 hover:border-sky-200 shadow-glow-r ring-1 ring-sky-400/60' : 'border-2 border-sky-950/80',
    SR: isOwned ? 'border-2 border-purple-400 hover:border-purple-200 shadow-glow-sr ring-2 ring-purple-400/80' : 'border-2 border-purple-950/80',
    // 🌟 SSR+ 등급: 3.5px~5px 초강력 림 테두리 + 강력한 앰비언트 글로우 + 링 오프셋
    SSR: isOwned
      ? 'border-[3.5px] border-amber-300 hover:border-yellow-100 shadow-[0_0_25px_rgba(245,158,11,0.7)] ring-2 ring-amber-400/90 ring-offset-1 ring-offset-black'
      : 'border-[2px] border-amber-950/80',
    UR: isOwned
      ? 'border-[4px] border-rose-400 hover:border-red-200 shadow-[0_0_30px_rgba(244,63,94,0.85)] ring-2 ring-rose-500 ring-offset-2 ring-offset-black animate-pulse-subtle'
      : 'border-[2px] border-rose-950/80',
    LR: isOwned
      ? 'border-[4px] border-pink-300 hover:border-rose-100 shadow-[0_0_35px_rgba(244,114,182,0.9)] ring-3 ring-pink-400 ring-offset-2 ring-offset-black animate-pulse-fast'
      : 'border-[2px] border-pink-950/80',
    MR: isOwned
      ? 'border-[4.5px] border-amber-200 hover:border-white shadow-[0_0_40px_rgba(250,204,21,0.95)] ring-4 ring-amber-400 ring-offset-2 ring-offset-black animate-pulse-fast'
      : 'border-[2px] border-yellow-950/80',
    XR: isOwned
      ? 'border-[5px] border-rose-500 hover:border-amber-300 shadow-[0_0_50px_rgba(244,63,94,1.0),0_0_25px_rgba(250,204,21,0.9)] ring-4 ring-amber-400 ring-offset-2 ring-offset-black animate-pulse-fast'
      : 'border-[3px] border-rose-900/80 ring-2 ring-rose-500/40',
  };

  const isNmixxGroup = card.member === 'NMIXX';
  const isLogoCard = card.theme?.includes('심볼') || card.theme?.includes('로고') || card.name.includes('심볼') || card.name.includes('로고');
  const isSsrPlus = ['SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity);

  // 9단계 Rarity별 이너 프레임 라인 & 코너 악센트 색상 가이드
  const innerFrameStyles: Record<Card['rarity'], { border: string; corner: string; glow: string }> = {
    C: { border: 'border-slate-500/40', corner: 'border-slate-400/60', glow: '' },
    UC: { border: 'border-emerald-400/50', corner: 'border-emerald-300', glow: 'shadow-[0_0_6px_rgba(52,211,153,0.3)]' },
    R: { border: 'border-slate-200/80', corner: 'border-white', glow: 'shadow-[0_0_10px_rgba(255,255,255,0.45)]' },
    SR: { border: 'border-purple-400/80', corner: 'border-purple-300', glow: 'shadow-[0_0_12px_rgba(192,132,252,0.55)]' },
    SSR: { border: 'border-[1.5px] border-amber-300', corner: 'border-yellow-200', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.65)]' },
    UR: { border: 'border-[2px] border-rose-400', corner: 'border-rose-200', glow: 'shadow-[0_0_18px_rgba(244,63,94,0.75)]' },
    LR: { border: 'border-[2px] border-yellow-300', corner: 'border-amber-200', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.85)]' },
    MR: { border: 'border-[2px] border-cyan-300', corner: 'border-white', glow: 'shadow-[0_0_22px_rgba(6,182,212,0.9)]' },
    XR: { border: 'border-[2.5px] border-rose-500', corner: 'border-amber-300', glow: 'shadow-[0_0_25px_rgba(244,63,94,0.95)]' },
  };

  const currentInnerFrame = innerFrameStyles[card.rarity] || innerFrameStyles.C;
  const serialCode = card.packCode
    ? `${card.packCode.replace('-', '')}-${String(card.collectionNumber).padStart(3, '0')}`
    : `NX1-${String(card.collectionNumber).padStart(3, '0')}`;

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseEnter={isOwned ? handlePointerEnter : undefined}
      onMouseMove={isOwned ? handleMouseMove : undefined}
      onTouchMove={isOwned ? handleTouchMove : undefined}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      style={{
        // ── simeydotme dynamicStyles: CSS 변수 → 자식 shine/glare 레이어 계승 ──
        ['--pointer-x'          as string]: `${springVars.pointerX}%`,
        ['--pointer-y'          as string]: `${springVars.pointerY}%`,
        ['--pointer-from-center'as string]: springVars.pFromCenter,
        ['--pointer-from-top'   as string]: springVars.pointerY / 100,
        ['--pointer-from-left'  as string]: springVars.pointerX / 100,
        ['--background-x'       as string]: `${springVars.bgX}%`,
        ['--background-y'       as string]: `${springVars.bgY}%`,
        ['--rotate-x'           as string]: `${springVars.rotateX}deg`,
        ['--rotate-y'           as string]: `${springVars.rotateY}deg`,
        ['--card-opacity'       as string]: springVars.opacity,
        // ── GPU 가속 3D 틸트: 루트 wrapper에만 적용 (자식은 평면 유지) ──
        transform: isOwned
          ? `perspective(800px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) ${interacting ? 'translateY(-3px)' : ''}`
          : undefined,
        transition: interacting
          ? 'transform 0.08s ease-out'
          : 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: isOwned ? 'transform' : undefined,
      } as React.CSSProperties}
      className={`group relative ${defaultSizeClass} ${className} rounded-2xl p-[1.5px] cursor-pointer select-none transition-all duration-300 ${
        !isOwned && !isXrMystery ? 'opacity-40 hover:opacity-75 filter grayscale-[80%] brightness-[70%] contrast-[90%]' : 'hover:scale-[1.03]'
      } ${isXrMystery ? 'hover:scale-[1.04]' : ''}`}
    >
      {/* ── Finish 쉐이더 레이어 (등급별 포일/텍스처) ── */}
      {isOwned && (
        <div className={`absolute inset-0 rounded-2xl z-30 pointer-events-none ${finishClass}`} />
      )}

      {/* 🌈 card__shine — color-dodge 홀로그램 무지개 반사광 */}
      {isOwned && (
        <div
          className={`card__shine absolute inset-0 rounded-2xl z-31 pointer-events-none${isSsrPlus ? ' holo-prism-intense' : ''}`}
          style={{
            ['--holo-strength' as string]: isXR ? '1.0'
              : ['MR', 'LR'].includes(card.rarity) ? '0.85'
              : ['UR', 'SSR'].includes(card.rarity) ? '0.7'
              : card.rarity === 'SR' ? '0.5'
              : ['R', 'UC'].includes(card.rarity) ? '0.28'
              : '0.0',
          } as React.CSSProperties}
        />
      )}

      {/* 💡 card__glare — overlay 원형 광원 */}
      {isOwned && (
        <div
          className="card__glare absolute inset-0 rounded-2xl z-32 pointer-events-none"
          style={{
            ['--glare-max' as string]: isSsrPlus ? '0.60'
              : ['R', 'SR'].includes(card.rarity) ? '0.38'
              : '0.22',
          } as React.CSSProperties}
        />
      )}

      {/* ── 고등급 금빛 파티클 (SSR+) ── */}
      {isOwned && isHighTier && (
        <div className="absolute inset-0 rounded-2xl z-25 pointer-events-none overflow-hidden">
          {GOLD_PARTICLES.map((gp, i) => (
            <div
              key={i}
              className="gold-particle"
              style={{
                left: gp.left,
                width: `${gp.size}px`,
                height: `${gp.size}px`,
                animationDelay: gp.delay,
                animationDuration: gp.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* ── 미보유 잠금 오버레이 ── */}
      {!isOwned && !isXrMystery && (
        <div className="absolute inset-0 z-30 rounded-2xl flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[1px]">
          <div className="bg-black/85 border border-white/20 text-slate-300 text-[10px] font-mono font-black px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5">
            <span>🔒</span>
            <span className="tracking-wider">LOCKED</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          메인 카드 바디 — flat, no preserve-3d, no translateZ
          카드 전체가 단일 평면으로 함께 틸트됨
          ══════════════════════════════════════════════════════ */}
      <div
        className={`relative w-full h-full rounded-2xl ${
          rarityBorders[card.rarity]
        } bg-black flex flex-col justify-between overflow-hidden z-10 shadow-2xl ${
          isOwned && isHighTier
            ? (card.rarity === 'MR' ? 'embossed-mr' : card.rarity === 'LR' ? 'embossed-lr' : card.rarity === 'UR' ? 'embossed-ur' : card.rarity === 'SSR' ? 'embossed-ssr' : 'embossed-sr')
            : ''
        } ${isOwned && card.isEmbossed3D ? 'card-embossed-3d' : ''}`}
      >
        {/* XR 미획득 상태: 미스터리 카드 */}
        {isXrMystery ? (
          <div className="absolute inset-0 bg-gradient-to-b from-void-950 via-purple-950/80 to-black flex flex-col items-center justify-between p-3.5 z-20 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.35)_0%,rgba(147,51,234,0.25)_50%,transparent_80%)] animate-pulse" />
            <div className="absolute w-36 h-36 rounded-full border border-rose-500/20 border-dashed animate-spin [animation-duration:15s] pointer-events-none" />
            <div className="relative z-20 w-full flex items-center justify-between pointer-events-none">
              <span className="font-mono text-[8.5px] font-black text-rose-300 bg-black/80 px-2 py-0.5 rounded-lg border border-rose-500/30">
                {serialCode}
              </span>
              <span className="text-[8.5px] font-black tracking-widest bg-gradient-to-r from-rose-600 to-amber-500 text-white px-2 py-0.5 rounded border border-white/30 shadow-lg animate-pulse">
                XR 초월
              </span>
            </div>
            <div className="relative z-20 flex flex-col items-center justify-center my-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-amber-500/20 border border-rose-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.6)] backdrop-blur-sm animate-bounce">
                <span className="font-serif font-black text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-300 to-amber-400 drop-shadow-[0_2px_10px_rgba(250,204,21,0.8)]">
                  ?
                </span>
              </div>
              <span className="mt-2.5 text-[9.5px] font-mono font-extrabold text-rose-300 tracking-wider text-center drop-shadow">
                TRANSCENDENT CARD
              </span>
            </div>
            <div className="relative z-20 w-full text-center bg-black/80 py-1 px-2 rounded-xl border border-rose-500/30">
              <span className="text-[7.5px] font-mono text-slate-300 block truncate">
                이 카드를 제외한 모든 카드 수집 시 자동 획득
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ── 배경 그라디언트 (평면, no translateZ) ── */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${card.gradient} pointer-events-none opacity-85`}
            />

            {/* ── 블러 앰비언트 배경 이미지 (평면) ── */}
            {card.image && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={card.image}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover scale-[1.65] blur-[24px] brightness-[0.7] contrast-125 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75" />
              </div>
            )}

            {/* ── 메인 포그라운드 이미지 (평면) ── */}
            {card.image && (
              <div className="absolute inset-0 flex items-center justify-center p-2.5 pt-8 pb-10 pointer-events-none">
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={card.image}
                    alt={card.name}
                    loading="lazy"
                    decoding="async"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.9)] ring-1 ring-white/20 group-hover:scale-[1.02] transition-transform duration-200 pointer-events-none"
                  />
                  <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/15 pointer-events-none" />
                </div>
              </div>
            )}

            {/* ── 내부 장식 프레임 + 코너 악센트 (평면) ── */}
            <div
              className={`absolute inset-[6px] rounded-xl border ${currentInnerFrame.border} ${currentInnerFrame.glow} pointer-events-none z-15`}
            >
              <div className={`absolute top-0.5 left-0.5 w-2 h-2 border-t-2 border-l-2 ${currentInnerFrame.corner}`} />
              <div className={`absolute top-0.5 right-0.5 w-2 h-2 border-t-2 border-r-2 ${currentInnerFrame.corner}`} />
              <div className={`absolute bottom-0.5 left-0.5 w-2 h-2 border-b-2 border-l-2 ${currentInnerFrame.corner}`} />
              <div className={`absolute bottom-0.5 right-0.5 w-2 h-2 border-b-2 border-r-2 ${currentInnerFrame.corner}`} />
              {isSsrPlus && (
                <>
                  <div className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                  <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                </>
              )}
            </div>

            {/* ── 고등급 베벨 림 (평면) ── */}
            {isOwned && isHighTier && (
              <div
                className="absolute inset-0 rounded-2xl border-2 border-white/30 pointer-events-none"
                style={{
                  boxShadow: isSsrPlus
                    ? 'inset 0 0 18px rgba(250,204,21,0.45)'
                    : 'inset 0 0 12px rgba(255,255,255,0.3)',
                }}
              />
            )}

            {/* ── 상단 HUD 헤더 바 (평면) ── */}
            <div className="relative z-20 w-full p-2 flex items-center justify-between pointer-events-none bg-black/40 backdrop-blur-md border-b border-white/10">
              <span className="font-mono text-[8px] sm:text-[8.5px] font-black text-amber-300 bg-black/70 px-2 py-0.5 rounded-md border border-amber-500/40 shadow-sm tracking-tight">
                {serialCode}
              </span>
              <div className="flex items-center gap-1">
                {card.isLegacy && (
                  <span className="text-[7.5px] font-mono font-black text-purple-200 bg-purple-950/90 px-1.5 py-0.5 rounded border border-purple-400/50 shadow-md">
                    🏛️ Legacy
                  </span>
                )}
                <span className="text-[7.5px] font-mono font-black text-pink-200 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded border border-pink-500/40">
                  {isLogoCard ? '⚓ 심볼' : (isNmixxGroup ? '✨ 단체' : `${card.symbol || ''} ${memberInfo.nameKo}`)}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badgeBg} shadow-md backdrop-blur-sm`}>
                  {card.rarity}
                </span>
              </div>
            </div>

            {/* ── 하단 정보 패널 (평면) ── */}
            {showDetails && (
              <div className="relative z-20 mt-auto w-full p-2 bg-black/65 backdrop-blur-md border-t border-white/15 flex flex-col gap-0.5 pointer-events-none">
                <div className="flex items-center justify-between w-full overflow-hidden">
                  <span className="font-serif font-black text-white text-[10px] sm:text-[11.5px] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] whitespace-nowrap overflow-hidden text-ellipsis block truncate max-w-[72%] leading-tight">
                    {isLogoCard ? 'Fe3O4: FORWARD 심볼' : (card.name.replace(/^\[[^\]]+\]\s*/, '') || card.name)}
                  </span>
                  <span className="text-[7px] sm:text-[7.5px] font-mono font-extrabold text-amber-300 uppercase whitespace-nowrap overflow-hidden text-ellipsis drop-shadow leading-tight bg-amber-950/60 px-1 py-0.2 rounded border border-amber-500/30 flex-shrink-0">
                    {card.era}
                  </span>
                </div>
                <p className="text-[7.5px] sm:text-[8px] font-sans text-slate-300/90 leading-tight truncate italic drop-shadow-sm">
                  {card.quote ? `"${card.quote}"` : card.description}
                </p>
                <div className="flex items-center justify-between text-[6.5px] sm:text-[7px] font-mono text-slate-400/90 pt-0.5 border-t border-white/10 mt-0.5 leading-none">
                  <span className="tracking-tight text-amber-300/90 font-bold">{serialCode}</span>
                  <span className="truncate max-w-[100px] text-slate-300">{card.packName || 'NMIXX TCG'}</span>
                  <span className="text-pink-300 font-bold">{card.finishType || 'NORMAL'}</span>
                </div>
              </div>
            )}

            {/* ── 수량 뱃지 x2, x3 (평면) ── */}
            {effectiveCount > 1 && (
              <div className="absolute bottom-9 right-2 z-40 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black border-2 border-white font-mono text-[9.5px] sm:text-[10.5px] font-black px-1.5 py-0.5 rounded-md shadow-[0_0_15px_rgba(250,204,21,0.95)] ring-1 ring-amber-400/80 pointer-events-none flex items-center gap-0.5 tracking-tight">
                <span className="text-[8.5px]">x</span>
                <span>{effectiveCount}</span>
              </div>
            )}

            {/* ── NEW 뱃지 (평면) ── */}
            {isNew && (
              <div className="absolute top-2 left-2 z-40 bg-gradient-to-r from-emerald-400 via-teal-200 to-yellow-300 text-black font-black text-[9px] sm:text-[9.5px] px-2.5 py-0.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.95)] ring-2 ring-white animate-bounce flex items-center gap-1 pointer-events-none">
                <span className="text-[10px]">✨</span>
                <span className="tracking-wider">NEW</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});


