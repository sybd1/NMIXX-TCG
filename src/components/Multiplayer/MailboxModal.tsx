import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MultiplayerService } from '../../services/multiplayerService';
import { sound } from '../../services/soundService';
import { Mail, Gift, Ticket, X, Check, Sparkles } from 'lucide-react';

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimedMailIds?: string[];
  onClaimMail: (mailId: string, coins: number, dust: number) => void;
  onRedeemCoupon: (code: string) => { success: boolean; message: string };
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  isOpen,
  onClose,
  claimedMailIds = [],
  onClaimMail,
  onRedeemCoupon,
}) => {
  const [activeTab, setActiveTab] = useState<'MAIL' | 'COUPON'>('MAIL');
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const mailList = MultiplayerService.getMailList(claimedMailIds);
  const unreadCount = mailList.filter((m) => !m.isClaimed).length;

  const handleClaimAll = () => {
    sound.playLegendaryReveal();
    mailList.forEach((mail) => {
      if (!mail.isClaimed) {
        onClaimMail(mail.id, mail.coinsReward, mail.dustReward || 0);
      }
    });
  };

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const result = onRedeemCoupon(couponInput.trim());
    setCouponFeedback(result);
    if (result.success) {
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

            {/* 우편 목록 */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-[260px]">
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100 font-serif">
                          {mail.title}
                        </span>
                      </div>
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
                        onClick={() => {
                          sound.playLegendaryReveal();
                          onClaimMail(mail.id, mail.coinsReward, mail.dustReward || 0);
                        }}
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

                  {/* 동봉된 보상 배지 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">동봉 보상:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-black flex items-center gap-1">
                      🪙 {mail.coinsReward.toLocaleString()} COIN
                    </span>
                    {mail.dustReward && (
                      <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold flex items-center gap-1">
                        ✨ {mail.dustReward} DUST
                      </span>
                    )}
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
    </div>
  );
};
