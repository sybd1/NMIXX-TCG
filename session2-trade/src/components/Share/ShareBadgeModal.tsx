import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Check, Share2, Star } from 'lucide-react';
import { UserAccount } from '../../types/auth';

interface ShareBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  rank: number | null;
  totalRankers: number;
  uniqueCardCount: number;
  collectionRate: number;
  topCards: { id: string; image: string; rarity: string; name: string }[];
}

const SITE_URL = 'https://nmixx-tcg.vercel.app/';

const RARITY_COLORS: Record<string, string> = {
  XR: '#f59e0b', LR: '#a855f7', MR: '#ec4899',
  UR: '#3b82f6', SSR: '#10b981', SR: '#64748b', R: '#94a3b8',
};

export const ShareBadgeModal: React.FC<ShareBadgeModalProps> = ({
  isOpen, onClose, user, rank, totalRankers, uniqueCardCount, collectionRate, topCards,
}) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [savingImg, setSavingImg] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const rankText = rank ? `Rank #${rank}` : '랭킹 미집계';
  const topPercent = rank && totalRankers > 0 ? Math.ceil((rank / totalRankers) * 100) : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 게스트 차단
  if (!user || user.id === 'guest' || !user.isCloudSynced) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="relative w-full max-w-sm bg-void-900 border-2 border-pink-500/40 p-7 rounded-3xl shadow-2xl flex flex-col items-center gap-5 text-center"
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-void-800 hover:bg-void-700 text-slate-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
          <Share2 size={40} className="text-pink-400" />
          <div>
            <h3 className="font-serif font-black text-xl text-white mb-1">로그인 후 공유 가능합니다</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              구글 또는 카카오 계정으로 로그인하면 나만의 수집 배지를 SNS에 자랑할 수 있어요!
            </p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-mono font-black text-sm hover:scale-105 transition-all cursor-pointer">
            확인
          </button>
        </motion.div>
      </div>
    );
  }

  const handleShareX = () => {
    const text = `[NMIXX TCG] 현재 제 랭킹은 ${rankText}! ${uniqueCardCount}장의 카드를 수집했습니다 (달성률 ${collectionRate}%). 함께 플레이해요! #NMIXX #엔믹스 #NMIXX_TCG`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=450');
  };

  const handleSaveImage = async () => {
    if (!badgeRef.current || savingImg) return;
    setSavingImg(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(badgeRef.current, { quality: 1, pixelRatio: 3, backgroundColor: '#0a0a0f' });
      const link = document.createElement('a');
      link.download = `nmixx-tcg-badge-${user.displayName}.png`;
      link.href = dataUrl;
      link.click();
      showToast('📸 이미지 저장 완료! 스토리나 피드에 업로드해 자랑해 보세요!');
    } catch {
      showToast('이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingImg(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopyDone(true);
      showToast('🔗 링크가 클립보드에 복사되었습니다!');
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      showToast('링크 복사에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="relative w-full max-w-md bg-gradient-to-b from-void-900 via-void-950 to-void-900 border-2 border-pink-500/40 p-5 sm:p-6 rounded-3xl shadow-2xl shadow-pink-950/60 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-void-800 hover:bg-void-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10">
          <X size={18} />
        </button>

        {/* 헤더 */}
        <div className="flex flex-col items-center text-center gap-1 pt-1">
          <span className="p-2 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30">
            <Share2 size={20} />
          </span>
          <h2 className="font-serif text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-100 to-amber-200">
            수집 배지 공유
          </h2>
          <p className="text-xs text-slate-400 font-sans">나의 NMIXX TCG 수집 현황을 SNS에 자랑해요!</p>
        </div>

        {/* 배지 카드 */}
        <div
          ref={badgeRef}
          style={{
            background: 'linear-gradient(135deg,#0f0820 0%,#1a0a2e 50%,#0f0820 100%)',
            border: '2px solid rgba(236,72,153,0.5)',
            borderRadius: 16,
            padding: 20,
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#ec4899', letterSpacing: '0.15em', fontFamily: 'monospace' }}>NMIXX TCG</div>
              <div style={{ fontSize: 9, color: '#6b7280', fontFamily: 'monospace' }}>nmixx-tcg.vercel.app</div>
            </div>
            <div style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)', fontSize: 10, fontWeight: 700, color: '#f9a8d4', fontFamily: 'monospace' }}>
              {topPercent ? `TOP ${topPercent}%` : rankText}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(168,85,247,0.6)', background: '#1e1b4b', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                : <span style={{ fontSize: 22, color: '#a855f7' }}>♪</span>}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{user.displayName}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>{rankText} · 수집률 {collectionRate}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: topCards.length > 0 ? 14 : 0 }}>
            {[
              { label: '보유 카드', value: `${uniqueCardCount.toLocaleString()}장`, color: '#f9a8d4' },
              { label: '수집 달성률', value: `${collectionRate}%`, color: '#fbbf24' },
              { label: '전체 순위', value: rankText, color: '#a5f3fc' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {topCards.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' }}>⭐ 대표 보유 카드</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {topCards.slice(0, 3).map(card => (
                  <div key={card.id} style={{ flex: 1, borderRadius: 10, overflow: 'hidden', border: `2px solid ${RARITY_COLORS[card.rarity] || '#6b7280'}`, aspectRatio: '3/4', background: '#1e1b4b', position: 'relative' }}>
                    <img src={card.image} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                    <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, fontWeight: 900, color: '#fff', background: RARITY_COLORS[card.rarity] || '#6b7280', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>
                      {card.rarity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SNS 공유 버튼 3종 */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-mono text-slate-500 text-center">플랫폼을 선택하여 공유하세요</p>
          <div className="grid grid-cols-3 gap-2">
            {/* X(트위터) 공유 — X 로고 inline SVG */}
            <button onClick={handleShareX} className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl bg-[#0a0a0a] hover:bg-[#111] border border-white/10 hover:border-white/25 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-black border border-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="white" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.254 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-300">X 공유</span>
            </button>

            {/* 인스타그램용 이미지 저장 — 인스타 로고 inline SVG */}
            <button onClick={handleSaveImage} disabled={savingImg} className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 hover:from-purple-800/50 hover:to-pink-800/50 border border-purple-500/30 hover:border-pink-400/50 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                {savingImg
                  ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : (
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1.5" fill="white" stroke="none" />
                    </svg>
                  )}
              </div>
              <span className="text-[10px] font-mono font-bold text-pink-300">{savingImg ? '저장 중...' : '이미지 저장'}</span>
            </button>

            {/* 링크 복사 */}
            <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl bg-void-900 hover:bg-void-800 border border-white/10 hover:border-amber-400/40 transition-all hover:scale-105 active:scale-95 cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                {copyDone ? <Check size={15} className="text-emerald-400" /> : <Link2 size={15} className="text-amber-300" />}
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300">{copyDone ? '복사 완료!' : '링크 복사'}</span>
            </button>
          </div>
          <p className="text-[10px] font-mono text-slate-600 text-center">인스타그램: 이미지 저장 후 스토리/피드에 업로드하세요</p>
        </div>

        {/* 요약 */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-void-950/80 border border-white/5">
          <div className="flex items-center gap-1.5">
            <Star size={12} className="text-amber-400" />
            <span className="text-[11px] font-mono text-slate-400">내 수집 현황</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-300">{uniqueCardCount}장 · {collectionRate}% · {rankText}</span>
        </div>
      </motion.div>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl bg-void-900 border border-pink-500/40 text-white text-xs font-mono font-bold shadow-2xl whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
