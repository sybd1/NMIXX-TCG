// specs/022 T004 — nmixx_tcg_leaderboard: 공개 읽기, 주인만 쓰기 (REQ-02, AC-03b·05·06)
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

/** MultiplayerService.updateLeaderboardEntry가 쓰는 payload 모양 (src/types/multiplayer.ts LeaderboardEntry) */
const entry = (uid: string, displayName: string, uniqueCardCount: number) => ({
  uid,
  displayName,
  avatarUrl: '/cards/card_001.webp',
  avatarMemberId: 'SULLYOON',
  uniqueCardCount,
  collectionRate: Math.round((uniqueCardCount / 521) * 1000) / 10,
  totalPacksOpened: 3,
  coins: 1000,
  hasXR: false,
  achievementBadges: [],
  updatedAt: 1764000000000,
});

describe('leaderboard', () => {
  it('leaderboard: 닉네임 검색 허용 (AC-03b)', async () => {
    await seed(env, { 'nmixx_tcg_leaderboard/goog_B': entry('goog_B', '엔써123', 10) });
    for (const db of [anonymous(env).firestore(), googleUser(env, 'A').firestore()]) {
      const snap = await assertSucceeds(
        db.collection('nmixx_tcg_leaderboard').where('displayName', '==', '엔써123').limit(2).get(),
      );
      expect(snap.size).toBe(1);
    }
  });

  it('leaderboard: 공개 읽기·본인 쓰기 (AC-05)', async () => {
    await seed(env, { 'nmixx_tcg_leaderboard/goog_B': entry('goog_B', '엔써B', 10) });
    await assertSucceeds(
      anonymous(env).firestore().collection('nmixx_tcg_leaderboard').orderBy('uniqueCardCount', 'desc').get(),
    );
    const db = googleUser(env, 'A').firestore();
    await assertSucceeds(db.doc('nmixx_tcg_leaderboard/goog_A').set(entry('goog_A', '엔써A', 42), { merge: true }));
    expect((await readAsAdmin(env, 'nmixx_tcg_leaderboard/goog_A'))?.uniqueCardCount).toBe(42);
  });

  it('leaderboard: 타인 수정·삭제 거부 (AC-06)', async () => {
    const before = entry('goog_B', '엔써B', 10);
    await seed(env, { 'nmixx_tcg_leaderboard/goog_B': before });
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.doc('nmixx_tcg_leaderboard/goog_B').update({ uniqueCardCount: 521 }));
    await assertFails(db.doc('nmixx_tcg_leaderboard/goog_B').delete());
    expect(await readAsAdmin(env, 'nmixx_tcg_leaderboard/goog_B')).toEqual(before);
  });
});
