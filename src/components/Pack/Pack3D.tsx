import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BoosterPackConfig, BOOSTER_PACKS, GAME_CONFIG } from '../../config/gameConfig';

interface Pack3DProps {
  pack?: BoosterPackConfig;
  onClick?: () => void;
  isOpening?: boolean;
  disabled?: boolean;
}

export const Pack3D: React.FC<Pack3DProps> = ({
  pack = BOOSTER_PACKS[0],
  onClick,
  isOpening = false,
  disabled = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || disabled || isOpening) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;
    setMousePos({ x: px, y: py });

    // -14도 ~ +14도 3D 원근 틸트
    const rX = ((y - rect.height / 2) / (rect.height / 2)) * -14;
    const rY = ((x - rect.width / 2) / (rect.width / 2)) * 14;
    setRotX(rX);
    setRotY(rY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotX(0);
    setRotY(0);
    setMousePos({ x: 50, y: 50 });
  };

  const handleMouseEnter = () => {
    if (!disabled && !isOpening) setIsHovered(true);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-64 sm:w-72 h-[415px] sm:h-[435px] cursor-pointer select-none [perspective:1000px] group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{
        ['--mouse-x' as string]: `${mousePos.x}%`,
        ['--mouse-y' as string]: `${mousePos.y}%`,
        ['--pack-glow' as string]: pack.glowColor || 'rgba(236, 72, 153, 0.4)',
      }}
    >
      {/* 1. 팩 외곽 동적 앰비언트 글로우 */}
      <div
        className={`absolute -inset-3 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* 2. PBR 물리 기반 3D 틸트 포일 부스터 팩 본체 */}
      <motion.div
        animate={{
          rotateX: rotX,
          rotateY: rotY,
          scale: isHovered ? 1.05 : 1,
          y: isHovered ? -8 : 0,
        }}
        transition={{ type: 'spring', damping: 18, stiffness: 220 }}
        className="relative w-full h-full rounded-2xl border border-white/40 bg-black flex flex-col justify-between overflow-hidden pbr-pack-shadow [transform-style:preserve-3d]"
      >
        {/* 🌟 최상단 비닐 톱니 압착 실링 (Sawtooth Crimped Top Seal) + 행거 홀 + V자형 뜯는 홈 */}
        <div className="relative z-30 w-full bg-gradient-to-b from-slate-700 via-slate-900 to-black/95 border-b border-white/25 px-3 pt-2.5 pb-2 flex flex-col items-center shadow-lg pack-crimped-top [transform:translateZ(12px)]">
          {/* 톱니형 압착 엠보싱 패턴 레이어 */}
          <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.3)_0px,rgba(255,255,255,0.3)_2px,transparent_2px,transparent_6px)] pointer-events-none" />
          
          {/* V자형 뜯는 홈 (Tear Notch Indicators) */}
          <div className="absolute -left-0.5 top-3 w-2 h-3 bg-black border-r border-white/40 [clip-path:polygon(0%_0%,100%_50%,0%_100%)] shadow-sm" />
          <div className="absolute -right-0.5 top-3 w-2 h-3 bg-black border-l border-white/40 [clip-path:polygon(100%_0%,0%_50%,100%_100%)] shadow-sm" />

          {/* 마트 매대 걸이용 타원형 행거 홀 (Sombrero Hanger Hole) */}
          <div className="w-8 h-2.5 rounded-full bg-black/95 border border-white/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] mb-1 z-10 flex items-center justify-center">
            <div className="w-3 h-0.5 rounded-full bg-white/30" />
          </div>

          {/* 상단 메타 뱃지 (팩 코드 & 공식 라이선스 마크) */}
          <div className="w-full flex justify-between items-center z-10 text-[8.5px] font-mono font-black tracking-wider">
            <span className="text-amber-300 bg-black/80 px-2 py-0.5 rounded border border-amber-500/50 shadow-sm">
              [{pack.code}]
            </span>
            <span className="text-slate-200 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded border border-white/25 shadow-sm">
              <span className="text-pink-400 font-extrabold">JYP</span>
              <span className="opacity-40">|</span>
              <span className="text-emerald-400 font-extrabold">ALL AGES</span>
            </span>
          </div>
        </div>

        {/* 🌟 중앙 메인 아트워크 & PBR 은박 주름/오로라/동적 스펙큘러 레이어 */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col justify-between p-3 [transform:translateZ(8px)]">
          {/* 팩 공식 커버 이미지 */}
          <img
            src={pack.image}
            alt={`${pack.name} Booster Pack`}
            style={{ objectPosition: pack.objectPosition || 'center 20%' }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* PBR 물리 기반 포일 비닐 구김/주름 음영 (PBR Foil Wrinkle Creases) */}
          <div className="absolute inset-0 foil-wrinkle-texture opacity-75 pointer-events-none" />

          {/* 홀로그래픽 오로라 반사광 (Holographic Foil Sheen) */}
          <div className="absolute inset-0 foil-holo-sheen opacity-60 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />

          {/* 실시간 커서 추적 PBR 동적 스펙큘러 하이라이트 (Dynamic Specular Glare) */}
          <div className="absolute inset-0 pbr-specular-glare opacity-80 pointer-events-none z-15" />

          {/* 비닐 호일 입체 명암 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none" />

          {/* 인터랙티브 대각선 메탈릭 광택 스위프 (Metallic Shimmer Foil Swipe) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none z-10" />

          {/* 중앙 상단: 믹스토피아 공식 TCG 로고 엠블렘 워터마크 */}
          <div className="relative z-20 flex justify-center mt-1 [transform:translateZ(15px)]">
            <span className="text-[9px] font-mono font-black tracking-widest text-white/95 uppercase bg-black/75 backdrop-blur-md px-3 py-0.5 rounded-full border border-pink-400/50 shadow-md">
              ✨ NMIXX OFFICIAL TRADING CARD GAME
            </span>
          </div>

          {/* 중앙 하단: 굵직한 메탈릭 골드/실버 타이틀 밴드 (2단 표기: NX 01 / Fe3O4: FORWARD) */}
          <div className="relative z-20 flex flex-col items-center justify-center text-center bg-black/85 backdrop-blur-md py-2 px-3.5 rounded-2xl border border-white/25 shadow-2xl mt-auto mb-1 [transform:translateZ(18px)]">
            <span className="font-mono text-[10px] sm:text-[11px] font-black tracking-widest text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] uppercase mb-0.5">
              {pack.code.replace('-', ' ')}
            </span>

            <h3 className="font-serif text-[15.5px] sm:text-[17px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] whitespace-nowrap truncate max-w-full">
              {pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name}
            </h3>

            <div className="flex items-center gap-1.5 mt-0.5 max-w-full truncate">
              <span className="text-[8px] text-pink-300 font-mono font-bold tracking-wider uppercase bg-pink-950/80 px-1.5 py-0.2 rounded border border-pink-500/30 flex-shrink-0">
                {pack.subtitle.split(' • ')[0]}
              </span>
              <span className="text-[8px] text-slate-300 font-serif italic truncate">
                {pack.slogan}
              </span>
            </div>

            {/* 하단 스펙 정보 바 (TCG 규격 박스) */}
            <div className="w-full flex items-center justify-between border-t border-white/10 pt-1.5 mt-1.5 text-[7px] sm:text-[7.5px] font-mono text-slate-300">
              <span className="text-amber-300 font-bold">전 {pack.totalCards}종 + 특수 레어</span>
              <span className="text-pink-300 font-bold">1팩 5장입</span>
              <span className="text-cyan-300 font-bold">정규 부스터</span>
            </div>
          </div>
        </div>

        {/* 🌟 최하단 비닐 톱니 압착 실링 (Sawtooth Crimped Bottom Seal) + 라이선스 카피라이트 */}
        <div className="relative z-30 w-full bg-gradient-to-t from-slate-700 via-slate-900 to-black/95 border-t border-white/25 px-3 pt-2 pb-2.5 flex flex-col shadow-inner pack-crimped-bottom [transform:translateZ(12px)]">
          {/* 하단 톱니형 압착 엠보싱 패턴 */}
          <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.3)_0px,rgba(255,255,255,0.3)_2px,transparent_2px,transparent_6px)] pointer-events-none" />

          {/* 가격 및 오픈 가이드 */}
          <div className="w-full flex justify-between items-center z-10 text-[9.5px] font-mono text-slate-200">
            <span className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              BOOSTER PACK
            </span>
            <span className="text-amber-300 font-black tracking-tight">{GAME_CONFIG.PACK_COST_SINGLE} COIN</span>
          </div>

          {/* 카피라이트 */}
          <div className="w-full text-center text-[6.5px] font-mono text-slate-400 mt-0.5 z-10 tracking-wider">
            ©JYP ENTERTAINMENT. MADE IN MIXXTOPIA
          </div>
        </div>
      </motion.div>
    </div>
  );
};

