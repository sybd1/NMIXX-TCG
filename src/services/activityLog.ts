// 이용자 행동 로그 — Firebase를 import하지 않는 순수 로직 (specs/024 plan 3절, DEC-031)
// 실제 Firestore 연결은 activityLogService.ts가 주입한다.
import type { UserAccount } from '../types/auth';
import {
  ACTIVITY_PURGE_LIMIT,
  ACTIVITY_RETENTION_DAYS,
  type ActivityEventDataMap,
  type ActivityEventDoc,
  type ActivityEventType,
} from '../types/activity';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** KST(Date.now() + 9h) 기준 'YYYY-MM-DD' */
export function kstDateString(nowMs: number): string {
  return new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 로그인·클라우드 연동 이용자만, localhost(개발 서버, 운영 Firestore 연결)에서는 쓰지 않는다 (DEC-009, DEC-017) */
export function shouldLog(user: UserAccount | null | undefined, isLocal: boolean): user is UserAccount {
  if (!user || isLocal) return false;
  if (user.id === 'guest' || user.provider === 'guest') return false;
  return user.isCloudSynced === true && !!user.id;
}

export function buildActivityEvent<T extends ActivityEventType>(
  uid: string,
  type: T,
  data: ActivityEventDataMap[T],
  sessionId: string,
  nowMs: number,
): Omit<ActivityEventDoc<T>, 'at'> {
  return { uid, type, kstDate: kstDateString(nowMs), sessionId, data };
}

export function summarizeRarities(cards: { rarity: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cards) out[c.rarity] = (out[c.rarity] || 0) + 1;
  return out;
}

export function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface ActivityLoggerDeps {
  isLocal(): boolean;
  now(): number;
  sessionId: string;
  /** at(serverTimestamp)을 붙여 쓴다 */
  addEvent(event: Omit<ActivityEventDoc, 'at'>): Promise<unknown>;
  /** uid == uid && at < beforeMs, limit */
  queryOldIds(uid: string, beforeMs: number, limit: number): Promise<string[]>;
  /** uid == uid, limit */
  listIds(uid: string, limit: number): Promise<string[]>;
  deleteIds(ids: string[]): Promise<void>;
}

export interface ActivityLogger {
  /** 기다리지 않는 기록. 어떤 실패도 밖으로 던지지 않는다 (AC-05) */
  log<T extends ActivityEventType>(user: UserAccount | null | undefined, type: T, data: ActivityEventDataMap[T]): void;
  /** 기록이 끝날 때까지 기다린다(로그아웃 직전처럼 인증이 곧 사라질 때). 실패는 삼킨다 */
  logAndWait<T extends ActivityEventType>(user: UserAccount | null | undefined, type: T, data: ActivityEventDataMap[T]): Promise<void>;
  /** 본인의 보관 기간 지난 이벤트를 최대 ACTIVITY_PURGE_LIMIT개 지운다. 실패는 삼킨다 (AC-10, AC-11) */
  purgeOld(user: UserAccount | null | undefined): Promise<void>;
  /** 본인 이벤트를 모두 지운다. 실패하면 던진다 (AC-12, AC-13) */
  deleteAll(uid: string): Promise<void>;
}

const DELETE_PAGE = 300;

export function createActivityLogger(deps: ActivityLoggerDeps): ActivityLogger {
  return {
    log(user, type, data) {
      try {
        if (!shouldLog(user, deps.isLocal())) return;
        const event = buildActivityEvent(user.id, type, data, deps.sessionId, deps.now());
        deps.addEvent(event).catch((e) => console.warn(`[ActivityLog] ${type} not recorded:`, e?.code || e?.message || e));
      } catch (e) {
        console.warn(`[ActivityLog] ${type} not recorded:`, e);
      }
    },

    async logAndWait(user, type, data) {
      try {
        if (!shouldLog(user, deps.isLocal())) return;
        await deps.addEvent(buildActivityEvent(user.id, type, data, deps.sessionId, deps.now()));
      } catch (e) {
        console.warn(`[ActivityLog] ${type} not recorded:`, (e as { code?: string })?.code || (e as Error)?.message || e);
      }
    },

    async purgeOld(user) {
      try {
        if (!shouldLog(user, deps.isLocal())) return;
        const before = deps.now() - ACTIVITY_RETENTION_DAYS * DAY_MS;
        const ids = await deps.queryOldIds(user.id, before, ACTIVITY_PURGE_LIMIT);
        if (ids.length > 0) await deps.deleteIds(ids);
      } catch (e) {
        console.warn('[ActivityLog] purge skipped:', (e as { code?: string })?.code || (e as Error)?.message || e);
      }
    },

    async deleteAll(uid) {
      // 한 번에 DELETE_PAGE개씩, 조회 결과가 빌 때까지 (그 사이 새로 생긴 것도 지운다)
      for (;;) {
        const ids = await deps.listIds(uid, DELETE_PAGE);
        if (ids.length === 0) return;
        await deps.deleteIds(ids);
      }
    },
  };
}
