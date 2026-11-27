// specs/024 T003 — nmixx_tcg_events 규칙 (AC-01, 03, 04, 07~10, 12)
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { anonymous, countAsAdmin, createRulesEnv, googleUser, kakaoUser, seed } from './setup';

const EVENTS = 'nmixx_tcg_events';
const TYPES = ['session_start', 'login', 'logout', 'pack_open', 'set_reward', 'achievement', 'xr_card', 'coupon', 'mail'];

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createRulesEnv();
});
afterEach(async () => {
  await env.clearFirestore();
});
afterAll(async () => {
  await env?.cleanup();
});

/** activityLogService가 쓰는 모양 (at = serverTimestamp) */
const event = (uid: string, type = 'pack_open', data: Record<string, unknown> = { packId: 'op01', packCount: 1, cost: 100, rarities: { R: 5 } }) => ({
  uid,
  type,
  at: serverTimestamp(),
  kstDate: '2026-11-26',
  sessionId: 's_test',
  data,
});

const seeded = (uid: string, atMs: number) => ({
  uid,
  type: 'session_start',
  at: Timestamp.fromMillis(atMs),
  kstDate: '2026-08-01',
  sessionId: 's_old',
  data: {},
});

describe('events', () => {
  it('본인 이벤트 생성 허용 (AC-01)', async () => {
    await assertSucceeds(googleUser(env, 'A').firestore().collection(EVENTS).add(event('goog_A')));
    expect(await countAsAdmin(env, EVENTS)).toBe(1);
  });

  it('모든 종류 생성 허용 (AC-07)', async () => {
    const db = googleUser(env, 'A').firestore();
    for (const t of TYPES) {
      await assertSucceeds(db.collection(EVENTS).add(event('goog_A', t, {})));
    }
    await assertSucceeds(kakaoUser(env, 'kakao_K').firestore().collection(EVENTS).add(event('kakao_K', 'login', { provider: 'kakao' })));
    expect(await countAsAdmin(env, EVENTS)).toBe(TYPES.length + 1);
  });

  it('타인 uid·비로그인 생성 거부 (AC-03)', async () => {
    await assertFails(googleUser(env, 'A').firestore().collection(EVENTS).add(event('goog_B')));
    await assertFails(anonymous(env).firestore().collection(EVENTS).add(event('goog_A')));
    await assertFails(anonymous(env).firestore().collection(EVENTS).add(event('kakao_K')));
    expect(await countAsAdmin(env, EVENTS)).toBe(0);
  });

  it('형식 위반 거부 (AC-04)', async () => {
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.collection(EVENTS).add(event('goog_A', 'hack')));
    await assertFails(db.collection(EVENTS).add({ ...event('goog_A'), email: 'a@example.com' }));
    await assertFails(db.collection(EVENTS).add({ ...event('goog_A'), at: Timestamp.fromMillis(Date.parse('2020-01-01')) }));
    await assertFails(db.collection(EVENTS).add({ ...event('goog_A'), kstDate: '26-11-2026' }));
    await assertFails(db.collection(EVENTS).add({ ...event('goog_A'), sessionId: 'x'.repeat(41) }));
    await assertFails(db.collection(EVENTS).add(event('goog_A', 'pack_open', Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i])))));
    const { kstDate: _omit, ...missing } = event('goog_A');
    await assertFails(db.collection(EVENTS).add(missing));
    expect(await countAsAdmin(env, EVENTS)).toBe(0);
  });

  it('수정 거부', async () => {
    await seed(env, { [`${EVENTS}/e1`]: seeded('goog_A', Date.now()) });
    await assertFails(googleUser(env, 'A').firestore().doc(`${EVENTS}/e1`).update({ type: 'login' }));
  });

  it('본인 uid 조회 허용 (AC-08)', async () => {
    await seed(env, { [`${EVENTS}/e1`]: seeded('goog_A', Date.now()), [`${EVENTS}/e2`]: seeded('goog_B', Date.now()) });
    const snap = await assertSucceeds(googleUser(env, 'A').firestore().collection(EVENTS).where('uid', '==', 'goog_A').get());
    expect(snap.size).toBe(1);
  });

  it('타인·비로그인 조회 거부, uid 조건 없는 목록 거부 (AC-09)', async () => {
    await seed(env, { [`${EVENTS}/e1`]: seeded('goog_A', Date.now()) });
    await assertFails(googleUser(env, 'B').firestore().doc(`${EVENTS}/e1`).get());
    await assertFails(googleUser(env, 'B').firestore().collection(EVENTS).where('uid', '==', 'goog_A').get());
    await assertFails(anonymous(env).firestore().collection(EVENTS).where('uid', '==', 'goog_A').get());
    await assertFails(googleUser(env, 'A').firestore().collection(EVENTS).get());
  });

  it('오래된 이벤트 정리 쿼리·삭제 허용 — 본인 (AC-10)', async () => {
    const old = Date.now() - 400 * 24 * 3600 * 1000;
    const recent = Date.now() - 100 * 24 * 3600 * 1000; // 90일은 지났지만 1년 안 (DEC-033)
    await seed(env, { [`${EVENTS}/old`]: seeded('goog_A', old), [`${EVENTS}/recent`]: seeded('goog_A', recent), [`${EVENTS}/new`]: seeded('goog_A', Date.now()) });
    const db = googleUser(env, 'A').firestore();
    const cutoff = Timestamp.fromMillis(Date.now() - 365 * 24 * 3600 * 1000);
    const snap = await assertSucceeds(db.collection(EVENTS).where('uid', '==', 'goog_A').where('at', '<', cutoff).limit(100).get());
    expect(snap.docs.map((d) => d.id)).toEqual(['old']);
    await assertSucceeds(db.doc(`${EVENTS}/old`).delete());
    expect(await countAsAdmin(env, EVENTS)).toBe(2);
  });

  it('본인 삭제 허용, 타인 삭제 거부 (AC-12)', async () => {
    await seed(env, { [`${EVENTS}/a1`]: seeded('goog_A', Date.now()), [`${EVENTS}/b1`]: seeded('goog_B', Date.now()) });
    await assertFails(googleUser(env, 'A').firestore().doc(`${EVENTS}/b1`).delete());
    await assertSucceeds(googleUser(env, 'A').firestore().doc(`${EVENTS}/a1`).delete());
    expect(await countAsAdmin(env, EVENTS)).toBe(1);
  });
});
