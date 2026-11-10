# Plan 002: 팩 구매와 카드 추첨(확률·천장)

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 관련 구조: `src/data/cards.ts`의 `getCardsByRarity`, `MASTER_CARDS` / `src/config/gameConfig.ts`의 `GAME_CONFIG`, `RARITY_TO_FINISH`
- 이 기능이 만든 파일:
  - `src/services/rngService.ts` — `rollRarity`, `rollCard`, `generatePack`
  - `src/App.tsx` 153~271행 — `handleOpenSinglePack`/`FivePacks`/`TenPacks`: 결과를 미리 뽑아 개봉 화면에 넘김
  - `src/hooks/useGameState.ts` 314~382행 — `commitPackOpening`: 코인 차감·카드 지급·천장·기록을 한 번의 `setState`로 반영
- 실행·검증 명령: `npx tsc --noEmit`, `npm run build`, 추첨 시뮬레이션(6절)

## 2. 구조와 데이터 흐름

```text
팩 탭 버튼 클릭 (HomePage)
  → App.handleOpenXxxPacks(pack)
      isOpeningLockRef 또는 coins < cost 이면 종료 (안내 없음)
      RngService.generatePack(pity, pack.id, tempCollection) × N   ← pity를 팩마다 이어 씀
      RevealedCard[] 생성 (isNew, duplicateCount, XR 1장 제한)
      setOpeningState({ cards, pack, packCount, cost, packResults })   ← 아직 상태 변화 없음
  → PackOpeningSequence: 팩을 찢는 순간 ensureCommitted() 1회
  → onCommitOpening → useGameState.commitPackOpening(cost, packResults)
      coins < cost 면 { success:false }
      setState: coins -= cost, coinsSpentTotal += cost, collection += 카드,
                pityCount = 마지막 팩 newPity, openedPacksTotal += N, packHistory 앞에 추가(최대 50)
      SSR 이상 카드마다 MultiplayerService.broadcastHighTierPull (기능 011)
  → 상태 변경 → 저장·동기화 (기능 008)
```

- 실패 지점: 코인 부족은 버튼 비활성 + App 가드 + `commitPackOpening` 가드 세 겹. 찢기 전 이탈은 `setOpeningState(null)`만 하므로 상태 변화 없음.
- **다시 열기 커밋(2026-11-10 tasks T010에서 수정)**: `PackOpeningSequence`는 다시 열 때 다시 마운트되지 않으므로, `[cards]` 이펙트가 새 카드마다 `hasCommittedRef.current = false`로 초기화한다. 그래서 다시 연 팩도 찢을 때 한 번 커밋된다. App에 `key`를 주는 대안은 개봉 화면 전체를 다시 만들어 3D 팩을 다시 생성하므로 택하지 않았다.
  - 수정 전 원인 기록: 요약 화면의 `🔁 다시 열기`·`1팩`·`5팩`·`10팩`·Space로 다시 열면 App이 `openingState`만 바꾸고 `PackOpeningSequence`는 다시 마운트되지 않는다(수정 전 `App.tsx` 389행, `key` 없음). `hasCommittedRef`(`PackOpeningSequence.tsx` 45행)는 `[cards]` 이펙트(117~138행)에서 초기화되지 않으므로 두 번째 개봉부터 `commitPackOpening`이 호출되지 않는다. 화면에는 새 카드가 보이지만 코인도 차감되지 않고 카드도 지급되지 않았다.
- 새로고침: 개봉 화면 도중 새로고침하면 찢기 전이면 아무 것도 반영되지 않고, 찢은 뒤면 이미 반영되어 저장되어 있다.

## 3. 계약 (단일 원본)

- 계약 원본 위치: 가격·천장 `src/config/gameConfig.ts`의 `GAME_CONFIG`, 추첨 가중치 `src/services/rngService.ts` 상단 `WEIGHT_*` 상수(DEC-003: `RARITY_CONFIGS[].weight`와 같은 값으로 유지).

### 로컬 함수 시그니처

```ts
RngService.rollRarity(forceSsrPlus = false): Rarity
RngService.rollCard(rarity, packId?, _userCollection?, _forceUnowned?): Card   // 뒤 두 인자는 사용하지 않음
RngService.generatePack(currentPity, packId?, userCollection?): {
  cards: Card[];            // 5장, 등급 오름차순
  highestRarity: Rarity;
  newPity: number;          // SSR+ 있으면 0, 없으면 currentPity + 1
  pityTriggered: boolean;
}

// useGameState
commitPackOpening(cost: number, packResults: { cards: Card[]; newPity: number }[])
  : { success: boolean; revealed: RevealedCard[] }
```

- 등급 판정: `rand ∈ [0, 9999]`, 누적 경계 MR <2, LR <14, UR <39, SSR <84, SR <334, R <1834, UC <4834, 그 외 C. (`rngService.ts` 47~53행 주석의 숫자는 옛 값이라 틀리다. 코드가 맞다.)
- 천장 판정: `currentPity >= PITY_THRESHOLD - 1`이면 5번째 카드에 `rollRarity(true)` (`pRand ∈ [0, 999]`: MR <20, LR <100, UR <300, 그 외 SSR).
- 인증·권한: 해당 없음(게스트도 개봉 가능, 저장만 안 됨).
- 중복 요청: `App.isOpeningLockRef`가 개봉 화면이 닫힐 때까지 새 구매를 막고, `PackOpeningSequence`의 `ensureCommitted` ref가 커밋을 1회로 제한한다.
- 부분 실패: `setState` 한 번이라 해당 없음.

## 4. 화면 구현

- 진입 경로: 팩 탭(`currentTab === 'home'`)의 세 버튼, 개봉 요약 화면의 `🔁 다시 열기`·`1팩`·`5팩`·`10팩` 버튼(기능 003. 2절의 다시 열기 미커밋 결함은 T010에서 수정)
- 상태 관리: 버튼 `disabled = coins < 가격`. 천장 게이지는 `state.pityCount / PITY_THRESHOLD`.

## 5. 설계 결정

- 결과를 먼저 뽑고 반영은 찢는 순간에 한다 — 이유: 찢기 전 이탈을 무료 취소로 만들고, 연출 중 새로고침으로 결과를 바꾸는 것을 막음 — 대안: 버튼 클릭 즉시 차감
- 천장 50팩 SSR+ — DEC-005
- 팩 풀에 등급이 없으면 전체 풀로 대체 — 이유: 빈 풀 예외 방지 — 대안: 등급 다시 뽑기(spec 7절 확인 필요)
- 1·5·10팩 핸들러가 거의 같은 코드 3벌이다. 고칠 때 세 곳을 함께 고치거나 하나로 합친다.

## 6. AC → 테스트 매핑

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 수동 | 절차 M1 | 10팩 → 코인 -34,200, 보유 합 +50, 개봉 +10 |
| AC-02 | 수동 | 절차 M2 | 코인 17,000 → 5·10팩 비활성 |
| AC-03 | 수동 | 절차 M3 | 찢기 전 ESC → 변화 없음 |
| AC-04 | 시뮬레이션 (자동화 후보: 단위) | 절차 S1 | 100만 회 → 공시 ±0.1%p, XR 0 |
| AC-05 | 시뮬레이션 | 절차 S1 | 5만 팩 → 전부 오름차순 |
| AC-06 | 시뮬레이션 | 절차 S1 | NX-03 5만 팩 → packId 전부 op03 |
| AC-07 | 시뮬레이션 | 절차 S1 | NX-01 LR 20만 회 → 전부 다른 팩 카드 |
| AC-08 | 시뮬레이션 (자동화 후보: 단위) | 절차 S1 | pity 49 → SSR+ 포함, newPity 0 |
| AC-09 | 시뮬레이션 | 절차 S1 | pity 48 → pityTriggered 0회 |
| AC-10 | 시뮬레이션 | 절차 S1 | 천장 20만 회 → 70/20/8/2 |
| AC-11 | 코드 검토 + 수동 | `App.tsx` 10팩 핸들러의 `currentPity` 연쇄 / 절차 M4 | 게이지 45에서 10팩 |
| AC-12 | 수동 | 절차 M5 | 연타 → 코인 1회 차감 |

- S1(추첨 시뮬레이션): `rngService.ts`를 esbuild로 번들해 Node에서 실행한다. 2026-11-10에 쓴 스크립트 요지:
  ```ts
  import { RngService } from '<repo>/src/services/rngService';
  // rollRarity(false) 1,000,000회 비율 / rollRarity(true) 200,000회 비율
  // generatePack(49, 'op01') 20,000회 → SSR+ 없거나 newPity≠0 인 횟수
  // generatePack(48, 'op02') 20,000회 → pityTriggered 횟수
  // generatePack(0, 'op03') 50,000회 → packId≠op03, XR, 오름차순 아닌 팩 수
  // rollCard('LR', 'op01') 200,000회 → packId≠op01 수
  ```
  실행: `npx esbuild sim.ts --bundle --platform=node --outfile=sim.cjs && node sim.cjs`
- M1: 배포 사이트 게스트 → 코인·정보 탭 개봉 수·도감 보유 수 기록 → NX-02 10팩 → 찢고 요약까지 → 값 비교
- M2: 로그인 계정의 `localStorage['nmixx_tcg_user_<uid>']`에서 `coins`를 17000으로 고친다. 로컬 저장본만으로는 클라우드 값에 덮이므로 배포 환경에서는 DevTools React 확장으로 `useGameState` 상태를 바꾼다. [확인 필요: 테스트용 코인 조정 방법을 공식 절차로 정할지]
- M3: 1팩 구매 → `👆 카드팩을 터치하여 개봉하기!` 화면에서 ESC → 코인·게이지 확인
- M4: 게이지 45 계정에서 10팩 → 요약에서 SSR+ 위치와 게이지 확인
- M5: 1팩 구매 → 개봉 화면에서 스페이스 꾹 누르기 → 요약 후 코인이 3,800만 줄었는지 확인

## 7. 위험과 구현 순서

- 위험: 가중치가 두 곳(`rngService.ts`, `RARITY_CONFIGS`)에 있어 한쪽만 바꾸면 확률표(기능 021)와 실제 추첨이 달라진다. — 확인: 시뮬레이션 S1을 바꾼 뒤 반드시 실행.
- 순서(최초 구현 기준): `rollRarity` → `rollCard` → `generatePack` → App 핸들러 → `commitPackOpening` → 천장(v1.3.0) → 연타 방지(v1.4.8~v1.4.9)

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
