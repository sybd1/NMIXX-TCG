// specs/022 T007 — 카카오 사용자(커스텀 토큰 uid = 문서 ID) (REQ-05, AC-15·15a, DEC-027)
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createRulesEnv, googleUser, kakaoUser, readAsAdmin, seed } from './setup';

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

describe('kakao', () => {
  it('kakao: 본인 문서 쓰기 허용 (AC-15)', async () => {
    const db = kakaoUser(env, 'kakao_K').firestore();
    await assertSucceeds(db.doc('nmixx_tcg_users/kakao_K').set({ coins: 700, provider: 'kakao' }, { merge: true }));
    await assertSucceeds(db.doc('nmixx_tcg_users/kakao_K').get());
    await assertSucceeds(
      db.doc('nmixx_tcg_leaderboard/kakao_K').set({ uid: 'kakao_K', uniqueCardCount: 7 }, { merge: true }),
    );
    await assertSucceeds(
      db.collection('nmixx_tcg_global_feed').add({ uid: 'kakao_K', userName: '카카오K', timestamp: 1 }),
    );
    expect((await readAsAdmin(env, 'nmixx_tcg_users/kakao_K'))?.coins).toBe(700);
  });

  it('kakao: 타인 문서 거부 (AC-15a)', async () => {
    const goog = { coins: 1 };
    const kakaoJ = { coins: 2 };
    const kakaoK = { coins: 3 };
    await seed(env, {
      'nmixx_tcg_users/goog_A': goog,
      'nmixx_tcg_users/kakao_J': kakaoJ,
      'nmixx_tcg_users/kakao_K': kakaoK,
    });
    const k = kakaoUser(env, 'kakao_K').firestore();
    await assertFails(k.doc('nmixx_tcg_users/goog_A').set({ coins: 999 }, { merge: true }));
    await assertFails(k.doc('nmixx_tcg_users/kakao_J').set({ coins: 999 }, { merge: true }));
    // 구글 로그인 사용자가 Firebase uid를 'kakao_K'로 가진 경우에도 카카오 문서는 쓸 수 없다
    const fakeGoogle = googleUser(env, 'kakao_K').firestore();
    await assertFails(fakeGoogle.doc('nmixx_tcg_users/kakao_K').set({ coins: 999 }, { merge: true }));
    // 일반 구글 사용자 A도 카카오 문서를 쓸 수 없다
    await assertFails(googleUser(env, 'A').firestore().doc('nmixx_tcg_users/kakao_K').set({ coins: 999 }));
    expect(await readAsAdmin(env, 'nmixx_tcg_users/goog_A')).toEqual(goog);
    expect(await readAsAdmin(env, 'nmixx_tcg_users/kakao_J')).toEqual(kakaoJ);
    expect(await readAsAdmin(env, 'nmixx_tcg_users/kakao_K')).toEqual(kakaoK);
  });
});
