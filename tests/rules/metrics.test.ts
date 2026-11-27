// specs/026 T002 — nmixx_tcg_metrics 규칙 (AC-01, 13, 17, DEC-034·035)
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { anonymous, countAsAdmin, createRulesEnv, googleUser, kakaoUser, readAsAdmin, seed } from './setup';

const METRICS = 'nmixx_tcg_metrics';
const ADMIN_UID = 'jP0i8ASU98UI07d7plZLc4jorfN2';

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

/** metricsService가 쓰는 모양 (at = serverTimestamp) */
const metric = (type: string, data: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  vid: 'v_abc123',
  sid: 's_test',
  type,
  at: serverTimestamp(),
  kstDate: '2026-11-27',
  data,
  ...extra,
});

const SAMPLES: Record<string, Record<string, unknown>> = {
  visit: { first: true, device: 'mobile', loggedIn: false },
  screen: { to: 'collection', from: 'home' },
  session_end: { durationMs: 300000, lastScreen: 'ranking' },
  pack: { packId: 'op01', packCount: 1, owned: 12, total: 521, rarities: { C: 4, R: 1 } },
  vitals: { device: 'desktop', lcp: 1200, inp: null, cls: 0.01 },
  pack3d: { mode: '3d', readyMs: 120, avgFps: 58.5, frames: 600 },
  error: { kind: 'error', message: 'boom', screen: 'home', version: 'v1.6.3' },
};

const seeded = (type: string, atMs: number, extra: Record<string, unknown> = {}) => ({
  vid: 'v_abc123',
  sid: 's_old',
  type,
  at: Timestamp.fromMillis(atMs),
  kstDate: '2026-01-01',
  data: {},
  ...extra,
});

describe('nmixx_tcg_metrics 추가', () => {
  it('비로그인·로그인 모두 정해진 모양 추가 허용 (AC-01)', async () => {
    for (const [type, data] of Object.entries(SAMPLES)) {
      await assertSucceeds(anonymous(env).firestore().collection(METRICS).add(metric(type, data)));
      await assertSucceeds(googleUser(env, 'A').firestore().collection(METRICS).add(metric(type, data)));
    }
    expect(await countAsAdmin(env, METRICS)).toBe(Object.keys(SAMPLES).length * 2);
  });

  it('identify는 본인 계정 ID만 (구글·카카오)', async () => {
    await assertSucceeds(googleUser(env, 'A').firestore().collection(METRICS).add(metric('identify', {}, { uid: 'goog_A' })));
    await assertSucceeds(kakaoUser(env, 'kakao_77').firestore().collection(METRICS).add(metric('identify', {}, { uid: 'kakao_77' })));
    await assertFails(googleUser(env, 'B').firestore().collection(METRICS).add(metric('identify', {}, { uid: 'goog_A' })));
    await assertFails(anonymous(env).firestore().collection(METRICS).add(metric('identify', {}, { uid: 'goog_A' })));
    await assertFails(googleUser(env, 'A').firestore().collection(METRICS).add(metric('identify', {})));
  });

  it('uid 위장·형식 위반 거부', async () => {
    const db = anonymous(env).firestore().collection(METRICS);
    await assertFails(db.add(metric('visit', SAMPLES.visit, { uid: 'goog_A' })));
    await assertFails(db.add(metric('unknown', {})));
    await assertFails(db.add(metric('visit', SAMPLES.visit, { extra: 1 })));
    await assertFails(db.add({ ...metric('visit', SAMPLES.visit), at: Timestamp.fromMillis(0) }));
    await assertFails(db.add({ ...metric('visit', SAMPLES.visit), vid: 'abc' }));
    await assertFails(db.add({ ...metric('visit', SAMPLES.visit), vid: 'v_ABC123' }));
    await assertFails(db.add({ ...metric('visit', SAMPLES.visit), sid: 's'.repeat(41) }));
    await assertFails(db.add({ ...metric('visit', SAMPLES.visit), kstDate: '2026/11/27' }));
    const { kstDate: _omit, ...noDate } = metric('visit', SAMPLES.visit);
    await assertFails(db.add(noDate));
    const nine = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]));
    await assertFails(db.add(metric('pack', nine)));
    expect(await countAsAdmin(env, METRICS)).toBe(0);
  });

  it('error 메시지 201자 거부, 200자 허용 (AC-13)', async () => {
    const db = anonymous(env).firestore().collection(METRICS);
    await assertSucceeds(db.add(metric('error', { ...SAMPLES.error, message: 'x'.repeat(200) })));
    await assertFails(db.add(metric('error', { ...SAMPLES.error, message: 'x'.repeat(201) })));
  });
});

describe('nmixx_tcg_metrics 읽기·수정·삭제 (AC-17)', () => {
  it('운영자만 목록을 읽는다', async () => {
    await seed(env, { [`${METRICS}/m1`]: seeded('visit', Date.now()) });
    await assertSucceeds(googleUser(env, ADMIN_UID).firestore().collection(METRICS).get());
    await assertFails(googleUser(env, 'A').firestore().collection(METRICS).get());
    await assertFails(anonymous(env).firestore().collection(METRICS).get());
    await assertFails(anonymous(env).firestore().doc(`${METRICS}/m1`).get());
    await assertFails(kakaoUser(env, ADMIN_UID).firestore().collection(METRICS).get());
  });

  it('identify는 본인도 읽고 지운다 (탈퇴)', async () => {
    await seed(env, {
      [`${METRICS}/i1`]: seeded('identify', Date.now(), { uid: 'goog_A' }),
      [`${METRICS}/i2`]: seeded('identify', Date.now(), { uid: 'goog_B' }),
      [`${METRICS}/v1`]: seeded('visit', Date.now()),
    });
    const db = googleUser(env, 'A').firestore();
    const snap = await assertSucceeds(
      db.collection(METRICS).where('uid', '==', 'goog_A').where('type', '==', 'identify').get(),
    );
    expect(snap.docs.map((d) => d.id)).toEqual(['i1']);
    await assertSucceeds(db.doc(`${METRICS}/i1`).delete());
    await assertFails(db.doc(`${METRICS}/i2`).delete());
    await assertFails(db.doc(`${METRICS}/v1`).delete());
    expect(await countAsAdmin(env, METRICS)).toBe(2);
  });

  it('운영자는 오래된 기록을 지운다, 수정은 아무도 못 한다', async () => {
    await seed(env, { [`${METRICS}/m1`]: seeded('visit', Date.now() - 400 * 24 * 3600 * 1000) });
    await assertFails(googleUser(env, ADMIN_UID).firestore().doc(`${METRICS}/m1`).update({ type: 'screen' }));
    await assertFails(anonymous(env).firestore().doc(`${METRICS}/m1`).update({ type: 'screen' }));
    expect((await readAsAdmin(env, `${METRICS}/m1`))?.type).toBe('visit');
    await assertFails(anonymous(env).firestore().doc(`${METRICS}/m1`).delete());
    await assertSucceeds(googleUser(env, ADMIN_UID).firestore().doc(`${METRICS}/m1`).delete());
    expect(await countAsAdmin(env, METRICS)).toBe(0);
  });
});
