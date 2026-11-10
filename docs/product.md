# 제품: NMIXX TCG

- 상태: Ready
- 최종 수정일: 2026-11-10

> 이 문서와 `specs/`는 2026-11-10 코드(커밋 `eae3c8c`)를 기준으로 역작성했다. 기능 순서와 결정 날짜는 git 커밋(PR #5·#10·#11의 08-31 이전 이력 포함)을 우선하고, git 이전은 `src/data/patchNotes.ts`를 따랐다. 조회 방법은 `docs/decisions.md` 머리말.
> 요구사항의 출처: GitHub 이슈 [#2](https://github.com/sybd1/NMIXX-TCG/issues/2)·[#6](https://github.com/sybd1/NMIXX-TCG/issues/6)·[#9](https://github.com/sybd1/NMIXX-TCG/issues/9)(날짜별 수정·작업 목록), [#8](https://github.com/sybd1/NMIXX-TCG/issues/8)(세트 구성), [#4](https://github.com/sybd1/NMIXX-TCG/issues/4)(장기 구상), [#7](https://github.com/sybd1/NMIXX-TCG/issues/7)(참고 사이트), [#13](https://github.com/sybd1/NMIXX-TCG/issues/13)(프로젝트 구조 단일화).
> 검증 기록에는 이번에 실제로 실행한 것만 `통과`로 적었다. 나머지는 `미실행`이며, 각 기능의 다음 작업은 `/sdd-verify`다.

## 1. 한 문장 정의

NMIXX 팬이 PC나 휴대폰 브라우저에서 부스터 팩을 열어 멤버 포토카드를 모으고, 도감·세트·업적을 채운 뒤 다른 팬과 수집 순위를 겨루게 해 주는 비영리 팬 메이드 웹 게임이다.

## 2. 목표와 성공 기준

- 사용자가 얻는 결과: 실물 카드팩을 뜯는 듯한 개봉 경험, 기기를 바꿔도 이어지는 컬렉션, 전종 완성이라는 명확한 목표와 그 보상(XR 카드, 랭킹 선착순).
- 성공 판단: 로그인 사용자의 랭킹 등록 수와 팩 개봉 수(Vercel Analytics, Firestore `nmixx_tcg_leaderboard`). [확인 필요: 목표 수치가 정해져 있는지]

## 3. 사용자와 핵심 흐름

- 주요 사용자: 한국어를 쓰는 NMIXX 팬(엔써). 데스크톱 브라우저와 모바일 브라우저 모두.
- 핵심 흐름: 첫 방문(100만 N 지급) → 팩 선택·구매 → 개봉 연출로 카드 확인 → 도감에서 수집률 확인 → 구글·카카오 로그인으로 클라우드 저장 → 세트·업적 보상 → 전종 수집 → XR 카드 획득 → 랭킹 상위 등록·배지 공유

## 4. 범위

- 이번 버전에 포함: 카드 5팩 521종(XR 포함), 1·5·10팩 구매와 천장, 3D 개봉 연출, 도감·세트, XR 보상, 구글·카카오 로그인, 클라우드 저장·기기 간 동기화, 업적, 랭킹 Top 50·배지 공유, 실시간 전광판, 우편·쿠폰, 프로필, 회원 탈퇴, 이스터에그, 정보(확률표)
- 나중에: 더스트 분해·제작(기능 015), 카드 교환소(016), 패치노트 탭(017), 출석 보너스(018) — 코드는 있으나 메뉴에서 숨김 (DEC-022)
- 나중에(이슈에만 있고 명세 없음, 착수 전 `/sdd-spec`): 남은 컨셉 세트 7종(캘린더, 블발 컨셉 2·3, 제로프론티어 베케이션, 헤세 엔써 4기·26시그·컨셉1 — #8) / 업적 칭호, 업적 보상 개선·쓸모없는 퀘스트 정리(#9, 기능 009) / 게임 머니 경매장(#9) / 모바일 개봉 화면 스크롤 불편, 개봉 결과 바로 보기 시 검은 화면(#9, 미해결 표시) / Three.js `THREE.Clock` 사용 경고(#9)
- 하지 않음: 카드 대전 규칙 — 수집 게임에 집중 / 실제 결제 — 비영리 팬 창작물(단, Q-07) / 공식 음원 사용 — 저작권 (DEC-004, 이슈 #6·#9의 팩별 음악 요청은 이 이유로 보류) / 'JYP 키우기' 등 연계 게임(#4) — 별도 프로젝트

## 5. 기능 목록

구현 순서대로 적는다. 상태 `Implementing`은 "배포되어 동작하지만 검증 기록이 완성되지 않음"을 뜻한다.

| ID | 기능 | 트랙 | 명세 | 상태 | 선행 |
|---|---|---|---|---|---|
| 001 | 카드 카탈로그와 등급 체계 | Full | [spec](../specs/001-card-catalog/spec.md) | Implementing | - |
| 002 | 팩 구매와 카드 추첨(확률·천장) | Full | [spec](../specs/002-pack-draw/spec.md) | Implementing | 001 |
| 003 | 팩 선택과 개봉 연출 | Full | [spec](../specs/003-pack-opening/spec.md) | Implementing | 002 |
| 004 | 도감(컬렉션) | Full | [spec](../specs/004-collection/spec.md) | Implementing | 001 |
| 005 | 컨셉 세트 보상 | Lite | [spec](../specs/005-concept-set-reward/spec.md) | Implementing | 004 |
| 006 | XR 전종 수집 보상 | Lite | [spec](../specs/006-xr-reward/spec.md) | Implementing | 004 |
| 007 | 로그인(구글·카카오·게스트) | Full | [spec](../specs/007-auth/spec.md) | Implementing | - |
| 008 | 게임 데이터 저장과 기기 간 동기화 | Full | [spec](../specs/008-save-sync/spec.md) | Implementing | 007 |
| 009 | 업적과 카테고리 배지 | Lite | [spec](../specs/009-achievements/spec.md) | Implementing | 002, 004 |
| 010 | 글로벌 랭킹 | Full | [spec](../specs/010-leaderboard/spec.md) | Implementing | 008, 009 |
| 011 | 고등급 획득 전광판 | Lite | [spec](../specs/011-pull-ticker/spec.md) | Implementing | 002, 007 |
| 012 | 우편함과 쿠폰 | Lite | [spec](../specs/012-mailbox-coupon/spec.md) | Implementing | 008 |
| 013 | 프로필(닉네임·최애 멤버) | Lite | [spec](../specs/013-profile/spec.md) | Implementing | 007 |
| 014 | 회원 탈퇴 | Lite | [spec](../specs/014-account-deletion/spec.md) | Implementing | 007, 010 |
| 015 | 더스트 분해·제작 (메뉴 숨김) | Lite | [spec](../specs/015-dust-craft/spec.md) | Implementing | 004 |
| 016 | 카드 교환소 (메뉴 숨김) | Lite | [spec](../specs/016-card-trade/spec.md) | Implementing | 007 |
| 017 | 패치노트 탭 (메뉴 숨김) | Lite | [spec](../specs/017-patch-notes/spec.md) | Implementing | - |
| 018 | 출석 보너스 (버튼 없음) | Lite | [spec](../specs/018-daily-bonus/spec.md) | Implementing | 008 |
| 019 | 이스터에그(MMU 우주선·카드) | Lite | [spec](../specs/019-easter-eggs/spec.md) | Implementing | 003, 004 |
| 020 | 랭킹 배지 공유 | Lite | [spec](../specs/020-share-badge/spec.md) | Implementing | 010 |
| 021 | 정보 탭(통계·확률표·사운드) | Lite | [spec](../specs/021-information/spec.md) | Implementing | 002 |

- 트랙: `Full`(spec·plan·tasks 3개 문서) / `Lite`(spec 1장). 기준은 `specs/_templates`와 템플릿 README.
- 상태: `대기 / Draft / Ready / Implementing / Verified`
- 문서화 중 확인한 우선순위 높은 결함 3개는 2026-11-10에 고쳤다(모두 타입 검사·빌드 통과):
  - 세 수정 모두 2026-11-10 `d07f0ce` 배포로 운영에 반영되었다
  - ① 개봉 요약 화면에서 다시 연 팩의 결제·지급 누락 — 결함 수정, 요구사항 변화 없음 — 002 T010, 003 T012 — 003 AC-08 수동 통과
  - ② 랭킹 조회 중 사용자 문서 삭제 — `/sdd-change`로 010 REQ-04(AC-11·12) 추가, DEC-023 — 010 T006 — AC-11·12 수동 검증은 미실행(Firebase 콘솔 테스트 문서 필요)
  - ③ 게스트 세션 탈퇴 시 로컬 저장본 전체 삭제 — `/sdd-change`로 014 AC-05 추가, DEC-024 — 014 T003 — AC-05 수동 통과

## 6. 제품 전반의 제약

- 지원 환경: 최신 Chrome·Edge·Safari 데스크톱과 모바일. 1024px 이상(`lg`)은 상단 탭, 미만은 하단 탭. WebGL이 없으면 2D 팩으로 대체 (DEC-007)
- 권한·개인정보·데이터 보관: 이메일·닉네임·프로필 이미지 URL을 Firestore에 저장. 탈퇴 시 삭제 (기능 014). 게스트 데이터는 저장하지 않음 (DEC-009)
- 디자인 자료: 없음 — 각 spec의 화면 상태 표로 대신함. 등급 색상은 `RARITY_CONFIGS`, 멤버 색상은 `CardVisual.tsx`의 `MEMBER_THEMES`
- 외부 서비스: Firebase(Auth·Firestore, 프로젝트 `nmixx-tcg`), Kakao JS SDK(`index.html`에서 CDN 로드), Vercel(호스팅·Analytics), X(트위터) 공유 인텐트
- 저작권: 카드 이미지와 IP는 원저작권자 소유. 화면 하단과 README에 고지

## 7. 미결 질문

- [확인 필요: Q-01 Firebase 콘솔에 배포된 Firestore 규칙이 저장소 `firestore.rules`와 같은가? 저장소 규칙은 (1) 로그인한 누구나 모든 유저·랭킹 문서를 쓸 수 있고, (2) 전광판 컬렉션을 `nmixx_tcg_feed`로 적었지만 코드는 `nmixx_tcg_global_feed`를 쓴다(규칙이 없으면 거부) — 막히는 기능: 008, 010, 011]
- [확인 필요: Q-02 카카오 로그인 사용자는 Firebase Auth에 로그인하지 않으므로(DEC-008) Firestore 요청의 `request.auth`가 null이다. 실제로 카카오 사용자의 저장·랭킹 등록이 되는가? — 막히는 기능: 008, 010]
- Q-03 해결(2026-11-10, DEC-025): 운영 배포가 2026-10-19 이후 멈춰 있던 원인은 Dependabot 보안 업데이트(`e2e08aa`, PR #15)가 올린 Tailwind 4.3.3과 v3 방식 설정의 불일치였다(GitHub 커밋 상태: `e3a08a4`까지 성공, 이후 4건 실패 / 새 폴더 `npm ci` 후 빌드 실패로 재현). Tailwind를 `~3.4.17`로 고정하고 Dependabot에 v4 무시 규칙을 넣었다. 새 폴더 `npm ci` → `npm run build` 통과, CSS가 운영본과 바이트 단위로 같다. 푸시 후 확인: `d07f0ce` Vercel 배포 `success`(2026-11-10), 운영 번들에 결함 수정 문구가 들어 있음.
- [확인 필요: Q-04 카드 총수가 화면마다 다르다: 실제 `MASTER_CARDS.length` 521, `RankingPage`·`LeaderboardModal`·봇 생성·`fetchUserProfile`의 하드코딩 521, `MarketModal` 651, `BOOSTER_PACKS[].totalCards` 합 537(팩 텍스처에 표시), 업적 설명문 115/124/87. 모두 `MASTER_CARDS` 기준으로 통일할지 — 막히는 기능: 없음(표시 오류). 이력: 카드 풀은 600(08-22 `16a0bd0`) → 740(08-23 `c4ec7ea`) → 651(08-23 `a3558c8`)을 거쳐 NX 팩 재편 뒤 521이 되었다. 651은 그 시절 값이 남은 것이다]
- Q-06 해결(2026-11-10, DEC-023): 랭킹 조회 중 문서 삭제 코드를 지우고 `카카오_엔써_` 사용자를 다시 표시한다(specs/010 REQ-04, tasks T006).
- [확인 필요: Q-05 천장 카드 설명이 두 곳에서 다르다. 개봉 화면은 "미보유 SSR+ 100% 확정", 정보 탭은 "중복 여부와 관계없이 무작위". 코드는 무작위다(DEC-005). 이력: 미보유 우선은 2026-08-23 `4960592`에서 구현되어 08-30까지 동작했고, 08-31 통합 커밋 `cf6cea8`에서 기록 없이 꺼졌다. 의도한 변경인지 통합 중 사고인지 모른다. 문구를 코드에 맞출지, 미보유 우선을 구현할지 — 막히는 기능: 002]
- [확인 필요: Q-07 GitHub 이슈 #9에 "과금 모델 구상"이 열려 있다. 화면·README의 "비영리 팬 창작물" 고지, 4절 "실제 결제 하지 않음"과 충돌한다. 이슈를 닫을지 — 막히는 기능: 없음]
