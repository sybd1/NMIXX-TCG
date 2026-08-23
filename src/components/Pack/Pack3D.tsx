import React from 'react';
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
  return (
    <motion.div
      whileHover={!disabled && !isOpening ? { scale: 1.05, y: -6 } : {}}
      whileTap={!disabled && !isOpening ? { scale: 0.98 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-64 sm:w-72 h-[410px] sm:h-[430px] rounded-2xl cursor-pointer select-none [perspective:1000px] group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {/* 팩 외곽 앰비언트 글로우 */}
      <div
        className={`absolute -inset-3 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* 실물 TCG 비닐 은박 호일 부스터 팩 본체 */}
      <div className="relative w-full h-full rounded-2xl border-2 border-white/30 bg-black flex flex-col justify-between overflow-hidden shadow-2xl [transform-style:preserve-3d]">
        
        {/* 1. 최상단 비닐 압착 실링 (Crimped Top Seal) + 행거 홀 (Hanger Hole Punch) */}
        <div className="relative z-30 w-full bg-gradient-to-b from-slate-800 via-slate-900 to-black/90 border-b border-white/20 px-3 py-1.5 flex flex-col items-center shadow-md">
          {/* 톱니형 압착 엠보싱 패턴 레이어 */}
          <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.2)_0px,rgba(255,255,255,0.2)_2px,transparent_2px,transparent_6px)] pointer-events-none" />
          
          {/* 마트 매대 걸이용 타원형 행거 홀 (Sombrero Hanger Hole) */}
          <div className="w-8 h-2.5 rounded-full bg-black/95 border border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] mb-1 z-10 flex items-center justify-center">
            <div className="w-3 h-0.5 rounded-full bg-white/20" />
          </div>

          {/* 상단 메타 뱃지 (팩 코드 & 공식 라이선스 마크) */}
          <div className="w-full flex justify-between items-center z-10 text-[8.5px] font-mono font-black tracking-wider">
            <span className="text-amber-300 bg-black/70 px-1.5 py-0.2 rounded border border-amber-500/40 shadow-sm">
              [{pack.code}]
            </span>
            <span className="text-slate-300 flex items-center gap-1 bg-black/60 px-1.5 py-0.2 rounded border border-white/20">
              <span className="text-pink-400">JYP</span>
              <span className="opacity-40">|</span>
              <span className="text-emerald-400">ALL AGES</span>
            </span>
          </div>
        </div>

        {/* 2. 중앙 메인 아트워크 & 배경 앰비언트 */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col justify-between p-3">
          {/* 팩 공식 커버 이미지 */}
          <img
            src={pack.image}
            alt={`${pack.name} Booster Pack`}
            style={{ objectPosition: pack.objectPosition || 'center 20%' }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          />

          {/* 비닐 호일 세로 주름 및 입체 메탈릭 섀도우 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.08)_25%,transparent_50%,rgba(255,255,255,0.08)_75%,transparent_100%)] pointer-events-none" />

          {/* 인터랙티브 대각선 메탈릭 광택 스위프 (Metallic Shimmer Foil Swipe) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none z-10" />

          {/* 중앙 상단: 믹스토피아 공식 TCG 로고 엠블렘 워터마크 */}
          <div className="relative z-20 flex justify-center mt-1">
            <span className="text-[9px] font-mono font-black tracking-widest text-white/90 uppercase bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-pink-400/40 shadow-sm">
              ✨ NMIXX OFFICIAL TRADING CARD GAME
            </span>
          </div>

          {/* 중앙 하단: 굵직한 메탈릭 골드/실버 타이틀 밴드 */}
          <div className="relative z-20 flex flex-col items-center justify-center text-center bg-black/80 backdrop-blur-md py-2 px-3 rounded-2xl border border-white/20 shadow-2xl mt-auto mb-1">
            <h3 className="font-serif text-[15px] sm:text-[16.5px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap truncate max-w-full">
              {pack.name.replace(/^NMIXX\s*/i, '')}
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
            <div className="w-full flex items-center justify-between border-t border-white/10 pt-1 mt-1.5 text-[7px] sm:text-[7.5px] font-mono text-slate-300">
              <span className="text-amber-300 font-bold">전 {pack.totalCards}종 + 특수 레어</span>
              <span className="text-pink-300 font-bold">1팩 5장입</span>
              <span className="text-cyan-300 font-bold">정규 부스터</span>
            </div>
          </div>
        </div>

        {/* 3. 최하단 비닐 압착 실링 (Crimped Bottom Seal) + 라이선스 카피라이트 */}
        <div className="relative z-30 w-full bg-gradient-to-t from-slate-800 via-slate-900 to-black/90 border-t border-white/20 px-3 py-1.5 flex flex-col shadow-inner">
          {/* 하단 톱니형 압착 엠보싱 패턴 */}
          <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.2)_0px,rgba(255,255,255,0.2)_2px,transparent_2px,transparent_6px)] pointer-events-none" />

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
      </div>
    </motion.div>
  );
};

