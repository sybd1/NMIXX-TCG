// 운영자용 행동 로그 조회 화면 — 숨김 주소 /#admin, 읽기 전용 (specs/025)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ACTIVITY_EVENT_TYPES, type ActivityEventType } from '../../types/activity';
import {
  ADMIN_FETCH_LIMIT,
  EVENT_TYPE_LABELS,
  describeEvent,
  filterByType,
  formatKst,
  rangeStartMs,
  summarizeByDay,
  summarizeMembers,
  type AdminEvent,
  type AdminRange,
} from '../../services/adminLog';
import { currentUserIsAdmin, fetchEventsSince, fetchNicknames } from '../../services/adminLogService';

type Phase = 'checking' | 'denied' | 'loading' | 'ready' | 'error';

const RANGES: { id: AdminRange; label: string }[] = [
  { id: 'today', label: '오늘' },
  { id: '7d', label: '7일' },
  { id: '30d', label: '30일' },
];

const PROVIDER_LABEL = { google: '구글', kakao: '카카오', other: '기타' } as const;

const th = 'px-2 py-1.5 text-left font-semibold text-slate-300 whitespace-nowrap';
const td = 'px-2 py-1.5 whitespace-nowrap';

export const AdminPage: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('checking');
  const [range, setRange] = useState<AdminRange>('7d');
  const [typeFilter, setTypeFilter] = useState<ActivityEventType | 'all'>('all');
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [capped, setCapped] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async (r: AdminRange) => {
    setPhase('loading');
    try {
      const res = await fetchEventsSince(rangeStartMs(r, Date.now()));
      setEvents(res.events);
      setCapped(res.capped);
      setPhase('ready');
      const uids = [...new Set(res.events.map((e) => e.uid))];
      fetchNicknames(uids).then(setNames);
    } catch (e) {
      console.warn('[Admin] load failed:', (e as { code?: string })?.code || e);
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    document.title = '행동 로그 (운영자)';
    currentUserIsAdmin().then((ok) => {
      if (ok) load('7d');
      else setPhase('denied');
    });
  }, [load]);

  const filtered = useMemo(() => filterByType(events, typeFilter), [events, typeFilter]);
  const days = useMemo(() => summarizeByDay(filtered), [filtered]);
  const members = useMemo(() => summarizeMembers(filtered), [filtered]);
  const detail = useMemo(() => (selected ? filtered.filter((e) => e.uid === selected) : []), [filtered, selected]);

  const nameOf = (uid: string) => names[uid] || uid;

  const changeRange = (r: AdminRange) => {
    setRange(r);
    setSelected(null);
    load(r);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 text-sm">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">행동 로그 (운영자)</h1>
          <a href="/" className="text-xs text-slate-400 underline">게임으로 돌아가기</a>
        </header>

        {phase === 'checking' && <p className="text-slate-400">확인 중…</p>}

        {phase === 'denied' && (
          <p className="rounded-lg bg-slate-900 p-4 text-slate-300">운영자 계정으로 로그인한 뒤 다시 열어 주세요.</p>
        )}

        {(phase === 'loading' || phase === 'ready' || phase === 'error') && (
          <>
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
              <label className="ml-auto flex items-center gap-2 text-slate-300">
                종류
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ActivityEventType | 'all')}
                  className="rounded-md bg-slate-800 px-2 py-1.5 text-slate-100"
                >
                  <option value="all">전체</option>
                  {ACTIVITY_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
            </div>

            {phase === 'loading' && <p className="text-slate-400">불러오는 중…</p>}

            {phase === 'error' && (
              <div className="rounded-lg bg-red-950/60 p-4 flex items-center gap-3">
                <span>기록을 불러오지 못했습니다.</span>
                <button type="button" onClick={() => load(range)} className="rounded-md bg-slate-700 px-3 py-1.5">다시 시도</button>
              </div>
            )}

            {phase === 'ready' && (
              <>
                {capped && (
                  <p className="rounded-lg bg-amber-950/60 p-3 text-amber-200">
                    최근 {ADMIN_FETCH_LIMIT.toLocaleString('en-US')}건만 표시합니다. 기간을 줄여 주세요.
                  </p>
                )}

                {filtered.length === 0 ? (
                  <p className="rounded-lg bg-slate-900 p-4 text-slate-300">이 기간에 기록이 없습니다.</p>
                ) : (
                  <>
                    <section>
                      <h2 className="mb-2 font-semibold">날짜별 요약</h2>
                      <div className="overflow-x-auto rounded-lg bg-slate-900">
                        <table className="w-full">
                          <thead><tr>
                            <th className={th}>날짜(KST)</th><th className={th}>접속 회원</th><th className={th}>로그인</th><th className={th}>팩 개봉</th><th className={th}>보상 수령</th>
                          </tr></thead>
                          <tbody>
                            {days.map((d) => (
                              <tr key={d.kstDate} className="border-t border-slate-800">
                                <td className={td}>{d.kstDate}</td><td className={td}>{d.activeUsers}</td><td className={td}>{d.logins}</td><td className={td}>{d.packs}</td><td className={td}>{d.rewards}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section>
                      <h2 className="mb-2 font-semibold">회원 ({members.length}명)</h2>
                      <div className="overflow-x-auto rounded-lg bg-slate-900">
                        <table className="w-full">
                          <thead><tr>
                            <th className={th}>닉네임</th><th className={th}>계정</th><th className={th}>이벤트</th><th className={th}>팩 개봉</th><th className={th}>마지막 활동</th>
                          </tr></thead>
                          <tbody>
                            {members.map((m) => (
                              <tr
                                key={m.uid}
                                onClick={() => setSelected(selected === m.uid ? null : m.uid)}
                                className={`border-t border-slate-800 cursor-pointer hover:bg-slate-800 ${selected === m.uid ? 'bg-slate-800' : ''}`}
                              >
                                <td className={td} title={m.uid}>{nameOf(m.uid)}</td>
                                <td className={td}>{PROVIDER_LABEL[m.provider]}</td>
                                <td className={td}>{m.events}</td>
                                <td className={td}>{m.packs}</td>
                                <td className={td}>{formatKst(m.lastAtMs)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {selected && (
                      <section>
                        <h2 className="mb-2 font-semibold">
                          {nameOf(selected)} <span className="text-xs font-normal text-slate-400">{selected}</span>
                        </h2>
                        <div className="overflow-x-auto rounded-lg bg-slate-900">
                          <table className="w-full">
                            <thead><tr><th className={th}>시각(KST)</th><th className={th}>종류</th><th className={th}>내용</th></tr></thead>
                            <tbody>
                              {detail.map((e) => (
                                <tr key={e.id} className="border-t border-slate-800">
                                  <td className={td}>{formatKst(e.atMs)}</td>
                                  <td className={td}>{EVENT_TYPE_LABELS[e.type] ?? e.type}</td>
                                  <td className={td}>{describeEvent(e)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
