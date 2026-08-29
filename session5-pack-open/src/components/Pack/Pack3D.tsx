import React from 'react';
import { motion } from 'framer-motion';
import { BoosterPackConfig, BOOSTER_PACKS } from '../../config/gameConfig';
import { BoosterPackThreeView } from './BoosterPackThreeView';
import { WebGLErrorBoundary } from '../Common/WebGLErrorBoundary';
import { BoosterPack2DView } from './BoosterPack2DView';

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
  const fallbackView = (
    <BoosterPack2DView
      pack={pack}
      disabled={disabled}
      onClick={!disabled ? onClick : undefined}
      className="w-full h-full relative z-10 drop-shadow-[0_25px_35px_rgba(0,0,0,0.85)]"
    />
  );

  return (
    <motion.div
      whileHover={!disabled && !isOpening ? { scale: 1.03, y: -2 } : {}}
      whileTap={!disabled && !isOpening ? { scale: 0.97 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-72 sm:w-80 h-[460px] sm:h-[490px] cursor-pointer select-none flex items-center justify-center group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {/* 팩 외곽 동적 앰비언트 글로우 오라 */}
      <div
        className={`absolute inset-4 rounded-3xl bg-gradient-to-r ${pack.gradient} blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />

      {/* 🌟 Three.js WebGL 물리 기반(PBR) 3D 부스터 팩 */}
      <WebGLErrorBoundary fallback={fallbackView}>
        <BoosterPackThreeView
          pack={pack}
          disabled={disabled}
          onClick={!disabled ? onClick : undefined}
          className="w-full h-full relative z-10 drop-shadow-[0_25px_35px_rgba(0,0,0,0.85)]"
        />
      </WebGLErrorBoundary>
    </motion.div>
  );
};


