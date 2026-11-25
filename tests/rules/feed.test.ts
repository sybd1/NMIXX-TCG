// specs/022 T005 — nmixx_tcg_global_feed: 공개 읽기, 본인 이름으로 추가만 (REQ-03, AC-08·09·10)
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { anonymous, countAsAdmin, createRulesEnv, googleUser, readAsAdmin, seed } from './setup';

const FEED = 'nmixx_tcg_global_feed';

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

/** MultiplayerService.broadcastHighTierPull이 쓰는 payload 모양 */
const pull = (uid: string, userName: string) => ({
  uid,
  userName,
  cardId: 'card_001',
  cardName: '테스트 카드',
  rarity: 'SSR',
  member: 'HAEWON',
  image: '/cards/card_001.webp',
  timestamp: 1764000000000,
});

describe('feed', () => {
  it('feed: 본인 항목 추가·공개 읽기 (AC-08)', async () => {
    await assertSucceeds(googleUser(env, 'A').firestore().collection(FEED).add(pull('goog_A', '엔써A')));
    const snap = await assertSucceeds(
      anonymous(env).firestore().collection(FEED).orderBy('timestamp', 'desc').limit(15).get(),
    );
    expect(snap.size).toBe(1);
  });

  it('feed: 수정·삭제·비로그인 추가 거부 (AC-09)', async () => {
    const before = pull('goog_B', '엔써B');
    await seed(env, { [`${FEED}/item1`]: before });
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.doc(`${FEED}/item1`).update({ userName: '위조' }));
    await assertFails(db.doc(`${FEED}/item1`).delete());
    await assertFails(anonymous(env).firestore().collection(FEED).add(pull('goog_A', '익명')));
    expect(await readAsAdmin(env, `${FEED}/item1`)).toEqual(before);
    expect(await countAsAdmin(env, FEED)).toBe(1);
  });

  it('feed: 작성자 uid 위조 거부 (AC-10)', async () => {
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.collection(FEED).add(pull('goog_B', '엔써B')));
    await assertSucceeds(db.collection(FEED).add(pull('goog_A', '아무이름')));
    expect(await countAsAdmin(env, FEED)).toBe(1);
  });
});
