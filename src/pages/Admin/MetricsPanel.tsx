// 운영자 지표 탭 — 포트폴리오용 이용자 분석·성능·오류 (specs/026 REQ-07, 읽기 전용 + 1년 지난 기록 정리)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RARITY_CONFIGS } from '../../config/gameConfig';
import { formatKst, rangeStartMs, type AdminRange } from '../../services/adminLog';
import { fetchMetricsSince, purgeOldMetrics } from '../../services/adminMetricsService';
import { computeMetrics, type AnalysisEvent, type Dist, type Rate } from '../../services/metricsAnalysis';
import { ADMIN_METRICS_FETCH_LIMIT, type ScreenName } from '../../types/metrics';

type Phase = 'loading' | 'ready' | 'error';

const RANGES: { id: AdminRange; label: string }[] = [
  { id: 'today', label: '오늘' },
  { id: '7d', label: '7일' },
  { id: '30d', label: '30일' },
];

const SCREEN_LABEL: Record<ScreenName, string> = {
  home: '홈(팩)',
  collection: '도감',
  achievements: '업적',
  ranking: '랭킹',
  settings: '정보',
  'patch-notes': '패치노트',
  opening: '팩 개봉 화면',
};

const ERROR_KIND_LABEL: Record<string, string> = { error: '오류', rejection: '처리 안 된 약속(Promise)', react: '3D 화면 오류' };

const th = 'px-2 py-1.5 text-left font-semibold text-slate-300 whitespace-nowrap';
const td = 'px-2 py-1.5 whitespace-nowrap';

const PROBABILITIES: Record<string, number> = Object.fromEntries(
  Object.entries(RARITY_CONFIGS).map(([k, v]) => [k, v.probability]),
);

const pct = (v: number | null, digits = 1) => (v === null ? '—' : `${(v * 100).toFixed(digits)}%`);

function duration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 ${s % 60}초`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

const Insufficient: React.FC<{ reason: string | null }> = ({ reason }) => (
  <span className="text-amber-300">데이터 부족{reason ? ` (${reason})` : ''}</span>
);

const RateCell: React.FC<{ r: Rate; fmt: (v: number) => string }> = ({ r, fmt }) =>
  r.value === null ? <Insufficient reason={r.reason} /> : <span>{fmt(r.value)} <span className="text-slate-400">(n={r.n})</span></span>;

const DistCells: React.FC<{ d: Dist; fmt: (v: number) => string }> = ({ d, fmt }) =>
  d.n === 0 ? (
    <td className={td} colSpan={3}><Insufficient reason="표본 0" /></td>
  ) : (
    <>
      <td className={td}>{fmt(d.median!)}</td>
      <td className={td}>{fmt(d.p75!)}</td>
      <td className={td}>{d.n}</td>
    </>
  );

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="mb-2 font-semibold">{title}</h3>
    <div className="overflow-x-auto rounded-lg bg-slate-900">{children}</div>
  </section>
);

export const MetricsPanel: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [range, setRange] = useState<AdminRange>('7d');
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [capped, setCapped] = useState(false);
  const [loadedAt, setLoadedAt] = useState(Date.now());

  const load = useCallback(async (r: AdminRange) => {
    setPhase('loading');
    try {
      const now = Date.now();
      const res = await fetchMetricsSince(rangeStartMs(r, now));
      setEvents(res.events);
      setCapped(res.capped);
      setLoadedAt(now);
      setPhase('ready');
    } catch (e) {
      console.warn('[Admin] metrics load failed:', (e as { code?: string })?.code || e);
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load('7d');
    void purgeOldMetrics(Date.now()); // 1년 지난 기록 정리 (DEC-035), 기다리지 않는다
  }, [load]);

  const report = useMemo(() => computeMetrics(events, loadedAt, PROBABILITIES), [events, loadedAt]);

  const changeRange = (r: AdminRange) => {
    setRange(r);
    load(r);
  };

  const ms = (v: number) => `${Math.round(v).toLocaleString('en-US')}ms`;
  const cls = (v: number) => v.toFixed(3);
  const fpsFmt = (v: number) => `${v.toFixed(1)}fps`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={phase === 'loading'}
            onClick={() => changeRange(r.id)}
            className={`rounded-md px-3 py-1.5 disabled:opacity-50 ${range === r.id ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {r.label}
          </button>
        ))}
        {phase === 'ready' && (
          <span className="ml-auto text-xs text-slate-400">
            기록 {report.eventCount.toLocaleString('en-US')}건 · {formatKst(loadedAt)} 기준(KST)
          </span>
        )}
      </div>

      {phase === 'loading' && <p className="text-slate-400">불러오는 중…</p>}

      {phase === 'error' && (
        <div className="rounded-lg bg-red-950/60 p-4 flex items-center gap-3">
          <span>기록을 불러오지 못했습니다.</span>
          <button type="button" onClick={() => load(range)} className="rounded-md bg-slate-700 px-3 py-1.5">다시 시도</button>
        </div>
      )}

      {phase === 'ready' && capped && (
        <p className="rounded-lg bg-amber-950/60 p-3 text-amber-200">
          최근 {ADMIN_METRICS_FETCH_LIMIT.toLocaleString('en-US')}건만 계산합니다. 기간을 줄여 주세요.
        </p>
      )}

      {phase === 'ready' && events.length === 0 && (
        <p className="rounded-lg bg-slate-900 p-4 text-slate-300">이 기간에 기록이 없습니다.</p>
      )}

      {phase === 'ready' && events.length > 0 && (
        <>
          <h2 className="text-base font-bold">이용자 분석</h2>

          <Section title="방문자">
            <table className="w-full">
              <tbody>
                <tr className="border-t border-slate-800 first:border-0"><td className={td}>방문자(브라우저)</td><td className={td}>{report.users.visitors}</td></tr>
                <tr className="border-t border-slate-800"><td className={td}>신규 방문자</td><td className={td}>{report.users.newVisitors} <span className="text-slate-400">(그중 로그인 {report.users.newLoggedIn})</span></td></tr>
                <tr className="border-t border-slate-800"><td className={td}>D1 재방문율</td><td className={td}><RateCell r={report.users.d1} fmt={(v) => pct(v)} /></td></tr>
                <tr className="border-t border-slate-800"><td className={td}>D7 재방문율</td><td className={td}><RateCell r={report.users.d7} fmt={(v) => pct(v)} /></td></tr>
                <tr className="border-t border-slate-800"><td className={td}>첫 팩까지 시간(중앙값)</td><td className={td}><RateCell r={report.users.firstPackMs} fmt={duration} /></td></tr>
              </tbody>
            </table>
          </Section>

          <Section title={`세션 ${report.sessions.count}개 · 종료 기록 없음 ${report.sessions.noEnd}개`}>
            <table className="w-full">
              <thead><tr><th className={th}>머문 시간</th>{report.sessions.buckets.map((b) => <th key={b.label} className={th}>{b.label}</th>)}</tr></thead>
              <tbody>
                <tr className="border-t border-slate-800">
                  <td className={td}>중앙값 {duration(report.sessions.median)} · 75% {duration(report.sessions.p75)}</td>
                  {report.sessions.buckets.map((b) => <td key={b.label} className={td}>{b.count}</td>)}
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="화면 이동과 이탈">
            <table className="w-full">
              <thead><tr><th className={th}>화면</th><th className={th}>들어간 수</th><th className={th}>마지막으로 본 세션</th></tr></thead>
              <tbody>
                {report.screens.entries.map((s) => (
                  <tr key={s.screen} className="border-t border-slate-800">
                    <td className={td}>{SCREEN_LABEL[s.screen] ?? s.screen}</td>
                    <td className={td}>{s.count}</td>
                    <td className={td}>{report.screens.lastScreen.find((l) => l.screen === s.screen)?.count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="도감 수집 속도 (신규 방문자, 첫 방문 기준)">
            <table className="w-full">
              <thead><tr><th className={th}>경과</th><th className={th}>수집률 중앙값</th><th className={th}>표본(팩 개봉)</th></tr></thead>
              <tbody>
                {report.collection.map((b) => (
                  <tr key={b.label} className="border-t border-slate-800">
                    <td className={td}>{b.label}</td>
                    <td className={td}>{b.n === 0 ? <Insufficient reason={null} /> : pct(b.median)}</td>
                    <td className={td}>{b.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={`등급 비율 (카드 ${report.rarity.total.toLocaleString('en-US')}장)`}>
            <table className="w-full">
              <thead><tr><th className={th}>등급</th><th className={th}>실제</th><th className={th}>설정 확률</th><th className={th}>장수</th></tr></thead>
              <tbody>
                {report.rarity.rows.map((r) => (
                  <tr key={r.rarity} className="border-t border-slate-800">
                    <td className={td}>{r.rarity}</td>
                    <td className={td}>{report.rarity.total === 0 ? '—' : pct(r.actual, 2)}</td>
                    <td className={td}>{pct(r.expected, 2)}</td>
                    <td className={td}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <h2 className="text-base font-bold pt-2">성능</h2>

          <Section title="첫 화면 로딩 (Web Vitals)">
            <table className="w-full">
              <thead><tr><th className={th}>기기</th><th className={th}>지표</th><th className={th}>중앙값</th><th className={th}>75%</th><th className={th}>표본</th></tr></thead>
              <tbody>
                {(['all', 'mobile', 'desktop'] as const).flatMap((dev) =>
                  ([['lcp', 'LCP(가장 큰 요소 표시)', ms], ['inp', 'INP(입력 반응)', ms], ['cls', 'CLS(화면 밀림)', cls]] as const).map(([k, label, fmt]) => (
                    <tr key={`${dev}-${k}`} className="border-t border-slate-800">
                      <td className={td}>{dev === 'all' ? '전체' : dev === 'mobile' ? '모바일' : '데스크톱'}</td>
                      <td className={td}>{label}</td>
                      <DistCells d={report.vitals[dev][k]} fmt={fmt} />
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </Section>

          <Section title={`3D 팩 화면 (3D ${report.pack3d.n3d} · 2D 대체 ${report.pack3d.n2d}, 대체 비율 ${pct(report.pack3d.ratio2d)})`}>
            <table className="w-full">
              <thead><tr><th className={th}>지표</th><th className={th}>중앙값</th><th className={th}>75%</th><th className={th}>표본</th></tr></thead>
              <tbody>
                <tr className="border-t border-slate-800"><td className={td}>준비 시간(첫 화면까지)</td><DistCells d={report.pack3d.readyMs} fmt={ms} /></tr>
                <tr className="border-t border-slate-800"><td className={td}>평균 프레임</td><DistCells d={report.pack3d.avgFps} fmt={fpsFmt} /></tr>
              </tbody>
            </table>
          </Section>

          <h2 className="text-base font-bold pt-2">오류 ({report.errors.total}건)</h2>
          {report.errors.rows.length === 0 ? (
            <p className="rounded-lg bg-slate-900 p-4 text-slate-300">이 기간에 기록된 오류가 없습니다.</p>
          ) : (
            <Section title="종류별">
              <table className="w-full">
                <thead><tr><th className={th}>종류</th><th className={th}>메시지</th><th className={th}>횟수</th><th className={th}>방문자</th><th className={th}>마지막</th></tr></thead>
                <tbody>
                  {report.errors.rows.map((r) => (
                    <tr key={`${r.kind}|${r.message}`} className="border-t border-slate-800">
                      <td className={td}>{ERROR_KIND_LABEL[r.kind] ?? r.kind}</td>
                      <td className="px-2 py-1.5 max-w-md break-all">{r.message}</td>
                      <td className={td}>{r.count}</td>
                      <td className={td}>{r.visitors}</td>
                      <td className={td}>{formatKst(r.lastAtMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </>
      )}
    </div>
  );
};

export default MetricsPanel;
