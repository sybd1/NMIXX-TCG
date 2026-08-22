import { Card, Rarity } from '../types/card';
import { MASTER_CARDS, getCardsByRarity } from '../data/cards';
import { GAME_CONFIG, RARITY_CONFIGS } from '../config/gameConfig';

const RARITY_RANK: Record<Rarity, number> = {
  C: 1,
  UC: 2,
  R: 3,
  SR: 4,
  SSR: 5,
  UR: 6,
  LR: 7,
  MR: 8,
};

export class RngService {
  /**
   * 8단계 극악 확률에 따라 카드 Rarity를 추첨합니다.
   * 1. C: 50.00%
   * 2. UC: 30.00%
   * 3. R: 15.00%
   * 4. SR: 4.00%
   * 5. SSR: 0.50%
   * 6. UR: 0.30%
   * 7. LR: 0.15%
   * 8. MR: 0.05%
   * @param forceSsrPlus Pity 시스템에 의해 최소 SSR 이상 보장 여부
   */
  public static rollRarity(forceSsrPlus = false): Rarity {
    if (forceSsrPlus) {
      // Pity 발동 시: SSR(70%), UR(20%), LR(8%), MR(2%) 보장
      const pRand = Math.random();
      if (pRand < 0.02) return 'MR';
      if (pRand < 0.10) return 'LR';
      if (pRand < 0.30) return 'UR';
      return 'SSR';
    }

    const rand = Math.random();

    // 누적 확률 검사 (극악 확률 순서: MR -> LR -> UR -> SSR -> SR -> R -> UC -> C)
    const mrChance = RARITY_CONFIGS.MR.probability;                           // 0.0005 (0.05%)
    const lrChance = mrChance + RARITY_CONFIGS.LR.probability;               // 0.0020 (0.20%)
    const urChance = lrChance + RARITY_CONFIGS.UR.probability;               // 0.0050 (0.50%)
    const ssrChance = urChance + RARITY_CONFIGS.SSR.probability;             // 0.0100 (1.00%)
    const srChance = ssrChance + RARITY_CONFIGS.SR.probability;              // 0.0500 (5.00%)
    const rChance = srChance + RARITY_CONFIGS.R.probability;                 // 0.2000 (20.00%)
    const ucChance = rChance + RARITY_CONFIGS.UC.probability;                // 0.5000 (50.00%)

    if (rand < mrChance) return 'MR';
    if (rand < lrChance) return 'LR';
    if (rand < urChance) return 'UR';
    if (rand < ssrChance) return 'SSR';
    if (rand < srChance) return 'SR';
    if (rand < rChance) return 'R';
    if (rand < ucChance) return 'UC';
    return 'C';
  }

  /**
   * 해당 Rarity 풀에서 무작위 카드를 1장 선택합니다.
   */
  public static rollCard(rarity: Rarity): Card {
    const pool = getCardsByRarity(rarity);
    if (!pool || pool.length === 0) {
      return MASTER_CARDS[0];
    }
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  /**
   * 1개 팩(5장)을 개봉합니다.
   * - 50팩 Pity 조건 반영 (SSR 이상 확정)
   * - 팩 내 가장 희귀한 카드가 5번째(마지막) 슬롯에 배치됩니다.
   */
  public static generatePack(currentPity: number): {
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
      cards.push(this.rollCard(rarity));
    }

    // 5번째 카드 롤 (천장 시 최소 SSR 이상 보장)
    const card5Rarity = this.rollRarity(isPityReady);
    if (isPityReady && RARITY_RANK[card5Rarity] >= RARITY_RANK.SSR) {
      pityTriggered = true;
    }
    cards.push(this.rollCard(card5Rarity));

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
