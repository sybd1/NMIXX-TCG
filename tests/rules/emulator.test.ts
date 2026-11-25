// 테스트 기반 연결 확인 (specs/022 T002). 규칙 판정과 무관하게 에뮬레이터에 붙는지만 본다.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createRulesEnv, seed } from './setup';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createRulesEnv();
});

afterAll(async () => {
  await env?.cleanup();
});

describe('emulator', () => {
  it('규칙을 끈 상태로 문서를 쓰고 읽을 수 있다', async () => {
    await seed(env, { 'nmixx_tcg_smoke/ping': { ok: true } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await ctx.firestore().doc('nmixx_tcg_smoke/ping').get();
      expect(snap.data()).toEqual({ ok: true });
    });
    await env.clearFirestore();
  });
});
