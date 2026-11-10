# Plan 008: 게임 데이터 저장과 기기 간 동기화

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 관련 구조:
  - `src/hooks/useGameState.ts` — `GameState`를 가진 단일 훅. `App.tsx`에서 한 번 호출해 하위에 내려준다
  - `src/services/authService.ts` — `subscribeAuthState`(로그인·로그아웃 통지), `logout`(로그아웃 전 강제 저장)
  - `src/config/firebase.ts` — `db`, `isFirebaseConfigured`
- 재사용할 것: `MultiplayerService.updateLeaderboardEntry` (기능 010), `getCompletedAchievementCategories` (기능 009)
- 이 기능이 만든 파일:
  - `src/services/storageService.ts` — localStorage 읽기·쓰기, 초기 상태 생성기, `isLocalServer`
  - `src/services/cloudSyncService.ts` — Firestore 읽기·쓰기·구독, 중복 쓰기 방지 해시
  - `src/hooks/useGameState.ts` 1~225행 — 저장 이펙트, 로그인 전환 이펙트, 클라우드 적용
- 실행·검증 명령: `npx tsc --noEmit`, `npm run build`, 배포 환경 수동 확인(DEC-017 때문에 로컬에서 재현 불가)

## 2. 구조와 데이터 흐름

```text
[저장] 액션(setState)
  → useEffect([state])                                useGameState.ts:31
      stateRef 갱신, StorageService.saveState(state, activeUserRef.id)   (게스트면 무시)
      skipNextCloudSaveRef면 여기서 종료 (원격에서 받은 변경)
      isSyncingRef 또는 isLocalServer()면 종료
  → CloudSyncService.saveUserGameData(user, data)     cloudSyncService.ts:87
      해시가 직전과 같으면 종료
      setDoc(nmixx_tcg_users/<uid>, payload, merge)
      → MultiplayerService.updateLeaderboardEntry(...)  (기능 010)

[로그인] AuthService.notifyAuthChange(user)
  → subscribeAuthState 콜백                            useGameState.ts:106
      기존 onSnapshot 해제, isSyncingRef = true
      loadUserGameData(uid)
        있음 → applyCloudData (로컬 전용 필드는 peekState로 보존)
        없음 → 로컬 저장본 또는 초기 상태 → (로컬 서버가 아니면) 클라우드에 1회 저장
              (로그인 함수가 프로필을 먼저 써서 이 분기는 드묾, 7절)
      300ms 뒤: isSyncingRef = false, 랭킹 강제 갱신, onSnapshot 구독 시작
        첫 스냅샷은 무시, 이후 스냅샷 → skipNextCloudSaveRef = true → applyCloudData

[로그아웃] AuthService.logout()
  → localStorage 저장본으로 saveUserGameData 강제 실행(forceResetHash)
  → Firebase/Kakao 로그아웃 → notifyAuthChange(null)
  → 콜백: activeUserRef = null 먼저 → 게스트 초기 상태로 setState → 50ms 뒤 가드 해제
```

- 실패 지점: Firestore 읽기 실패 → `loadUserGameData`가 null 반환 → "문서 없음"과 같은 경로로 처리된다(아래 위험 참고). 쓰기 실패 → `console.warn` 후 false 반환, 재시도 없음. 다음 상태 변경 때 해시가 달라 다시 시도된다.
- 새로고침·재진입: 로그인 세션은 `localStorage['nmixx_tcg_auth_session_v1']`에서 복원되고, 상태는 `StorageService.loadState(uid)`로 즉시 그린 뒤 클라우드 값으로 바뀐다.

## 3. 계약 (단일 원본)

- 계약 원본 위치: `src/types/game.ts`(`GameState`), `src/services/cloudSyncService.ts`(`CloudGameData`). 아래는 저장 위치와 필드 대응만 적는다.

### 데이터 모델

| 저장소 | 키·경로 | 내용 |
|---|---|---|
| localStorage | `nmixx_tcg_user_<uid>` | `GameState` 전체 JSON |
| localStorage | `nmixx_tcg_auth_session_v1` | 로그인 `UserAccount` (게스트는 sessionStorage) |
| localStorage | `nmixx_mmu_claimed_<uid>` | MMU 이스터에그 수령 표시 (기능 019) |
| Firestore | `nmixx_tcg_users/<uid>` | `CloudGameData` + 프로필 필드(`displayName`, `nickname`, `avatarMemberId`, `avatarUrl`, `email`, `provider`, `lastLoginAt`, `sessionId`) |

`GameState` ↔ `CloudGameData` 필드 대응 (이름이 다른 것만):

| GameState | CloudGameData |
|---|---|
| `pityCount` | `pityCounter` |
| `openedPacksTotal` | `totalPacksOpened` |
| `claimedAchievements` | `unlockedAchievements` |

클라우드에 없는 필드(`coinsSpentTotal`, `packHistory`, `lastDailyBonus`, `soundMuted`, `isFirstVisit`, `coinReset_v16`, `cardEasterEggClaims`)는 `applyCloudData`가 로컬 저장본에서 가져온다.

### 로컬 함수 시그니처

```ts
// storageService.ts
isLocalServer(): boolean
createGuestInitialState(): GameState      // 100만 N, 로컬 서버면 전종 보유
createAdminInitialState(): GameState      // 1억 N, 전종 보유 (DEC-012)
StorageService.loadState(uid?): GameState  // 없으면 초기 상태를 만들어 저장, XR 1장 제한 적용
StorageService.peekState(uid?): GameState | null   // 만들지 않음
StorageService.saveState(state, uid?): void        // 게스트면 무시

// cloudSyncService.ts
CloudSyncService.loadUserGameData(uid): Promise<CloudGameData | null>
CloudSyncService.saveUserGameData(user, data): Promise<boolean>
CloudSyncService.subscribeUserGameData(uid, onData, onError?): () => void
CloudSyncService.forceResetHash(): void
```

- 중복 쓰기 방지 해시(`cloudSyncService.ts:108`): `displayName_avatarMemberId_보유카드종수_coins_pityCounter_totalPacksOpened_업적수_세트보상수_쿠폰수_MMU여부_lastMailClaimDate_배지목록`. `dust`, 카드별 수량은 포함하지 않는다(spec 7절 한계).
- 인증·권한: 게스트(`id === 'guest'`)·`isCloudSynced === false`면 클라우드 함수가 모두 즉시 반환한다. 서버 측 권한은 `firestore.rules`에 따른다.
- 동시 변경: 마지막 쓰기 우선(DEC-011). `setDoc(..., { merge: true })`라 필드 단위로 덮어쓴다.
- 부분 실패: 유저 문서 저장 성공 후 랭킹 갱신이 실패해도 되돌리지 않는다. 다음 저장·로그인 때 랭킹이 다시 계산된다(DEC-016).

## 4. 화면 구현

해당 없음.

## 5. 설계 결정

- 클라우드 반영을 기다리지 않고 로컬 상태를 먼저 바꾼다(낙관적 저장) — 이유: 개봉 연출이 네트워크에 막히면 안 됨 — 대안: 저장 성공 후 화면 반영
- 가드 3종(`isSyncingRef`, `skipNextCloudSaveRef`, `activeUserRef`)으로 덮어쓰기를 막는다 — 2026-08-31 피드백 루프·로그아웃 유실 버그 수정에서 도입 (커밋 `6293536`, `0a984f7`)
- 다기기 실시간 동기화, 단일 세션 강제 없음 — DEC-010 → DEC-011
- 로컬 개발 환경은 클라우드 쓰기 금지 — DEC-017

## 6. AC → 테스트 매핑

자동 테스트가 없어(DEC-019) 모두 수동이다. "자동화 후보"는 DEC-020 확정 시 먼저 만들 테스트다.

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 수동 | 절차 M1 | 1팩 개봉 → localStorage·Firestore `coins` 996,200 |
| AC-02 | 수동 | 절차 M2 | 게스트 개봉 후 새로고침 → 1,000,000 / 0장, `nmixx_tcg_guest` 키 없음 |
| AC-03 | 수동 (자동화 후보: 단위, `saveUserGameData`에 같은 data 두 번 → `setDoc` 1회) | 절차 M3 | 사운드 토글만 → Network 탭에 Firestore Write 없음 |
| AC-04 | 수동 | 절차 M4 | 기기 B 로그인 → A와 같은 값 |
| AC-05 | 수동 | 절차 M5 | 새 계정 로그인 → 문서 생성, 재로그인 시 유지 |
| AC-06 | 코드 검토 + 수동 | `useGameState.ts:48` 가드 / 절차 M4 중 Firestore 문서 변화 관찰 | 로그인 직후 문서 값이 초기값으로 바뀌지 않음 |
| AC-07 | 수동 | 절차 M6 | A 개봉 → B 화면 자동 갱신 |
| AC-08 | 수동 | 절차 M6 중 B의 Network 탭 | B에서 Write 0회 |
| AC-09 | 수동 | 절차 M7 | 개봉 직후 로그아웃·재로그인 → 값 유지 |
| AC-10 | 수동 | 절차 M7 중 Firestore 콘솔 | 로그아웃 후 문서 값 불변 |
| AC-11 | 수동 | 절차 M8 | localhost 개봉 → Firestore 불변 |

수동 절차 (M1~M7은 배포 사이트 `https://nmixx-tcg.vercel.app`에서, Firestore 콘솔을 함께 연다):

- M1: 로그인 → 정보 탭에서 코인 확인 → 1팩 구매·개봉 → DevTools Application › Local Storage의 `nmixx_tcg_user_<uid>`와 Firestore `nmixx_tcg_users/<uid>`의 `coins` 확인
- M2: 시크릿 창(로그인 안 함)에서 1팩 개봉 → 새로고침 → 코인·도감 확인, Local Storage 키 목록 확인
- M3: 로그인 상태에서 DevTools Network를 `firestore` 필터 → 소리 켜기/끄기만 반복 → `Write` 채널 요청이 없는지 확인
- M4: 브라우저 A에서 진행이 있는 계정 → 다른 브라우저 프로필 B(Local Storage 비어 있음)에서 같은 계정 로그인 → 코인·도감 수 비교
- M5: 새 구글 계정으로 로그인 → 화면 코인 1,000,000 확인, Firestore 문서에 프로필 필드만 있는지 확인 → 1팩 개봉 → 문서에 `coins`·`collection` 생성 확인 → 로그아웃·재로그인 → 초기화되지 않았는지 확인
- M6: A·B 동시 로그인 → A에서 1팩 개봉 → B 화면의 코인이 자동으로 바뀌는지, B의 Network에 Write가 없는지 확인
- M7: 카카오 로그인 → 1팩 개봉 → 연출이 끝나자마자 프로필에서 로그아웃 → Firestore 문서가 그 사이 바뀌지 않았는지 확인 → 재로그인 후 코인 확인
- M8: `npm run dev` → 로그인 → 1팩 개봉 → Firestore 문서의 `lastSavedAt`이 바뀌지 않았는지 확인

## 7. 위험과 구현 순서

- 위험: Firestore 읽기가 네트워크 오류로 실패하면 `loadUserGameData`가 null을 돌려주고, 로그인 흐름은 "문서 없음"으로 판단한다. 이때 로컬 저장본(`peekState`)이 있으면 그 값을, 없으면 **초기 상태를 클라우드에 저장**한다. 새 기기에서 오프라인으로 로그인하면 진행이 초기화될 수 있다. — 확인 방법: 절차 M4를 DevTools Offline으로 반복. 고칠 때는 `loadUserGameData`가 "없음"과 "실패"를 구분해 반환하도록 바꾼다.
- 위험(코드 검토로 확인): `loginWithGoogle`·`loginWithKakao`는 `saveSession`(=로그인 통지) **전에** 같은 `nmixx_tcg_users/<uid>` 문서에 프로필 필드를 쓴다(`authService.ts` 193~211행, 301~319행). 그래서 로그인 통지 시점의 `loadUserGameData`는 대개 문서를 찾아 `applyCloudData`로 가고, 없는 필드는 기본값(코인 1,000,000, 빈 컬렉션)으로 채운다. "문서 없음 → 초기 상태 생성·업로드" 분기는 `onAuthStateChanged` 경로가 먼저 실행되는 경우 등에만 탄다. 결과: 새 계정의 `coins`·`collection`은 첫 상태 변경 때 처음 저장되고, 운영자 초기 상태(DEC-012)는 거의 적용되지 않는다.
- 위험: 300ms·50ms `setTimeout` 가드는 타이밍 가정이다. 느린 기기에서 `applyCloudData`의 setState보다 먼저 가드가 풀리는지 [확인 필요].
- 순서(최초 구현 기준): storageService → cloudSyncService → useGameState 저장 이펙트 → 로그인 전환 이펙트 → onSnapshot 구독 → 로그아웃 강제 저장

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
