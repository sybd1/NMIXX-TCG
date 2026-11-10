# Spec 009 (Lite): 업적과 카테고리 배지

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

수집 외의 장기 목표를 준다. 업적 탭에서 4개 카테고리(🏆 팩 전종 4개, ⭐ 레어도 9개, 🪙 골드 소비 6개, 📦 팩 개봉 6개)의 진행도를 보고 달성한 업적을 `완료하기`로 기록한다. 한 카테고리를 모두 달성하면 랭킹 닉네임 옆에 그 아이콘이 붙는다(DEC-018).

- 제외: 업적 코인 보상(모든 `rewardCoins`가 0), NX-05 팩 전종 업적(정의 없음)

## 인수 조건

- **AC-01** Given 누적 개봉 12팩 When 업적 탭 › `📦 팩 개봉` Then `카드팩 10개 개봉하기`는 `완료하기` 버튼, `카드팩 100개 개봉하기`는 `진행도 12 / 100`과 잠금이다
- **AC-02** Given 달성한 업적 When `완료하기`를 누른다 Then `달성 완료`로 바뀌고 `claimedAchievements`에 ID가 추가되며 코인은 변하지 않는다
- **AC-03** Given NX-01 128장 중 127장 When 업적 탭 Then `NX 01 - Fe3O4: FORWARD 카드 모두 수집`이 `진행도 127 / 128`이다(판정 분모는 실제 팩 장수)
- **AC-04** Given XR 미보유 When 업적 탭 Then `XR (Transcendent) 초월 카드 획득` 항목이 보이지 않는다
- **AC-05** Given 📦 카테고리 6개를 모두 달성(완료하기 여부와 무관) When 저장된다 Then 랭킹 문서 `achievementBadges`에 `PACKS`가 들어간다

## 구현 메모

- 바꿀 파일: `src/data/achievements.ts` — `ACHIEVEMENTS`(25개), `ACHIEVEMENT_CATEGORY_META`, `isAchievementCompleted`, `getCompletedAchievementCategories` / `src/pages/Achievements/AchievementsPage.tsx` / `src/hooks/useGameState.ts` `claimAchievement` / `src/components/Ranking/AchievementBadges.tsx`
- 판정 기준: `PACK_COUNT` → `openedPacksTotal`, `PACK_SET` → 팩 카드 전부 보유, `RARITY_SET` → 등급 카드 전부 보유(XR은 1장), `COIN_SPENT` → `coinsSpentTotal`. 배지는 판정 결과로만 계산하고 `완료하기`와는 무관하다.
- 테스트: 자동화 후보(DEC-020) — `isAchievementCompleted`, `getCompletedAchievementCategories`는 순수 함수. 현재는 수동: 배포 사이트 계정으로 업적 탭 확인, AC-05는 Firestore 랭킹 문서 확인
- 알려진 한계: `coinsSpentTotal`이 없으면 `openedPacksTotal × 100`으로 추정하는데 실제 1팩은 3,800 N이다(`App.tsx` 83행, `useGameState.ts`, `AchievementsPage.tsx` 22행). `coinsSpentTotal`은 클라우드에 저장되지 않아(기능 008) 새 기기에서는 이 추정값이 쓰인다.
- 알려진 한계: 화면 문구 "4대 부스터 팩", "150종"과 업적 설명의 115/124/87장은 실제와 다르다(판정은 실제 장수). 상단 `전체 달성률`의 분모는 숨긴 XR 업적까지 센다.
- [확인 필요: 업적 보상이 모두 0인데 `완료하기` 버튼을 유지할지, 보상을 정할지 — 구현 막음: 아니오. 관련 요청: GitHub 이슈 #9 "업적 돈 주는 것 개선하기. 쓸모없는 퀘스트 시스템 삭제", "업적에서 칭호 시스템 추가"(둘 다 미완료)]

## 작업

- [x] T001 업적 정의·판정 — `achievements.ts` (v1.1.0)
- [x] T002 업적 탭 — `AchievementsPage.tsx`
- [x] T003 카테고리 배지 — `achievements.ts`, `AchievementBadges.tsx`, `useGameState.ts` (2026-10-18)
- [ ] T004 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
