// specs/025 T002 — 운영자 전체 행동 로그 읽기 (AC-01~03, DEC-032)
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { ADMIN_GOOGLE_UIDS } from '../../src/config/admin';
import { anonymous, createRulesEnv, googleUser, kakaoUser, seed, readAsAdmin } from './setup';

const EVENTS = 'nmixx_tcg_events';
const ADMIN = ADMIN_GOOGLE_UIDS[0];

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

const ev = (uid: string, atMs: number) => ({
  uid,
  type: 'pack_open',
  at: Timestamp.fromMillis(atMs),
  kstDate: '2026-11-26',
  sessionId: 's_x',
  data: { packId: 'op01', packCount: 1, cost: 100, rarities: { R: 5 } },
});

const NOW = Date.parse('2026-11-26T10:00:00Z');

async function seedTwoUsers() {
  await seed(env, {
    [`${EVENTS}/a1`]: ev('goog_A', NOW - 1000),
    [`${EVENTS}/b1`]: ev('goog_B', NOW - 2000),
    [`${EVENTS}/k1`]: ev('kakao_9', NOW - 3000),
  });
}

const rangeQuery = (db: ReturnType<ReturnType<typeof googleUser>['firestore']>) =>
  db.collection(EVENTS).where('at', '>=', Timestamp.fromMillis(NOW - 7 * 86400000)).orderBy('at', 'desc').limit(2001);

describe('운영자 읽기 (AC-01)', () => {
  it('운영자는 uid 조건 없이 기간 목록을 읽는다', async () => {
    await seedTwoUsers();
    await assertSucceeds(rangeQuery(googleUser(env, ADMIN).firestore()).get());
  });
  it('운영자는 남의 이벤트 문서를 읽는다', async () => {
    await seedTwoUsers();
    await assertSucceeds(googleUser(env, ADMIN).firestore().doc(`${EVENTS}/b1`).get());
    await assertSucceeds(googleUser(env, ADMIN).firestore().doc(`${EVENTS}/k1`).get());
  });
});

describe('운영자가 아닌 계정 (AC-02)', () => {
  it('일반·카카오·비로그인은 전체 목록 거부', async () => {
    await seedTwoUsers();
    await assertFails(rangeQuery(googleUser(env, 'A').firestore()).get());
    await assertFails(rangeQuery(kakaoUser(env, 'kakao_9').firestore()).get());
    await assertFails(rangeQuery(anonymous(env).firestore()).get());
  });
  it('카카오 커스텀 토큰 uid가 운영자 uid와 같아도 거부', async () => {
    await seedTwoUsers();
    const fake = env.authenticatedContext(ADMIN, { firebase: { sign_in_provider: 'custom' } });
    await assertFails(rangeQuery(fake.firestore()).get());
  });
  it('일반 이용자는 남의 문서를 못 읽고, 본인 조회는 그대로 허용', async () => {
    await seedTwoUsers();
    await assertFails(googleUser(env, 'A').firestore().doc(`${EVENTS}/b1`).get());
    await assertSucceeds(googleUser(env, 'A').firestore().doc(`${EVENTS}/a1`).get());
    await assertSucceeds(googleUser(env, 'A').firestore().collection(EVENTS).where('uid', '==', 'goog_A').get());
  });
});

describe('운영자도 남의 이벤트를 바꿀 수 없다 (AC-03)', () => {
  it('삭제·수정·대리 생성 거부', async () => {
    await seedTwoUsers();
    const db = googleUser(env, ADMIN).firestore();
    await assertFails(db.doc(`${EVENTS}/b1`).delete());
    await assertFails(db.doc(`${EVENTS}/b1`).update({ type: 'login' }));
    await assertFails(
      db.collection(EVENTS).add({ uid: 'goog_B', type: 'login', at: serverTimestamp(), kstDate: '2026-11-26', sessionId: 's', data: {} }),
    );
    const after = await readAsAdmin(env, `${EVENTS}/b1`);
    if (!after || after.type !== 'pack_open') throw new Error('b1 changed');
  });
});
