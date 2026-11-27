# Plan 026: 포트폴리오용 이용자 분석·성능 로그

- 상태: Implementing
- 최종 수정일: 2026-11-27
- 기준 spec: [spec.md](spec.md) (2026-11-27)

> 이 문서는 spec을 **어떻게** 구현하는지 적는다. 요구사항을 새로 만들지 않는다.

## 1. 기존 코드 조사

직접 열어본 파일만 적는다.

- 관련 구조
  - `src/services/activityLog.ts`·`activityLogService.ts` — 024 기록. 순수 로직과 Firestore 연결을 나누고 의존성을 주입해 단위 테스트한다. 같은 방식을 따른다
  - `src/types/activity.ts` — 024 계약. `ACTIVITY_RETENTION_DAYS = 365`(DEC-033)
  - `firestore.rules` — `isOwner(id)`, `isAdmin()`(DEC-032), `nmixx_tcg_events` 규칙 모양
  - `src/App.tsx` — 탭 상태 `currentTab: NavTab`, 개봉 화면 상태 `openingState`, `handleSelectTab`은 같은 탭이면 아무것도 하지 않음. `@vercel/analytics`의 `<Analytics/>` 사용 중
  - `src/types/game.ts` — `NavTab = 'home' | 'collection' | 'achievements' | 'ranking' | 'settings' | 'patch-notes'`, `collection: Record<string, number>`
  - `src/hooks/useGameState.ts` — `addMultiplePacksResult`에서 `newCollection`·`packId`·`packResults`가 있고 024 `pack_open`을 기록한다(게스트는 024가 기록 안 함). `MASTER_CARDS` import 있음
  - `src/services/authService.ts` — 구글 로그인 후(310행)·카카오 로그인 후(446행) 024 `login` 기록, 탈퇴 시 `activityLog.deleteAll(userId)`(771행)
  - `src/components/Pack/BoosterPackThreeView.tsx` — Three.js 렌더러 생성, `requestAnimationFrame` 루프, 보이지 않으면 렌더 중단, 언마운트 시 정리
  - `src/components/Common/WebGLErrorBoundary.tsx` — 3D 오류 시 2D(`BoosterPack2DView`)로 대체, `componentDidCatch`에서 콘솔 출력만
  - `src/pages/Admin/AdminPage.tsx`·`src/services/adminLog.ts`·`adminLogService.ts` — 025 운영자 화면. 단계(checking/denied/loading/ready/error), `rangeStartMs`, `formatKst`, 2,000건 상한 방식
  - `src/config/gameConfig.ts` — `RARITY_CONFIGS[rarity].probability`(설정 확률)
  - `src/data/patchNotes.ts` — 첫 항목 `version`(앱 버전 표시용)
  - `src/services/storageService.ts` — `isLocalServer()`
  - `tests/rules/setup.ts` — `googleUser`·`kakaoUser`·`anonymous`·`seed`·`countAsAdmin`
  - `package.json`·`package-lock.json` — `web-vitals@4.2.4`가 `@firebase/performance`의 하위 의존성으로 이미 설치돼 있음(직접 의존성은 아님)
- 재사용할 것: `kstDateString`(activityLog.ts), `rangeStartMs`·`formatKst`·`EVENT_TYPE_LABELS`(adminLog.ts), `currentUserIsAdmin`(adminLogService.ts), `isLocalServer`, 규칙 `isOwner`·`isAdmin`
- 새로 만들거나 바꿀 것: 3절·4절
- 실행·검증 명령: `npm run test:unit`, `npm run test:rules`, `npm run build`, 규칙 배포 `npx firebase deploy --only firestore:rules --project nmixx-tcg`

## 2. 구조와 데이터 흐름

```text
페이지 열림(main.tsx, /#admin 제외)
  → metrics.start(): 방문자 ID 읽기/만들기(localStorage), visit 기록, 오류·화면 숨김 리스너, web-vitals 구독
탭 이동·개봉 화면(App.tsx useEffect)        → metrics.screen(to)      (같은 화면이면 무시, AC-02)
팩 개봉(useGameState)                      → metrics.pack(...)       (게스트 포함, 수집 종류 수)
3D 팩 뷰(BoosterPackThreeView) 언마운트     → metrics.pack3d('3d', 준비 시간, 평균 프레임)
WebGLErrorBoundary.componentDidCatch       → metrics.pack3d('2d') + metrics.error('react')
window error / unhandledrejection          → metrics.error(...)      (세션당 5건, 같은 메시지 1번)
화면 숨김(visibilitychange hidden)          → metrics.sessionEnd(누적 시간, 마지막 화면) + 첫 숨김에 vitals 1번
로그인(authService)                         → metrics.identify(account) (방문자 ID ↔ 계정 ID 연결)
  ↓ 모두 src/services/metrics.ts(순수) → metricsService.ts(Firestore addDoc, at = serverTimestamp)
nmixx_tcg_metrics (규칙: 누구나 정해진 모양만 추가, 읽기는 운영자, identify만 본인이 지움)
  ↓
/#admin `지표` 탭(MetricsPanel) → fetchMetricsSince(최대 5,000건) → computeMetrics(순수) → 표
                               → 1년 지난 기록 최대 400건 정리(운영자, 기다리지 않음)
```

- 실패 지점과 처리 책임
  - 기록 실패: `metrics.ts`가 잡고 `console.warn`만 한다(AC-03). 다시 보내지 않는다. 기록 실패는 `metrics.error`를 부르지 않는다(AC-15). `metrics.error` 안에서 다시 오류가 나도 재진입 플래그로 막는다
  - 화면을 닫는 순간의 쓰기는 끝나지 않을 수 있다. 그래서 세션 종료는 화면이 숨겨질 때마다 누적 시간으로 다시 쓰고, 분석은 세션별 최댓값을 쓴다. 하나도 없으면 마지막 기록 시각으로 계산하고 "종료 기록 없음"으로 센다(AC-05)
  - 운영자 화면 불러오기 실패: `MetricsPanel`이 오류 문구와 다시 시도(AC-18)
- 새로고침·재진입: 새로고침하면 새 세션 ID, 같은 방문자 ID. `first`는 방문자 ID를 새로 만든 경우에만 참

## 3. 계약 (단일 원본)

- 계약 원본 위치: `src/types/metrics.ts`(새 파일). 권한 원본은 `firestore.rules`
- 아래는 만들 내용의 요약이다. 구현 후에는 코드 파일이 원본이다

```ts
// 컬렉션 nmixx_tcg_metrics — 문서 ID 자동
export type MetricEventType =
  | 'visit' | 'screen' | 'session_end' | 'pack' | 'vitals' | 'pack3d' | 'error' | 'identify';
export type ScreenName =
  | 'home' | 'collection' | 'achievements' | 'ranking' | 'settings' | 'patch-notes' | 'opening';
export type DeviceKind = 'mobile' | 'desktop';

export interface MetricDataMap {
  visit: { first: boolean; device: DeviceKind; loggedIn: boolean };
  screen: { to: ScreenName; from: ScreenName };
  session_end: { durationMs: number; lastScreen: ScreenName };
  pack: { packId: string; packCount: number; owned: number; total: number; rarities: Record<string, number> };
  vitals: { device: DeviceKind; lcp: number | null; inp: number | null; cls: number | null };
  pack3d: { mode: '3d' | '2d'; readyMs: number | null; avgFps: number | null; frames: number };
  error: { kind: 'error' | 'rejection' | 'react'; message: string; screen: ScreenName; version: string };
  identify: Record<string, never>;
}

export interface MetricDoc<T extends MetricEventType = MetricEventType> {
  vid: string;        // 방문자 ID 'v_' + 소문자·숫자·_ 6~36자, localStorage 'nmixx_visitor_id'
  sid: string;        // 세션 ID(페이지 로드마다), 최대 40자
  type: T;
  at: unknown;        // serverTimestamp() — 규칙에서 request.time과 같아야 함
  kstDate: string;    // 'YYYY-MM-DD' (Date.now() + 9h)
  data: MetricDataMap[T];  // 키 8개 이하
  uid?: string;       // identify에만. 작성자 본인 계정 ID
}

export const METRICS_COLLECTION = 'nmixx_tcg_metrics';
export const METRIC_ERROR_CAP_PER_SESSION = 5;   // AC-14
export const METRIC_ERROR_MESSAGE_MAX = 200;     // AC-13
export const ADMIN_METRICS_FETCH_LIMIT = 5000;   // 운영자 1회 읽기 상한
export const METRICS_PURGE_LIMIT = 400;          // 운영자 화면 1회 정리 상한
// 보관 기간은 ACTIVITY_RETENTION_DAYS(365, DEC-033)를 같이 쓴다
```

규칙(firestore.rules에 추가)

```
match /nmixx_tcg_metrics/{id} {
  allow create: if d.keys().hasAll(['vid','sid','type','at','kstDate','data'])
    && d.keys().hasOnly(['vid','sid','type','at','kstDate','data','uid'])
    && d.vid is string && d.vid.matches('v_[a-z0-9_]{6,36}')
    && d.sid is string && d.sid.size() <= 40
    && d.type in ['visit','screen','session_end','pack','vitals','pack3d','error','identify']
    && d.at == request.time
    && d.kstDate is string && d.kstDate.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
    && d.data is map && d.data.size() <= 8
    && ((d.type == 'identify' && ('uid' in d) && d.uid is string && isOwner(d.uid))
        || (d.type != 'identify' && !('uid' in d)))
    && (d.type != 'error' || (d.data.message is string && d.data.message.size() <= 200));
  allow read: if isAdmin() || (resource.data.type == 'identify' && isOwner(resource.data.uid));
  allow delete: if isAdmin() || (resource.data.type == 'identify' && isOwner(resource.data.uid));
}
// d = request.resource.data. 수정(update)은 없다
```

- 인증·권한: 추가는 로그인 없이도 된다(DEC-034). 읽기·삭제는 운영자, identify 문서만 본인도 읽고 지운다(탈퇴용)
- 인덱스: 운영자 조회 `at >= X order by at desc`, 정리 `at < X`, 탈퇴 `uid == X && type == 'identify'`는 모두 단일 필드 자동 인덱스로 된다. `firestore.indexes.json`은 바꾸지 않는다
- 중복: 세션 종료는 숨김마다 다시 쓴다(분석에서 최댓값). 나머지는 중복 방지 없음

## 4. 화면 구현

- 진입 경로: `/#admin`(025). 화면 위에 `행동 로그` / `지표` 탭 버튼을 둔다. 기본은 `행동 로그`(기존 동작 유지)
- 컴포넌트
  - `src/pages/Admin/AdminPage.tsx` — 권한 확인 후 탭 전환. 기존 행동 로그 화면은 그대로
  - `src/pages/Admin/MetricsPanel.tsx`(새) — 기간 버튼(오늘·7일·30일, 기본 7일), 상태(loading/ready/error), 묶음 3개(이용자 분석·성능·오류) 표
- 상태 관리: spec 5절 상태 = `phase`(loading/ready/error) + 빈 상태(기록 0건) + 지표별 `insufficient` 사유
- 고지 문구(AC-19, 정보 탭): `방문자의 게임 이용 기록(접속, 화면 이동, 접속 시간, 팩 개봉, 보상 수령)과 화면 로딩 속도·오류 정보를 부정 이용 확인과 서비스 개선을 위해 1년 동안 보관합니다. 로그인하지 않은 방문자는 이름 없는 무작위 번호로만 구분합니다. 이메일·닉네임은 기록하지 않으며, 회원 탈퇴 시 계정과 연결된 기록은 함께 삭제됩니다.` 로그인 창 문구는 024 그대로 둔다

### 지표 계산(`src/services/metricsAnalysis.ts`, 순수)

- 신규 방문자: 기간 안 `visit.first == true`인 방문자. 그중 로그인한 수(`visit.loggedIn` 또는 `identify`)
- D1·D7: 첫 방문 KST 날짜 d0, d0+N일(그날) 기록이 있으면 재방문. d0+N이 오늘(KST)보다 뒤면 분모에서 뺀다. 분모 0이면 `데이터 부족`(신규 0명 / 아직 N일이 지나지 않음)
- 첫 팩까지: 신규 방문자의 첫 방문 시각 → 첫 `pack` 시각, 중앙값과 표본 수
- 세션 길이: `sid`별 `session_end.durationMs` 최댓값, 없으면 (마지막 기록 − 첫 기록)이고 "종료 기록 없음"으로 센다. 중앙값·75번째 백분위·구간(1분 미만, 1~5분, 5~15분, 15~30분, 30분 이상)
- 화면: `screen.to` 진입 수(+ 세션 시작은 홈 진입), 세션별 마지막 화면 분포
- 수집 속도: 신규 방문자의 `pack` 기록을 첫 방문 후 경과일 구간(첫날, 2일차, 3~7일차, 8~14일차, 15일 이상)으로 묶어 `owned/total` 중앙값
- 등급 비율: `pack.rarities` 합계 대비 비율, `RARITY_CONFIGS.probability`, 표본 장수
- 성능: `vitals` lcp·inp·cls 중앙값·75번째 백분위·표본 수(전체, 모바일, 데스크톱). `pack3d` 3D 준비 시간·평균 프레임 중앙값, 2D 대체 비율
- 오류: (종류, 메시지)별 횟수·영향 방문자 수·마지막 시각, 많은 순
- 백분위는 정렬 후 nearest-rank. 표본 0이면 `null` → `데이터 부족`

## 5. 설계 결정

- 새 컬렉션 `nmixx_tcg_metrics`를 따로 둔다 — 이유: 024 이벤트는 로그인 본인 확인이 걸린 규칙·탈퇴 흐름이 있어 바꾸지 않는다(spec 2절 제외) — 대안: 024에 타입 추가(비로그인 쓰기를 열어야 해 거부)
- 계정 ID는 `identify` 문서에만 둔다 — 이유: 탈퇴할 때 그 문서만 지우면 나머지는 누구 것인지 알 수 없는 기록이 된다(spec 6절 탈퇴). 비로그인→로그인 연결(Q12 기본값)도 된다
- 쓰기는 Firestore SDK `addDoc` — 이유: 기존 방식, 로그인 토큰 처리 자동, 에뮬레이터로 규칙 테스트 가능 — 대안: REST `fetch(keepalive)`(닫힐 때 더 잘 보내지만 CORS 사전 요청·인증 처리 확인이 필요해 제외, 손실은 AC-05로 다룸)
- 첫 화면 로딩 지표는 `web-vitals` 4.2.4를 직접 의존성으로 추가 — 이유: 측정 규칙(LCP 마감, INP 계산, CLS 세션 창, bfcache)을 직접 만들면 틀리기 쉽다. 이미 `@firebase/performance`의 하위 의존성으로 같은 버전이 설치돼 있어 새로 내려받는 코드가 없다 — 대안: `PerformanceObserver` 직접 구현(INP·CLS 정의를 맞추기 어려움), Vercel Speed Insights(운영자 화면에서 이용자 단위로 볼 수 없고 Hobby 한도) — DEC-035
- 오래된 기록 정리는 운영자가 `지표` 탭을 열 때 1년 지난 것 최대 400건을 지운다 — 이유: 비로그인 기록은 본인 확인이 안 되고 TTL은 결제가 필요하다(DEC-031). 이를 위해 운영자에게 이 컬렉션 삭제 권한을 준다(DEC-032 3항 "읽기에만"의 예외) — DEC-035
- spec 미결 질문의 기본값(Q3~Q12, 2026-11-27 사용자 "플랜대로 전부 진행" 지시에 따라 적용)
  - Q3 팝업은 기록하지 않는다. 탭 화면 + 개봉 화면(`opening`)만
  - Q4 실패한 기록은 다시 보내지 않는다
  - Q5 재방문은 "N일 뒤 그날" 기준
  - Q6 성능 지표는 전체·모바일·데스크톱으로 나눠 보인다(화면 폭 1024px 미만 또는 터치 위주 = 모바일)
  - Q7 메시지 200자, 호출 위치(stack)는 보관하지 않는다. 이메일 모양 문자열과 `goog_`·`kakao_` 계정 ID는 `***`로 바꾼다
  - Q8 세션당 오류 5건, 같은 (종류, 메시지)는 세션당 1건
  - 3D 성능 기록은 세션당 10건까지(`METRIC_PACK3D_CAP_PER_SESSION`). 홈 화면 캐러셀이 3D 팩을 여러 개 띄워 탭을 옮길 때마다 여러 건이 생기기 때문(구현 중 확인, 2026-11-27)
  - Q9 기간 오늘·7일·30일(025와 같음)
  - Q10 4절 고지 문구
  - Q11 보관 1년(DEC-033과 같음)
  - Q12 로그인할 때 `identify`를 남겨 방문자 ID와 계정 ID를 잇는다
- 비용 계산(Firestore 무료: 쓰기 20,000/일, 읽기 50,000/일, 저장 1 GiB)
  - 세션당 쓰기 예상: visit 1 + screen 3~6 + session_end 1~3 + vitals 1 + pack3d 1~2 + pack(개봉 수) + error 0~5 ≈ 10~20. 하루 1,000세션까지 한도의 절반 아래다. 지금은 하루 수 세션 수준이다
  - 운영자 화면 1회 읽기 최대 5,001 + 정리 조회 400. 하루 9회 이하 열면 한도 안이다
  - 문서 1건 0.5 KB 가정 시 하루 1,000세션 × 20건 × 365일 ≈ 3.6 GB로 1 GiB를 넘는다. 지금 규모(하루 수십 세션 이하)에서는 수십 MB다. 운영자 화면에 이번 기간 기록 수를 보여 늘어나는 것을 볼 수 있게 한다

## 6. AC → 테스트 매핑

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 단위 + 규칙 | `tests/unit/metrics.test.ts` › `screen: 화면이 바뀌면 to·from을 기록한다` / `tests/rules/metrics.test.ts` › `비로그인·로그인 모두 정해진 모양 추가 허용` | home → collection → `{to:'collection', from:'home'}` 1건 / 허용 |
| AC-02 | 단위 | `metrics.test.ts` › `screen: 같은 화면이면 기록하지 않는다` | collection → collection → 추가 호출 0 |
| AC-03 | 단위 | `metrics.test.ts` › `기록 실패는 밖으로 던지지 않고 다시 보내지 않는다` | addDoc 거부 → 예외 없음, 호출 1번 |
| AC-04 | 단위 | `metrics.test.ts` › `sessionEnd: 경과 시간과 마지막 화면` | 시작 후 5분 → `durationMs` 300,000 |
| AC-05 | 단위 | `metricsAnalysis.test.ts` › `세션 길이: 종료 기록이 없으면 마지막 기록까지, 따로 센다` | session_end 없는 세션 → 길이 = 마지막−처음, `noEnd` 1 |
| AC-06 | 단위 | `metrics.test.ts` › `pack: 수집 종류 수와 전체 수를 남긴다` | owned 123, total = 전달값 |
| AC-07 | 단위 | `metricsAnalysis.test.ts` › `D1 재방문율과 표본 수` | 신규 10명 중 3명 다음 날 → 0.3, n 10 |
| AC-08 | 단위 | `metricsAnalysis.test.ts` › `D7 표본 부족은 null과 사유` | 첫 방문 3일 전 → null, 사유 `아직 7일이 지나지 않음` / 신규 0명 → `신규 방문자 0명` |
| AC-09 | 단위 | `metricsAnalysis.test.ts` › `등급 비율: 실제·설정·표본` | R 3, C 7 → R 0.3, 설정값 그대로, n 10 |
| AC-10 | 단위 + 수동 | `metricsAnalysis.test.ts` › `vitals 중앙값·75백분위, 기기별` / 수동 P1 | 값 5개 → 중앙값·p75 / 운영 사이트에서 `vitals` 문서 생성 확인 |
| AC-11 | 단위 + 수동 | `metricsAnalysis.test.ts` › `3D 준비 시간·평균 프레임` / 수동 P1 | 3D 기록 → 중앙값 / 운영에서 `pack3d` 문서 확인 |
| AC-12 | 단위 | `metricsAnalysis.test.ts` › `2D 대체 비율` | 3d 3, 2d 1 → 0.25 |
| AC-13 | 단위 + 규칙 | `metrics.test.ts` › `error: 메시지를 자르고 이메일·계정 ID를 가린다` / `metricsAnalysis.test.ts` › `오류 종류별 횟수와 방문자 수` / 규칙 `error 메시지 201자 거부` | 이메일 포함 300자 → 200자, `***` / 집계 |
| AC-14 | 단위 | `metrics.test.ts` › `error: 세션당 5건, 같은 메시지는 1건` | 100번(같은 것) → 1건, 서로 다른 10개 → 5건 |
| AC-15 | 단위 | `metrics.test.ts` › `error 기록 실패가 다시 error를 만들지 않는다` | addDoc 거부 → error 호출 1번뿐 |
| AC-16 | 단위 + 수동 | `metricsAnalysis.test.ts` 전체 / 수동 P2 | 운영자 `/#admin` → `지표` 탭에서 기간별 표 확인 |
| AC-17 | 규칙 + 수동 | `metrics.test.ts`(rules) › `운영자만 읽는다, identify는 본인도 읽고 지운다`, `uid 위장·형식 위반 거부`, `수정 거부` / 수동 P3 | 비운영자 목록 읽기 거부 / 비로그인 `/#admin` 지표 탭 없음(025 문구) |
| AC-18 | 수동 | P4 | 네트워크 끊고 `지표` 탭 → `기록을 불러오지 못했습니다.`·다시 시도 |
| AC-19 | 수동 | P5 | 정보 탭 문구 확인(dev·운영) |

수동 절차(운영 사이트, localhost는 기록하지 않음)
- P1: 시크릿 창에서 운영 사이트 열기 → 탭 2번 이동 → 팩 1개 개봉 → 다른 탭으로 전환. 운영자 CLI 권한으로 `nmixx_tcg_metrics` 최근 문서 조회: visit·screen·pack·pack3d·session_end·vitals가 같은 `vid`로 있음
- P2: 운영자 계정으로 `/#admin` → `지표` → 7일: 신규 방문자·세션·화면·등급·성능 표에 P1 기록이 반영됨
- P3: 로그인하지 않고 `/#admin` → 권한 없음 문구만
- P4: 운영자 화면에서 개발자 도구로 오프라인 → `지표` 기간 바꾸기 → 오류 문구·다시 시도 → 온라인 후 다시 시도 성공
- P5: 정보 탭 고지 문구

## 7. 위험과 구현 순서

- 위험
  - 로그인 없는 쓰기를 열어 누군가 가짜 기록을 대량으로 넣으면 프로젝트 전체 쓰기 한도(20,000/일)를 써 버려 게임 저장까지 막힐 수 있다. 규칙은 모양·크기만 막는다. 완화: 현재 규모에서는 감수, 문제가 생기면 Firebase App Check 도입(별도 명세). DEC-035에 기록
  - 화면을 닫을 때 쓰기가 끝나지 않을 수 있다(AC-05로 다룸)
  - `web-vitals`의 INP·LCP는 Safari에서 값이 없을 수 있다 → `null`로 기록, 표본에서 뺀다
- 순서: 계약·의존성 → 규칙·단위 테스트(실패 확인) → 규칙 → 순수 로직 → 서비스·연결 지점 → 운영자 화면·고지 → 프로젝트 검사 → 규칙 배포·푸시 → 운영 확인

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다.
- [x] 계약 원본 위치가 하나로 정해졌다. (`src/types/metrics.ts`, 권한은 `firestore.rules`)
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다. (Q3~Q12는 5절 기본값 적용)
