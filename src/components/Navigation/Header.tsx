import React from 'react';
import { Volume2, VolumeX, Gift, User } from 'lucide-react';
import { NavTab } from '../../types/game';
import { UserAccount } from '../../types/auth';

const MEMBER_BADGES: Record<string, { symbol: string; name: string; bg: string }> = {
  LILY: { symbol: '🌸', name: '릴리', bg: 'bg-sky-950/80 text-sky-300 border-sky-500/40' },
  HAEWON: { symbol: '🌊', name: '해원', bg: 'bg-purple-950/80 text-purple-300 border-purple-500/40' },
  SULLYOON: { symbol: '🦌', name: '설윤', bg: 'bg-pink-950/80 text-pink-300 border-pink-500/40' },
  BAE: { symbol: '🐥', name: '배이', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/40' },
  JIWOO: { symbol: '🐶', name: '지우', bg: 'bg-rose-950/80 text-rose-300 border-rose-500/40' },
  KYUJIN: { symbol: '🐱', name: '규진', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
};

interface HeaderProps {
  coins: number;
  soundMuted: boolean;
  onToggleSound: () => void;
  canClaimDaily?: boolean;
  onClaimDaily?: () => void;
  onClaimMysteryBox: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user?: UserAccount | null;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  coins,
  soundMuted,
  onToggleSound,
  onClaimMysteryBox,
  currentTab,
  onSelectTab,
  user,
  onOpenAuth,
  onOpenProfile,
}) => {
  const [showRewardToast, setShowRewardToast] = React.useState(false);

  const handleMysteryClick = () => {
    onClaimMysteryBox();
    setShowRewardToast(true);
    setTimeout(() => setShowRewardToast(false), 2000);
  };
  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-void-950/85 backdrop-blur-xl border-b border-void-800/80 px-4 md:px-8 flex items-center justify-between relative">
      {/* Brand */}
      <div
        onClick={() => onSelectTab('home')}
        className="flex items-center gap-3 cursor-pointer group z-10"
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

      {/* 🌟 Desktop Navigation Tabs (화면 정중앙 완벽 고정) */}
      <nav className="hidden md:flex items-center gap-1 bg-void-900/90 p-1.5 rounded-2xl border border-void-800/90 absolute left-1/2 -translate-x-1/2 shadow-xl backdrop-blur-md">
        {[
          { id: 'home', label: 'PACK OPEN' },
          { id: 'collection', label: 'COLLECTION' },
          { id: 'achievements', label: 'ACHIEVEMENTS' },
          { id: 'settings', label: 'INFORMATION' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as NavTab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
              currentTab === tab.id
                ? 'bg-gradient-to-r from-pink-600/40 via-purple-600/40 to-amber-500/30 text-white border border-pink-400/50 shadow-md shadow-pink-950/50 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right Currencies & Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
        {/* 👤 소셜 로그인 / 유저 프로필 뱃지 */}
        {user ? (
          (() => {
            const fav = MEMBER_BADGES[user.avatarMemberId || 'SULLYOON'] || MEMBER_BADGES.SULLYOON;
            return (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-void-900 border border-purple-500/40 hover:border-pink-400 text-xs font-mono transition-all hover:scale-105 cursor-pointer shadow-md"
                title="프로필 및 클라우드 연동 관리"
              >
                <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-xs">
                  {fav.symbol}
                </div>
                <span className="font-bold text-white max-w-[80px] sm:max-w-[100px] truncate text-[11px]">
                  {user.displayName}
                </span>
                <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border hidden sm:inline-flex items-center gap-0.5 ${fav.bg}`}>
                  <span>{fav.symbol}</span>
                  <span>{fav.name}</span>
                </span>
              </button>
            );
          })()
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono font-black text-xs shadow-md shadow-pink-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-pink-400/30"
            title="Google 및 카카오 계정으로 간편 가입"
          >
            <User size={13} />
            <span className="hidden xs:inline">로그인 / 회원가입</span>
            <span className="xs:hidden">로그인</span>
          </button>
        )}

        {/* 🎁 ??? 미스터리 박스 버튼 (클릭 시 게임머니 만원 +10,000 COIN 충전) */}
        <button
          onClick={handleMysteryClick}
          className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-amber-400 hover:from-pink-500 hover:to-amber-300 text-white font-mono font-black text-xs shadow-lg shadow-pink-950/60 hover:scale-105 transition-all active:scale-95 cursor-pointer border border-white/20"
          title="미스터리 박스를 열어 게임 머니 만원(+10,000 COIN)을 충전하세요!"
        >
          <Gift size={13} className="text-yellow-300 animate-bounce" />
          <span className="tracking-widest font-black text-[11px]">???</span>
        </button>

        {/* 만원 충전 토스트 팝업 */}
        {showRewardToast && (
          <div className="absolute -bottom-8 left-0 transform -translate-x-4 bg-amber-500 text-black font-mono font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-2xl animate-pulse z-50 border border-yellow-200 pointer-events-none whitespace-nowrap">
            🎉 +10,000 COIN 충전 완료!
          </div>
        )}

        {/* Coins */}
        <div className="flex items-center gap-1.5 bg-void-900 border border-amber-500/30 px-2.5 py-1 rounded-xl">
          <span className="text-amber-400 text-xs">🪙</span>
          <span className="font-mono text-xs font-bold text-amber-300">
            {coins.toLocaleString()} <span className="hidden sm:inline">COIN</span>
          </span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 rounded-lg bg-void-900 hover:bg-void-800 text-slate-400 hover:text-slate-200 border border-void-800 transition-colors cursor-pointer"
          title={soundMuted ? '음소거 해제' : '음소거'}
        >
          {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </header>
  );
};
