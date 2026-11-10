# Plan 007: 로그인(구글·카카오·게스트)

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 이 기능이 만든 파일:
  - `src/types/auth.ts` — `UserAccount`, `AuthProvider`
  - `src/config/firebase.ts` — Firebase 앱·Auth·Firestore·GoogleAuthProvider 초기화, `initKakaoSdk()`
  - `src/services/authService.ts` — `AuthService`(정적 클래스): 로그인 3종, 세션 저장·로드, 구독, 로그아웃, 프로필·탈퇴(기능 013·014), `sanitizeDisplayName`
  - `src/services/securityService.ts` — `hashSHA256`, `generateSecureUID`
  - `src/components/Auth/AuthModal.tsx` — 로그인 창
  - `index.html` — Kakao SDK `<script src="https://developers.kakao.com/sdk/js/kakao.min.js">`
- 환경 변수(`.env.example`): `VITE_FIREBASE_*` 6개, `VITE_KAKAO_JS_KEY`. 없으면 `firebase.ts`의 기본값(공개 클라이언트 키)을 쓴다.
- 실행·검증 명령: `npm run dev` 후 `http://localhost:3000`, 배포 사이트. [확인 필요: Authorized domains 목록 — README 기준 127.0.0.1은 미등록]

## 2. 구조와 데이터 흐름

```text
AuthModal 버튼
  → AuthService.loginWithGoogle(nick?)
      signInWithPopup → fbUser
      fetchExistingProfile('goog_'+uid)  (Firestore users 문서의 displayName/nickname)
      닉네임 결정 (운영자 이메일 → '운영자' / 기존 프로필 / 신규: 입력→구글이름→기본값, 중복이면 접미사)
      setDoc(users/<id>, {displayName, nickname, email, avatarUrl, avatarMemberId, provider, lastLoginAt, sessionId}, merge)
      saveSession(account) → localStorage 저장 → notifyAuthChange(account)
  → AuthService.loginWithKakao(nick?)
      initKakaoSdk() → Kakao.Auth.login → Kakao.API.request('/v2/user/me')
      닉네임 결정 (같은 기기 세션 → Firestore 프로필 → 신규)
      setDoc(...) → saveSession → notify
      (SDK 없음 → 무작위 ID 로컬 계정 생성, spec 7절)
  → AuthService.loginAsGuest() → id 'guest', sessionStorage 저장
구독자: App(user 상태), useGameState(기능 008)
Firebase onAuthStateChanged: 구글 세션이 로컬 세션과 다르면 세션 재구성 / Firebase 로그아웃 감지 시 구글 세션만 정리
```

- 실패 지점: 구글 팝업 차단·닫힘, `auth/unauthorized-domain` → `Error(message)`로 던지고 `AuthModal`이 그 문구를 표시. 카카오 실패는 SDK 오류 객체를 그대로 reject하며, `AuthModal`이 `err.message`가 없으면 `카카오 로그인 처리 중 문제가 발생했습니다.`를 표시. Firestore 프로필 쓰기 실패는 `console.warn` 후 로그인은 성공 처리.
- 새로고침: `AuthService.getCurrentUser()`가 `loadSession()`으로 복원. 이때 운영자·특정 닉네임 치환을 다시 적용한다.

## 3. 계약 (단일 원본)

- 계약 원본 위치: `src/types/auth.ts`.

```ts
// 요약 (원본: src/types/auth.ts)
type AuthProvider = 'google' | 'kakao' | 'guest';
interface UserAccount {
  id: string;              // 'goog_<uid>' | 'kakao_<id>' | 'guest'
  provider: AuthProvider;
  email: string; displayName: string; avatarUrl: string;
  avatarMemberId?: string; // LILY | HAEWON | SULLYOON | BAE | JIWOO | KYUJIN
  createdAt: number; lastLoginAt: number;
  isCloudSynced: boolean;  // 게스트만 false
  securityHash: string;    // SHA-256(id:provider:displayName:email:createdAt + pepper)
  sessionId?: string;      // 기록만 함 (DEC-011)
}
```

- 저장 위치: 로그인 계정 `localStorage['nmixx_tcg_auth_session_v1']`, 게스트 `sessionStorage` 같은 키.
- 운영자 판별: DEC-012 (여러 파일에 중복 구현).
- 인증·권한: Firestore 규칙 `request.auth != null` — 구글만 충족(DEC-008, product.md Q-02).

## 4. 화면 구현

- 진입 경로: `Header`의 `로그인` 버튼 → `App`의 `isAuthModalOpen`
- 컴포넌트: `AuthModal` — props `isOpen`, `onClose`, `onLoginSuccess(user)`. 상태 `nicknameInput`, `isLoading`, `selectedProvider`, `errorMessage`.
- 성공 시 `App`이 `user`를 갱신하고 창을 닫는다. 게임 상태 전환은 `useGameState`의 구독이 처리(기능 008).

## 5. 설계 결정

- 구글 Firebase 팝업 + 카카오 JS SDK — DEC-008
- 게스트는 저장하지 않음 — DEC-009
- 단일 세션 강제 폐기 — DEC-010 → DEC-011
- 운영자 식별·랭킹 제외 — DEC-012
- 리다이렉트 대신 팝업 — 이유: SPA 상태 유지 — 대안: `signInWithRedirect`(COOP 문제는 없지만 상태 복원 필요)

## 6. AC → 테스트 매핑

모두 수동(DEC-019). 실제 계정이 필요하다.

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 수동 | M1 | 새 구글 계정 → 문서 생성 |
| AC-02 | 수동 | M2 | 닉네임 변경 후 재로그인 → 유지 |
| AC-03 | 수동 | M3 | 팝업 닫기 → 안내 문구 |
| AC-04 | 수동 | M4 | 127.0.0.1 → 도메인 오류 |
| AC-05 | 수동 | M5 | 카카오 → 문서 생성 |
| AC-06 | 수동 | M5 | 카카오 취소 → 오류 |
| AC-07 | 수동 | M6 | 게스트 → 랭킹 미등록 |
| AC-08 | 수동 | M2 | 새로고침 → 로그인 유지 |
| AC-09 | 수동 | M2 | 로그아웃 → 게스트 상태 |
| AC-10 | 수동 | M7 | 운영자 계정 → 이름·랭킹 |

- M1: 시크릿 창 → 배포 사이트 → `로그인` → 닉네임 비움 → 테스트용 구글 계정 → Firestore 콘솔 `nmixx_tcg_users`에서 `goog_…` 문서 확인
- M2: M1 계정으로 프로필에서 닉네임 변경 → 새로고침(유지 확인) → `로그아웃`(헤더·탭·코인 확인) → 다시 구글 로그인 → 닉네임 확인
- M3: `Google 계정으로 시작` → 팝업 창 닫기
- M4: `npm run dev` → `http://127.0.0.1:3000` → 구글 로그인
- M5: 카카오 테스트 계정으로 로그인 → 문서 확인 → 로그아웃 → 다시 시도하며 카카오 창에서 취소
- M6: 게스트 시작 → 팩 몇 개 개봉 → 랭킹 탭에 이름이 없는지 확인
- M7: 운영자 이메일 계정으로 로그인 → 헤더 이름 → 랭킹 탭에 없음 확인

## 7. 위험과 구현 순서

- 위험: 운영자 판별에 `chip`이 들어간 이메일·ID가 모두 포함되어, 일반 사용자 이메일에 `chip`이 있으면 운영자로 취급된다(이름이 `운영자`로 바뀌고 랭킹에서 빠짐). [확인 필요: 판별 규칙을 운영자 이메일 하나로 좁힐지]
- 위험: `isNicknameAvailable`는 조회 실패 시 `true`를 반환한다(중복 허용).
- 순서(최초 구현 기준): 로컬 세션(v1.0.5) → Firebase·Kakao 공식 연동(v1.5.6) → 게스트 분리(v1.6.1) → 운영자 처리(2026-08-31) → 카카오 닉네임 우선순위 수정(커밋 `0f62eca`)

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
