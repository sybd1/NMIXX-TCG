// 포트폴리오용 분석·성능 기록 계약 (specs/026-portfolio-analytics plan 3절, DEC-034·035)
// 컬렉션: nmixx_tcg_metrics. 권한은 firestore.rules. 로그인하지 않은 방문자도 쓴다.

export type MetricEventType =
  | 'visit'
  | 'screen'
  | 'session_end'
  | 'pack'
  | 'vitals'
  | 'pack3d'
  | 'error'
  | 'identify';

export const METRIC_EVENT_TYPES: readonly MetricEventType[] = [
  'visit',
  'screen',
  'session_end',
  'pack',
  'vitals',
  'pack3d',
  'error',
  'identify',
];

export type ScreenName =
  | 'home'
  | 'collection'
  | 'achievements'
  | 'ranking'
  | 'settings'
  | 'patch-notes'
  | 'opening';

export type DeviceKind = 'mobile' | 'desktop';

export interface MetricDataMap {
  visit: { first: boolean; device: DeviceKind; loggedIn: boolean };
  screen: { to: ScreenName; from: ScreenName };
  session_end: { durationMs: number; lastScreen: ScreenName };
  pack: { packId: string; packCount: number; owned: number; total: number; rarities: Record<string, number> };
  vitals: { device: DeviceKind; lcp: number | null; inp: number | null; cls: number | null };
  pack3d: { mode: '3d' | '2d'; readyMs: number | null; avgFps: number | null; frames: number };
  error: { kind: 'error' | 'rejection' | 'react'; message: string; screen: ScreenName; version: string };
  identify: Record<string, never>;
}

/** Firestore 문서 (문서 ID 자동). 이메일·닉네임은 넣지 않는다 */
export interface MetricDoc<T extends MetricEventType = MetricEventType> {
  /** 방문자 ID: 'v_' + 소문자·숫자·_ 6~36자. localStorage에 둔다 */
  vid: string;
  /** 페이지를 열 때마다 새 값, 최대 40자 */
  sid: string;
  type: T;
  /** serverTimestamp() — 규칙에서 request.time과 같아야 한다 */
  at: unknown;
  /** 'YYYY-MM-DD' (Date.now() + 9h) */
  kstDate: string;
  /** 키 8개 이하 */
  data: MetricDataMap[T];
  /** identify에만: 작성자 본인 계정 ID (goog_… / kakao_…) */
  uid?: string;
}

export const METRICS_COLLECTION = 'nmixx_tcg_metrics';
export const VISITOR_ID_KEY = 'nmixx_visitor_id';
/** 세션당 오류 기록 상한 (AC-14) */
export const METRIC_ERROR_CAP_PER_SESSION = 5;
/** 세션당 3D 성능 기록 상한 — 홈 화면은 3D 팩을 여러 개 띄운다 (plan 5절 비용) */
export const METRIC_PACK3D_CAP_PER_SESSION = 10;
/** 오류 메시지 최대 길이 (AC-13). firestore.rules와 같은 값 */
export const METRIC_ERROR_MESSAGE_MAX = 200;
/** 운영자 화면 1회 읽기 상한. 조회는 +1건을 요청해 넘는지 판단한다 */
export const ADMIN_METRICS_FETCH_LIMIT = 5000;
/** 운영자 화면을 열 때 1회 정리 상한 (보관 기간은 ACTIVITY_RETENTION_DAYS, DEC-033) */
export const METRICS_PURGE_LIMIT = 400;
