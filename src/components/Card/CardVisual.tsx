import React, { useState, useRef, useCallback } from 'react';
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
  const isXrMystery = card.rarity === 'XR' && !isOwned;

  // 3D 틸트 물리 엔진 상태
  const cardRef = useRef<HTMLDivElement>(null);
  const [styleState, setStyleState] = useState({
    rotX: 0,
    rotY: 0,
    px: 50,
    py: 50,
    pDist: 0.3,
    opacity: 0.6,
  });

  const lastUpdateRef = useRef<number>(0);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return; // 60fps 쓰로틀
    lastUpdateRef.current = now;

    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const w = rect.width;
    const h = rect.height;

    const normX = (x / w) * 2 - 1; // -1 to 1
    const normY = (y / h) * 2 - 1; // -1 to 1

    const rotX = -normY * 18; // 최대 18도 회전
    const rotY = normX * 18;

    const px = Math.min(100, Math.max(0, (x / w) * 100));
    const py = Math.min(100, Math.max(0, (y / h) * 100));
    const pDist = Math.sqrt(normX * normX + normY * normY);

    setStyleState({
      rotX,
      rotY,
      px,
      py,
      pDist,
      opacity: 0.95,
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handlePointerLeave = () => {
    setStyleState({
      rotX: 0,
      rotY: 0,
      px: 50,
      py: 50,
      pDist: 0.3,
      opacity: 0.6,
    });
  };

  const handleClick = () => {
    if (isOwned && isHighTier) {
      sound.playNmixxMelody(card.rarity);
    }
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
      onMouseMove={isOwned ? handleMouseMove : undefined}
      onTouchMove={isOwned ? handleTouchMove : undefined}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      style={{
        transform: isOwned
          ? `perspective(1000px) rotateX(${styleState.rotX}deg) rotateY(${styleState.rotY}deg) ${styleState.opacity > 0.8 ? 'translateY(-6px)' : ''}`
          : undefined,
        transition: styleState.opacity > 0.8 ? 'transform 0.08s ease-out' : 'transform 0.35s ease-out',
        willChange: isOwned ? 'transform' : undefined,
      } as React.CSSProperties}
      className={`group relative ${defaultSizeClass} ${className} rounded-2xl p-[1.5px] cursor-pointer select-none [transform-style:preserve-3d] transition-all duration-300 ${
        !isOwned && !isXrMystery ? 'opacity-40 hover:opacity-75 filter grayscale-[80%] brightness-[70%] contrast-[90%]' : 'hover:scale-[1.03]'
      } ${isXrMystery ? 'hover:scale-[1.04]' : ''}`}
    >
      {/* 1. 9-Tier Interactive Foil / Finish Shader Layer */}
      {isOwned && (
        <div
          className={`absolute inset-0 rounded-2xl z-30 pointer-events-none transition-opacity duration-300 ${finishClass}`}
          style={{
            ['--pointer-x' as string]: `${styleState.px}%`,
            ['--pointer-y' as string]: `${styleState.py}%`,
            ['--pointer-from-center' as string]: styleState.pDist,
            ['--card-opacity' as string]: styleState.opacity,
          } as React.CSSProperties}
        />
      )}

      {/* 2. SR, SSR, UR, LR, MR, XR 고등급 전용 금빛 라이브 파티클 오버레이 */}
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

      {/* 3. 일반 미보유 카드 잠금 오버레이 */}
      {!isOwned && !isXrMystery && (
        <div className="absolute inset-0 z-30 rounded-2xl flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[1px]">
          <div className="bg-black/85 border border-white/20 text-slate-300 text-[10px] font-mono font-black px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5">
            <span>🔒</span>
            <span className="tracking-wider">LOCKED</span>
          </div>
        </div>
      )}

      {/* 4. 메인 카드 바디 */}
      <div
        className={`relative w-full h-full rounded-2xl ${
          rarityBorders[card.rarity]
        } bg-black flex flex-col justify-between overflow-hidden z-10 shadow-2xl [transform-style:preserve-3d] ${
          isOwned && isHighTier
            ? (card.rarity === 'MR' ? 'embossed-mr' : card.rarity === 'LR' ? 'embossed-lr' : card.rarity === 'UR' ? 'embossed-ur' : card.rarity === 'SSR' ? 'embossed-ssr' : 'embossed-sr')
            : ''
        } ${isOwned && card.isEmbossed3D ? 'card-embossed-3d' : ''}`}
      >
        {/* XR 미획득 상태: 신비로운 물음표 미스터리 카드 렌더링 */}
        {isXrMystery ? (
          <div className="absolute inset-0 bg-gradient-to-b from-void-950 via-purple-950/80 to-black flex flex-col items-center justify-between p-3.5 z-20 overflow-hidden">
            {/* 배경 회전 마법진 & 성운 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.35)_0%,rgba(147,51,234,0.25)_50%,transparent_80%)] animate-pulse" />
            <div className="absolute w-36 h-36 rounded-full border border-rose-500/20 border-dashed animate-spin [animation-duration:15s] pointer-events-none" />

            {/* 상단 미스터리 HUD */}
            <div className="relative z-20 w-full flex items-center justify-between pointer-events-none">
              <span className="font-mono text-[8.5px] font-black text-rose-300 bg-black/80 px-2 py-0.5 rounded-lg border border-rose-500/30">
                {serialCode}
              </span>
              <span className="text-[8.5px] font-black tracking-widest bg-gradient-to-r from-rose-600 to-amber-500 text-white px-2 py-0.5 rounded border border-white/30 shadow-lg animate-pulse">
                XR 초월
              </span>
            </div>

            {/* 중앙 거대한 황금 물음표 */}
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

            {/* 하단 미스터리 안내 */}
            <div className="relative z-20 w-full text-center bg-black/80 py-1 px-2 rounded-xl border border-rose-500/30">
              <span className="text-[7.5px] font-mono text-slate-300 block truncate">
                이 카드를 제외한 모든 카드 수집 시 자동 획득
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Layer 1: 깊이감 있는 패럴랙스 배경 그라데이션 (-28px) */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${card.gradient} transition-transform duration-150 pointer-events-none opacity-85`}
              style={{
                transform: isOwned && isHighTier
                  ? `translateZ(-28px) scale(1.10) translate(${styleState.rotY * -0.45}px, ${styleState.rotX * 0.45}px)`
                  : undefined,
              }}
            />

            {/* Layer 2: 강한 블러 앰비언트 배경 (filter: blur(24px) brightness(0.7) & 1.65배 확대) */}
            {card.image && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{
                  transform: isOwned && isHighTier
                    ? `translateZ(-15px) scale(1.15) translate(${styleState.rotY * -0.2}px, ${styleState.rotX * 0.2}px)`
                    : undefined,
                }}
              >
                <img
                  src={card.image}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover scale-[1.65] blur-[24px] brightness-[0.7] contrast-125 opacity-80"
                />
                {/* 앰비언트 비네팅 및 글로우 레이어 */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75" />
              </div>
            )}

            {/* Layer 3: 메인 포그라운드 이미지 (100% 원본 비율 유지 object-contain & 입체 액자 프레임) */}
            {card.image && (
              <div
                className="absolute inset-0 flex items-center justify-center p-2.5 pt-8 pb-10 pointer-events-none"
                style={{
                  transform: isOwned && isHighTier
                    ? `translateZ(16px) scale(1.02) translate(${styleState.rotY * 0.55}px, ${styleState.rotX * -0.55}px)`
                    : undefined,
                }}
              >
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={card.image}
                    alt={card.name}
                    loading="lazy"
                    decoding="async"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.9)] ring-1 ring-white/20 group-hover:scale-105 transition-all duration-200 pointer-events-none"
                  />
                  {/* 사진 내부 미세한 반사광 하이라이트 림 */}
                  <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/15 pointer-events-none" />
                </div>
              </div>
            )}

            {/* 🌟 Layer 4: 공통 내부 장식 테두리 프레임 (Unified Inner TCG Decorative Frame) + 코너 노드 악센트 (+25px) */}
            <div
              className={`absolute inset-[6px] rounded-xl border ${currentInnerFrame.border} ${currentInnerFrame.glow} pointer-events-none transition-all duration-200 z-15`}
              style={{
                transform: isOwned && isHighTier
                  ? `translateZ(25px) translate(${styleState.rotY * 0.5}px, ${styleState.rotX * -0.5}px)`
                  : undefined,
              }}
            >
              {/* 네 모서리 TCG 기하학적 꺾임 장식 노드 (Corner Node Accents) */}
              <div className={`absolute top-0.5 left-0.5 w-2 h-2 border-t-2 border-l-2 ${currentInnerFrame.corner}`} />
              <div className={`absolute top-0.5 right-0.5 w-2 h-2 border-t-2 border-r-2 ${currentInnerFrame.corner}`} />
              <div className={`absolute bottom-0.5 left-0.5 w-2 h-2 border-b-2 border-l-2 ${currentInnerFrame.corner}`} />
              <div className={`absolute bottom-0.5 right-0.5 w-2 h-2 border-b-2 border-r-2 ${currentInnerFrame.corner}`} />

              {/* 고등급(SSR+) 전용 이너 젬 노드 */}
              {isSsrPlus && (
                <>
                  <div className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                  <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(250,204,21,1)]" />
                </>
              )}
            </div>

            {/* Layer 5: 3D 양각 테두리 이너 베벨 광택 림 (+30px) */}
            {isOwned && isHighTier && (
              <div
                className="absolute inset-0 rounded-2xl border-2 border-white/30 pointer-events-none transition-transform duration-150"
                style={{
                  transform: `translateZ(30px) translate(${styleState.rotY * 0.65}px, ${styleState.rotX * -0.65}px)`,
                  boxShadow: isSsrPlus ? 'inset 0 0 18px rgba(250,204,21,0.45)' : 'inset 0 0 12px rgba(255,255,255,0.3)',
                }}
              />
            )}

            {/* Layer 6: 상단 정돈된 글래스모피즘 HUD 헤더 바 (+40px) */}
            <div
              className="relative z-20 w-full p-2 flex items-center justify-between pointer-events-none bg-black/40 backdrop-blur-md border-b border-white/10"
              style={{
                transform: isOwned && isHighTier
                  ? `translateZ(40px) translate(${styleState.rotY * 0.8}px, ${styleState.rotX * -0.8}px)`
                  : undefined,
              }}
            >
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

            {/* Layer 7: 하단 글래스모피즘 규격화 정보 패널 (표준 메타데이터 + 설명글 +35px) */}
            {showDetails && (
              <div
                className="relative z-20 mt-auto w-full p-2 bg-black/65 backdrop-blur-md border-t border-white/15 flex flex-col gap-0.5 pointer-events-none"
                style={{
                  transform: isOwned && isHighTier
                    ? `translateZ(35px) translate(${styleState.rotY * 0.7}px, ${styleState.rotX * -0.7}px)`
                    : undefined,
                }}
              >
                {/* 1열: 카드 타이틀 & 심볼/에라 */}
                <div className="flex items-center justify-between w-full overflow-hidden">
                  <span className="font-serif font-black text-white text-[10px] sm:text-[11.5px] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] whitespace-nowrap overflow-hidden text-ellipsis block truncate max-w-[72%] leading-tight">
                    {isLogoCard ? 'Fe3O4: FORWARD 심볼' : (card.name.replace(/^\[[^\]]+\]\s*/, '') || card.name)}
                  </span>
                  <span className="text-[7px] sm:text-[7.5px] font-mono font-extrabold text-amber-300 uppercase whitespace-nowrap overflow-hidden text-ellipsis drop-shadow leading-tight bg-amber-950/60 px-1 py-0.2 rounded border border-amber-500/30 flex-shrink-0">
                    {card.era}
                  </span>
                </div>

                {/* 2열: 카드 설명글 / 인용구 */}
                <p className="text-[7.5px] sm:text-[8px] font-sans text-slate-300/90 leading-tight truncate italic drop-shadow-sm">
                  {card.quote ? `"${card.quote}"` : card.description}
                </p>

                {/* 3열: 하단 표준화 규격 메타데이터 라인 (TCG 공식 규격: 일련번호 • 심볼 • 레어도 가공) */}
                <div className="flex items-center justify-between text-[6.5px] sm:text-[7px] font-mono text-slate-400/90 pt-0.5 border-t border-white/10 mt-0.5 leading-none">
                  <span className="tracking-tight text-amber-300/90 font-bold">{serialCode}</span>
                  <span className="truncate max-w-[100px] text-slate-300">{card.packName || 'NMIXX TCG'}</span>
                  <span className="text-pink-300 font-bold">{card.finishType || 'NORMAL'}</span>
                </div>
              </div>
            )}

            {/* 카드 획득/보유 수량 뱃지 (x2, x3 등 선명한 황금 네온 뱃지) */}
            {count > 1 && (
              <div
                className="absolute bottom-9 right-2 z-40 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black border-2 border-white font-mono text-[9.5px] sm:text-[10.5px] font-black px-1.5 py-0.2 rounded-md shadow-[0_0_15px_rgba(250,204,21,0.95)] ring-1 ring-amber-400/80 pointer-events-none flex items-center gap-0.5 tracking-tight"
                style={{ transform: 'translateZ(45px)' }}
              >
                <span className="text-[8.5px]">x</span>
                <span>{count}</span>
              </div>
            )}

            {/* NEW 획득 뱃지 (초강조 네온 & 3D 펄스 바운스) */}
            {isNew && (
              <div
                className="absolute top-2 left-2 z-40 bg-gradient-to-r from-emerald-400 via-teal-200 to-yellow-300 text-black font-black text-[9px] sm:text-[9.5px] px-2.5 py-0.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.95)] ring-2 ring-white animate-bounce flex items-center gap-1 pointer-events-none"
                style={{ transform: 'translateZ(45px)' }}
              >
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

