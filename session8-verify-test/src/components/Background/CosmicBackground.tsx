import React from 'react';

export const CosmicBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu select-none">
      {/* Deep Cosmic Void Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05010a] via-[#090417] via-55% to-[#020006]" />

      {/* Ambient Cosmic Nebulae */}
      <div className="absolute -top-40 -left-20 w-[32rem] sm:w-[48rem] h-[32rem] sm:h-[48rem] rounded-full bg-gradient-to-br from-purple-700/20 via-pink-600/10 to-transparent blur-3xl pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-1/3 left-1/4 w-[28rem] sm:w-[40rem] h-[28rem] sm:h-[40rem] rounded-full bg-gradient-to-tr from-cyan-600/12 via-sky-500/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[36rem] sm:w-[60rem] h-[36rem] sm:h-[60rem] rounded-full bg-gradient-to-tl from-cyan-500/20 via-fuchsia-600/15 to-transparent blur-3xl pointer-events-none" />

      {/* Cosmic Star Dust & Cyber Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.8px,transparent_0.8px)] [background-size:32px_32px] opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_0.6px,transparent_0.6px)] [background-size:80px_80px] opacity-20" />
    </div>
  );
};
