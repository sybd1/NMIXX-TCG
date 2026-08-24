import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MultiplayerService } from '../../services/multiplayerService';
import { sound } from '../../services/soundService';
import { Mail, Gift, Ticket, X, Check, Sparkles, Crown } from 'lucide-react';

/** KST(UTC+9) 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
const getKstToday = (): string =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimedMailIds?: string[];
  lastMailClaimDate?: string | null;
  onClaimMail: (mailId: string, coins: number) => void;
  onRedeemCoupon: (code: string) => { success: boolean; message: string; isSecret?: boolean };
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  isOpen,
  onClose,
  claimedMailIds = [],
  lastMailClaimDate,
  onClaimMail,
  onRedeemCoupon,
}) => {
  const [activeTab, setActiveTab] = useState<'MAIL' | 'COUPON'>('MAIL');
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{
    success: boolean;
    message: string;
    isSecret?: boolean;
  } | null>(null);
  const [showSecretCelebration, setShowSecretCelebration] = useState(false);
  // 🛡️ 연타 방지: 수령 중 플래그
  const isClaimingRef = useRef(false);

  if (!isOpen) return null;

  const kstToday = getKstToday();
  // 이미 오늘(KST) 일일 우편을 수령했는지 확인
  const hasClaimedTodayMail = lastMailClaimDate === kstToday;

  const mailList = MultiplayerService.getMailList(claimedMailIds);
  const unreadCount = mailList.filter((m) => !m.isClaimed).length;

  const triggerConfetti = (isSecret = false) => {
    if (isSecret) {
      const end = Date.now() + 3.0 * 1000;
      const colors = ['#f59e0b', '#ec4899', '#a855f7', '#38bdf8', '#fbbf24', '#ffffff'];
      (function frame() {
        confetti({ particleCount: 8, angle: 60, spread: 75, origin: { x: 0, y: 0.7 }, colors, zIndex: 9999 });
        confetti({ particleCount: 8, angle: 120, spread: 75, origin: { x: 1, y: 0.7 }, colors, zIndex: 9999 });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } else {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    }
  };

  const handleClaimSingle = (mailId: string, coinsReward: number) => {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;
    sound.playLegendaryReveal();
    onClaimMail(mailId, coinsReward);
    triggerConfetti(false);
    setTimeout(() => { isClaimingRef.current = false; }, 800);
  };

  const handleClaimAll = () => {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;
    sound.playLegendaryReveal();
    triggerConfetti(false);
    mailList.forEach((mail) => {
      if (!mail.isClaimed) onClaimMail(mail.id, mail.coinsReward);
    });
    setTimeout(() => { isClaimingRef.current = false; }, 800);
  };

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const result = onRedeemCoupon(couponInput.trim());
    setCouponFeedback(result);
    if (result.success) {
      triggerConfetti(!!result.isSecret);
      if (result.isSecret) setShowSecretCelebration(true);
      setCouponInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl select-text">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="relative w-full max-w-xl bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-pink-500/40 p-5 sm:p-7 rounded-3xl shadow-2xl shadow-pink-950/60 flex flex-col gap-4 max-h-[90vh] overflow-hidden"
      >
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-void-800 hover:bg-void-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
        >
          <X size={18} />
        </button>

        {/* 헤더 타이틀 */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30">
              <Gift size={20} className="text-white" />
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-100 to-amber-200">
              엔써 공식 우편함 & 쿠폰 교환소
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            공식 지원 보상금 수령 및 특별 이벤트 쿠폰을 등록할 수 있습니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center justify-center gap-2 p-1 bg-void-950 rounded-2xl border border-white/10">
          <button
            onClick={() => {
              setActiveTab('MAIL');
              setCouponFeedback(null);
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'MAIL'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail size={14} />
            <span>수신 우편함</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('COUPON');
              setCouponFeedback(null);
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'COUPON'
                ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket size={14} />
            <span>시크릿 쿠폰 등록</span>
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'MAIL' ? (
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            {/* 모두 받기 상단 바 */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-slate-400">
                미수령 우편: <span className="text-pink-400 font-bold">{unreadCount}</span>통
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleClaimAll}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-mono font-black shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Gift size={13} />
                  <span>보상 모두 받기</span>
                </button>
              )}
            </div>

            {/* 🕛 KST 자정 일일 리셋 안내 */}
            <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-void-950/60 border border-white/5">
              <span className="text-[11px] font-mono text-slate-500">🕛 매일 자정(KST 00:00) 재수령 가능 · 오늘 수령 여부:</span>
              <span className={`text-[11px] font-mono font-black ${hasClaimedTodayMail ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasClaimedTodayMail ? '✓ 완료' : '미수령'}
              </span>
            </div>

            {/* 우편 목록 */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-[220px]">
              {mailList.map((mail) => (
                <div
                  key={mail.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                    mail.isClaimed
                      ? 'bg-void-950/40 border-white/5 opacity-60'
                      : 'bg-void-950/80 border-pink-500/30 shadow-md hover:border-pink-500/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-100 font-serif">{mail.title}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        보낸 사람: <span className="text-pink-300 font-bold">{mail.sender}</span>
                      </span>
                    </div>

                    {/* 수령 버튼 */}
                    {mail.isClaimed ? (
                      <span className="px-2.5 py-1 rounded-xl bg-void-800 text-slate-500 text-[11px] font-mono flex items-center gap-1 flex-shrink-0">
                        <Check size={12} />
                        수령 완료
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaimSingle(mail.id, mail.coinsReward)}
                        className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-mono text-xs font-black shadow-md shadow-pink-500/30 hover:scale-105 transition-all cursor-pointer flex-shrink-0 flex items-center gap-1"
                      >
                        <Gift size={13} />
                        <span>수령</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5">
                    {mail.content}
                  </p>

                  {/* 동봉 보상 배지 (코인만) */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">동봉 보상:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-black flex items-center gap-1">
                      🪙 {mail.coinsReward.toLocaleString()} COIN
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 🎫 쿠폰 입력 탭 */
          <div className="flex flex-col gap-4 flex-1 py-2">
            <form onSubmit={handleCouponSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Ticket size={14} className="text-pink-400" />
                  <span>공식 시크릿 쿠폰 코드 입력</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: NMIXX2026, FE3O4_FORWARD"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-black/60 border border-pink-500/30 text-white font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-mono text-sm font-black shadow-lg shadow-pink-500/30 hover:scale-105 transition-all cursor-pointer flex-shrink-0"
                  >
                    쿠폰 등록
                  </button>
                </div>
              </div>
            </form>

            {/* 쿠폰 결과 피드백 배너 */}
            {couponFeedback && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-sans flex items-center gap-2 ${
                  couponFeedback.success
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                }`}
              >
                <span>{couponFeedback.success ? '🎉' : '⚠️'}</span>
                <span>{couponFeedback.message}</span>
              </div>
            )}

            {/* 🎁 공개된 공식 쿠폰 힌트 카드 */}
            <div className="bg-void-950/80 p-4 rounded-2xl border border-white/10 flex flex-col gap-2 mt-2">
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>현재 사용 가능한 공개 쿠폰 힌트</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div
                  onClick={() => setCouponInput('NMIXX2026')}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-pink-500/40 cursor-pointer flex justify-between items-center transition-all hover:scale-[1.02]"
                >
                  <span className="text-pink-300 font-bold">NMIXX2026</span>
                  <span className="text-amber-400 font-bold">+30,000 🪙</span>
                </div>
                <div
                  onClick={() => setCouponInput('FE3O4_FORWARD')}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-pink-500/40 cursor-pointer flex justify-between items-center transition-all hover:scale-[1.02]"
                >
                  <span className="text-purple-300 font-bold">FE3O4_FORWARD</span>
                  <span className="text-amber-400 font-bold">+20,000 🪙</span>
                </div>
                <div
                  onClick={() => setCouponInput('WELCOME_NSWER')}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-pink-500/40 cursor-pointer flex justify-between items-center transition-all hover:scale-[1.02]"
                >
                  <span className="text-cyan-300 font-bold">WELCOME_NSWER</span>
                  <span className="text-amber-400 font-bold">+10,000 🪙</span>
                </div>
                <div
                  onClick={() => setCouponInput('PARK_XR_GOD')}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-pink-500/40 cursor-pointer flex justify-between items-center transition-all hover:scale-[1.02]"
                >
                  <span className="text-yellow-300 font-bold">PARK_XR_GOD</span>
                  <span className="text-amber-400 font-bold">+50,000 🪙</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* 👑 시크릿 쿠폰 (평생 엔써의 맹세) 전용 축하 팝업 모달 */}
      <AnimatePresence>
        {showSecretCelebration && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-gradient-to-b from-amber-950 via-void-950 to-void-950 border-2 border-amber-400 p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.6)] flex flex-col items-center text-center gap-5"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black flex items-center justify-center shadow-2xl animate-bounce">
                <Crown size={42} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono font-black tracking-widest text-amber-400 uppercase">
                  ⭐ SECRET EASTER EGG UNLOCKED ⭐
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300">
                  평생 엔써의 서약 완료!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mt-1">
                  엔믹스를 향한 진심 어린 맹세가 확인되었습니다.<br />
                  특별 비밀 보급 지원금이 지급되었습니다!
                </p>
              </div>

              <div className="w-full bg-black/80 border border-amber-500/50 p-4 rounded-2xl flex flex-col items-center gap-1 shadow-inner">
                <span className="text-[11px] font-mono text-slate-400 font-bold">지급 완료된 지원금</span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 animate-pulse">
                  +100,000,000 N COIN
                </span>
                <span className="text-[10px] font-mono text-amber-400/80 font-bold">(1억 원)</span>
              </div>

              <button
                onClick={() => setShowSecretCelebration(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-serif font-black text-sm shadow-xl shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white"
              >
                영광의 보상 수령 완료 💖
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
