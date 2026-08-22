import React from 'react';
import { motion } from 'framer-motion';
import { BoosterPackConfig, BOOSTER_PACKS } from '../../config/gameConfig';

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
      className={`relative w-64 h-96 rounded-2xl cursor-pointer select-none [perspective:1000px] group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {/* 팩 앰비언트 글로우 */}
      <div
        className={`absolute -inset-2 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* 포일 팩 메인 본체 */}
      <div className="relative w-full h-full rounded-2xl border-2 border-pink-400/40 bg-black p-4 flex flex-col justify-between overflow-hidden shadow-pack-hover">
        {/* 요청된 all-member 공식 팩 커버 이미지 (팩별 맞춤 포커스) */}
        <img
          src={pack.image}
          alt={`${pack.name} Booster Pack`}
          style={{ objectPosition: pack.objectPosition || 'center 20%' }}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
        />

        {/* 팩 포일 광택 및 얼굴 가림 없는 은은한 섀도우 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/90 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

        {/* 상단 봉인 지퍼/주름 */}
        <div className="relative z-10 flex justify-between items-center border-b border-white/20 pb-2 bg-black/40 backdrop-blur-sm -mx-2 -mt-1 px-3 pt-1 rounded-t-xl">
          <div className="flex gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1.5 h-2.5 bg-pink-500/80 rounded-sm shadow-sm" />
            ))}
          </div>
          <span className="font-mono text-[9.5px] tracking-widest text-pink-300 font-black uppercase drop-shadow">
            [{pack.code}] NMIXX TCG
          </span>
        </div>

        {/* 중앙은 멤버들 얼굴통통한 비주얼이 시원하게 보이도록 넉넉한 공간 유지 */}
        <div className="flex-1 min-h-[160px]" />

        {/* 하단 콤팩트 글래스모피즘 타이틀 밴드 (한 칸 밑으로 하단 배치 & 한 줄 완벽 렌더링) */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center bg-black/85 backdrop-blur-md py-1.5 px-2.5 rounded-2xl border border-white/20 shadow-2xl mb-1 w-full overflow-hidden">
          <h3 className="font-serif text-[13.5px] sm:text-[14.5px] font-black tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200 drop-shadow-md whitespace-nowrap truncate max-w-full">
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
          <span className="font-bold">5 CARDS / PACK</span>
          <span className="text-amber-300 font-black">100 COIN</span>
        </div>
      </div>
    </motion.div>
  );
};
