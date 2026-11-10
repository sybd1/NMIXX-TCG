# Plan 003: 팩 선택과 개봉 연출

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준 spec: [spec.md](spec.md) (2026-11-10)

## 1. 기존 코드 조사

- 이 기능이 만든 파일:
  - `src/pages/Home/HomePage.tsx` — 캐러셀, 수집률, 구매 버튼, 천장 게이지, 첫 방문
  - `src/components/Pack/PackOpeningSequence.tsx` — 전체 화면 개봉 상태 기계
  - `src/components/Pack/Pack3D.tsx` → `BoosterPackThreeView.tsx` → `BoosterPack3DScene.ts` — 3D 팩(지오메트리, 포일 노멀맵 1024², 색 텍스처 1536×2304)
  - `src/components/Pack/BoosterPack2DView.tsx`, `src/components/Common/WebGLErrorBoundary.tsx` — 2D 대체(렌더 예외 시에만). `src/utils/webgl.ts`는 만들었으나 쓰지 않는다
  - `src/components/Card/CardFlip.tsx` — 뒤집기 카드
  - `src/services/soundService.ts` — `playPackTear`, `playCardDeal`, `playCardFlip`, `playRareReveal`, `playEpicReveal`
- 재사용: `CardVisual`, `CardModal`(기능 001), `commitPackOpening`(기능 002)
- 실행·검증 명령: `npm run dev`(로컬은 전종 보유라 NEW 표시 확인 불가, DEC-017), `npm run build`

## 2. 구조와 데이터 흐름

```text
HomePage 버튼 → App.handleOpenXxx → openingState 설정 (기능 002)
App이 <PackOpeningSequence cards pack packCount cost coins pityCount collection
                          onCommitOpening onFinish onOpenAnother onOpenPackCount /> 마운트
  step: DIM_BG --300ms--> PACK_ENTER --클릭/Space: ensureCommitted()--> PACK_TEAR --700ms--> CARDS_DEALT
        CARDS_DEALT: flipped 집합 관리 → 모두 뒤집힘
          SSR+ 있음 → 400ms → showcase 큐(CardModal 연속) → SUMMARY
          없음      → 400ms → SUMMARY
  onFinish → App: openingState = null, isOpeningLockRef = false
  onOpenAnother/onOpenPackCount → App: 잠금 해제 후 해당 구매 핸들러 재호출
```

- 실패 지점: WebGL 렌더 예외 → `WebGLErrorBoundary`가 `BoosterPack2DView`로 교체(개봉 화면만). 이미지 로드 실패 → 카드는 `CardVisual` 대체 처리.
- 새로고침·재진입: `history.pushState({screen:'pack-opening'})`로 뒤로가기를 가로채 개봉 화면만 닫는다. 새로고침하면 개봉 화면은 사라진다.

## 3. 계약 (단일 원본)

- 계약 원본 위치: `src/types/game.ts`의 `PackOpeningState`(일부 값 미사용), `src/types/card.ts`의 `RevealedCard`.

```ts
// PackOpeningSequence props (원본: PackOpeningSequence.tsx 상단)
{
  cards: RevealedCard[]; pack?: BoosterPackConfig; packCount?: number; cost?: number;
  coins?: number; pityCount?: number; collection?: Record<string, number>;
  onCommitOpening?: () => void;          // 찢을 때 1회
  onFinish: () => void;
  onOpenAnother: () => void;             // 같은 수량 다시
  onOpenPackCount?: (count: 1 | 5 | 10) => void;
}
```

- 타이밍 상수(코드 내 하드코딩): DIM 300ms, 찢기 700ms, 쇼케이스 대기 400ms, 키 입력 간격 250ms, 단계 진입 후 350ms, 요약 후 다시 열기 500ms.

## 4. 화면 구현

- 진입 경로: 팩 탭(`currentTab === 'home'`) → `openingState`가 있으면 전체 화면 오버레이
- 상태 관리: `step`(위 상태 기계), `revealedCards`(카드별 `isFlipped`), `showcaseQueue`·`showcaseIndex`, `selectedDetailCard`(상세), `hasCommittedRef`(커밋 1회), `stepEnterTimeRef`·`lastActionTimeRef`(입력 간격), `isReopeningRef`(다시 열기 중복 방지)
- 카드 합치기: `cards`를 `id`로 묶어 `duplicateCount` = 개수(XR은 1), 정렬 `isNew` → 등급 → 수량
- 3D: 카메라 fov 40·z 7.2, ACES 톤매핑, 마우스 따라 기울기(lerp 0.08), 언마운트 시 geometry·material·renderer dispose

## 5. 설계 결정

- 3D Three.js + 2D 대체 — DEC-007
- 결제는 찢는 순간 — 기능 002 plan 5절
- 효과음 Web Audio 합성 — DEC-004
- 고등급은 중앙 확대 쇼케이스로 따로 보여 준다(v1.5.0) — 이유: 50장 중 고등급이 묻히지 않게 — 대안: 전용 컷신(`SecretRevealEffect`, 만들었으나 연결하지 않음)

## 6. AC → 테스트 매핑

모두 수동(DEC-019). 배포 사이트 게스트로 진행한다(로컬은 전종 보유라 NEW가 나오지 않음).

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 수동 | M1 | → 키 5번 → NX-01로 복귀 |
| AC-02 | 수동 | M2 | 첫 방문 버튼 → 개봉 시작 |
| AC-03 | 수동 | M3 | 팩 클릭 → 카드 5장, `(0/5종)` |
| AC-04 | 수동 | M3 | Space → 전부 공개 → 요약 |
| AC-05 | 수동 | M4 | SSR+ 2장 → 상세 2번 |
| AC-06 | 수동 | M4 | 10팩 → 중복 합침·문구 |
| AC-07 | 수동 | M5 | Space 꾹 → 한 단계씩 |
| AC-08 | 수동 | M3 | 요약 Space → 새 개봉 |
| AC-09 | 수동 | 기능 002 plan M2로 코인 조정 후 | 요약 Space → 무반응 |
| AC-10 | 수동 | M3 | `메인 홈`·ESC·뒤로가기 각각 |
| AC-11 | 수동 | M6 | WebGL 끔 → 2D 팩 |

- M1: 팩 탭 → ←/→ 키, 휠, 화살표 버튼으로 넘기며 정보 변화 확인
- M2: 현재 실행 불가. 게스트·운영자 초기 상태 모두 `isFirstVisit: false`이고(`storageService.ts` `createGuestInitialState`·`createAdminInitialState`), 코드 어디에서도 true로 바꾸지 않는다. spec 7절 참고.
- M3: 1팩 구매 → 팩 클릭 → Space → 요약 → Space로 다시 열기 → 요약에서 `메인 홈` / 다시 열고 요약에서 ESC / 다시 열고 뒤로가기
- M4: 10팩을 SSR+가 나올 때까지 반복(천장 게이지 49에서 10팩이면 확정) → 쇼케이스 순서, 중복 합침 확인
- M5: 개봉 화면에서 Space를 2초 누르고 있기 → 단계 변화 관찰
- M6: Chrome `chrome://settings/system`에서 하드웨어 가속 끄기 또는 `--disable-webgl`로 실행 → 개봉

## 7. 위험과 구현 순서

- 위험: 3D 팩 6개(캐러셀 5 + 개봉 1)가 각각 메인 스레드에서 1024² 노멀맵과 1536×2304 텍스처를 만든다. 저사양 모바일에서 팩 탭 진입이 느릴 수 있다. [확인 필요: 저사양 기기 체감]
- 순서(최초 구현 기준): CardFlip → PackOpeningSequence 2D(v1.0) → 3D 엔진(v1.3.9) → 2단계 개봉 흐름(v1.4.0) → 쇼케이스(v1.5.0) → 단계 순서 재구성·60fps(v1.5.1) → ESC 잠금(v1.5.5)

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
