// Firestore 보안 규칙 테스트 공통 준비 (specs/022-firestore-rules plan 6절)
// `npm run test:rules`가 띄운 에뮬레이터(FIRESTORE_EMULATOR_HOST)에만 연결한다. 운영 프로젝트에는 닿지 않는다.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

/** firebase.json·package.json의 --project 값과 같아야 한다. demo- 접두어는 에뮬레이터 전용. */
export const PROJECT_ID = 'demo-nmixx-tcg';

export async function createRulesEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
}

/** 구글 로그인 사용자: Firebase uid = `uid`, 문서 ID = `goog_<uid>` (DEC-008) */
export function googleUser(env: RulesTestEnvironment, uid: string): RulesTestContext {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } });
}

/** 카카오 사용자: 커스텀 토큰 uid = 문서 ID `kakao_<회원번호>` (DEC-027) */
export function kakaoUser(env: RulesTestEnvironment, docId: string): RulesTestContext {
  return env.authenticatedContext(docId, { firebase: { sign_in_provider: 'custom' } });
}

export function anonymous(env: RulesTestEnvironment): RulesTestContext {
  return env.unauthenticatedContext();
}

/** 규칙을 끈 상태로 문서를 읽는다. 거부된 요청 뒤에 데이터가 그대로인지 확인할 때 쓴다. */
export async function readAsAdmin(
  env: RulesTestEnvironment,
  path: string,
): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await ctx.firestore().doc(path).get();
    data = snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
  });
  return data;
}

/** 규칙을 끈 상태로 컬렉션 문서 수를 센다. */
export async function countAsAdmin(env: RulesTestEnvironment, collection: string): Promise<number> {
  let n = 0;
  await env.withSecurityRulesDisabled(async (ctx) => {
    n = (await ctx.firestore().collection(collection).get()).size;
  });
  return n;
}

/** 규칙을 끈 상태로 사전 데이터를 넣는다. */
export async function seed(
  env: RulesTestEnvironment,
  docs: Record<string, Record<string, unknown>>,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [path, data] of Object.entries(docs)) {
      await db.doc(path).set(data);
    }
  });
}
