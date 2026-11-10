# Spec 016 (Lite): 카드 교환소 (메뉴 숨김)

- 상태: Implementing  <!-- 화면·서비스 코드는 있으나 여는 버튼이 없음 (DEC-022) -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

중복 카드를 다른 사람의 카드와 1:1로 바꿔 수집을 돕는다.

- 제외: 코인 거래, 경매, 여러 장 묶음 교환

## 인수 조건

- **AC-01** Given 2장 이상 가진 카드 X, 미보유 카드 Y When `내 중복 카드 거래 등록`에서 X 제공·Y 희망으로 등록 Then `nmixx_tcg_market`에 `status: OPEN` 매물이 생기고 `🎉 거래소에 카드가 성공적으로 등록되었습니다!` 후 목록 탭으로 간다
- **AC-02** Given 이미 매물에 올린 수량을 빼면 2장 미만 When 같은 카드를 또 등록 Then `제공할 카드의 유효 보유 수량(이미 등록된 매물 제외)이 부족합니다.`
- **AC-03** Given 다른 사람의 매물(X 제공, Y 희망), 내가 Y 보유 When `맞교환하기` Then 내 Y가 1 줄고 X가 1 늘며 매물이 `COMPLETED`가 된다
- **AC-04** Given Y 미보유 When 매물을 본다 Then 버튼이 비활성이고 `보유 카드 없음`으로 표시된다(`교환에 필요한 … 보유하고 있지 않습니다.` 알림 코드는 있으나 도달하지 않음)
- **AC-05** Given 매물 없음 When 교환소를 연다 Then `현재 등록된 교환 매물이 없습니다. 최초로 카드를 등록해 보세요!`

## 구현 메모

- 바꿀 파일: `src/components/Multiplayer/MarketModal.tsx` / `src/services/multiplayerService.ts` — `fetchTradeListings`(최근 40개 중 OPEN), `createTradeListing`, `completeTrade`, `fetchUserProfile`, `fetchUserCollection` / `src/hooks/useGameState.ts` `applyTradeResult` / `src/types/multiplayer.ts` `CardTradeListing`
- 다시 열려면: `Header.tsx`에 `onOpenMarket`을 호출하는 버튼을 추가한다(`App.tsx`에는 연결되어 있음).
- **열기 전에 해결해야 하는 구조 문제**: 교환은 구매자 쪽 컬렉션만 바꾸고 판매자의 컬렉션은 바꾸지 않는다. 판매자는 X를 계속 갖고 Y를 받지 못한다. 서버가 없어(DEC-001) 다른 사용자의 문서를 안전하게 바꿀 방법이 없다. Cloud Functions 도입 등 DEC가 필요하다.
- 테스트: 수동. 버튼을 임시로 추가하고 테스트 계정 두 개로 AC-01~05
- 알려진 한계: 로그인하지 않으면 가짜 게스트 계정으로 등록·교환을 시도한다(서비스에서 거부). 교환 실패 시 안내가 없다. 판매자 정보의 `/ 651장` 표기 오류.

## 작업

- [x] T001 매물 서비스 — `multiplayerService.ts` (v1.6.0)
- [x] T002 교환소 창 — `MarketModal.tsx`
- [ ] T003 판매자 쪽 반영 방식 결정(DEC 필요) — (보류, v1.6.1에 비활성화)
- [ ] T004 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 실행 불가(진입 버튼 없음) | | 2026-11-10 |
| AC-02 | 실행 불가(진입 버튼 없음) | | 2026-11-10 |
| AC-03 | 실행 불가(진입 버튼 없음) | | 2026-11-10 |
| AC-04 | 실행 불가(진입 버튼 없음) | | 2026-11-10 |
| AC-05 | 실행 불가(진입 버튼 없음) | | 2026-11-10 |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
