# NMIXX TCG

NMIXX 팬이 카드팩을 열어 521종 포토카드를 모으고, 먼저 완성한 순서로 글로벌 순위를 겨루는 웹 수집 게임.

> 이 파일은 Claude Code가 매 대화 시작 시 자동으로 읽는다. 짧고 사실만 유지한다(100줄 이내 권장).
> 제품 범위는 `docs/product.md`, 결정 이력은 `docs/decisions.md`, 기능별 상세는 `specs/NNN-*/`에 있다.

## 기술 스택

- 언어·런타임: TypeScript 5.7 / Node (Vite 6 빌드)
- 클라이언트: React 18 + Vite 6, Tailwind CSS 3(`~3.4.17` 고정, DEC-025), framer-motion, Three.js(3D 팩), canvas-confetti
- 데이터·API: 자체 서버 없음. Firebase Auth(구글) + Cloud Firestore, Kakao JS SDK(`index.html`에서 로드), Vercel 호스팅 (DEC-001)
- 테스트: 자동 테스트 프레임워크 없음. 빌드 가드(이미지 검사 + `tsc`)와 수동 절차로 검증한다 (DEC-019)

새 의존성은 `docs/decisions.md`에 이유를 남긴 뒤 추가한다.

## 명령어

`✓`는 2026-11-10에 실제 실행해 성공을 확인한 명령이다.

```bash
npm ci                           # ✓ lockfile 그대로 설치 (Vercel과 같은 조건)
npm run dev                      # http://localhost:3000 (vite.config.ts server.port)
npx tsc --noEmit                 # ✓ 타입 검사 (린트 도구 없음)
node scripts/verify_images.cjs   # ✓ src 안 이미지 경로가 public/에 대소문자까지 일치하는지 검사 (529개)
npm run build                    # ✓ = verify_images → tsc → vite build, 결과물 dist/
npm run preview                  # dist/ 미리보기
```

- 주의: Tailwind는 v3로 고정한다(DEC-025). 2026-10-19 Dependabot이 v4로 올려 Vercel 배포가 한 달 가까이 실패했고, 로컬 `node_modules`에는 옛 버전이 남아 로컬 빌드로는 드러나지 않았다. 의존성을 바꾸면 새 폴더에서 `npm ci` 후 `npm run build`로 확인한다. Dependabot 규칙은 `.github/dependabot.yml`.
- 이력: `main`은 2026-08-31 `cf6cea8`부터다. 이전 이력은 `git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'` 후 `git log origin/pr/11`. 요구사항 출처는 GitHub 이슈(product.md 머리말).
- 배포: `main`에 푸시하면 Vercel이 자동 배포한다. 결과는 GitHub 커밋 상태(`Vercel`)로 확인한다. `배포하기.bat`은 `git add .` → 커밋 → 푸시를 한 번에 한다(스테이지 확인 없이 전부 올라가므로 주의).

## 폴더 구조

```text
src/types/            — 계약 원본: card.ts(Card·Rarity), game.ts(GameState), auth.ts, multiplayer.ts
src/config/           — gameConfig.ts(가격·확률·팩·더스트), firebase.ts(Firebase·Kakao 초기화)
src/data/card-data/   — 팩별 카드 JSON(op01~op05, special) + sets.json(컨셉 세트)
src/data/             — cards.ts(MASTER_CARDS 병합), achievements.ts, patchNotes.ts, easterEggs.ts
src/services/         — rng(추첨), storage(localStorage), cloudSync(Firestore 저장), auth, multiplayer(랭킹·전광판·우편·쿠폰·교환), sound
src/hooks/useGameState.ts — 게임 상태의 유일한 변경 지점 + 저장·동기화 트리거
src/pages/            — 탭 화면 5개 + 패치노트(숨김)
src/components/       — Card, Pack, Navigation, Auth, Multiplayer, Shop, Share, Ranking, EasterEgg
public/               — 카드·팩 이미지(.webp). 경로는 JSON의 image 필드와 대소문자까지 일치해야 함
scripts/              — verify_images.cjs(빌드 가드), db_inject.ts·sync_session.cjs(일회성 운영 스크립트)
firestore.rules       — Firestore 보안 규칙 (콘솔 배포본과 같은지 확인 필요, product.md 7절)
docs/product.md · docs/decisions.md · specs/NNN-<기능>/
```

## 코딩 규칙

- 게임 상태(`GameState`)는 `useGameState`의 액션으로만 바꾼다. 컴포넌트에서 `localStorage`·Firestore를 직접 쓰지 않는다.
- 카드·세트 추가는 JSON만 고친다. 도감 총수·수집률 분모는 항상 `MASTER_CARDS.length`를 쓰고 숫자를 하드코딩하지 않는다 (DEC-002).
- 등급별 확률·더스트·가격은 `src/config/gameConfig.ts` 한 곳에서 바꾼다. 단, 추첨 가중치는 `rngService.ts` 상수에도 있으니 함께 고친다 (DEC-003).
- XR 카드(`card_xr_transcendent_park_741`)는 팩 풀에서 제외하고 보유 수를 1로 제한한다. 카드를 컬렉션에 넣는 모든 경로에서 지킨다 (DEC-006).
- Firestore 컬렉션 이름은 `nmixx_tcg_*`. 새 컬렉션을 쓰면 `firestore.rules`에도 규칙을 추가한다.
- 조회 경로(랭킹·프로필 읽기)에서 다른 사용자의 문서를 쓰거나 지우지 않는다 (DEC-023). `npm run dev`도 운영 Firestore(`nmixx-tcg`)에 연결된다.
- 날짜 기준 보상(우편·카드 이스터에그)은 KST(`Date.now() + 9h`)로 계산한다.
- UI 문구는 한국어, 컴포넌트는 함수형.

## 명세 주도 작업 방식

1. 기능 작업은 `specs/NNN-<기능>/`의 문서를 기준으로 한다. 명세가 없는 기능 요청이면 먼저 `/sdd-spec`을 제안한다.
2. 단계: `/sdd-spec` → `/sdd-clarify` → `/sdd-plan` → `/sdd-tasks` → `/sdd-implement` → `/sdd-verify`. 요구사항이 바뀌면 `/sdd-change`.
3. 명세 단계(`/sdd-spec`, `/sdd-clarify`, `/sdd-plan`, `/sdd-tasks`)에서는 소스 코드를 수정하지 않는다.
4. 구현은 `tasks.md`의 작업 하나씩 진행한다. 자동 테스트가 없으므로 AC는 plan 6절의 수동 절차로 확인하고, 테스트 도입(DEC-020) 이후에는 테스트를 먼저 쓴다.
5. 계약의 원본은 `src/types/*.ts`, `src/config/gameConfig.ts`, `src/data/card-data/*.json`뿐이다. 명세 문서는 경로만 참조한다.
6. 대화에서 확정한 결정은 즉시 해당 문서에 반영한다. 구조에 영향을 주는 결정은 `docs/decisions.md`에 남긴다.

## 사실 확인 규칙

- 파일·명령·API·라이브러리 동작은 직접 확인한 뒤 사실로 쓴다. 확인하지 못한 것은 `[확인 필요: …]`로 표시한다.
- 확인된 사실, 제안, 미결 사항을 구분해 보고한다.
- 실행하지 않은 테스트·검증을 통과로 기록하지 않는다. 실패는 출력과 함께 그대로 보고한다.
- 문서끼리 또는 문서와 코드가 충돌하면 임의로 고르지 말고 충돌 지점과 필요한 결정을 드러낸다.

## 하지 말 것

- 명세 범위 밖의 기능·리팩터링·의존성 추가
- 검증을 통과시키기 위해 AC를 약하게 고치기
- `.env`, `.env.production`, 서비스 계정 키를 커밋하기 (`.gitignore`에 있음, `배포하기.bat` 사용 전 `git status` 확인)
- 기존 카드 `id` 변경·삭제 — 사용자 컬렉션·랭킹 키가 깨진다 (DEC-002)
- `migrations/001_add_finish_type.sql` 실행 — 이 앱은 SQL DB를 쓰지 않는다 (DEC-001)
