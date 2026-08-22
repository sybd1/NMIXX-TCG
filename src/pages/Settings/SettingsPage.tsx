import React, { useState } from 'react';
import { GameState } from '../../types/game';
import { RARITY_CONFIGS, GAME_CONFIG, FINISH_CONFIGS } from '../../config/gameConfig';
import { MASTER_CARDS } from '../../data/cards';
import { Rarity } from '../../types/card';
import { Info, Volume2, VolumeX, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';

interface SettingsPageProps {
  state: GameState;
  onToggleSound: () => void;
  onResetGame: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  state,
  onToggleSound,
  onResetGame,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const totalCollectedCards = Object.values(state.collection).reduce((sum, c) => sum + c, 0);
  const uniqueCollectedCards = Object.keys(state.collection).filter(id => (state.collection[id] || 0) > 0).length;
  const totalMasterCardsCount = MASTER_CARDS.length; // 전체 651종
  const completionPercentage = Math.round((uniqueCollectedCards / totalMasterCardsCount) * 100);

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-void-900/80 border border-void-800 p-6 rounded-3xl backdrop-blur-md">
        <h1 className="font-serif text-2xl md:text-3xl font-black text-slate-100 mb-1 flex items-center gap-2">
          <Info className="text-pink-400" />
          INFORMATION
        </h1>
        <p className="text-xs font-mono text-slate-400">
          NMIXX TCG 공식 시스템 안내, 도감 정보 및 확률 테이블
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-void-900/90 border border-void-800 p-4 rounded-2xl flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">개봉한 팩</span>
          <span className="font-mono text-xl font-bold text-slate-100">
            {state.openedPacksTotal} PACKS
          </span>
        </div>
        <div className="bg-void-900/90 border border-void-800 p-4 rounded-2xl flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">수집한 고유 카드</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-purple-300">
              {uniqueCollectedCards} / {totalMasterCardsCount}
            </span>
            <span className="text-[10px] font-mono text-pink-400 font-extrabold">
              ({completionPercentage}%)
            </span>
          </div>
        </div>
        <div className="bg-void-900/90 border border-void-800 p-4 rounded-2xl flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">총 소지 카드 수</span>
          <span className="font-mono text-xl font-bold text-amber-300">
            {totalCollectedCards} 장
          </span>
        </div>
        <div className="bg-void-900/90 border border-void-800 p-4 rounded-2xl flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">Pity 게이지</span>
          <span className="font-mono text-xl font-bold text-cyan-300">
            {state.pityCount} / {GAME_CONFIG.PITY_THRESHOLD}
          </span>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="bg-void-900/80 border border-void-800 p-6 rounded-3xl flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-serif font-bold text-slate-200 text-sm">
            오디오 사운드 효과
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Web Audio API 기반 자체 내장 효과음 켜기/끄기
          </span>
        </div>

        <button
          onClick={onToggleSound}
          className={`p-3 rounded-2xl border transition-all flex items-center gap-2 font-mono text-xs font-bold ${
            state.soundMuted
              ? 'bg-void-950 border-void-800 text-slate-500'
              : 'bg-purple-600/30 border-purple-500/50 text-purple-200 shadow-md shadow-purple-950/50'
          }`}
        >
          {state.soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>{state.soundMuted ? 'MUTED' : 'ENABLED'}</span>
        </button>
      </div>

      {/* Rarity & Drop Rate Table */}
      <div className="bg-void-900/80 border border-void-800 p-6 rounded-3xl">
        <h3 className="font-serif font-bold text-slate-200 text-sm mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          공식 카드팩 레어도 및 봉입률
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-void-800 text-slate-500 pb-2">
                <th className="py-2.5">RARITY (레어도)</th>
                <th className="py-2.5">가공 (FOIL & FINISH)</th>
                <th className="py-2.5">봉입률 (%)</th>
                <th className="py-2.5">시각 셰이더 스펙</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-void-800/60 text-slate-300">
              {(['C', 'UC', 'R', 'SR', 'SSR', 'UR', 'LR', 'MR'] as Rarity[]).map(r => {
                const conf = RARITY_CONFIGS[r];
                const finishConf = FINISH_CONFIGS[conf.finishType];
                const pct = (conf.probability * 100).toFixed(2);
                return (
                  <tr key={r} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-bold flex items-center gap-2.5">
                      {/* 젤 앞의 멋있는 프리미엄 Rarity 엠블럼 뱃지 */}
                      <span
                        className={`inline-flex items-center justify-center min-w-[38px] px-2 py-0.5 rounded-md text-[10.5px] font-black tracking-wider border shadow-md ${conf.badgeBg}`}
                      >
                        {r}
                      </span>
                      <span className="text-slate-200 font-serif font-bold text-[12px]">
                        {conf.label.replace(/^[A-Z]+\s+/, '')}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-pink-300 text-[11.5px]">
                      {finishConf?.nameKo || conf.finishType}
                    </td>
                    <td className="py-3 font-black text-amber-300 text-[12.5px]">{pct}%</td>
                    <td className="py-3 text-slate-400 text-[11px] font-sans">
                      {finishConf?.visualSpec || '표준 카드 가공'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Game Section */}
      <div className="bg-void-900/80 border border-rose-950/60 p-6 rounded-3xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-serif font-bold text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-400" />
              게임 데이터 완전 초기화 (RESET GAME)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              모든 컬렉션 및 진행 상황을 초기화하고 기본 5만원 (50,000 COIN)으로 다시 시작합니다.
            </span>
          </div>

          <button
            onClick={() => setShowConfirmReset(true)}
            className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>초기화</span>
          </button>
        </div>

        {/* Confirmation modal */}
        {showConfirmReset && (
          <div className="bg-void-950 p-4 rounded-2xl border border-rose-500/30 flex flex-col gap-3">
            <p className="text-xs text-rose-200 font-serif">
              정말로 모든 진행 상황을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg bg-void-800 text-slate-400 text-xs font-mono"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onResetGame();
                  setShowConfirmReset(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono"
              >
                확인 및 초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
