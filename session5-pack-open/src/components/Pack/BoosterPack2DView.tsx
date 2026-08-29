import React from 'react';
import { BoosterPackConfig } from '../../config/gameConfig';

interface BoosterPack2DViewProps {
  pack: BoosterPackConfig;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BoosterPack2DView: React.FC<BoosterPack2DViewProps> = ({
  pack,
  disabled = false,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between select-none ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {/* 팩 이미지 */}
      <img
        src={pack.image}
        alt={pack.name}
        className="w-full h-full object-cover rounded-2xl"
        style={{ objectPosition: pack.objectPosition || 'center' }}
      />
      
      {/* 포일 주름/반사 오버레이 효과 */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none foil-wrinkle-texture opacity-30 mix-blend-overlay" />
      <div className="absolute inset-0 rounded-2xl pointer-events-none foil-holo-sheen opacity-20 mix-blend-color-dodge" />
    </div>
  );
};
