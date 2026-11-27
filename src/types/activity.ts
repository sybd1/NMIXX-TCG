// 이용자 행동 로그 계약 (specs/024-activity-log plan 3절, DEC-031)
// 컬렉션: nmixx_tcg_events. 권한은 firestore.rules, 인덱스는 firestore.indexes.json

export type ActivityEventType =
  | 'session_start'
  | 'login'
  | 'logout'
  | 'pack_open'
  | 'set_reward'
  | 'achievement'
  | 'xr_card'
  | 'coupon'
  | 'mail';

export const ACTIVITY_EVENT_TYPES: readonly ActivityEventType[] = [
  'session_start',
  'login',
  'logout',
  'pack_open',
  'set_reward',
  'achievement',
  'xr_card',
  'coupon',
  'mail',
];

export interface ActivityEventDataMap {
  session_start: Record<string, never>;
  login: { provider: 'google' | 'kakao' };
  logout: Record<string, never>;
  pack_open: { packId: string; packCount: number; cost: number; rarities: Record<string, number> };
  set_reward: { setId: string; coins: number };
  achievement: { achievementId: string; coins: number };
  xr_card: { cardId: string };
  coupon: { code: string; coins: number };
  mail: { mailId: string; coins: number };
}

/** Firestore 문서 (문서 ID 자동). 이메일·닉네임은 넣지 않는다 */
export interface ActivityEventDoc<T extends ActivityEventType = ActivityEventType> {
  /** 계정 ID (goog_… / kakao_…) — 작성자 본인 */
  uid: string;
  type: T;
  /** serverTimestamp() — 규칙에서 request.time과 같아야 한다 */
  at: unknown;
  /** 'YYYY-MM-DD' (Date.now() + 9h) */
  kstDate: string;
  /** 페이지를 열 때마다 새 값, 최대 40자 */
  sessionId: string;
  /** 키 8개 이하 */
  data: ActivityEventDataMap[T];
}

export const ACTIVITY_COLLECTION = 'nmixx_tcg_events';
/** 보관 기간 1년 (DEC-033, 처음 90일) */
export const ACTIVITY_RETENTION_DAYS = 365;
export const ACTIVITY_PURGE_LIMIT = 100;
