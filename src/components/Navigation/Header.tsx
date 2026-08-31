import React from 'react';
import { Volume2, VolumeX, User, Mail } from 'lucide-react';
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
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user?: UserAccount | null;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenMarket?: () => void;
  onOpenMailbox: () => void;
  unreadMailCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  coins,
  soundMuted,
  onToggleSound,
  currentTab,
  onSelectTab,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenMailbox,
  unreadMailCount = 0,
}) => {

  const userFav = user ? (MEMBER_BADGES[user.avatarMemberId || 'SULLYOON'] || MEMBER_BADGES.SULLYOON) : null;

  // 🌟 상단 카테고리: 팩오픈 -> 컬렉션 -> 업적 -> 랭킹 -> 인포메이션 -> 패치노트
  const navTabs: { id: NavTab; label: string }[] = [
    { id: 'home', label: 'PACK OPEN' },
    { id: 'collection', label: 'COLLECTION' },
    { id: 'achievements', label: 'ACHIEVEMENTS' },
    { id: 'ranking', label: 'RANKING' },
    { id: 'settings', label: 'INFORMATION' },
    // { id: 'patch-notes', label: 'PATCH NOTES' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-void-950/95 backdrop-blur-xl border-b border-void-800/80 flex flex-col">
      {/* 📱 메인 상단 헤더 바 (Desktop & Mobile 공통) */}
      <div className="w-full h-14 sm:h-16 px-4 sm:px-6 md:px-8 flex items-center justify-between relative">
        {/* Brand Logo & Title */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group flex-shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-pink-500 via-purple-600 to-sky-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-pink-950/50 flex-shrink-0">
            <div className="w-full h-full bg-void-950 rounded-[6px] flex items-center justify-center">
              <span className="text-pink-400 font-serif font-black text-xs sm:text-sm">N</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black text-sm sm:text-base md:text-lg tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-sky-200 group-hover:from-pink-200 group-hover:to-amber-200 transition-colors">
              NMIXX TCG
            </span>
            <span className="text-[7.5px] font-mono tracking-widest text-slate-400 font-bold hidden xl:inline">
              OFFICIAL DIGITAL CARD PROTOCOL
            </span>
          </div>
        </div>

        {/* 💻 Desktop Navigation Tabs (순서: 팩오픈 -> 컬렉션 -> 업적 -> 랭킹 -> 인포메이션 -> 패치노트) */}
        <nav className="hidden lg:flex items-center gap-1 bg-void-900/90 p-1.5 rounded-2xl border border-void-800/90 absolute left-1/2 -translate-x-1/2 shadow-xl backdrop-blur-md">
          {navTabs.map((tab) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600/40 via-purple-600/40 to-amber-500/30 text-white border border-pink-400/50 shadow-md shadow-pink-950/50 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* 우측 핵심 통화 & 유저 액션 바 */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* 📬 Desktop 우편함 버튼 */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1">
            <button
              onClick={onOpenMailbox}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-void-900 hover:bg-void-800 text-pink-300 border border-pink-500/30 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer shadow-md"
              title="공식 우편함 & 쿠폰"
            >
              <Mail size={13} className="text-pink-400" />
              <span>우편</span>
              {unreadMailCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
                  {unreadMailCount}
                </span>
              )}
            </button>
          </div>

          {/* 🪙 Coins Balance Display */}
          <div className="flex items-center gap-1.5 bg-void-900 border border-amber-500/30 px-2.5 py-1 rounded-xl shadow-inner">
            <span className="text-amber-400 text-xs">🪙</span>
            <span className="font-mono text-[11px] sm:text-xs font-black text-amber-300">
              {coins.toLocaleString()}
            </span>
            <span className="font-mono text-[9.5px] font-extrabold text-amber-400/90 tracking-tight">
              N COIN
            </span>
          </div>

          {/* 👤 로그인 상태: 닉네임 확실하게 표시 */}
          {user ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-purple-950/90 to-pink-950/90 border border-purple-500/50 hover:border-pink-400 text-xs font-mono transition-all hover:scale-105 cursor-pointer shadow-md"
              title="프로필 및 클라우드 연동 관리"
            >
              <span className="text-xs">{userFav?.symbol || '🌸'}</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-amber-200 max-w-[90px] sm:max-w-[120px] truncate text-[11.5px] sm:text-xs">
                {user.displayName}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono font-bold text-xs shadow-md transition-all hover:scale-105 cursor-pointer border border-pink-400/30"
              title="소셜 로그인"
            >
              <User size={12} />
              <span className="text-[11px]">로그인</span>
            </button>
          )}

          {/* 🔊 Desktop Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg bg-void-900 hover:bg-void-800 text-slate-400 hover:text-slate-200 border border-void-800 transition-colors cursor-pointer hidden lg:inline-flex"
            title={soundMuted ? '음소거 해제' : '음소거'}
          >
            {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* 📱 Mobile 전용 서브 퀵 액션 바 (lg 미만 화면) */}
      <div className="lg:hidden w-full bg-void-950/90 border-t border-white/5 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto select-none">
        {/* 📬 모바일 우편함 버튼 */}
        <button
          onClick={onOpenMailbox}
          className="relative flex-1 py-1 px-3 rounded-xl bg-void-900/90 border border-pink-500/30 hover:border-pink-400 text-pink-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <Mail size={13} className="text-pink-400" />
          <span>공식 우편함</span>
          {unreadMailCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[8px] font-black animate-pulse">
              {unreadMailCount}
            </span>
          )}
        </button>

        {/* 🔊 모바일 사운드 토글 */}
        <button
          onClick={onToggleSound}
          className="py-1 px-3 rounded-xl bg-void-900/90 border border-white/10 text-slate-400 text-[11px] font-mono font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          {soundMuted ? <VolumeX size={12} /> : <Volume2 size={12} className="text-pink-400" />}
          <span>{soundMuted ? '음소거' : '소리 ON'}</span>
        </button>
      </div>
    </header>
  );
};
