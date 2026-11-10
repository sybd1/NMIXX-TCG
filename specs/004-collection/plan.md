# Plan 004: 도감(컬렉션)

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 이 기능이 만든 파일: `src/pages/Collection/CollectionPage.tsx` (931행. 전체 카드 탭, 세트 탭, XR 배너·축하 창, 상세 창 호출을 모두 포함)
- 재사용: `MASTER_CARDS`, `CONCEPT_SETS`(기능 001), `CardVisual`, `CardModal`(기능 001)
- App에서 받는 props: `collection`, `claimedSetRewards`, `onClaimSetReward`, `onClaimXrCard`, `onClaimCardEasterEgg`, `dust`, `onCraftCard`, `onDismantleSingle`, `onDismantleAll`
- 실행·검증 명령: `npm run dev`(전종 보유라 필터 결과 확인에 적합), 배포 사이트(일부 보유 상태 확인)

## 2. 구조와 데이터 흐름

```text
collection(props) + MASTER_CARDS
  → 필터: ownership × pack × member × rarity  (XR·PARK는 보유 시에만 선택 가능)
  → 정렬: sortBy × sortDirection
  → 페이지: slice((page-1)*24, page*24)
  → CardVisual 그리드 → 클릭 → selectedCard → CardModal
필터·정렬 변경 → currentPage = 1
collection 변경 → XR 해금 조건 검사 (기능 006)
```

- 상태는 화면 안에서만 유지된다. 탭을 옮기거나 새로고침하면 필터·페이지가 기본값으로 돌아간다.

## 3. 계약 (단일 원본)

- 계약 원본 위치: `CollectionPage.tsx` 상단 타입 `TabType`, `OwnershipFilter`, `SortOption`, `SortDirection`과 상수 `MEMBERS`, `PACK_FILTERS`, `ITEMS_PER_PAGE = 24`.
- 기본값: 탭 `ALL_CARDS`, 팩·멤버·등급·보유 `ALL`, 정렬 `OWNED_HIGH_RARITY`, 방향 `DESC`.
- 진행률: `보유 종류 수 / MASTER_CARDS.length`, 정수 % 반올림(`Math.round`). 팩 탭의 팩별 수집률은 소수 첫째 자리라 표기가 다르다.

## 4. 화면 구현

- 진입 경로: `currentTab === 'collection'`
- 컴포넌트: `CollectionPage` 한 파일. 하위 분리 없음(크기 때문에 분리 후보).
- 상태: `activeTab`, `selectedPack`, `selectedMember`, `selectedRarity`, `ownershipFilter`, `sortBy`, `sortDirection`, `currentPage`, `selectedCard`, `showXrCelebrationModal`, `isCraftingOpen`(항상 false)

## 5. 설계 결정

- 페이지네이션 24장 — 이유: 효과가 무거운 카드를 한 번에 수백 장 그리지 않기 위함(v1.5.2) — 대안: 가상 스크롤(세션 문서 `docs/sessions/session4_filter_scroll.md`에 구상만 있음)
- 필터 상태를 URL에 저장하지 않음 — 이유: 단순함 — 대안: 쿼리스트링

## 6. AC → 테스트 매핑

모두 수동(DEC-019).

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 수동 | M1 | 보유 종류 수 / 521 |
| AC-02 | 수동 + 스크립트 | M2 | NX-03·해원·SR 결과 수 = 데이터 개수 |
| AC-03 | 수동 | M2 | NX-01·MR → 0장 |
| AC-04 | 수동 | M1 | 못 모은 카드만 → 전부 LOCKED |
| AC-05 | 수동 | M1 | XR 미보유 → 박진영·XR 버튼 없음 |
| AC-06 | 수동 | M1 | 수량순 내림차순 |
| AC-07 | 수동 | M2 | 결과 개수에 맞는 페이지 수 |
| AC-08 | 수동 | M2 | 3페이지에서 필터 변경 → 1페이지 |

- M1: 배포 사이트 로그인 계정(일부 보유) → 도감 탭 → 진행률을 정보 탭 `수집한 고유 카드`와 비교 → 보유 필터·정렬 확인 → 멤버·등급 버튼 목록 확인
- M2: `npm run dev`(전종 보유) → 필터 조합 → 결과 수를 `node -e "const a=require('./src/data/card-data/op03.json');console.log(a.filter(c=>c.member==='HAEWON'&&c.rarity==='SR').length)"`와 비교 → 페이지 이동 후 필터 변경

## 7. 위험과 구현 순서

- 위험: 931행 단일 파일이라 수정 시 충돌이 잦다. 큰 변경 전에 탭별 컴포넌트로 나누는 것을 권장한다.
- 순서(최초 구현 기준): 전체 목록(v1.1.5) → 필터·멤버 도감 → 페이지네이션(v1.5.2) → 세트 탭 → XR 배너

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
