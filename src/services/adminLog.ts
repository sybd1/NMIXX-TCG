// 운영자 조회 화면의 순수 로직 — Firebase를 import하지 않는다 (specs/025 plan 3절)
import type { ActivityEventType } from '../types/activity';

export type AdminRange = 'today' | '7d' | '30d';

/** 한 번에 불러오는 최대 이벤트 수 (AC-10). 조회는 +1건을 요청해 넘는지 판단한다 */
export const ADMIN_FETCH_LIMIT = 2000;

export interface AdminEvent {
  id: string;
  uid: string;
  type: ActivityEventType;
  atMs: number;
  kstDate: string;
  data: Record<string, unknown>;
}

export interface DaySummary {
  kstDate: string;
  activeUsers: number;
  logins: number;
  packs: number;
  rewards: number;
}

export interface MemberSummary {
  uid: string;
  provider: 'google' | 'kakao' | 'other';
  events: number;
  packs: number;
  lastAtMs: number;
}

export const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  session_start: '접속',
  login: '로그인',
  logout: '로그아웃',
  pack_open: '팩 개봉',
  set_reward: '세트 보상',
  achievement: '업적 보상',
  xr_card: 'XR 카드',
  coupon: '쿠폰',
  mail: '우편',
};

const REWARD_TYPES: ReadonlySet<ActivityEventType> = new Set(['set_reward', 'achievement', 'xr_card', 'coupon', 'mail']);

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<AdminRange, number> = { today: 1, '7d': 7, '30d': 30 };

/** 기간 시작 = (오늘 포함 N일 전) KST 자정 */
export function rangeStartMs(range: AdminRange, nowMs: number): number {
  const kstMidnight = Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
  return kstMidnight - (RANGE_DAYS[range] - 1) * DAY_MS;
}

/** 'MM-DD HH:mm' (KST) */
export function formatKst(ms: number): string {
  const iso = new Date(ms + KST_OFFSET_MS).toISOString();
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
}

export function capEvents(events: AdminEvent[]): { events: AdminEvent[]; capped: boolean } {
  return events.length > ADMIN_FETCH_LIMIT
    ? { events: events.slice(0, ADMIN_FETCH_LIMIT), capped: true }
    : { events, capped: false };
}

export function filterByType(events: AdminEvent[], type: ActivityEventType | 'all'): AdminEvent[] {
  return type === 'all' ? events : events.filter((e) => e.type === type);
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function packCount(e: AdminEvent): number {
  return e.type === 'pack_open' ? num(e.data.packCount) : 0;
}

export function summarizeByDay(events: AdminEvent[]): DaySummary[] {
  const days = new Map<string, DaySummary & { users: Set<string> }>();
  for (const e of events) {
    let d = days.get(e.kstDate);
    if (!d) {
      d = { kstDate: e.kstDate, activeUsers: 0, logins: 0, packs: 0, rewards: 0, users: new Set() };
      days.set(e.kstDate, d);
    }
    d.users.add(e.uid);
    if (e.type === 'login') d.logins += 1;
    d.packs += packCount(e);
    if (REWARD_TYPES.has(e.type)) d.rewards += 1;
  }
  return [...days.values()]
    .sort((a, b) => (a.kstDate < b.kstDate ? 1 : a.kstDate > b.kstDate ? -1 : 0))
    .map(({ users, ...rest }) => ({ ...rest, activeUsers: users.size }));
}

function providerOf(uid: string): MemberSummary['provider'] {
  if (uid.startsWith('goog_')) return 'google';
  if (uid.startsWith('kakao_')) return 'kakao';
  return 'other';
}

export function summarizeMembers(events: AdminEvent[]): MemberSummary[] {
  const members = new Map<string, MemberSummary>();
  for (const e of events) {
    let m = members.get(e.uid);
    if (!m) {
      m = { uid: e.uid, provider: providerOf(e.uid), events: 0, packs: 0, lastAtMs: 0 };
      members.set(e.uid, m);
    }
    m.events += 1;
    m.packs += packCount(e);
    if (e.atMs > m.lastAtMs) m.lastAtMs = e.atMs;
  }
  return [...members.values()].sort((a, b) => b.lastAtMs - a.lastAtMs);
}

const won = (v: unknown) => `${num(v).toLocaleString('en-US')}코인`;
const str = (v: unknown) => (typeof v === 'string' && v ? v : '?');

/** 이벤트 부가 정보 한 줄 (AC-07) */
export function describeEvent(e: AdminEvent): string {
  const d = e.data || {};
  switch (e.type) {
    case 'pack_open': {
      const rar = d.rarities && typeof d.rarities === 'object' ? (d.rarities as Record<string, unknown>) : {};
      const parts = Object.entries(rar)
        .map(([k, v]) => [k, num(v)] as const)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`);
      return [`${str(d.packId)} ${num(d.packCount)}팩`, won(d.cost), ...(parts.length ? [parts.join(', ')] : [])].join(' · ');
    }
    case 'login':
      return d.provider === 'kakao' ? '카카오' : d.provider === 'google' ? '구글' : '';
    case 'set_reward':
      return `${str(d.setId)} · ${won(d.coins)}`;
    case 'achievement':
      return `${str(d.achievementId)} · ${won(d.coins)}`;
    case 'xr_card':
      return str(d.cardId);
    case 'coupon':
      return `${str(d.code)} · ${won(d.coins)}`;
    case 'mail':
      return `${str(d.mailId)} · ${won(d.coins)}`;
    default:
      return '';
  }
}
