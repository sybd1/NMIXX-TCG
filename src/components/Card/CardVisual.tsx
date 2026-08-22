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

  // 9단계 Rarity 테두리 및 글로우 스타일 가이드
  const rarityBorders: Record<Card['rarity'], string> = {
    C: isOwned ? 'border-slate-600/90 hover:border-slate-400 shadow-md' : 'border-slate-800/90',
    UC: isOwned ? 'border-emerald-400 hover:border-emerald-200 shadow-glow-uc ring-1 ring-emerald-400/40' : 'border-emerald-950/80',
    R: isOwned ? 'border-sky-400 hover:border-sky-200 shadow-glow-r ring-1 ring-sky-400/60' : 'border-sky-950/80',
    SR: isOwned ? 'border-purple-400 hover:border-purple-200 shadow-glow-sr ring-1 ring-purple-400/80' : 'border-purple-950/80',
    SSR: isOwned ? 'border-amber-300 hover:border-yellow-100 shadow-glow-ssr ring-2 ring-amber-400/80' : 'border-amber-950/80',
    UR: isOwned ? 'border-rose-400 hover:border-red-200 shadow-glow-ur ring-2 ring-rose-500/90 animate-pulse-subtle' : 'border-rose-950/80',
    LR: isOwned ? 'border-pink-300 hover:border-rose-100 shadow-glow-lr ring-2 ring-pink-400 animate-pulse-fast' : 'border-pink-950/80',
    MR: isOwned ? 'border-yellow-100 hover:border-white shadow-glow-mr ring-2 ring-amber-300 animate-pulse-fast' : 'border-yellow-950/80',
    XR: isOwned ? 'border-rose-500 hover:border-amber-300 shadow-glow-xr ring-2 ring-amber-400 animate-pulse-fast' : 'border-rose-900/80 ring-1 ring-rose-500/40',
  };

  const isNmixxGroup = card.member === 'NMIXX';

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
        className={`relative w-full h-full rounded-2xl border ${
          isOwned && isHighTier
            ? (card.rarity === 'MR' ? 'embossed-mr' : card.rarity === 'LR' ? 'embossed-lr' : card.rarity === 'UR' ? 'embossed-ur' : card.rarity === 'SSR' ? 'embossed-ssr' : 'embossed-sr')
            : rarityBorders[card.rarity]
        } bg-black flex flex-col justify-between overflow-hidden z-10 shadow-2xl [transform-style:preserve-3d] ${
          isOwned && card.isEmbossed3D ? 'card-embossed-3d' : ''
        }`}
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
                NO. #{String(card.collectionNumber).padStart(3, '0')}
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
              className={`absolute inset-0 bg-gradient-to-b ${card.gradient} transition-transform duration-150 pointer-events-none`}
              style={{
                transform: isOwned && isHighTier
                  ? `translateZ(-28px) scale(1.10) translate(${styleState.rotY * -0.45}px, ${styleState.rotX * 0.45}px)`
                  : undefined,
              }}
            />

            {/* Layer 2: 실제 아이돌/프로듀서 고화질 사진 (3D 캐릭터 팝업 뎁스 +16px) */}
            {card.image && (
              <img
                src={card.image}
                alt={card.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-[center_18%] group-hover:scale-105 transition-all duration-200 pointer-events-none"
                style={{
                  transform: isOwned && isHighTier
                    ? `translateZ(16px) scale(1.03) translate(${styleState.rotY * 0.55}px, ${styleState.rotX * -0.55}px)`
                    : undefined,
                }}
              />
            )}

            {/* Layer 3: 3D 양각 테두리 이너 베벨 광택 림 (+30px) */}
            {isOwned && isHighTier && (
              <div
                className="absolute inset-0 rounded-2xl border-2 border-white/25 pointer-events-none transition-transform duration-150"
                style={{
                  transform: `translateZ(30px) translate(${styleState.rotY * 0.65}px, ${styleState.rotX * -0.65}px)`,
                  boxShadow: 'inset 0 0 12px rgba(255,255,255,0.3)',
                }}
              />
            )}

            {/* 상단 얇은 은은한 섀도우 그라데이션 */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none z-10" />

            {/* Layer 4: 상단 미니멀 HUD 헤더 (3D 전면 포그라운드 뎁스 +40px) */}
            <div
              className="relative z-20 p-2 flex items-center justify-between pointer-events-none"
              style={{
                transform: isOwned && isHighTier
                  ? `translateZ(40px) translate(${styleState.rotY * 0.8}px, ${styleState.rotX * -0.8}px)`
                  : undefined,
              }}
            >
              <span className="font-mono text-[8.5px] font-extrabold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/15 shadow-sm">
                NO. #{String(card.collectionNumber).padStart(3, '0')}
              </span>

              <div className="flex items-center gap-1">
                {card.isLegacy && (
                  <span className="text-[7.5px] font-mono font-black text-purple-200 bg-purple-950/90 px-1.5 py-0.5 rounded border border-purple-400/50 shadow-md">
                    🏛️ Legacy
                  </span>
                )}
                <span className="text-[7.5px] font-mono font-black text-pink-200 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded border border-pink-500/30">
                  {isNmixxGroup ? '단체' : memberInfo.nameKo}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badgeBg} shadow-md backdrop-blur-sm`}>
                  {card.rarity}
                </span>
              </div>
            </div>

            {/* 하단 미니멀 네임태그 (사진 가림 원천 방지 & 초슬림 콤팩트 렌더링) */}
            {showDetails && (
              <div
                className="relative z-20 mt-auto pt-3 pb-1.5 px-2 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-between pointer-events-none w-full overflow-hidden"
                style={{
                  transform: isOwned && isHighTier
                    ? `translateZ(35px) translate(${styleState.rotY * 0.7}px, ${styleState.rotX * -0.7}px)`
                    : undefined,
                }}
              >
                <span className="font-serif font-black text-white text-[10.5px] sm:text-[11.5px] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] whitespace-nowrap overflow-hidden text-ellipsis block truncate max-w-[70%] leading-none">
                  {card.name.replace(/^\[[^\]]+\]\s*/, '') || card.name}
                </span>
                <span className="text-[7px] sm:text-[7.5px] font-mono font-bold text-slate-300 uppercase whitespace-nowrap overflow-hidden text-ellipsis drop-shadow leading-none opacity-80 flex-shrink-0">
                  {card.era}
                </span>
              </div>
            )}

            {/* 카드 획득/보유 수량 뱃지 (x2, x3 등 선명한 황금 네온 뱃지) */}
            {count > 1 && (
              <div
                className="absolute bottom-2 right-2 z-40 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black border-2 border-white font-mono text-[10px] sm:text-[11.5px] font-black px-2 py-0.5 rounded-lg shadow-[0_0_18px_rgba(250,204,21,0.95)] ring-2 ring-amber-400/80 pointer-events-none flex items-center gap-0.5 tracking-tight"
                style={{ transform: 'translateZ(45px)' }}
              >
                <span className="text-[9px]">x</span>
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
