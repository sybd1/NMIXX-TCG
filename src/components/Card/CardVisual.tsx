import React, { useRef, useCallback } from 'react';
import { Card, FinishType } from '../../types/card';
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

// 🌈 멤버별 시그니처 컬러, 전용 배경 그라디언트 및 마우스 반응 라이트 컬러
export const MEMBER_THEMES: Record<string, {
  nameKo: string;
  position: string;
  color: string;
  lightColor: string; // 마우스 반응 라이트 컬러
  glowColor: string;
  bgGradient: string; // 멤버 전용 배경 그라디언트
}> = {
  LILY: {
    nameKo: '릴리',
    position: 'MAIN VOCAL',
    color: '#38bdf8',
    lightColor: 'rgba(56, 189, 248, 0.45)',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    bgGradient: 'from-sky-950/90 via-cyan-900/50 to-slate-950',
  },
  HAEWON: {
    nameKo: '해원',
    position: 'LEADER / LEAD VOCAL',
    color: '#a855f7',
    lightColor: 'rgba(168, 85, 247, 0.45)',
    glowColor: 'rgba(168, 85, 247, 0.35)',
    bgGradient: 'from-purple-950/90 via-indigo-900/50 to-slate-950',
  },
  SULLYOON: {
    nameKo: '설윤',
    position: 'LEAD VOCAL / VISUAL',
    color: '#f472b6',
    lightColor: 'rgba(244, 114, 182, 0.45)',
    glowColor: 'rgba(244, 114, 182, 0.35)',
    bgGradient: 'from-pink-950/90 via-rose-900/50 to-slate-950',
  },
  BAE: {
    nameKo: '배이',
    position: 'VOCAL / DANCER',
    color: '#fbbf24',
    lightColor: 'rgba(251, 191, 36, 0.45)',
    glowColor: 'rgba(251, 191, 36, 0.35)',
    bgGradient: 'from-amber-950/90 via-yellow-900/50 to-slate-950',
  },
  JIWOO: {
    nameKo: '지우',
    position: 'MAIN RAPPER / DANCER',
    color: '#ef4444',
    lightColor: 'rgba(239, 68, 68, 0.45)',
    glowColor: 'rgba(239, 68, 68, 0.35)',
    bgGradient: 'from-rose-950/90 via-red-900/50 to-slate-950',
  },
  KYUJIN: {
    nameKo: '규진',
    position: 'MAIN DANCER / RAPPER',
    color: '#22c55e',
    lightColor: 'rgba(34, 197, 94, 0.45)',
    glowColor: 'rgba(34, 197, 94, 0.35)',
    bgGradient: 'from-emerald-950/90 via-teal-900/50 to-slate-950',
  },
  NMIXX: {
    nameKo: '단체',
    position: 'ALL-ROUNDER',
    color: '#ec4899',
    lightColor: 'rgba(236, 72, 153, 0.45)',
    glowColor: 'rgba(236, 72, 153, 0.35)',
    bgGradient: 'from-fuchsia-950/90 via-purple-900/50 to-slate-950',
  },
  PARK: {
    nameKo: '박진영',
    position: 'PRODUCER',
    color: '#f43f5e',
    lightColor: 'rgba(244, 63, 94, 0.5)',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    bgGradient: 'from-void-950 via-rose-950/80 to-amber-950/60',
  },
};

// 8단계 Rarity별 전용 후가공 셰이더 클래스 매핑
const RARITY_FINISH_MAP: Record<Card['rarity'], string> = {
  C: 'finish-matte',
  UC: 'finish-glossy',
  R: 'finish-rare-glitter',
  SR: 'finish-sr-horizontal',
  SSR: 'finish-ssr-soft',
  UR: 'finish-ur-pastel',
  LR: 'finish-lr-cross-metal',
  MR: 'finish-mr-radiant-nmixx',
  XR: 'finish-transcendent-cosmic',
};

const FINISH_CLASS_MAP: Record<FinishType, string> = {
  MATTE: 'finish-matte',
  GLOSSY: 'finish-glossy',
  SILVER_STAMPING: 'finish-rare-glitter',
  RAINBOW_FOIL: 'finish-sr-horizontal',
  SHATTERED_GLASS: 'finish-ssr-soft',
  PRISM_GLITTER: 'finish-ur-pastel',
  TEXTURE_GOLD: 'finish-lr-cross-metal',
  COSMIC_GHOST: 'finish-mr-radiant-nmixx',
  TRANSCENDENT_COSMIC: 'finish-transcendent-cosmic',
};

// 고등급 카드 전용 은은한 금빛 라이브 파티클 데이터
const GOLD_PARTICLES = [
  { left: '15%', size: 3, delay: '0s', duration: '3.2s' },
  { left: '38%', size: 5, delay: '0.8s', duration: '4.0s' },
  { left: '62%', size: 4, delay: '1.6s', duration: '3.5s' },
  { left: '82%', size: 5, delay: '0.4s', duration: '4.5s' },
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
  const finishClass = finishType
    ? FINISH_CLASS_MAP[finishType] || 'finish-matte'
    : RARITY_FINISH_MAP[card.rarity] || 'finish-matte';

  const memberTheme = MEMBER_THEMES[card.member] || MEMBER_THEMES.NMIXX;
  const isHighTier = ['SR', 'SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity);
  const isSsrPlus = ['SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity);
  const isXR = card.rarity === 'XR' || card.id === 'card_xr_transcendent_park_741';
  const effectiveCount = isXR ? Math.min(1, count) : count;
  const isXrMystery = card.rarity === 'XR' && !isOwned;

  // ─────────────────────────────────────────────────────────────────
  // 올바른 물리 기반 3D 틸트 (X/Y 축 완벽 연동)
  // ─────────────────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [interacting, setInteracting] = React.useState(false);
  const [springVars, setSpringVars] = React.useState({
    pointerX:  50,
    pointerY:  50,
    bgX:       50,
    bgY:       50,
    rotateX:    0,
    rotateY:    0,
    pFromCenter: 0,
    opacity:    0,
  });

  const clampVal = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
  const roundVal = (v: number, p = 3) => parseFloat(v.toFixed(p));
  const adjust   = (val: number, fromMin: number, fromMax: number, toMin: number, toMax: number) =>
    toMin + (toMax - toMin) * ((val - fromMin) / (fromMax - fromMin));

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const absX = clientX - rect.left;
    const absY = clientY - rect.top;

    const px = clampVal(roundVal((100 / rect.width)  * absX));
    const py = clampVal(roundVal((100 / rect.height) * absY));

    // 🎯 마우스가 있는 위치가 위로 기울어져 올라오도록 반전 (Tilt Towards Cursor)
    const rotX = roundVal(((py - 50) / 3.5));
    const rotY = roundVal(-((px - 50) / 3.5));

    const bgX = adjust(px, 0, 100, 37, 63);
    const bgY = adjust(py, 0, 100, 33, 67);

    const cx = px - 50;
    const cy = py - 50;
    const pFromCenter = clampVal(Math.sqrt(cy * cy + cx * cx) / 50, 0, 1);

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
    setSpringVars({ pointerX: 50, pointerY: 50, bgX: 50, bgY: 50, rotateX: 0, rotateY: 0, pFromCenter: 0, opacity: 0 });
  };

  const handleClick = () => {
    if (isOwned && isHighTier) sound.playNmixxMelody(card.rarity);
    if (onClick) onClick();
  };

  const defaultSizeClass = className.includes('w-') ? '' : {
    sm: 'w-36 h-52 text-xs',
    md: 'w-48 sm:w-52 h-72 sm:h-76 text-sm',
    lg: 'w-64 h-92 text-base',
  }[size];

  // 9단계 Rarity 외곽 테두리 (MR은 묵직한 티타늄 메탈 두께감 프레임)
  const rarityBorders: Record<Card['rarity'], string> = {
    C:   isOwned ? 'border border-slate-600/80 shadow-md' : 'border border-slate-800',
    UC:  isOwned ? 'border-[1.5px] border-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.35)]' : 'border border-emerald-950/80',
    R:   isOwned ? 'border-[1.5px] border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.45)]' : 'border border-sky-950/80',
    SR:  isOwned ? 'border-2 border-purple-400 shadow-[0_0_18px_rgba(192,132,252,0.55)]' : 'border border-purple-950/80',
    SSR: isOwned ? 'border-2 border-amber-300 shadow-[0_0_22px_rgba(250,204,21,0.65)] ring-1 ring-amber-400/40' : 'border border-amber-950/80',
    UR:  isOwned ? 'border-2 border-rose-300 shadow-[0_0_25px_rgba(253,164,175,0.75)] ring-1 ring-rose-400/50' : 'border border-rose-950/80',
    LR:  isOwned ? 'border-[2.5px] border-yellow-200 shadow-[0_0_30px_rgba(254,240,138,0.85)] ring-1 ring-amber-300/60' : 'border border-pink-950/80',
    // 🌟 MR: 묵직하고 두꺼운 최고급 티타늄 메탈 프레임
    MR:  isOwned ? 'border-[3.5px] border-slate-200 shadow-[0_0_35px_rgba(56,189,248,0.5),inset_0_0_15px_rgba(0,0,0,0.95),0_15px_35px_rgba(0,0,0,0.95)] ring-2 ring-white/60 ring-offset-2 ring-offset-black' : 'border border-yellow-950/80',
    XR:  isOwned ? 'border-[3px] border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.95),0_0_20px_rgba(250,204,21,0.8)] ring-2 ring-amber-400/80' : 'border border-rose-900/80',
  };

  // 9단계 Rarity 텍스트 타이포그래피 스타일
  const rarityTextStyles: Record<Card['rarity'], string> = {
    C:   'text-slate-400 font-bold',
    UC:  'text-emerald-300 font-black drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]',
    R:   'text-sky-300 font-black drop-shadow-[0_0_8px_rgba(56,189,248,0.85)]',
    SR:  'text-purple-300 font-black drop-shadow-[0_0_10px_rgba(192,132,252,0.9)]',
    SSR: 'text-amber-300 font-black drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]',
    UR:  'text-rose-300 font-black drop-shadow-[0_0_14px_rgba(253,164,175,1)]',
    LR:  'text-yellow-200 font-black drop-shadow-[0_0_16px_rgba(254,240,138,1)]',
    MR:  'text-cyan-200 font-black drop-shadow-[0_0_18px_rgba(165,243,252,1)]',
    XR:  'text-rose-400 font-black drop-shadow-[0_0_20px_rgba(244,63,94,1)]',
  };

  const isLogoCard = card.theme?.includes('심볼') || card.theme?.includes('로고') || card.name.includes('심볼') || card.name.includes('로고');
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
        // ── CSS 변수: 루트에서 주입되어 모든 자식 레이어로 자동 계승 ──
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
        // 🌈 멤버 시그니처 틴트 라이트 컬러 연동
        ['--member-light'       as string]: memberTheme.lightColor,
        ['--member-glow'        as string]: memberTheme.glowColor,
        // ── GPU 하드웨어 가속 3D 틸트: 루트에만 적용 (마우스 있는 곳이 들려 올라옴) ──
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
      } ${isXrMystery ? 'hover:scale-[1.04]' : ''} card-tier-${card.rarity.toLowerCase()}`}
    >
      {/* 🔒 미보유 카드 잠금 오버레이 */}
      {!isOwned && !isXrMystery && (
        <div className="absolute inset-0 z-50 rounded-2xl flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-[1px]">
          <span className="text-xs font-mono font-black text-slate-300 drop-shadow flex items-center gap-1">
            🔒 LOCKED
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          메인 카드 바디 — simeydotme 수준의 5단계 멀티 레이어 아키텍처
          ══════════════════════════════════════════════════════════════ */}
      <div
        className={`relative w-full h-full rounded-2xl ${
          rarityBorders[card.rarity]
        } bg-black flex flex-col justify-between overflow-hidden z-10 shadow-2xl card-inner-frame`}
      >
        {/* XR 미획득 상태: 미스터리 카드 */}
        {isXrMystery ? (
          <div className="absolute inset-0 bg-gradient-to-b from-void-950 via-purple-950/80 to-black flex flex-col items-center justify-between p-4 z-20 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.35)_0%,rgba(147,51,234,0.25)_50%,transparent_80%)] animate-pulse" />
            <div className="w-full flex items-center justify-between pointer-events-none">
              <span className="font-mono text-[9px] font-bold text-rose-300/80 drop-shadow">
                {serialCode}
              </span>
              <span className="font-black text-xs text-rose-400 tracking-widest drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse">
                XR 초월
              </span>
            </div>
            <div className="flex flex-col items-center justify-center my-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-amber-500/20 border border-rose-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.6)] backdrop-blur-sm animate-bounce">
                <span className="font-serif font-black text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-300 to-amber-400 drop-shadow-[0_2px_10px_rgba(250,204,21,0.8)]">
                  ?
                </span>
              </div>
              <span className="mt-2.5 text-[9.5px] font-mono font-extrabold text-rose-300 tracking-wider text-center drop-shadow">
                TRANSCENDENT CARD
              </span>
            </div>
            <span className="text-[8px] font-mono text-slate-400 text-center block truncate">
              전체 카드 수집 시 자동 획득
            </span>
          </div>
        ) : (
          <>
            {/* ── [Layer 1: Base Background Layer] (멤버별 시그니처 배경 그라디언트) ── */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${card.gradient || memberTheme.bgGradient} pointer-events-none opacity-85 z-0`}
            />

            {/* ── [Layer 2: Foil & Holo Shine Layer] (z-10) ── */}
            {isOwned && (
              <div className={`absolute inset-0 rounded-2xl z-10 pointer-events-none ${finishClass}`} />
            )}
            {isOwned && isSsrPlus && (
              <div
                className={`card__shine absolute inset-0 rounded-2xl z-12 pointer-events-none ${
                  card.rarity === 'XR' ? 'holo-prism-intense'
                  : ['MR', 'LR'].includes(card.rarity) ? 'holo-prism-intense'
                  : 'holo'
                }`}
                style={{
                  ['--holo-strength' as string]: isXR ? '1.0'
                    : ['MR', 'LR'].includes(card.rarity) ? '0.85'
                    : '0.65',
                } as React.CSSProperties}
              />
            )}

            {/* ── [Layer 3: Real Noise & Grain Texture Overlay] (z-15) ── */}
            <div className="card__noise absolute inset-0 rounded-2xl z-15 pointer-events-none" />

            {/* ── [Layer 4: Character Artwork Layer] (z-20) ── */}
            {/* 🎯 스마트 크롭된 600x840 px 고화질 이미지를 카드에 꽉 채우고, 얼굴이 color-dodge로 타지 않도록 선명하게 보호! */}
            {card.image && (
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                <img
                  src={card.image}
                  alt={card.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Fallback to relative path if leading slash failed
                    const target = e.currentTarget;
                    const imgUrl = card.image || '';
                    if (imgUrl.startsWith('/') && !target.dataset.triedRelative) {
                      target.dataset.triedRelative = 'true';
                      target.src = imgUrl.slice(1);
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                  className={`w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200 pointer-events-none ${
                    card.rarity === 'UR'
                      ? 'filter brightness-[1.04] saturate-[1.22] contrast-[1.05] drop-shadow-[0_4px_12px_rgba(253,164,175,0.35)]'
                      : ''
                  }`}
                />
              </div>
            )}

            {/* ── [Layer 4-B: SSR 전용 3D 이너 림 액자 프레임 (레퍼런스 스타일)] ── */}
            {card.rarity === 'SSR' && isOwned && (
              <div className="absolute inset-[12px] rounded-xl border-2 border-white/45 shadow-[inset_0_0_15px_rgba(255,255,255,0.4),0_0_15px_rgba(0,0,0,0.6)] pointer-events-none z-21" />
            )}

            {/* ── [Layer 4-C: MR 전용 인물 위 교차 격자 광선 투과 레이어] ── */}
            {isOwned && card.rarity === 'MR' && (
              <div className="absolute inset-0 rounded-2xl z-22 pointer-events-none finish-mr-radiant-nmixx opacity-45 mix-blend-color-dodge" />
            )}

            {/* ── [Layer 5: Glare, Lighting & HUD UI Layer] (z-25 ~ z-30) ── */}
            {/* 5A. 원형 실물 포토카드 코팅 표면 반사광 (멤버별 시그니처 틴트 반영) */}
            {isOwned && card.rarity !== 'SSR' && (
              <div
                className="card__glare absolute inset-0 rounded-2xl z-25 pointer-events-none"
                style={{
                  ['--glare-max' as string]: isSsrPlus ? '0.45'
                    : ['R', 'SR'].includes(card.rarity) ? '0.28'
                    : '0.18',
                } as React.CSSProperties}
              />
            )}

            {/* 5B. SSR+ 고등급 라이브 골드 파티클 */}
            {isOwned && isSsrPlus && (
              <div className="absolute inset-0 rounded-2xl z-26 pointer-events-none overflow-hidden">
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

            {/* 5C. 1px 섬세한 이너 프레임 라인 */}
            <div className="absolute inset-[6px] rounded-xl border border-white/10 pointer-events-none z-27" />

            {/* 5D. 상단 레퍼런스 디자인: NMIXX 시그니처 로고 (상단 좌측) & 등급 표기 (상단 우측) */}
            <div className="relative z-30 w-full p-2.5 pt-2 flex items-center justify-between pointer-events-none">
              <span className="font-sans font-black text-[11px] sm:text-[13px] tracking-widest text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] uppercase">
                NMIXX
              </span>
              <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${rarityTextStyles[card.rarity]} drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]`}>
                {card.rarity}
              </span>
            </div>

            {/* 5E. 하단 레퍼런스 디자인 정보 바 (하단 좌: 멤버명+NMIXX / 하단 우: 등급+시리얼) */}
            {showDetails && (
              <div className={`relative z-30 mt-auto w-full px-3 py-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-end justify-between pointer-events-none ${card.rarity === 'SR' ? 'text-overlay-glass rounded-b-2xl' : ''}`}>
                {/* 하단 좌측: 멤버 이름 (Bold Large) + NMIXX 서브텍스트 */}
                <div className="flex flex-col leading-tight overflow-hidden max-w-[65%]">
                  <span className="font-sans font-black text-[13px] sm:text-[15px] text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate">
                    {isLogoCard
                      ? 'Symbol'
                      : card.member === 'NMIXX'
                      ? 'Group Portrait'
                      : card.member === 'PARK'
                      ? 'J.Y. Park'
                      : {
                          LILY: 'Lily',
                          HAEWON: 'Haewon',
                          SULLYOON: 'Sullyoon',
                          BAE: 'BAE',
                          JIWOO: 'Jiwoo',
                          KYUJIN: 'Kyujin',
                        }[card.member] || card.member}
                  </span>
                  <span className="font-mono font-bold text-[7.5px] sm:text-[8.5px] text-slate-400/90 tracking-widest">
                    NMIXX
                  </span>
                </div>

                {/* 하단 우측: 등급 (Bold Large) + 시리얼 코드 서브텍스트 */}
                <div className="flex flex-col items-end leading-tight flex-shrink-0">
                  <span className={`font-sans font-black text-[13px] sm:text-[15px] tracking-wider ${rarityTextStyles[card.rarity]} drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]`}>
                    {card.rarity}
                  </span>
                  <span className="font-mono font-bold text-[7.5px] sm:text-[8.5px] text-slate-400/90 tracking-tight">
                    {serialCode}
                  </span>
                </div>
              </div>
            )}

            {/* 5F. 수량 뱃지 — 🎯 하단 텍스트 및 아트를 가리지 않도록 우측 상단(top-2.5 right-2.5)에 배치 */}
            {effectiveCount > 1 && (
              <div className="absolute top-2.5 right-2.5 z-40 bg-black/85 text-amber-300 border border-amber-400/60 font-mono text-[9px] sm:text-[9.5px] font-black px-1.5 py-0.2 rounded-md shadow-md pointer-events-none">
                x{effectiveCount}
              </div>
            )}

            {isNew && (
              <div className="absolute top-2 left-2 z-40 bg-emerald-500/90 text-white font-black text-[8px] px-1.5 py-0.2 rounded-full shadow-md animate-pulse pointer-events-none">
                NEW
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});



