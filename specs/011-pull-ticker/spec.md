# Spec 011 (Lite): 고등급 획득 전광판

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

다른 사람이 지금 SSR 이상을 뽑았다는 소식을 상단 전광판으로 보여 줘, 혼자 하는 게임에 "함께 하는" 느낌을 준다.

- 제외: 게스트의 획득 소식, 과거 기록 목록, 소식 클릭 동작

## 인수 조건

- **AC-01** Given 로그인 사용자 A When A가 SSR 이상 카드를 얻는다(팩을 찢는 순간) Then Firestore `nmixx_tcg_global_feed`에 `{uid, userName, cardId, cardName, rarity, member, image, timestamp}` 문서가 카드마다 하나씩 생긴다
- **AC-02** Given AC-01 직후 When 다른 사용자 B가 화면을 보고 있다 Then B의 전광판에 `🎉 A 님 획득: [SSR] {카드 이름}`이 나타나고, 최근 15개를 4.5초마다 돌려 보여 준다
- **AC-03** Given 게스트 When SSR을 얻는다 Then 전광판 문서가 생기지 않는다
- **AC-04** Given XR 미보유 사용자 When XR 획득 소식이 있다 Then 그 소식은 보이지 않는다(XR 보유자에게만 보임)
- **AC-05** Given 소식이 하나도 없거나 구독 오류 When 앱을 연다 Then 전광판 자체가 보이지 않는다

## 구현 메모

- 바꿀 파일: `src/services/multiplayerService.ts` — `broadcastHighTierPull`, `subscribeGlobalFeed`(onSnapshot, `orderBy timestamp desc`, `limit 15`) / `src/components/Navigation/GlobalTicker.tsx` / `src/hooks/useGameState.ts` — `commitPackOpening`에서 호출 / `src/types/multiplayer.ts` — `GlobalPullFeedItem`
- 테스트: 수동. 브라우저 두 개(A 로그인, B 아무나) → A가 천장 49에서 1팩 → B 전광판 확인, Firestore 콘솔에서 문서 확인
- [확인 필요: 저장소 `firestore.rules`는 `nmixx_tcg_feed`만 허용하고 코드는 `nmixx_tcg_global_feed`를 쓴다. 저장소 규칙이 배포본이면 쓰기·읽기가 모두 거부되어 전광판이 동작하지 않는다 — product.md Q-01 — 구현 막음: 아니오. 이력: 코드는 처음부터 `nmixx_tcg_global_feed`를 썼고(2026-08-24 00:23 `acf6c87`), 규칙 파일은 같은 날 19:10 `15d7f27`에서 `nmixx_tcg_feed`로 작성되었다. 처음부터 맞지 않았다]
- 알려진 한계: 전광판 문서는 지우지 않아 계속 쌓인다(읽기는 15개만). 업데이트가 빈 배열이면 무시해 오래된 소식이 남는다. 코드 주석은 "4초"지만 실제 4,500ms.

## 작업

- [x] T001 획득 방송·구독 — `multiplayerService.ts` (v1.6.0)
- [x] T002 전광판 — `GlobalTicker.tsx`
- [x] T003 XR 소식은 XR 보유자만 — `GlobalTicker.tsx` `showXr` (2026-10-18)
- [ ] T004 Firestore 규칙 컬렉션 이름 일치 — `firestore.rules` (Q-01 확인 후)
- [ ] T005 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
