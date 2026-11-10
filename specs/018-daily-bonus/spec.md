# Spec 018 (Lite): 출석 보너스 (버튼 없음)

- 상태: Implementing  <!-- 상태·액션은 있으나 헤더 버튼이 연결되지 않음 (DEC-022) -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

매일 접속하면 300,000 N을 준다. 현재는 우편함의 데일리 응원 상자(기능 012, 같은 금액)가 이 역할을 대신한다.

- 제외: 연속 출석 보상

## 인수 조건

- **AC-01** Given 오늘 받지 않음 When 출석 버튼을 누른다 Then 코인이 300,000(`GAME_CONFIG.DAILY_BONUS_COINS`) 늘고 `lastDailyBonus`가 오늘 날짜가 된다
- **AC-02** Given 오늘 이미 받음 When 다시 누른다 Then 아무 것도 바뀌지 않는다

## 구현 메모

- 바꿀 파일: `src/hooks/useGameState.ts` — `canClaimDailyBonus`, `claimDailyBonus` / `src/components/Navigation/Header.tsx` — props `canClaimDaily`, `onClaimDaily`(받기만 하고 쓰지 않음)
- 다시 열려면: Header에 버튼을 추가하고 App에서 두 액션을 넘긴다. 그 전에 아래 한계를 정리한다.
- 테스트: 수동(버튼 추가 후)
- 알려진 한계: 날짜를 UTC(`toISOString`)로 계산해 다른 보상(KST)과 기준이 다르다. `lastDailyBonus`는 클라우드에 저장되지 않아(기능 008) 기기마다 따로 받을 수 있다.
- [확인 필요: 우편함 응원 상자와 중복되는 이 기능을 지울지, 살릴지 — 구현 막음: 예(재오픈 시). 이력: 첫 커밋 `5c97931`(2026-08-22)에는 헤더에 출석 버튼이 있었고, 34분 뒤 `fe6680e`에서 미스터리 박스 버튼으로 바뀌었다. 그 미스터리 박스(`claimMysteryBox`)도 지금은 호출하는 곳이 없다(기능 019)]

## 작업

- [x] T001 상태·액션 — `useGameState.ts`, `GameState.lastDailyBonus`
- [ ] T002 버튼 연결 또는 코드 삭제 결정 — (보류)

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 실행 불가(버튼 없음) | | 2026-11-10 |
| AC-02 | 실행 불가(버튼 없음) | | 2026-11-10 |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
