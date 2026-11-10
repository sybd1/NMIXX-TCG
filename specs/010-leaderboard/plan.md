# Plan 010: 글로벌 랭킹

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 이 기능이 만든 파일:
  - `src/types/multiplayer.ts` — `LeaderboardEntry`
  - `src/services/multiplayerService.ts` — `fetchLeaderboard`, `updateLeaderboardEntry`, `compareLeaderboard`, `completionMillis`, `getMockBots`, `getBotCollection`, `fetchUserProfile`, `fetchUserCollection`
  - `src/pages/Ranking/RankingPage.tsx` — 랭킹 탭
  - `src/components/Ranking/AchievementBadges.tsx` — 닉네임 옆 배지
  - `src/components/Multiplayer/LeaderboardModal.tsx` — 모달판 랭킹과 상대 프로필(현재 여는 버튼 없음)
- 호출하는 곳: `CloudSyncService.saveUserGameData`(저장마다), `useGameState` 로그인 300ms 후(로그인마다, DEC-016), `AuthService.updateProfile`(닉네임·아바타만)
- 실행·검증 명령: 배포 사이트 + Firestore 콘솔(로컬은 랭킹에 쓰지 않음, DEC-017)

## 2. 구조와 데이터 흐름

```text
[갱신] saveUserGameData / 로그인 후 강제 갱신
  → updateLeaderboardEntry(user, stats)
      게스트·미동기화 → 종료 / 운영자 → 랭킹 문서 삭제 후 종료
      getDoc(leaderboard/<uid>) → existing
      payload = {uid, displayName(sanitize), avatar, uniqueCardCount, collectionRate,
                 totalPacksOpened, coins, hasXR, achievementBadges, updatedAt: serverTimestamp()}
      전종이면 fullCollectionAt = existing.fullCollectionAt ?? (existing 전종 ? existing.updatedAt : serverTimestamp())
      setDoc(merge)

[조회] RankingPage mount / 새로고침
  → fetchLeaderboard(50)
      getDocs(orderBy uniqueCardCount desc)  ← 전체 문서
      각 문서: 테스트·운영자 판정 → 목록에서만 건너뜀 (삭제하지 않음, T006)
      + getMockBots() 53명
      sort(compareLeaderboard) → rank 부여 → 상위 50
  → 화면: 수집률 = uniqueCardCount / MASTER_CARDS.length 로 재계산, 내 줄은 로컬 배지로 덮어씀
```

- 실패 지점: 조회 예외 → `console.warn` 후 봇만으로 진행. 갱신 예외 → `console.warn`, 다음 저장 때 재시도.
- 새로고침: 매번 새로 조회. 캐시 없음.

## 3. 계약 (단일 원본)

- 계약 원본 위치: `src/types/multiplayer.ts`의 `LeaderboardEntry`. 정렬 규칙 원본은 `multiplayerService.ts`의 `compareLeaderboard`.

```ts
// 요약 (원본: src/types/multiplayer.ts)
interface LeaderboardEntry {
  uid: string; displayName: string; avatarUrl: string; avatarMemberId: string;
  uniqueCardCount: number;
  collectionRate: number;        // 저장값. 화면은 재계산값을 씀
  totalPacksOpened: number; coins: number; hasXR: boolean;
  achievementBadges?: string[];  // 'PACK_SETS' | 'RARITY' | 'SPENDING' | 'PACKS'
  rank?: number;                 // 조회 시 부여, 저장하지 않음
  updatedAt: any;                // serverTimestamp
  fullCollectionAt?: any;        // 최초 전종 시각, 불변
}
// Firestore: nmixx_tcg_leaderboard/<uid>
```

- `completionMillis`: Timestamp(`toMillis`)·`{seconds}`·number를 ms로, 없으면 `MAX_SAFE_INTEGER`(맨 뒤).
- 인증·권한: 규칙상 읽기 공개, 쓰기는 `request.auth != null`(본인 확인 없음, product.md Q-01).
- 동시 변경: `setDoc(merge)` 마지막 쓰기 우선. `fullCollectionAt`은 읽고-쓰기라 동시 첫 완성은 이론상 경쟁 가능(영향 미미).

## 4. 화면 구현

- 진입 경로: `currentTab === 'ranking'`
- 컴포넌트: `RankingPage` — props `currentUserId`, `collection`, `myAchievementBadges` / `AchievementBadges` — props `badges`
- 상태: `entries`, `isLoading`(최초), `isRefreshing`(새로고침, 최소 600ms), `isShareOpen`.
- 공유 버튼은 기능 020(`ShareBadgeModal`)을 연다. 대표 카드 3장은 이 화면에서 계산해 넘긴다.

## 5. 설계 결정

- 전종 동률은 완성 시각 선착순, 배지 표시 — DEC-018
- 수집률 재계산 — DEC-016
- 운영자 제외 — DEC-012
- 조회 경로는 문서를 지우지 않는다(목록에서 숨김만) — DEC-023
- 봇 53명 혼합 — 이유: 초기 사용자 수가 적을 때 순위표가 비어 보이지 않게 — 대안: 실제 사용자만 표시 [확인 필요: 사용자 수가 충분해진 지금도 봇을 유지할지]

## 6. AC → 테스트 매핑

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 단위 후보(DEC-020) + 수동 | `compareLeaderboard` / M1 | 300 vs 250 → 300 먼저 |
| AC-02 | 단위 후보 | `compareLeaderboard` | 둘 다 521, 이른 시각 먼저 |
| AC-03 | 수동 | M2 | 전종 계정 저장 후 `fullCollectionAt` 불변 |
| AC-04 | 코드 검토 | `multiplayerService.ts` 224~232행 | 이관 분기 |
| AC-05 | 수동 | M1 | 개봉 → 문서 필드 갱신 |
| AC-06 | 수동 | 기능 007 plan M6·M7 | 게스트·운영자 미표시 |
| AC-07 | 수동 | M3 | 문서의 `collectionRate`를 바꿔도 화면은 재계산값 |
| AC-08 | 수동 | M4 | 배지 표시 |
| AC-09 | 수동 | M5 | 오프라인 → 봇 50명 |
| AC-10 | 수동 | M5 | 오프라인 → 오류 창 없음, 온라인 후 새로고침 |
| AC-11 | 수동 + 코드 검토 | M6 / `fetchLeaderboard`에 `deleteDoc` 없음 | `mock_` 문서 → 목록에 없음, 콘솔에 문서 남음 |
| AC-12 | 수동 | M7 | `카카오_엔써_` 문서 → 목록에 있음, 문서 남음 |

- M1: 로그인 계정 A로 팩 개봉 → Firestore `nmixx_tcg_leaderboard/<uid>` 필드 확인 → 랭킹 탭에서 순위 확인
- M2: 전종 계정(테스트 계정에 쿠폰·개봉으로 도달, 또는 콘솔에서 준비) → 저장 전후 `fullCollectionAt` 비교
- M3: 콘솔에서 테스트 계정 랭킹 문서의 `collectionRate`를 99로 바꿈 → 랭킹 탭 표시값 확인
- M4: 업적 `PACKS` 카테고리(10~100만 팩)는 현실적으로 달성이 어려우므로, 콘솔에서 테스트 문서 `achievementBadges`에 `["PACKS"]`를 넣고 다른 계정으로 확인
- M5: DevTools Network Offline → 랭킹 탭 → 봇 목록 확인 → Online → 새로고침
- M6: Firebase 콘솔에서 `nmixx_tcg_leaderboard/mock_sdd_check`와 `nmixx_tcg_users/mock_sdd_check`를 만든다(`uniqueCardCount` 300) → 다른 계정으로 랭킹 탭을 열고 새로고침 → 목록에 없는지, 콘솔에 두 문서가 남았는지 확인 → 문서 삭제. 보조 근거: 랭킹을 여는 동안 `performance.getEntriesByType('resource')`에 `Firestore/Write` 요청이 없는지 본다
- M7: M6과 같은 방법으로 `displayName: '카카오_엔써_ab12'` 문서를 만들고 목록 표시와 문서 유지를 확인한다

## 7. 위험과 구현 순서

- 위험(해결됨, 2026-11-10): spec 7절 조회 중 데이터 삭제는 T006에서 제거했다.
- 위험: 랭킹 컬렉션 전체 읽기. 문서가 수천 개를 넘으면 `limit` 쿼리 + 서버 정렬로 바꿔야 한다(단, 완성 시각 동률 규칙 때문에 복합 정렬 필요).
- 순서(최초 구현 기준): 랭킹 문서·조회(2026-08-24 `acf6c87`, v1.6.0) → 조회 중 테스트 계정 삭제(08-24 `d6704da`, 2026-11-10 제거) → 봇·순위 배지(08-30 `cac0b22`) → 운영자·테스트 정리(2026-08-31) → 수집률 재계산(2026-09-01) → 완성 시각·배지(2026-10-18)

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
