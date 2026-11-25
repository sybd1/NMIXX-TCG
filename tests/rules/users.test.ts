// specs/022 T003 — nmixx_tcg_users: 주인만 읽고 쓴다 (REQ-01, AC-01·02·03·03a·04)
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { anonymous, createRulesEnv, googleUser, readAsAdmin, seed } from './setup';

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

/** CloudSyncService.saveUserGameData가 쓰는 payload 모양 (src/services/cloudSyncService.ts CloudGameData) */
const gameData = (coins: number) => ({
  collection: { card_001: 1 },
  coins,
  dust: 0,
  pityCounter: 3,
  totalPacksOpened: 1,
  unlockedAchievements: [],
  claimedSetRewards: [],
  claimedMailIds: [],
  claimedCouponCodes: [],
  hasClaimedMmuEasterEgg: false,
  lastMailClaimDate: null,
  lastSavedAt: 1764000000000,
  userEmail: 'a@example.com',
  displayName: '엔써A',
  provider: 'google',
});

const B_DOC = { coins: 100, userEmail: 'b@example.com', displayName: '엔써B' };

describe('users', () => {
  it('users: 본인 저장 허용 (AC-01)', async () => {
    const db = googleUser(env, 'A').firestore();
    await assertSucceeds(db.doc('nmixx_tcg_users/goog_A').set(gameData(5000), { merge: true }));
    await assertSucceeds(db.doc('nmixx_tcg_users/goog_A').get());
    expect((await readAsAdmin(env, 'nmixx_tcg_users/goog_A'))?.coins).toBe(5000);
  });

  it('users: 타인 문서 쓰기 거부 (AC-02)', async () => {
    await seed(env, { 'nmixx_tcg_users/goog_B': B_DOC });
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.doc('nmixx_tcg_users/goog_B').set({ coins: 999999 }, { merge: true }));
    expect(await readAsAdmin(env, 'nmixx_tcg_users/goog_B')).toEqual(B_DOC);
  });

  it('users: 타인 삭제·비로그인 쓰기 거부 (AC-03)', async () => {
    await seed(env, { 'nmixx_tcg_users/goog_B': B_DOC });
    await assertFails(googleUser(env, 'A').firestore().doc('nmixx_tcg_users/goog_B').delete());
    await assertFails(anonymous(env).firestore().doc('nmixx_tcg_users/goog_B').set({ coins: 1 }));
    expect(await readAsAdmin(env, 'nmixx_tcg_users/goog_B')).toEqual(B_DOC);
  });

  it('users: 타인 읽기·컬렉션 검색 거부 (AC-03a)', async () => {
    await seed(env, { 'nmixx_tcg_users/goog_B': B_DOC });
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.doc('nmixx_tcg_users/goog_B').get());
    await assertFails(db.collection('nmixx_tcg_users').where('displayName', '==', '엔써B').get());
  });

  it('users·leaderboard: 본인 삭제 허용 (AC-04)', async () => {
    await seed(env, {
      'nmixx_tcg_users/goog_A': gameData(10),
      'nmixx_tcg_leaderboard/goog_A': { uid: 'goog_A', uniqueCardCount: 1 },
      'nmixx_tcg_users/goog_B': B_DOC,
    });
    const db = googleUser(env, 'A').firestore();
    await assertSucceeds(db.doc('nmixx_tcg_users/goog_A').delete());
    await assertSucceeds(db.doc('nmixx_tcg_leaderboard/goog_A').delete());
    expect(await readAsAdmin(env, 'nmixx_tcg_users/goog_A')).toBeUndefined();
    expect(await readAsAdmin(env, 'nmixx_tcg_leaderboard/goog_A')).toBeUndefined();
    expect(await readAsAdmin(env, 'nmixx_tcg_users/goog_B')).toEqual(B_DOC);
  });
});
