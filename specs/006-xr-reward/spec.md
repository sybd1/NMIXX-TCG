# Spec 006 (Lite): XR 전종 수집 보상

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

XR 1장을 뺀 520종을 모두 모은 사람에게 히든 XR 카드(`card_xr_transcendent_park_741`)를 준다. 수집 완주에 상징적인 보상을 주고, 그 전까지는 정체를 숨겨 궁금증을 만든다(DEC-006).

- 제외: 팩·교환·제작으로 XR 얻기, XR 2장 이상 보유

## 인수 조건

- **AC-01** Given 520종 중 519종 보유 When 도감 탭을 연다 Then XR 배너에 `초월 카드 해금 조건 519/520 (100%)`과 `모든 카드 수집 시 해금` 잠금이 보이고, 배너의 XR 카드 앞면은 `?`·`XR 초월`·`TRANSCENDENT CARD`로 가려져 있다(도감 목록에는 XR 칸이 나오지 않음)
- **AC-02** Given 520종을 모두 모은 직후, XR 미보유 When 도감 탭을 연다 Then 팡파레와 함께 `🎺 축하합니다! 모든 카드 수집 달성!` 창이 뜨고 XR 1장이 컬렉션에 들어간다
- **AC-03** Given XR 보유 When 도감·정보 탭을 본다 Then 멤버 필터에 `박진영`, 등급 필터에 `XR`, 업적에 XR 항목, 전광판에 XR 소식이 보이기 시작하고, 배너는 `초월 카드 획득 완료!`다
- **AC-04** Given XR 보유 When XR이 팩·교환·제작·localStorage 저장본 로드 경로로 다시 들어와도 Then 보유 수는 1이다 (클라우드 데이터 적용 `applyCloudData`는 제한하지 않아, 클라우드 값이 2 이상이면 그대로 들어온다)

## 구현 메모

- 바꿀 파일: `src/data/card-data/special.json` — XR 카드 / `src/pages/Collection/CollectionPage.tsx` 99~117행(조건 검사·자동 지급), 300~392행(배너) / `src/hooks/useGameState.ts` — `claimXrCard`, 모든 카드 추가 경로의 `isXR ? 1 : n+1` / `src/services/storageService.ts` `loadState` — 1장 제한 / `src/services/rngService.ts` — 추첨 풀 제외
- 재사용: `CardVisual`의 XR 미스터리 표시(기능 001), `GlobalTicker`의 `showXr`(기능 011)
- 테스트: 자동 테스트 없음. AC-01~03 → 수동: 배포 사이트 테스트 계정의 Firestore `collection`을 콘솔에서 519종/520종으로 준비 → 로그인 후 도감 탭. AC-04 → 코드 검토(`grep -n "isXR" src/hooks/useGameState.ts`로 모든 경로 확인)
- [확인 필요: 지급 조건 검사가 도감 탭의 `useEffect`에만 있어, 520종을 채워도 도감 탭을 열기 전에는 XR이 들어오지 않는다. 의도된 "도감에서 해금" 연출인지 — 구현 막음: 아니오. 근거: 2026-08-23 `60e14d2`의 의도가 "COLLECTION에 들어가면 자동 축하·획득 연출"이었으므로 도감 진입 시 지급은 설계된 동작으로 보인다. 남은 질문은 도감을 열지 않는 사용자에게도 지급할지다]
- [확인 필요: 새 팩을 추가하면 기존 XR 보유자는 전종이 아니게 되지만 XR은 유지된다. 이 정책을 공지할지 — 기능 001 plan 3절]

## 작업

- [x] T001 XR 카드 데이터·추첨 제외 — `special.json`, `rngService.ts`
- [x] T002 도감 배너·자동 지급·축하 창 — `CollectionPage.tsx`, `useGameState.ts`
- [x] T003 1장 제한 — `useGameState.ts`, `storageService.ts` (v1.5.3)
- [ ] T004 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | 코드상 팩·교환·제작·로드 경로 모두 1 제한 확인. 관찰 근거 없음 | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
