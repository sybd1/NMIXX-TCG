# 🧩 세션 1: 글로벌 랭킹 상세 프로필 및 대표 카드

이 세션은 랭킹 목록에서 유저 정보를 조회하고, XR 등급을 제외한 고등급 대표 카드 3장을 렌더링하는 것을 목표로 합니다.

## 🎯 주요 목표 및 수정 범위
* **수정 파일**: 
  - `src/components/Multiplayer/LeaderboardModal.tsx`
  - `src/services/multiplayerService.ts`
* **개발 세부 요건**:
  - 랭킹 항목(순위 메달, 아바타, 닉네임 영역 등) 클릭 시 상세 정보 모달(framer-motion을 쓰지 않는 일반 React 마운팅)로 뷰 전환.
  - Firestore 연계 `fetchUserCollection(uid)` API를 호출하여 대상 유저의 실제 수집 맵 로드.
  - 대표 카드는 XR 등급 카드를 제외하고 고등급(MR -> LR -> UR -> SSR -> SR -> R -> UC -> C) 및 전투력 내림차순 정렬을 거친 상위 3장을 `CardVisual` 레이아웃으로 렌더링.

---

## 📋 [프롬프트 복사용 템플릿]

새 방을 개설한 뒤 아래 텍스트박스 전체를 복사하여 첫 프롬프트로 전송해 주세요.

```markdown
/fork

[NMIXX TCG 초소형 세션 개발 시작 - 세션 1]
1. 진행 세션: 세션 1 (글로벌 랭킹 상세 프로필 및 대표 카드)
2. 요구사항:
   - LeaderboardModal.tsx 에서 랭커 리스트의 항목 혹은 뱃지 클릭 시, 해당 유저의 상세 프로필 오버레이 화면(framer-motion AnimatePresence를 제외한 일반 React 조건부 마운트 구조)으로 전환되도록 뼈대를 작성해주세요.
   - multiplayerService.ts 에 fetchUserCollection(uid) 메소드를 작성하여 Firestore 'nmixx_tcg_users' 컬렉션에서 해당 유저의 collection 맵을 비동기로 로드해주세요.
   - 대표 카드는 XR 등급 카드를 제외하고 등급(희귀도)이 가장 높은 순(MR -> LR -> UR -> SSR -> SR -> R -> UC -> C)으로 3장을 정렬하여 렌더링해주세요. (동률 시 전투력 내림차순)
3. 베이스 라인 유지:
   - 모든 메타데이터는 팩별 JSON 파일로 모듈화되어 있으며, JYP 하드코딩 예외 분기는 isMystery 및 triggerCelebration 속성 기반으로 제어됩니다.
   - 구현 후 npm run build를 수행하여 빌드 테스트를 통과하는지 확인해주세요.
```
