// specs/023 T005 — 카카오 토큰 확인 → Firebase 커스텀 토큰 발급 판정 (AC-01, AC-03, AC-04)
import { describe, expect, it, vi } from 'vitest';
import {
  KakaoApiError,
  fetchKakaoTokenInfo,
  issueKakaoFirebaseToken,
  type IssueDeps,
} from '../../api/_lib/kakaoToken';

const APP_ID = 1234;

function deps(overrides: Partial<IssueDeps> = {}): IssueDeps {
  return {
    expectedAppId: APP_ID,
    fetchTokenInfo: vi.fn(async () => ({ id: 123456789, app_id: APP_ID })),
    createCustomToken: vi.fn(async (uid: string) => `custom-token-for-${uid}`),
    ...overrides,
  };
}

describe('issueKakaoFirebaseToken', () => {
  it('유효 토큰 → kakao_<id> 커스텀 토큰 (AC-01)', async () => {
    const d = deps();
    const res = await issueKakaoFirebaseToken({ accessToken: 'valid' }, d);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ customToken: 'custom-token-for-kakao_123456789' });
    expect(d.fetchTokenInfo).toHaveBeenCalledWith('valid');
    expect(d.createCustomToken).toHaveBeenCalledWith('kakao_123456789');
  });

  it('본문의 id 무시 (AC-03)', async () => {
    const d = deps();
    const res = await issueKakaoFirebaseToken({ accessToken: 'valid', id: '999', uid: 'kakao_999' }, d);
    expect(res.status).toBe(200);
    expect(d.createCustomToken).toHaveBeenCalledWith('kakao_123456789');
    expect(d.createCustomToken).not.toHaveBeenCalledWith('kakao_999');
  });

  it('app_id 불일치 거부 (AC-03)', async () => {
    const d = deps({ fetchTokenInfo: vi.fn(async () => ({ id: 1, app_id: 9999 })) });
    const res = await issueKakaoFirebaseToken({ accessToken: 'other-app' }, d);
    expect(res).toMatchObject({ status: 401, body: { code: 'KAKAO_TOKEN_INVALID' } });
    expect(d.createCustomToken).not.toHaveBeenCalled();
  });

  it('카카오 401 거부 (AC-03)', async () => {
    const d = deps({
      fetchTokenInfo: vi.fn(async () => {
        throw new KakaoApiError('invalid', 'kakao -401');
      }),
    });
    const res = await issueKakaoFirebaseToken({ accessToken: 'forged' }, d);
    expect(res).toMatchObject({ status: 401, body: { code: 'KAKAO_TOKEN_INVALID' } });
    expect(d.createCustomToken).not.toHaveBeenCalled();
  });

  it.each([[undefined], [null], ['text'], [{}], [{ accessToken: '' }], [{ accessToken: '   ' }], [{ accessToken: 42 }]])(
    '잘못된 본문 → 400 (%j)',
    async (body) => {
      const d = deps();
      const res = await issueKakaoFirebaseToken(body, d);
      expect(res).toMatchObject({ status: 400, body: { code: 'INVALID_REQUEST' } });
      expect(d.fetchTokenInfo).not.toHaveBeenCalled();
    },
  );

  it('카카오 시간 초과 → 502 (AC-04)', async () => {
    const d = deps({
      fetchTokenInfo: vi.fn(async () => {
        throw new KakaoApiError('unavailable', 'timeout');
      }),
    });
    const res = await issueKakaoFirebaseToken({ accessToken: 'valid' }, d);
    expect(res).toMatchObject({ status: 502, body: { code: 'KAKAO_UNAVAILABLE' } });
  });

  it('예상하지 못한 오류 → 502 (AC-04)', async () => {
    const d = deps({
      fetchTokenInfo: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const res = await issueKakaoFirebaseToken({ accessToken: 'valid' }, d);
    expect(res).toMatchObject({ status: 502, body: { code: 'KAKAO_UNAVAILABLE' } });
  });

  it('카카오 응답에 회원번호가 없으면 → 502', async () => {
    const d = deps({ fetchTokenInfo: vi.fn(async () => ({ id: 0, app_id: APP_ID })) });
    const res = await issueKakaoFirebaseToken({ accessToken: 'valid' }, d);
    expect(res).toMatchObject({ status: 502, body: { code: 'KAKAO_UNAVAILABLE' } });
    expect(d.createCustomToken).not.toHaveBeenCalled();
  });

  it('설정 없음 → 500 (AC-04)', async () => {
    for (const d of [deps({ expectedAppId: null }), deps({ createCustomToken: null })]) {
      const res = await issueKakaoFirebaseToken({ accessToken: 'valid' }, d);
      expect(res).toMatchObject({ status: 500, body: { code: 'SERVER_MISCONFIGURED' } });
    }
  });

  it('발급 실패 → 500 (AC-04)', async () => {
    const d = deps({
      createCustomToken: vi.fn(async () => {
        throw new Error('signing failed');
      }),
    });
    const res = await issueKakaoFirebaseToken({ accessToken: 'valid' }, d);
    expect(res).toMatchObject({ status: 500, body: { code: 'TOKEN_ISSUE_FAILED' } });
  });
});

describe('fetchKakaoTokenInfo', () => {
  const ok = (json: unknown, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } }));

  it('200 → id·app_id, Bearer 헤더로 요청', async () => {
    const f = ok({ id: 123456789, expires_in: 7199, app_id: 1234 });
    await expect(fetchKakaoTokenInfo('tok', f)).resolves.toEqual({ id: 123456789, app_id: 1234 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://kapi.kakao.com/v1/user/access_token_info');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer tok');
  });

  it('-401(HTTP 401) → invalid (AC-03)', async () => {
    await expect(fetchKakaoTokenInfo('tok', ok({ code: -401, msg: 'InvalidTokenException' }, 401))).rejects.toMatchObject({
      kind: 'invalid',
    });
  });

  it('-2(HTTP 400) → invalid', async () => {
    await expect(fetchKakaoTokenInfo('tok', ok({ code: -2 }, 400))).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('-1·-7(HTTP 400), 5xx → unavailable (AC-04)', async () => {
    for (const f of [ok({ code: -1 }, 400), ok({ code: -7 }, 400), ok({}, 503)]) {
      await expect(fetchKakaoTokenInfo('tok', f)).rejects.toMatchObject({ kind: 'unavailable' });
    }
  });

  it('네트워크 실패 → unavailable', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(fetchKakaoTokenInfo('tok', f)).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('시간 초과 → unavailable', async () => {
    const f = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    await expect(fetchKakaoTokenInfo('tok', f, 20)).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
