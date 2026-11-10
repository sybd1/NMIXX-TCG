# Spec 019 (Lite): 이스터에그(MMU 우주선·카드)

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

숨은 재미를 넣어 팬끼리 이야기할 거리를 만든다. (1) 팩 탭에 드물게 MMU 우주선이 지나가고 누르면 코인을 준다. (2) 특별 카드 상세에서 카드 그림을 누르면 하루 한 번 소액 코인을 준다.

- 제외: 힌트 화면(`src/data/easterEggs.ts`의 정의는 화면에서 쓰지 않음)

## 인수 조건

- **AC-01** Given 팩 탭에 들어올 때 0.1% 확률로 우주선이 정해짐 When 3초 뒤 오른쪽에서 왼쪽으로 2.5초간 지나가는 우주선을 누른다 Then `이스터에그` / `500,000 N COIN 획득.` 팝업과 함께 코인이 500,000 늘어난다
- **AC-02** Given 이 계정(또는 이 브라우저의 같은 사용자 키)이 이미 받음 When 다시 우주선을 누른다 Then 아무 일도 일어나지 않는다(`hasClaimedMmuEasterEgg` 또는 `localStorage['nmixx_mmu_claimed_<uid>']`. 게스트는 키가 `nmixx_mmu_claimed_guest`라 브라우저당 1회, 새로고침 후에도 유지 — DEC-009 예외)
- **AC-03** Given 보유한 XR 카드(또는 `triggerCelebration` 카드) 상세 When 카드 그림을 누른다 Then 코인이 50 늘어난다
- **AC-04** Given AC-03을 오늘(KST) 이미 함 When 다시 누른다 Then 코인이 그대로다. 다음 날 KST 00:00 이후 다시 받을 수 있다

## 구현 메모

- 바꿀 파일: `src/components/EasterEgg/FlyingMmuShip.tsx`(등장 확률 `Math.random() < 0.001`, 팩 탭에 올 때마다 다시 뽑음) / `src/components/Card/CardModal.tsx`(그림 클릭, 250ms 연타 방지) / `src/hooks/useGameState.ts` — `claimMmuEasterEgg`(+500,000), `claimCardEasterEgg`(+50, `cardEasterEggClaims[cardId] = KST 날짜`)
- 현재 `triggerCelebration`이 있는 카드는 XR 1장뿐이다.
- 테스트: 수동. AC-01·02는 확률 때문에 재현이 어렵다. `FlyingMmuShip.tsx` 10행의 확률을 임시로 1로 바꿔 `npm run dev`에서 확인하고 되돌린다. AC-03·04는 `npm run dev`(전종 보유)에서 XR 상세 확인
- 알려진 한계: `App.tsx` 주석은 "첫 입장 시 등장"이라 하지만 실제는 0.1% 무작위다. 팝업 금액 500,000이 하드코딩. `cardEasterEggClaims`는 클라우드에 저장되지 않아 기기마다 따로 받는다. `claimMysteryBox`(+10,000)는 호출하는 곳이 없다. 이력: 2026-08-24 `29030fa`에서 "첫 입장 시" 날아가도록 만들었고, 이후 GitHub 이슈 #9의 요청("메인 화면에 새로 진입할 때마다 0.1% 확률로 등장, 보상은 계정당 1회 유지")에 따라 0.1%로 바꿨다(`cf6cea8`, 08-31). 0.1%가 의도이고 주석이 낡은 것이다.

## 작업

- [x] T001 MMU 우주선 — `FlyingMmuShip.tsx`, `useGameState.ts` (v1.6.2 계정당 1회 잠금)
- [x] T002 카드 이스터에그 — `CardModal.tsx`, `useGameState.ts` (2026-10-18)
- [ ] T003 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
