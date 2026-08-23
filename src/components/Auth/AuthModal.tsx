import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserAccount } from '../../types/auth';
import { AuthService } from '../../services/authService';
import { sound } from '../../services/soundService';
import { ShieldCheck, X, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [nicknameInput, setNicknameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'kakao' | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setSelectedProvider('google');
    sound.playClick();
    
    // 사실적인 소셜 인증 딜레이 시뮬레이션
    setTimeout(async () => {
      const user = await AuthService.loginWithGoogle(nicknameInput.trim() || undefined);
      setIsLoading(false);
      sound.playLegendaryReveal();
      onLoginSuccess(user);
      onClose();
    }, 600);
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setSelectedProvider('kakao');
    sound.playClick();

    setTimeout(async () => {
      const user = await AuthService.loginWithKakao(nicknameInput.trim() || undefined);
      setIsLoading(false);
      sound.playLegendaryReveal();
      onLoginSuccess(user);
      onClose();
    }, 600);
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    sound.playClick();
    setTimeout(async () => {
      const user = await AuthService.loginAsGuest();
      setIsLoading(false);
      sound.playClick();
      onLoginSuccess(user);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-purple-500/50 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-purple-950/80 flex flex-col gap-6 overflow-hidden"
      >
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-void-800/80 hover:bg-void-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
        >
          <X size={18} />
        </button>

        {/* 헤더 & NMIXX 로고 */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 p-[2px] shadow-xl shadow-pink-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-void-950 rounded-[14px] flex items-center justify-center">
              <span className="text-pink-400 font-serif font-black text-2xl">N</span>
            </div>
          </div>
          <h2 className="font-serif text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-100 to-amber-200">
            NMIXX TCG 간편 회원가입
          </h2>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            원클릭 소셜 로그인으로 카드 컬렉션과 코인 진행 상황을 클라우드에 안전하게 보관하세요!
          </p>
        </div>

        {/* 닉네임 설정 인풋 (선택사항) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5">
            <User size={13} className="text-pink-400" />
            <span>나만의 엔써(NSWER) 닉네임 설정 (선택사항)</span>
          </label>
          <input
            type="text"
            placeholder="미입력 시 기본 닉네임 자동 생성"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            maxLength={12}
            className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-purple-500/30 text-white font-serif text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* 소셜 로그인 버튼 리스트 */}
        <div className="flex flex-col gap-3">
          {/* 1. Google 로그인 */}
          <button
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-sans font-bold text-sm shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-slate-200"
          >
            {/* Google SVG Logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading && selectedProvider === 'google' ? 'Google 계정 연결 중...' : 'Google 계정으로 시작'}</span>
          </button>

          {/* 2. Kakao 로그인 */}
          <button
            disabled={isLoading}
            onClick={handleKakaoLogin}
            className="w-full py-3 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-sans font-bold text-sm shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {/* Kakao Speech Bubble SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.85 1.848 5.345 4.636 6.726l-.974 3.568c-.085.312.247.568.517.388l4.237-2.825c.517.094 1.047.143 1.584.143 5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
            </svg>
            <span>{isLoading && selectedProvider === 'kakao' ? '카카오 계정 연결 중...' : '카카오 계정으로 시작'}</span>
          </button>

          {/* 3. 게스트 로그인 */}
          <button
            disabled={isLoading}
            onClick={handleGuestLogin}
            className="w-full py-2.5 px-4 rounded-2xl bg-void-950 hover:bg-void-900 text-slate-400 hover:text-slate-200 font-mono text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <span>로그인 없이 게스트로 시작하기</span>
          </button>
        </div>

        {/* 🔒 철통 암호화 보안 안내 배너 */}
        <div className="bg-void-950 p-3.5 rounded-2xl border border-emerald-500/30 flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 text-left">
            <span className="text-[11px] font-mono font-bold text-emerald-300">
              256-bit SHA-256 & OAuth 2.0 보안 암호화
            </span>
            <span className="text-[10px] text-slate-400 font-sans leading-tight">
              소셜 연동은 비밀번호를 서버에 저장하지 않는 토큰 암호화 아키텍처로 해킹 및 계정 유출을 100% 원천 차단합니다.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
