import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserAccount } from '../../types/auth';
import { AuthService } from '../../services/authService';
import { sound } from '../../services/soundService';
import { X, LogOut, CheckCircle2, Cloud, Sparkles, AlertCircle } from 'lucide-react';

const NMIXX_PROFILE_MEMBERS = [
  { id: 'LILY', name: '릴리', symbol: '🌸', color: 'from-sky-400 to-blue-600' },
  { id: 'HAEWON', name: '해원', symbol: '🌊', color: 'from-purple-400 to-indigo-600' },
  { id: 'SULLYOON', name: '설윤', symbol: '🦌', color: 'from-pink-400 to-rose-600' },
  { id: 'BAE', name: '배이', symbol: '🐥', color: 'from-amber-400 to-yellow-600' },
  { id: 'JIWOO', name: '지우', symbol: '🐶', color: 'from-rose-400 to-red-600' },
  { id: 'KYUJIN', name: '규진', symbol: '🐱', color: 'from-emerald-400 to-green-600' },
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
  const [selectedMember, setSelectedMember] = useState(user.avatarMemberId || 'SULLYOON');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFav = NMIXX_PROFILE_MEMBERS.find(m => m.id === selectedMember) || NMIXX_PROFILE_MEMBERS[2];

  const handleSave = async () => {
    sound.playClick();
    setErrorMessage(null);

    setIsSaving(true);
    // 닉네임은 변경이 불가능하므로 대표 멤버(avatarMemberId) 수정 정보만 전송
    const result = await AuthService.updateProfile({
      avatarMemberId: selectedMember,
    });
    setIsSaving(false);

    if (result.success && result.user) {
      onUpdateUser(result.user);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } else {
      setErrorMessage(result.message || '프로필 변경에 실패했습니다.');
    }
  };

  const handleLogoutClick = async () => {
    sound.playClick();
    await AuthService.logout();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-text">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-purple-500/50 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-purple-950/80 flex flex-col gap-5 overflow-hidden select-text"
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
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${currentFav.color} p-[2px] shadow-xl flex-shrink-0`}>
            <div className="w-full h-full bg-void-950 rounded-[14px] flex items-center justify-center text-3xl">
              {currentFav.symbol}
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-black text-xl text-white select-text">
                {user.displayName}
              </h3>
              {/* 구글/카카오 대신 선택한 최애 멤버 뱃지 노출 */}
              <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-lg border bg-pink-950/80 text-pink-300 border-pink-500/40 shadow-sm flex items-center gap-1">
                <span>{currentFav.symbol}</span>
                <span>{currentFav.name}</span>
              </span>
            </div>

            <span className="text-xs text-slate-400 font-mono select-all">
              {user.email}
            </span>

            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 font-bold mt-0.5">
              <Cloud size={13} />
              <span>클라우드 세이브 활성화됨 (암호화 실시간 백업)</span>
            </div>
          </div>
        </div>

        {/* 에러 메시지 배너 */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-sans flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 닉네임 수정 (계정 최초 가입 시 외 변경 차단) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-bold text-rose-400">
            닉네임 변경 불가 (한 번 가입/설정된 닉네임은 변경할 수 없습니다)
          </label>
          <input
            type="text"
            value={user.displayName}
            disabled={true}
            className="w-full px-4 py-2.5 rounded-xl bg-void-950/80 border border-red-500/20 text-slate-400 font-serif text-sm focus:outline-none cursor-not-allowed select-none"
          />
        </div>

        {/* 최애 대표 멤버 아바타 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
            <span>대표 엔믹스 최애 멤버 설정</span>
            <span className="text-[10.5px] text-pink-300 font-mono font-bold">
              선택: {currentFav.symbol} {currentFav.name}
            </span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full justify-center">
            {NMIXX_PROFILE_MEMBERS.map(m => {
              const isSelected = selectedMember === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m.id)}
                  className={`py-2.5 px-1.5 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-b from-pink-600 via-purple-600 to-pink-700 text-white border-pink-300 shadow-lg shadow-pink-950/60 scale-[1.04]'
                      : 'bg-void-950/90 text-slate-400 hover:text-white border-white/10 hover:border-pink-500/40 hover:bg-void-900'
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{m.symbol}</span>
                  <span className="text-xs whitespace-nowrap font-serif">{m.name}</span>
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
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-mono font-black text-xs shadow-lg shadow-pink-950/60 transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 border border-white/30 disabled:opacity-50"
          >
            {isSaved ? <CheckCircle2 size={15} className="text-emerald-300" /> : <Sparkles size={15} />}
            <span>{isSaving ? '중복 검사 중...' : isSaved ? '저장 완료!' : '프로필 저장하기'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
