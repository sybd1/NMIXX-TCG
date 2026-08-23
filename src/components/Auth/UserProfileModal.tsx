import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserAccount } from '../../types/auth';
import { AuthService } from '../../services/authService';
import { sound } from '../../services/soundService';
import { X, LogOut, CheckCircle2, Cloud, Sparkles } from 'lucide-react';

const NMIXX_PROFILE_MEMBERS = [
  { id: 'LILY', name: '릴리', symbol: '🌸' },
  { id: 'HAEWON', name: '해원', symbol: '🌊' },
  { id: 'SULLYOON', name: '설윤', symbol: '🦌' },
  { id: 'BAE', name: '배이', symbol: '🐥' },
  { id: 'JIWOO', name: '지우', symbol: '🐶' },
  { id: 'KYUJIN', name: '규진', symbol: '🐱' },
  { id: 'PARK', name: '박진영', symbol: '👑' },
];

interface UserProfileModalProps {
  user: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (updated: UserAccount) => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateUser,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [selectedMember, setSelectedMember] = useState(user.avatarMemberId || 'SULLYOON');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    sound.playClick();
    const updated = await AuthService.updateProfile({
      displayName: displayName.trim() || user.displayName,
      avatarMemberId: selectedMember,
    });
    if (updated) {
      onUpdateUser(updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleLogoutClick = () => {
    sound.playClick();
    AuthService.logout();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-purple-500/50 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-purple-950/80 flex flex-col gap-5 overflow-hidden"
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-void-800/80 hover:bg-void-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
        >
          <X size={18} />
        </button>

        {/* 상단 프로필 헤더 */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 p-[2px] shadow-xl flex-shrink-0">
            <div className="w-full h-full bg-void-950 rounded-[14px] flex items-center justify-center font-serif font-black text-2xl text-pink-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-black text-xl text-white">
                {user.displayName}
              </h3>
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                user.provider === 'google'
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                  : user.provider === 'kakao'
                  ? 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40'
                  : 'bg-void-800 text-slate-400 border-white/10'
              }`}>
                {user.provider === 'google' ? 'GOOGLE' : user.provider === 'kakao' ? 'KAKAO' : 'GUEST'}
              </span>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              {user.email}
            </span>

            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 font-bold mt-0.5">
              <Cloud size={13} />
              <span>클라우드 세이브 활성화됨 (암호화 동기화)</span>
            </div>
          </div>
        </div>

        {/* 닉네임 수정 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-bold text-slate-300">
            닉네임 변경
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={12}
            className="w-full px-4 py-2 rounded-xl bg-black/60 border border-purple-500/30 text-white font-serif text-sm focus:outline-none focus:border-pink-400 transition-all"
          />
        </div>

        {/* 최애 대표 멤버 아바타 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
            <span>대표 엔믹스 최애 멤버 설정</span>
            <span className="text-[10px] text-pink-300 font-mono">
              선택: {NMIXX_PROFILE_MEMBERS.find(m => m.id === selectedMember)?.name || selectedMember}
            </span>
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {NMIXX_PROFILE_MEMBERS.map(m => {
              const isSelected = selectedMember === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-white shadow-lg scale-105'
                      : 'bg-void-950/80 text-slate-400 hover:text-white border-white/10 hover:bg-void-800'
                  }`}
                >
                  <span className="text-base">{m.symbol}</span>
                  <span className="text-[10px] whitespace-nowrap">{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 액션 버튼 (저장 & 로그아웃) */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            onClick={handleLogoutClick}
            className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-mono font-black text-xs shadow-lg shadow-pink-950/60 transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 border border-white/30"
          >
            {isSaved ? <CheckCircle2 size={15} className="text-emerald-300" /> : <Sparkles size={15} />}
            <span>{isSaved ? '저장 완료!' : '프로필 저장하기'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
