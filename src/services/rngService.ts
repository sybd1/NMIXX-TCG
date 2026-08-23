import { Card, Rarity } from '../types/card';
import { MASTER_CARDS, getCardsByRarity } from '../data/cards';
import { GAME_CONFIG, RARITY_TO_FINISH } from '../config/gameConfig';

const RARITY_RANK: Record<Rarity, number> = {
  C: 1,
  UC: 2,
  R: 3,
  SR: 4,
  SSR: 5,
  UR: 6,
  LR: 7,
  MR: 8,
  XR: 9,
};

// 정수 가중치 (총합 10,000 기준)
// MR: 2 (0.02%), LR: 12 (0.12%), UR: 25 (0.25%), SSR: 45 (0.45%), SR: 250 (2.50%), R: 1500 (15.00%), UC: 3000 (30.00%), C: 5166 (51.66%)
const WEIGHT_MR = 2;
const WEIGHT_LR = 12;
const WEIGHT_UR = 25;
const WEIGHT_SSR = 45;
const WEIGHT_SR = 250;
const WEIGHT_R = 1500;
const WEIGHT_UC = 3000;

export class RngService {
  /**
   * 8단계 극악 확률에 따라 정수 가중치(10,000 기준)를 사용하여 Rarity를 추첨합니다.
   * 부동 소수점 오차 방지를 위해 [0, 9999] 범위의 정수 난수를 활용합니다.
   * @param forceSsrPlus Pity 시스템에 의해 최소 SSR 이상 보장 여부
   */
  public static rollRarity(forceSsrPlus = false): Rarity {
    if (forceSsrPlus) {
      // Pity 발동 시: SSR(70%), UR(20%), LR(8%), MR(2%) 보장 (정수 가중치 1000 기준)
      const pRand = Math.floor(Math.random() * 1000);
      if (pRand < 20) return 'MR';    // 2.0%
      if (pRand < 100) return 'LR';   // 8.0%
      if (pRand < 300) return 'UR';   // 20.0%
      return 'SSR';                   // 70.0%
    }

    // 0 ~ 9999 사이의 정수 난수 생성
    const rand = Math.floor(Math.random() * 10000);

    // 누적 정수 가중치 계산
    const thresMR = WEIGHT_MR;                                         // 5 (0.05%)
    const thresLR = thresMR + WEIGHT_LR;                               // 20 (0.20%)
    const thresUR = thresLR + WEIGHT_UR;                               // 50 (0.50%)
    const thresSSR = thresUR + WEIGHT_SSR;                             // 100 (1.00%)
    const thresSR = thresSSR + WEIGHT_SR;                              // 500 (5.00%)
    const thresR = thresSR + WEIGHT_R;                                 // 2000 (20.00%)
    const thresUC = thresR + WEIGHT_UC;                                // 5000 (50.00%)

    if (rand < thresMR) return 'MR';
    if (rand < thresLR) return 'LR';
    if (rand < thresUR) return 'UR';
    if (rand < thresSSR) return 'SSR';
    if (rand < thresSR) return 'SR';
    if (rand < thresR) return 'R';
    if (rand < thresUC) return 'UC';
    return 'C';
  }

  /**
   * 해당 Rarity 풀에서 무작위 카드를 1장 선택하고 8단계 FinishType을 보장 부여합니다.
   * - packId가 지정된 경우 해당 부스터 팩의 풀에서 우선 선택
   * - forceUnowned(천장 중복 방지) 활성화 시: 유저가 미보유한 카드를 100% 우선 추첨!
   */
  public static rollCard(
    rarity: Rarity,
    packId?: string,
    userCollection?: Record<string, number>,
    forceUnowned = false
  ): Card {
    // 👑 XR 박진영 카드는 전 우주 1장 유일 보상이므로 일반 팩 추첨 풀에서 100% 원천 배제
    let pool = getCardsByRarity(rarity).filter(c => c.rarity !== 'XR' && c.id !== 'card_xr_transcendent_park_741');
    if (packId) {
      const packPool = pool.filter(c => c.packId === packId);
      if (packPool.length > 0) {
        pool = packPool;
      }
    }

    // 🛡️ 천장 중복 방지 시스템 (Duplicate Protection)
    if (forceUnowned && userCollection) {
      const unownedInPool = pool.filter(c => (userCollection[c.id] || 0) === 0);
      if (unownedInPool.length > 0) {
        pool = unownedInPool; // 미보유 카드로만 추첨 풀 압축!
      } else {
        // 해당 등급의 팩 내 카드를 다 모았다면 전체 도감 내 해당 등급 미보유 카드 검색
        const allRarityPool = getCardsByRarity(rarity).filter(c => c.rarity !== 'XR' && c.id !== 'card_xr_transcendent_park_741');
        const unownedGlobal = allRarityPool.filter(c => (userCollection[c.id] || 0) === 0);
        if (unownedGlobal.length > 0) {
          pool = unownedGlobal;
        }
      }
    }

    const fallback = MASTER_CARDS[0];
    const baseCard = (!pool || pool.length === 0) ? fallback : pool[Math.floor(Math.random() * pool.length)];

    return {
      ...baseCard,
      finishType: RARITY_TO_FINISH[rarity] || 'MATTE',
    };
  }

  /**
   * 1개 팩(5장)을 개봉합니다.
   * - 선택된 부스터 팩(packId)의 풀에서 우선 추첨
   * - 50팩 Pity 조건 반영 (SSR 이상 100% 확정 보장)
   * - 👑 천장 발동 시 미보유(NEW) SSR+ 카드 100% 우선 지급 (중복 방지 스마트 천장)
   * - 팩 내 가장 희귀한 카드가 5번째(마지막) 슬롯에 배치됩니다.
   */
  public static generatePack(
    currentPity: number,
    packId?: string,
    userCollection?: Record<string, number>
  ): {
    cards: Card[];
    highestRarity: Rarity;
    newPity: number;
    pityTriggered: boolean;
  } {
    const isPityReady = currentPity >= (GAME_CONFIG.PITY_THRESHOLD - 1);
    let pityTriggered = false;

    const cards: Card[] = [];

    // 4장의 일반 카드 롤
    for (let i = 0; i < 4; i++) {
      const rarity = this.rollRarity(false);
      cards.push(this.rollCard(rarity, packId, userCollection, false));
    }

    // 5번째 카드 롤 (천장 시 최소 SSR 이상 보장 & 중복 방지 스마트 추첨)
    const card5Rarity = this.rollRarity(isPityReady);
    if (isPityReady && RARITY_RANK[card5Rarity] >= RARITY_RANK.SSR) {
      pityTriggered = true;
    }
    cards.push(this.rollCard(card5Rarity, packId, userCollection, pityTriggered));

    // 가장 높은 Rarity 카드가 5번째 슬롯에 오도록 정렬
    cards.sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);

    const highestRarity = cards[cards.length - 1].rarity;
    const hasSsrOrHigher = RARITY_RANK[highestRarity] >= RARITY_RANK.SSR;

    // SSR 이상 획득 시 Pity 리셋, 아니면 카운트 증가
    const newPity = hasSsrOrHigher ? 0 : currentPity + 1;

    return {
      cards,
      highestRarity,
      newPity,
      pityTriggered,
    };
  }
}
