// 분석·성능 기록 — Firebase를 import하지 않는 순수 로직 (specs/026 plan 2절, DEC-034)
// 실제 Firestore 연결과 브라우저 리스너는 metricsService.ts가 맡는다.
import { kstDateString } from './activityLog';
import {
  METRIC_ERROR_CAP_PER_SESSION,
  METRIC_ERROR_MESSAGE_MAX,
  METRIC_PACK3D_CAP_PER_SESSION,
  type MetricDataMap,
  type MetricDoc,
  type MetricEventType,
  type ScreenName,
} from '../types/metrics';

export interface MetricsDeps {
  /** localhost(개발 서버, 운영 Firestore 연결)면 참 — 기록하지 않는다 (DEC-017) */
  isLocal(): boolean;
  now(): number;
  sessionId: string;
  /** 방문자 ID와 이번에 새로 만들었는지 */
  visitor(): { id: string; first: boolean };
  /** at(serverTimestamp)을 붙여 쓴다 */
  addMetric(doc: Omit<MetricDoc, 'at'>): Promise<unknown>;
}

export interface MetricsLogger {
  visit(data: Omit<MetricDataMap['visit'], 'first'>): void;
  screen(to: ScreenName): void;
  currentScreen(): ScreenName;
  sessionEnd(): void;
  pack(data: MetricDataMap['pack']): void;
  /** 세션당 한 번 */
  vitals(data: MetricDataMap['vitals']): void;
  pack3d(data: MetricDataMap['pack3d']): void;
  error(kind: MetricDataMap['error']['kind'], rawMessage: string, version: string): void;
  identify(uid: string): void;
}

const EMAIL_RE = /[^\s@'"<>()]+@[^\s@'"<>()]+\.[^\s@'"<>()]+/g;
const ACCOUNT_RE = /\b(?:goog|kakao)_[A-Za-z0-9_-]+/g;

/** 이메일·계정 ID를 가리고 공백을 줄여 METRIC_ERROR_MESSAGE_MAX자로 자른다 (AC-13) */
export function sanitizeErrorMessage(raw: string): string {
  return String(raw ?? '')
    .replace(EMAIL_RE, '***')
    .replace(ACCOUNT_RE, '***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, METRIC_ERROR_MESSAGE_MAX);
}

export function createMetricsLogger(deps: MetricsDeps): MetricsLogger {
  const startMs = deps.now();
  let screen: ScreenName = 'home';
  let visitor: { id: string; first: boolean } | null = null;
  let vitalsSent = false;
  let inError = false;
  const errorKeys = new Set<string>();
  let errorCount = 0;
  let pack3dCount = 0;

  const getVisitor = () => (visitor ??= deps.visitor());

  /** 기다리지 않는 기록. 어떤 실패도 밖으로 던지지 않고, 기록 실패는 오류 기록을 만들지 않는다 (AC-03, AC-15) */
  function write<T extends MetricEventType>(type: T, data: MetricDataMap[T], uid?: string): void {
    try {
      if (deps.isLocal()) return;
      const doc: Omit<MetricDoc, 'at'> = {
        vid: getVisitor().id,
        sid: deps.sessionId,
        type,
        kstDate: kstDateString(deps.now()),
        data,
        ...(uid ? { uid } : {}),
      };
      deps.addMetric(doc).catch((e) => console.warn(`[Metrics] ${type} not recorded:`, e?.code || e?.message || e));
    } catch (e) {
      console.warn(`[Metrics] ${type} not recorded:`, e);
    }
  }

  return {
    visit(data) {
      try {
        if (deps.isLocal()) return;
        write('visit', { first: getVisitor().first, ...data });
      } catch (e) {
        console.warn('[Metrics] visit not recorded:', e);
      }
    },

    screen(to) {
      if (to === screen) return; // AC-02
      const from = screen;
      screen = to;
      write('screen', { to, from });
    },

    currentScreen: () => screen,

    sessionEnd() {
      write('session_end', { durationMs: Math.max(0, deps.now() - startMs), lastScreen: screen });
    },

    pack(data) {
      write('pack', data);
    },

    vitals(data) {
      if (vitalsSent) return;
      vitalsSent = true;
      write('vitals', data);
    },

    pack3d(data) {
      if (pack3dCount >= METRIC_PACK3D_CAP_PER_SESSION) return;
      pack3dCount += 1;
      write('pack3d', data);
    },

    error(kind, rawMessage, version) {
      if (inError) return; // 기록 중 다시 오류가 나도 반복하지 않는다 (AC-15)
      inError = true;
      try {
        if (errorCount >= METRIC_ERROR_CAP_PER_SESSION) return; // AC-14
        const message = sanitizeErrorMessage(rawMessage) || '(빈 메시지)';
        const key = `${kind}|${message}`;
        if (errorKeys.has(key)) return;
        errorKeys.add(key);
        errorCount += 1;
        write('error', { kind, message, screen, version });
      } catch {
        /* 오류 기록은 게임을 막지 않는다 */
      } finally {
        inError = false;
      }
    },

    identify(uid) {
      if (!uid || uid === 'guest') return;
      write('identify', {} as Record<string, never>, uid);
    },
  };
}
