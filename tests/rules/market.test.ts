// specs/022 T006 — nmixx_tcg_market: 숨김 상태라 쓰기 전부 거부, 읽기 공개 (REQ-04, AC-11·12·13)
// 목록에 없는 컬렉션 기본 거부 (REQ-06, AC-18)
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { anonymous, countAsAdmin, createRulesEnv, googleUser, readAsAdmin, seed } from './setup';

const MARKET = 'nmixx_tcg_market';

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

/** MultiplayerService.createTradeListing이 쓰는 payload 모양 */
const listing = (sellerUid: string) => ({
  sellerUid,
  sellerName: '판매자',
  sellerAvatar: '/cards/card_001.webp',
  offeredCardId: 'card_001',
  offeredCardName: '제시 카드',
  offeredRarity: 'R',
  offeredImage: '/cards/card_001.webp',
  offeredMember: 'HAEWON',
  wantedCardId: 'card_002',
  wantedCardName: '원하는 카드',
  wantedRarity: 'R',
  status: 'OPEN',
  createdAt: 1764000000000,
});

describe('market', () => {
  it('market: 등록 거부 (AC-11)', async () => {
    await assertFails(googleUser(env, 'A').firestore().collection(MARKET).add(listing('goog_A')));
    expect(await countAsAdmin(env, MARKET)).toBe(0);
  });

  it('market: 수정·삭제 거부 (AC-12)', async () => {
    const mine = listing('goog_A');
    const theirs = listing('goog_B');
    await seed(env, { [`${MARKET}/mine`]: mine, [`${MARKET}/theirs`]: theirs });
    const db = googleUser(env, 'A').firestore();
    for (const id of ['mine', 'theirs']) {
      // completeTrade가 보내는 것과 같은 변경
      await assertFails(
        db.doc(`${MARKET}/${id}`).update({ status: 'COMPLETED', buyerUid: 'goog_A', buyerName: '구매자', completedAt: 1 }),
      );
      await assertFails(db.doc(`${MARKET}/${id}`).delete());
    }
    expect(await readAsAdmin(env, `${MARKET}/mine`)).toEqual(mine);
    expect(await readAsAdmin(env, `${MARKET}/theirs`)).toEqual(theirs);
  });

  it('market: 공개 읽기 (AC-13)', async () => {
    await seed(env, { [`${MARKET}/t1`]: listing('goog_B') });
    const db = anonymous(env).firestore();
    await assertSucceeds(db.doc(`${MARKET}/t1`).get());
    const snap = await assertSucceeds(db.collection(MARKET).where('status', '==', 'OPEN').get());
    expect(snap.size).toBe(1);
  });
});

describe('기본 거부', () => {
  it('기본 거부: 규칙에 없는 컬렉션 (AC-18)', async () => {
    const db = googleUser(env, 'A').firestore();
    await assertFails(db.doc('nmixx_tcg_unknown/x').get());
    await assertFails(db.doc('nmixx_tcg_unknown/x').set({ a: 1 }));
  });
});
