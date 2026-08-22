import React, { useState, useRef, useCallback } from 'react';
import { Card, FinishType } from '../../types/card';
import { RARITY_CONFIGS, RARITY_TO_FINISH } from '../../config/gameConfig';

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
};

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [styleState, setStyleState] = useState<{
    rotX: number;
    rotY: number;
    px: number;
    py: number;
    pDist: number;
    opacity: number;
  }>({
    rotX: 0,
    rotY: 0,
    px: 50,
    py: 50,
    pDist: 0.3,
    opacity: 0.6,
  });

  const config = RARITY_CONFIGS[card.rarity];
  const memberInfo = MEMBER_INFO[card.member] || MEMBER_INFO.NMIXX;
  const activeFinish: FinishType = finishType || card.finishType || RARITY_TO_FINISH[card.rarity] || 'MATTE';
  const finishClass = FINISH_CLASS_MAP[activeFinish];

  // 3D 인터랙티브 셰이더 포인터/틸트 연산
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const py = Math.max(0, Math.min(100, (y / rect.height) * 100));

    const normX = (x / rect.width) * 2 - 1; // -1 to +1
    const normY = (y / rect.height) * 2 - 1; // -1 to +1

    const rotX = -normY * 12; // 상하 최대 12도 틸트
    const rotY = normX * 12;  // 좌우 최대 12도 틸트
    const pDist = Math.sqrt(normX * normX + normY * normY);

    setStyleState({
      rotX,
      rotY,
      px,
      py,
      pDist: Math.min(1, pDist),
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

  // size prop에 따른 기본 치수
  const defaultSizeClass = className.includes('w-') ? '' : {
    sm: 'w-36 h-52 text-xs',
    md: 'w-48 sm:w-52 h-72 sm:h-76 text-sm',
    lg: 'w-64 h-92 text-base',
  }[size];

  // 8단계 Rarity 테두리 및 글로우 스타일 가이드 (미보유 시 어두운 슬레이트 테두리)
  const rarityBorders: Record<Card['rarity'], string> = {
    C: isOwned ? 'border-slate-600/90 hover:border-slate-400 shadow-md' : 'border-slate-800/90',
    UC: isOwned ? 'border-emerald-400 hover:border-emerald-200 shadow-glow-uc ring-1 ring-emerald-400/40' : 'border-emerald-950/80',
    R: isOwned ? 'border-sky-400 hover:border-sky-200 shadow-glow-r ring-1 ring-sky-400/60' : 'border-sky-950/80',
    SR: isOwned ? 'border-purple-400 hover:border-purple-200 shadow-glow-sr ring-1 ring-purple-400/80' : 'border-purple-950/80',
    SSR: isOwned ? 'border-amber-300 hover:border-yellow-100 shadow-glow-ssr ring-2 ring-amber-400/80' : 'border-amber-950/80',
    UR: isOwned ? 'border-rose-400 hover:border-red-200 shadow-glow-ur ring-2 ring-rose-500/90 animate-pulse-subtle' : 'border-rose-950/80',
    LR: isOwned ? 'border-pink-300 hover:border-rose-100 shadow-glow-lr ring-2 ring-pink-400 animate-pulse-fast' : 'border-pink-950/80',
    MR: isOwned ? 'border-yellow-100 hover:border-white shadow-glow-mr ring-2 ring-amber-300 animate-pulse-fast' : 'border-yellow-950/80',
  };

  const isNmixxGroup = card.member === 'NMIXX';

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={isOwned ? handleMouseMove : undefined}
      onTouchMove={isOwned ? handleTouchMove : undefined}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      style={{
        transform: isOwned
          ? `perspective(1000px) rotateX(${styleState.rotX}deg) rotateY(${styleState.rotY}deg) ${styleState.opacity > 0.8 ? 'translateY(-5px)' : ''}`
          : undefined,
        transition: styleState.opacity > 0.8 ? 'transform 0.08s ease-out' : 'transform 0.35s ease-out',
        willChange: isOwned ? 'transform' : undefined,
      } as React.CSSProperties}
      className={`group relative ${defaultSizeClass} ${className} rounded-2xl p-[1.5px] cursor-pointer select-none [transform-style:preserve-3d] transition-all duration-300 ${
        !isOwned ? 'opacity-40 hover:opacity-75 filter grayscale-[80%] brightness-[70%] contrast-[90%]' : 'hover:scale-[1.03]'
      }`}
    >
      {/* 1. 8-Tier Interactive Foil / Finish Shader Layer (상시 은은한 광택 + 호버 시 다이내믹 틸트) */}
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

      {/* 미보유 상태일 때 세련된 LOCKED 잠금 뱃지 오버레이 */}
      {!isOwned && (
        <div className="absolute inset-0 z-30 rounded-2xl flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[1px]">
          <div className="bg-black/85 border border-white/20 text-slate-300 text-[10px] font-mono font-black px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5">
            <span>🔒</span>
            <span className="tracking-wider">LOCKED</span>
          </div>
        </div>
      )}

      {/* 2. 메인 카드 바디 (포토카드 풀아트 프레임 - 사진 최대 노출 & 슬림 HUD) */}
      <div
        className={`relative w-full h-full rounded-2xl border ${rarityBorders[card.rarity]} bg-black flex flex-col justify-between overflow-hidden z-10 shadow-2xl`}
      >
        {/* 실제 아이돌 고화질 사진 (중심부 시원하게 노출) */}
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-[center_18%] group-hover:scale-105 transition-transform duration-500 pointer-events-none"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-b ${card.gradient}`} />
        )}

        {/* 상단 얇은 은은한 섀도우 그라데이션 */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none z-10" />

        {/* 상단 미니멀 HUD 헤더: 코스트 & 카드 번호 & 단체/멤버 뱃지 & Rarity */}
        <div className="relative z-20 p-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1">
            {/* OPTCG 슬림 코스트 젬 */}
            <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-black font-black font-mono text-[9.5px] flex items-center justify-center shadow-md border border-white/80 flex-shrink-0">
              {card.cost}
            </div>
            <span className="font-mono text-[8.5px] font-extrabold text-white/90 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10 shadow-sm">
              #{String(card.collectionNumber).padStart(3, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 멤버 한글 이름 / 단체 미니 태그 */}
            <span className="text-[7.5px] font-mono font-black text-pink-200 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded border border-pink-500/30">
              {isNmixxGroup ? '단체' : memberInfo.nameKo}
            </span>
            {/* 8단계 Rarity 미니 뱃지 */}
            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badgeBg} shadow-md backdrop-blur-sm`}>
              {card.rarity}
            </span>
          </div>
        </div>

        {/* 하단 슬림 글래스모피즘 네임태그 (카드 풀 네임 표시) */}
        {showDetails && (
          <div className="relative z-20 mt-auto pt-6 pb-2 px-2.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-0.5 pointer-events-none">
            <div className="flex items-end justify-between gap-1">
              <div className="flex flex-col truncate">
                <span className="font-serif font-black text-white text-[11.5px] sm:text-[12.5px] tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate">
                  {card.name}
                </span>
                <span className="text-[7.5px] font-mono font-bold text-slate-300 uppercase tracking-tighter truncate drop-shadow">
                  {isNmixxGroup ? card.era : `${memberInfo.nameKo} • ${card.era}`}
                </span>
              </div>

              {/* ⚡ POWER 뱃지 (슬림 골드 캡슐) */}
              <div className="text-[9px] font-mono font-black text-amber-300 bg-black/80 px-1.5 py-0.5 rounded border border-amber-400/50 shadow-sm flex-shrink-0">
                ⚡{card.power.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* 카드 보유 수량 뱃지 */}
        {count > 1 && (
          <div className="absolute bottom-2 right-2 z-30 bg-void-950/95 border border-amber-400 text-amber-300 font-mono text-[8.5px] font-black px-1.5 py-0.2 rounded-md shadow-2xl">
            x{count}
          </div>
        )}

        {/* NEW 획득 뱃지 */}
        {isNew && (
          <div className="absolute top-2 left-2 z-30 bg-gradient-to-r from-emerald-400 to-teal-300 text-black font-black text-[7.5px] px-1.5 py-0.2 rounded-full shadow-2xl animate-bounce">
            NEW
          </div>
        )}
      </div>
    </div>
  );
});
