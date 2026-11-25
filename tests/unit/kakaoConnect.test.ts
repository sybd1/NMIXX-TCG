// specs/023 T007 — 카카오 연결 모듈 (AC-04, AC-07, AC-08, AC-14)
import { describe, expect, it, vi } from 'vitest';
import {
  KAKAO_AUTH_FAILED_MESSAGE,
  KAKAO_RELOGIN_MESSAGE,
  accountIdForFirebaseUser,
  connectKakaoToFirebase,
  kakaoDeleteBlockedMessage,
} from '../../src/services/kakaoConnect';

describe('문구', () => {
  it('spec 5절과 같다', () => {
    expect(KAKAO_AUTH_FAILED_MESSAGE).toBe('카카오 계정 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    expect(KAKAO_RELOGIN_MESSAGE).toBe('클라우드 저장을 위해 카카오로 다시 로그인해 주세요.');
  });
});

describe('accountIdForFirebaseUser', () => {
  it('kakao_ uid는 그대로 (AC-07)', () => {
    expect(accountIdForFirebaseUser('kakao_123')).toEqual({ id: 'kakao_123', provider: 'kakao' });
  });
  it('구글 uid (AC-08)', () => {
    expect(accountIdForFirebaseUser('AbC123xyz')).toEqual({ id: 'goog_AbC123xyz', provider: 'google' });
  });
});

describe('connectKakaoToFirebase', () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it('성공: 서버 토큰으로 로그인', async () => {
    const postToken = vi.fn(async () => json({ customToken: 'ct' }));
    const signInWithCustomToken = vi.fn(async () => ({ uid: 'kakao_123' }));
    await expect(connectKakaoToFirebase('kakao-access', { postToken, signInWithCustomToken })).resolves.toEqual({
      uid: 'kakao_123',
    });
    expect(postToken).toHaveBeenCalledWith({ accessToken: 'kakao-access' });
    expect(signInWithCustomToken).toHaveBeenCalledWith('ct');
  });

  it.each([
    ['서버 401', async () => json({ code: 'KAKAO_TOKEN_INVALID', message: 'x' }, 401)],
    ['서버 500', async () => json({ code: 'SERVER_MISCONFIGURED', message: 'x' }, 500)],
    ['응답에 토큰 없음', async () => json({})],
    ['JSON 아님', async () => new Response('<html>', { status: 200 })],
    [
      '네트워크 오류',
      async () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ])('서버 실패 → KAKAO_AUTH_FAILED_MESSAGE (AC-04): %s', async (_name, postToken) => {
    const signInWithCustomToken = vi.fn(async () => ({ uid: 'kakao_1' }));
    await expect(connectKakaoToFirebase('t', { postToken, signInWithCustomToken })).rejects.toThrow(
      KAKAO_AUTH_FAILED_MESSAGE,
    );
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });

  it('빈 카카오 토큰 → 요청하지 않고 실패', async () => {
    const postToken = vi.fn();
    await expect(
      connectKakaoToFirebase('', { postToken, signInWithCustomToken: vi.fn() }),
    ).rejects.toThrow(KAKAO_AUTH_FAILED_MESSAGE);
    expect(postToken).not.toHaveBeenCalled();
  });

  it('Firebase 로그인 실패 → KAKAO_AUTH_FAILED_MESSAGE', async () => {
    const signInWithCustomToken = vi.fn(async () => {
      throw new Error('auth/invalid-custom-token');
    });
    await expect(
      connectKakaoToFirebase('t', { postToken: async () => json({ customToken: 'ct' }), signInWithCustomToken }),
    ).rejects.toThrow(KAKAO_AUTH_FAILED_MESSAGE);
  });

  it('kakao_ 아닌 uid → 실패', async () => {
    await expect(
      connectKakaoToFirebase('t', {
        postToken: async () => json({ customToken: 'ct' }),
        signInWithCustomToken: async () => ({ uid: 'someone-else' }),
      }),
    ).rejects.toThrow(KAKAO_AUTH_FAILED_MESSAGE);
  });
});

describe('kakaoDeleteBlockedMessage', () => {
  it('연결 안 된 카카오 → 재로그인 메시지 (AC-14)', () => {
    expect(kakaoDeleteBlockedMessage({ id: 'kakao_1', provider: 'kakao' }, null)).toBe(KAKAO_RELOGIN_MESSAGE);
    expect(kakaoDeleteBlockedMessage({ id: 'kakao_1', provider: 'kakao' }, 'kakao_2')).toBe(KAKAO_RELOGIN_MESSAGE);
  });
  it('연결된 카카오·구글 → null', () => {
    expect(kakaoDeleteBlockedMessage({ id: 'kakao_1', provider: 'kakao' }, 'kakao_1')).toBeNull();
    expect(kakaoDeleteBlockedMessage({ id: 'goog_a', provider: 'google' }, null)).toBeNull();
  });
});
