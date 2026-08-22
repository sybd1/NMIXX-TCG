import React, { useState, useRef, useCallback } from 'react';
import { Card, NmixxMember, FinishType } from '../../types/card';
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

// 멤버별 시그니처 컬러 및 포지션 라벨 (all-member는 SPECIAL로 표기)
const MEMBER_INFO: Record<NmixxMember, { nameKo: string; position: string; color: string; bgBadge: string }> = {
  LILY: { nameKo: '릴리', position: 'MAIN VOCAL', color: '#38bdf8', bgBadge: 'bg-sky-500/30 text-sky-200 border-sky-400' },
  HAEWON: { nameKo: '해원', position: 'LEADER • VOCAL', color: '#3b82f6', bgBadge: 'bg-blue-500/30 text-blue-200 border-blue-400' },
  SULLYOON: { nameKo: '설윤', position: 'VISUAL • VOCAL', color: '#f472b6', bgBadge: 'bg-pink-500/30 text-pink-200 border-pink-400' },
  BAE: { nameKo: '배이', position: 'DANCE • VOCAL', color: '#fbbf24', bgBadge: 'bg-amber-500/30 text-amber-200 border-amber-400' },
  JIWOO: { nameKo: '지우', position: 'RAP • DANCE', color: '#f87171', bgBadge: 'bg-red-500/30 text-red-200 border-red-400' },
  KYUJIN: { nameKo: '규진', position: 'MAKNAE • DANCE', color: '#c084fc', bgBadge: 'bg-purple-500/30 text-purple-200 border-purple-400' },
  NMIXX: { nameKo: 'SPECIAL', position: 'ALL-ROUNDER', color: '#ec4899', bgBadge: 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400' },
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
    pDist: 0,
    opacity: 0,
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
      pDist: 0,
      opacity: 0,
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
    C: isOwned ? 'border-slate-600 hover:border-slate-400 shadow-md' : 'border-slate-800/90',
    UC: isOwned ? 'border-emerald-500/90 hover:border-emerald-300 shadow-glow-uc ring-1 ring-emerald-500/30' : 'border-emerald-950/80',
    R: isOwned ? 'border-sky-400 hover:border-sky-200 shadow-glow-r ring-1 ring-sky-400/50' : 'border-sky-950/80',
    SR: isOwned ? 'border-purple-400 hover:border-purple-200 shadow-glow-sr ring-1 ring-purple-400/70' : 'border-purple-950/80',
    SSR: isOwned ? 'border-amber-300 hover:border-yellow-100 shadow-glow-ssr ring-2 ring-amber-400/70' : 'border-amber-950/80',
    UR: isOwned ? 'border-rose-500 hover:border-red-300 shadow-glow-ur ring-2 ring-rose-500/80 animate-pulse-subtle' : 'border-rose-950/80',
    LR: isOwned ? 'border-pink-400 hover:border-rose-200 shadow-glow-lr ring-2 ring-pink-400/90 animate-pulse-fast' : 'border-pink-950/80',
    MR: isOwned ? 'border-yellow-200 hover:border-white shadow-glow-mr ring-3 ring-amber-300 animate-pulse-fast' : 'border-yellow-950/80',
  };

  const isHighRarity = ['SSR', 'UR', 'LR', 'MR'].includes(card.rarity);

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
          ? `perspective(1000px) rotateX(${styleState.rotX}deg) rotateY(${styleState.rotY}deg) ${styleState.opacity > 0 ? 'translateY(-6px)' : ''}`
          : undefined,
        transition: styleState.opacity > 0 ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out',
        willChange: isOwned ? 'transform' : undefined,
      } as React.CSSProperties}
      className={`group relative ${defaultSizeClass} ${className} rounded-2xl p-[2px] cursor-pointer select-none [transform-style:preserve-3d] transition-all duration-300 ${
        !isOwned ? 'opacity-40 hover:opacity-70 filter grayscale-[80%] brightness-[70%] contrast-[90%]' : 'hover:scale-[1.03]'
      }`}
    >
      {/* 1. 8-Tier Interactive Foil / Finish Shader Layer (보유 시에만 작동) */}
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
          <div className="bg-black/85 border border-white/20 text-slate-300 text-[10.5px] font-mono font-black px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5">
            <span>🔒</span>
            <span className="tracking-wider">LOCKED</span>
          </div>
        </div>
      )}

      {/* 2. 메인 카드 바디 (포토카드 풀아트 프레임) */}
      <div
        className={`relative w-full h-full rounded-2xl border-2 ${rarityBorders[card.rarity]} bg-black flex flex-col justify-between overflow-hidden z-10 shadow-2xl`}
      >
        {/* 실제 아이돌 고화질 사진 */}
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

        {/* 상단/하단 은은한 섀도우 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none z-10" />

        {/* 상단 헤더: 코스트, 카드 번호, NMIXX 뱃지, Rarity 뱃지 */}
        <div className="relative z-20 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* OPTCG 코스트 뱃지 */}
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-black font-black font-mono text-[11px] flex items-center justify-center shadow-md border border-white/60">
              {card.cost}
            </div>
            <span className="font-mono text-[9.5px] font-extrabold text-white/90 drop-shadow-md bg-black/40 px-1.5 py-0.5 rounded">
              #{String(card.collectionNumber).padStart(3, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* NMIXX / SPECIAL 뱃지 */}
            <span className="text-[8px] font-mono tracking-tighter text-pink-300/90 font-black uppercase px-1.5 py-0.5 bg-black/60 rounded border border-pink-500/30">
              {card.member === 'NMIXX' ? 'SPECIAL' : 'NMIXX'}
            </span>
            {/* 8단계 Rarity 뱃지 */}
            <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badgeBg} shadow-md`}>
              {card.rarity}
            </span>
          </div>
        </div>

        {/* 중앙 Rarity 특수 엠블럼 워터마크 (고등급 한정) */}
        {isHighRarity && (
          <div className="relative z-10 my-auto flex justify-center opacity-30 group-hover:opacity-60 transition-opacity">
            <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center">
              <span className="text-white font-serif font-black text-xs">NMIXX</span>
            </div>
          </div>
        )}

        {/* 하단 글래스모피즘 정보 밴드 */}
        <div className="relative z-20 m-2 bg-black/80 backdrop-blur-md rounded-xl p-2 border border-white/20 flex flex-col gap-1 shadow-2xl">
          {/* 멤버 이름 & 파워 */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-serif font-black text-white text-[12.5px] tracking-wide drop-shadow">
                {memberInfo.nameKo}
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-tighter">
                {card.member === 'NMIXX' ? 'SPECIAL' : card.member}
              </span>
            </div>

            {/* ⚡ POWER 뱃지 */}
            <div className="text-[9.5px] font-mono font-black text-amber-300 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-400/60 shadow-sm flex-shrink-0">
              ⚡{card.power.toLocaleString()}
            </div>
          </div>

          {/* 포지션 & Era 태그 */}
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-300">
            <span className="text-pink-300 font-bold truncate">
              {memberInfo.position}
            </span>
            <span className="text-slate-400 font-bold uppercase bg-white/10 px-1.5 py-0.5 rounded">
              {card.era}
            </span>
          </div>

          {showDetails && card.quote && (
            <p className="text-[8px] italic text-amber-200/90 font-serif line-clamp-1 border-t border-white/15 pt-1 mt-0.5">
              {card.quote}
            </p>
          )}
        </div>

        {/* 카드 보유 수량 뱃지 */}
        {count > 1 && (
          <div className="absolute bottom-2.5 right-2.5 z-30 bg-void-950/95 border border-amber-400 text-amber-300 font-mono text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xl">
            x{count}
          </div>
        )}

        {/* NEW 획득 뱃지 */}
        {isNew && (
          <div className="absolute top-2.5 left-2.5 z-30 bg-gradient-to-r from-emerald-400 to-teal-300 text-black font-black text-[8px] px-1.5 py-0.5 rounded-full shadow-2xl animate-bounce">
            NEW
          </div>
        )}
      </div>
    </div>
  );
});
