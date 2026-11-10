# Plan 001: 카드 카탈로그와 등급 체계

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 이 기능이 만든 파일:
  - `src/types/card.ts` — `Card`, `Rarity`, `FinishType`, `NmixxMember`, `ConceptSetCard`, `RevealedCard`
  - `src/config/gameConfig.ts` — `RARITY_CONFIGS`, `FINISH_CONFIGS`, `RARITY_TO_FINISH`, `BOOSTER_PACKS`, `GAME_CONFIG`
  - `src/data/card-data/op01.json` ~ `op05.json`, `special.json`, `sets.json`
  - `src/data/cards.ts` — `MASTER_CARDS`, `CONCEPT_SETS`, `getCardById`, `getCardsByRarity`, `getCardsByPack`
  - `src/components/Card/CardVisual.tsx` — 카드 한 장 렌더링, `MEMBER_THEMES`
  - `src/components/Card/CardModal.tsx` — 카드 상세 창
  - `scripts/verify_images.cjs` — 이미지 경로 빌드 가드
- 실행·검증 명령: `node scripts/verify_images.cjs`, `npx tsc --noEmit`, `npm run build`

## 2. 구조와 데이터 흐름

```text
op01~op05.json, special.json ──import──▶ cards.ts: MASTER_CARDS (배열 순서 = 팩 순서)
sets.json ──────────────────────────────▶ cards.ts: CONCEPT_SETS
MASTER_CARDS ─▶ rngService(추첨), CollectionPage(도감), achievements(업적), cloudSync·multiplayer(수집률)
Card + 보유 수 ─▶ CardVisual(앞면·효과) ─클릭─▶ CardModal(상세)
```

- 실패 지점: 이미지 누락은 빌드 시점(`verify_images.cjs`)에서 막는다. 런타임 이미지 실패는 `CardVisual`의 `onError`가 처리한다.
- 새로고침: 정적 데이터라 해당 없음.

## 3. 계약 (단일 원본)

- 계약 원본 위치: 타입은 `src/types/card.ts`, 등급 수치는 `src/config/gameConfig.ts`의 `RARITY_CONFIGS`, 카드 내용은 `src/data/card-data/*.json`. 여기에는 요약만 둔다.

### 데이터 모델 요약

| 필드 | 필수 | 용도 |
|---|---|---|
| `id` | 예 | 컬렉션 키. 배포 후 변경 금지(DEC-002). 형식 예: `nmixx_001`, `nmixx_200_055` |
| `name`, `member`, `rarity`, `category` | 예 | 표시·필터·추첨 |
| `image` | 예 | `/card-pack-image/...webp`(XR만 `/image/XR-park.webp`). `public/` 기준 경로, 대소문자 일치 |
| `packId`, `packCode`, `packName` | 예 | 팩 필터·팩 풀 추첨. `packId`는 `BOOSTER_PACKS[].id`와 같아야 함(XR만 예외: `secret_transcendent`, `SECRET`) |
| `collectionNumber` | 예 | 일련번호 표시 |
| `era`, `theme`, `description`, `quote`, `symbol`, `gradient` | 예 | 상세 표시 |
| `finishType` | 선택 | 도감 표시 가공. 없으면 `MATTE` |
| `setId`, `setTitle` | 선택 | 컨셉 세트 소속 (기능 005) |
| `isMystery`, `triggerCelebration` | 선택 | XR 비밀 처리·이스터에그 (기능 006, 019) |
| `isLandscape`, `aspectRatio` | 선택 | 가로 이미지 배치 |
| `cost`, `power`, `dustValue`, `craftCost` | 예(형식상) | 현재 화면 계산에 쓰지 않음. `power`는 대표 카드 정렬 동률 처리에만 사용 |

### 등급 수치 (원본: `RARITY_CONFIGS`)

| 등급 | 가중치 | 분해 더스트 | 제작 더스트 | 가공 |
|---|---|---|---|---|
| C | 5166 | 5 | 50 | MATTE |
| UC | 3000 | 15 | 150 | GLOSSY |
| R | 1500 | 40 | 400 | SILVER_STAMPING |
| SR | 250 | 120 | 1200 | RAINBOW_FOIL |
| SSR | 45 | 500 | 5000 | SHATTERED_GLASS |
| UR | 25 | 1500 | 15000 | PRISM_GLITTER |
| LR | 12 | 4000 | 40000 | TEXTURE_GOLD |
| MR | 2 | 10000 | 제작 불가 | COSMIC_GHOST |
| XR | 0 | 50000 | 제작 불가 | TRANSCENDENT_COSMIC |

### 유지보수 절차: 새 팩 추가

1. 이미지를 `public/card-pack-image/<팩폴더>/...`에 `.webp`로 넣는다.
2. `src/data/card-data/op06.json`을 만든다. 기존 카드와 겹치지 않는 `id`, `packId: "op06"`, `packCode: "NX-06"`을 쓴다.
3. `src/data/cards.ts`에 import하고 `MASTER_CARDS`에 펼친다(XR이 든 `special`보다 앞).
4. `src/config/gameConfig.ts`의 `BOOSTER_PACKS`에 팩 설정을 추가한다.
5. 하드코딩된 팩 목록을 함께 고친다: `CollectionPage.tsx`의 `PACK_FILTERS`, `BoosterPack3DScene.ts`의 팩별 포일 파라미터(없으면 NX-01 값 사용), `achievements.ts`의 팩 전종 업적.
6. 컨셉 세트가 있으면 `sets.json`에 추가한다.
7. `npm run build`로 이미지 가드·타입 검사를 통과시킨다.
8. 기존 사용자의 XR 보유 조건(전종)이 바뀌므로, 이미 XR을 가진 사용자는 새 카드가 없어도 XR을 유지한다는 점을 공지한다. [확인 필요: 새 팩 추가 시 XR 보유자 처리 정책]

## 4. 화면 구현

- 컴포넌트: `CardVisual`(React.memo) — props `card`, `finishType?`, `isOwned`, `count`, `isNew`, `size`, `onClick`, `showDetails` / `CardModal` — props `card`, `count`, `isOpen`, `onClose`, `onClaimCardEasterEgg?`, `dust?`, `onCraftCard?`, `onDismantleSingle?`(뒤 셋은 숨긴 기능 015용)
- 효과 단계: 보유한 XR 외 카드 전부에 포일, SSR·UR·LR·MR에 광택·엠보싱(작은 크기 제외), LR 입자 2개, MR 입자 4개, XR 코스믹. 작은 칸에서는 포일 0.62배, 광택 0.7배로 줄인다.
- 기울기: 마우스 위치 / 3.5, `perspective: 800px`, rAF로 묶음.

## 5. 설계 결정

- 팩별 JSON + `MASTER_CARDS` 병합 — DEC-002
- 정수 가중치 10,000, 등급 종속 가공 — DEC-003
- 이미지 경로 빌드 가드 — DEC-019

## 6. AC → 테스트 매핑

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 수동 | 절차 M1 | 도감 탭 → 분모 521 |
| AC-02 | 빌드 가드(자동) | `scripts/verify_images.cjs` | 정상 데이터 → `✅ … verified`, 경로 오류 → 종료 코드 1 |
| AC-03 | 스크립트 | 절차 M2 | 고유 id 수 = 521 |
| AC-04 | 수동 | 절차 M3 | C·MR 카드 비교 |
| AC-05 | 수동 | 절차 M1 | 미보유 카드 잠금 표시 |
| AC-06 | 수동 | 절차 M4 | XR 미보유 표시 |
| AC-07 | 수동 | 절차 M3 | 상세 창 필드 |
| AC-08 | 수동 | 절차 M5 | 이미지 요청 차단 시 표시 |

- M1: 배포 사이트에 게스트로 접속(로컬은 전종 보유, DEC-017) → 도감 탭 → 헤더 문구와 진행률, 미보유 카드 모양 확인
- M2: 저장소 루트에서 `node -e "const fs=require('fs');const a=['op01','op02','op03','op04','op05','special'].flatMap(f=>JSON.parse(fs.readFileSync('src/data/card-data/'+f+'.json')));console.log(a.length,new Set(a.map(c=>c.id)).size)"` → `521 521`
- M3: `npm run dev`(전종 보유) → 도감에서 등급 필터 C, MR을 차례로 골라 카드 효과 비교 → MR 카드 클릭해 상세 필드·멜로디 확인
- M4: 배포 사이트 게스트 → 도감 상단 XR 배너와 정보 탭 XR 행 확인
- M5: DevTools Network에서 `*.webp` 요청 차단 → 도감 카드에 텍스트 정보만 남는지 확인

## 7. 위험과 구현 순서

- 위험: 카드 `id`를 바꾸면 기존 사용자 컬렉션에서 그 카드가 사라진다. 바꿔야 하면 이전 `id` → 새 `id` 변환 코드를 `StorageService.loadState`와 `applyCloudData`에 함께 넣어야 한다.
- 순서(최초 구현 기준): 타입 → 등급 설정 → 카드 JSON → `cards.ts` → `CardVisual` → `CardModal` → 이미지 가드

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
