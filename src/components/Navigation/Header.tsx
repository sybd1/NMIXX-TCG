import React from 'react';
import { Volume2, VolumeX, Gift } from 'lucide-react';
import { NavTab } from '../../types/game';

interface HeaderProps {
  coins: number;
  soundMuted: boolean;
  onToggleSound: () => void;
  canClaimDaily?: boolean;
  onClaimDaily?: () => void;
  onClaimMysteryBox: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  coins,
  soundMuted,
  onToggleSound,
  onClaimMysteryBox,
  currentTab,
  onSelectTab,
}) => {
  const [showRewardToast, setShowRewardToast] = React.useState(false);

  const handleMysteryClick = () => {
    onClaimMysteryBox();
    setShowRewardToast(true);
    setTimeout(() => setShowRewardToast(false), 2000);
  };
  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-void-950/85 backdrop-blur-xl border-b border-void-800/80 px-4 md:px-8 flex items-center justify-between">
      {/* Brand */}
      <div
        onClick={() => onSelectTab('home')}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 via-purple-600 to-sky-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-pink-950/50">
          <div className="w-full h-full bg-void-950 rounded-[7px] flex items-center justify-center">
            <span className="text-pink-400 font-serif font-black text-sm">N</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-serif font-black text-base md:text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-sky-200 group-hover:from-pink-200 group-hover:to-amber-200 transition-colors">
            NMIXX TCG
          </span>
          <span className="text-[8.5px] font-mono tracking-widest text-slate-400 font-bold hidden sm:inline">
            OFFICIAL DIGITAL CARD PROTOCOL
          </span>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-void-900/90 p-1 rounded-xl border border-void-800">
        {[
          { id: 'home', label: 'PACK OPEN' },
          { id: 'collection', label: 'COLLECTION' },
          { id: 'settings', label: 'INFORMATION' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as NavTab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all ${
              currentTab === tab.id
                ? 'bg-pink-600/30 text-pink-200 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right Currencies & Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3 relative">
        {/* 🎁 ??? 미스터리 박스 버튼 (클릭 시 게임머니 만원 +10,000 COIN 충전) */}
        <button
          onClick={handleMysteryClick}
          className="relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-amber-400 hover:from-pink-500 hover:to-amber-300 text-white font-mono font-black text-xs shadow-lg shadow-pink-950/60 hover:scale-105 transition-all active:scale-95 cursor-pointer border border-white/20"
          title="미스터리 박스를 열어 게임 머니 만원(+10,000 COIN)을 충전하세요!"
        >
          <Gift size={14} className="text-yellow-300 animate-bounce" />
          <span className="tracking-widest font-black">???</span>
        </button>

        {/* 만원 충전 토스트 팝업 */}
        {showRewardToast && (
          <div className="absolute -bottom-8 left-0 transform -translate-x-4 bg-amber-500 text-black font-mono font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-2xl animate-pulse z-50 border border-yellow-200 pointer-events-none whitespace-nowrap">
            🎉 +10,000 COIN 충전 완료!
          </div>
        )}

        {/* Coins */}
        <div className="flex items-center gap-1.5 bg-void-900 border border-amber-500/30 px-3 py-1 rounded-xl">
          <span className="text-amber-400 text-xs">🪙</span>
          <span className="font-mono text-xs font-bold text-amber-300">
            {coins.toLocaleString()} COIN
          </span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 rounded-xl bg-void-900 border border-void-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
          title={soundMuted ? '음소거 해제' : '음소거'}
        >
          {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </header>
  );
};
