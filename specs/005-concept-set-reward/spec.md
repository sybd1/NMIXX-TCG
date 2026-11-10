# Spec 005 (Lite): 컨셉 세트 보상

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

같은 콘셉트로 찍은 멤버 6명의 카드를 모두 모으면 코인 보상을 준다. 도감 안에 중간 목표를 만들어 수집을 이어 가게 한다. 세트는 `src/data/card-data/sets.json`의 6개다. 5개는 2,000,000 N, `set_forward_harmony`(Spinnin' On It)는 50,000,000 N이다.

- 제외: 보상 카드 지급(`rewardCard` 필드는 타입에만 있고 데이터에 없음), 세트 자동 수령

## 인수 조건

- **AC-01** Given 세트 6장 중 5장 보유 When 도감 › `NMIXX 세트 카드 (6종)` 탭을 연다 Then 그 세트에 `수집 현황: 5 / 6 (완성 시 +2,000,000 N COIN)`이 보이고 받기 버튼이 없다
- **AC-02** Given 6장 모두 보유, 미수령 When `🎁 +2,000,000 N COIN 받기!`를 누른다 Then 코인이 2,000,000 늘고 버튼이 `+2,000,000 N COIN 수령 완료`로 바뀐다
- **AC-03** Given 이미 받은 세트 When 버튼을 다시 누르거나 새로고침 후 다시 본다 Then 코인이 늘지 않는다(`claimedSetRewards`에 `setId`가 있으면 무시)
- **AC-04** Given 50,000,000 세트 완성 When 보상을 받는다 Then 코인이 50,000,000 는다

## 구현 메모

- 바꿀 파일: `src/data/card-data/sets.json` — 세트 정의(`setId`, `cardIds` 6개, `rewardCoins`) / `src/pages/Collection/CollectionPage.tsx` — 세트 탭(689~832행) / `src/hooks/useGameState.ts` — `claimSetReward(setId, coins)`
- 저장: `GameState.claimedSetRewards`(클라우드 동기화 대상, 기능 008)
- 재사용: 기능 004 도감 화면, 기능 001 `CONCEPT_SETS`
- 테스트: 자동 테스트 없음(DEC-019). AC-01~04 → 수동: `npm run dev`(전종 보유)에서 세트 탭 → 받기 → 새로고침 후 재확인(로컬은 저장되지 않으므로 AC-03 새로고침 확인은 배포 사이트 로그인 계정으로)
- 알려진 한계: 세트 탭 안내 문구가 "2,000,000 N COIN이 지급됩니다"로 하드코딩되어 50,000,000 세트와 맞지 않는다(822행). 세트가 완성되기만 하면 받기 전에도 "🎉 세트 완성 보상 코인이 지급되었습니다!"가 보인다(820~821행). `(6종)`, `/ 6`이 하드코딩.
- 알려진 한계: `sets.json`의 `packId`와 세트 이름이 맞지 않는 항목이 있다(예: `set_blue_valentine`은 `packId: op02`). 표시에만 쓰여 동작 영향은 없다. 세트 구성 이력: 2026-08-24 `27e38cc`~`3d28bdf`에서 팩별 세트를 지금 구성으로 바꿨다. 아직 만들지 않은 세트 7종은 GitHub 이슈 #8에 있다(product.md 4절).

## 작업

- [x] T001 세트 데이터 — `sets.json`
- [x] T002 세트 탭·수령 — `CollectionPage.tsx`, `useGameState.ts`
- [ ] T003 하드코딩 문구 정리 — `CollectionPage.tsx` (후속)
- [ ] T004 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
