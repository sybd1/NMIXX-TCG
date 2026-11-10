# Spec 021 (Lite): 정보 탭(통계·확률표·사운드)

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

확률형 아이템이므로 등급별 확률을 공개하고, 내 플레이 통계와 사운드 설정을 한곳에 모은다. 쿠폰 입력(기능 012)과 회원 탈퇴(기능 014)도 이 탭에 있다.

- 제외: 팩별 개별 확률(모든 팩이 같은 등급 확률)

## 인수 조건

- **AC-01** Given 개봉 12팩, 고유 100종, 총 130장 When 정보 탭(`INFORMATION`, 모바일 `INFO`) Then `개봉한 팩 12 PACKS`, `수집한 고유 카드 100 / 521`, `총 소지 카드 수 130장`이 보인다
- **AC-02** Given 정보 탭 When 확률표를 본다 Then C~MR 8행이 `RARITY_CONFIGS`의 확률(소수 둘째 자리)과 가공 이름·설명으로 보이고, XR 행은 `???`와 `모든 카드를 수집하면 등장한다는데?`다
- **AC-03** Given 소리 켜짐 When `ENABLED` 버튼(또는 헤더 소리 버튼) Then `MUTED`로 바뀌고 효과음이 나지 않으며, 새로고침 후에도 유지된다(로그인 계정, `GameState.soundMuted`)

## 구현 메모

- 바꿀 파일: `src/pages/Settings/SettingsPage.tsx` / `src/hooks/useGameState.ts` `toggleSound` / `src/services/soundService.ts` / 확률 원본 `RARITY_CONFIGS`(기능 001)
- 화면 확률은 `RARITY_CONFIGS[].probability`를, 실제 추첨은 `rngService.ts` 상수를 쓴다(DEC-003). 둘을 같이 바꾼다.
- 테스트: 수동. 배포 사이트 로그인 계정으로 AC-01(도감·업적 탭 수치와 비교), AC-02(기능 002 spec의 확률과 비교), AC-03(새로고침)
- `수집한 고유 카드`의 분모는 `MASTER_CARDS.length`(`SettingsPage.tsx` 56행)라 카드를 추가하면 자동으로 바뀐다.
- 알려진 한계: 천장 설명 "중복 여부와 관계없이 무작위로"는 코드와 맞지만 개봉 화면 문구와 다르다(product.md Q-05). 게스트의 소리 설정은 저장되지 않는다.

## 작업

- [x] T001 통계·확률표·사운드 — `SettingsPage.tsx`, `soundService.ts`
- [ ] T002 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
