import { Rarity } from '../types/card';

export type AchievementCategory = 'PACKS' | 'PACK_SETS' | 'RARITY' | 'SPENDING';

export interface Achievement {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  targetValue: number;
  rewardCoins: number;
  type: 'PACK_COUNT' | 'PACK_SET' | 'RARITY_SET' | 'COIN_SPENT';
  targetPackId?: string;
  targetRarity?: Rarity;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ----------------------------------------------------
  // 1. 머니 누적 소비 업적 (1만 ~ 10억 골드 / 6단계) ➔ 통일 엠블렘: 🪙
  // ----------------------------------------------------
  {
    id: 'spend_coins_10k',
    category: 'SPENDING',
    type: 'COIN_SPENT',
    title: '1만 (10,000) 골드 소비하기',
    description: '상점 및 카드팩 개봉에 총 10,000 골드를 소비하세요.',
    icon: '🪙',
    targetValue: 10_000,
    rewardCoins: 0,
  },
  {
    id: 'spend_coins_100k',
    category: 'SPENDING',
    type: 'COIN_SPENT',
    title: '10만 (100,000) 골드 소비하기',
    description: '상점 및 카드팩 개봉에 총 100,000 골드를 소비하세요.',
    icon: '🪙',
    targetValue: 100_000,
    rewardCoins: 0,
  },
  {
    id: 'spend_coins_1m',
    category: 'SPENDING',
    type: 'COIN_SPENT',
    title: '100만 (1,000,000) 골드 소비하기',
    description: '상점 및 카드팩 개봉에 총 1,000,000 골드를 소비하세요.',
    icon: '🪙',
    targetValue: 1_000_000,
    rewardCoins: 0,
  },
  {
    id: 'spend_coins_10m',
    category: 'SPENDING',
    type: 'COIN_SPENT',
    title: '1,000만 (10,000,000) 골드 소비하기',
    description: '상점 및 카드팩 개봉에 총 10,000,000 골드를 소비하세요.',
    icon: '🪙',
    targetValue: 10_000_000,
    rewardCoins: 0,
  },
  {
    id: 'spend_coins_100m',
    category: 'SPENDING',
    type: 'COIN_SPENT',
    title: '1억 (100,000,000) 골드 소비하기',
    description: '상점 및 카드팩 개봉에 총 100,000,000 골드를 소비하세요.',
    icon: '🪙',
    targetValue: 100_000_000,
    rewardCoins: 0,
  },
  {
    id: 'spend_coins_1b',
    category: 'SPENDING',
    type: 'COIN_SPENT',
    title: '10억 (1,000,000,000) 골드 소비하기',
    description: '상점 및 카드팩 개봉에 총 1,000,000,000 골드를 소비하세요.',
    icon: '🪙',
    targetValue: 1_000_000_000,
    rewardCoins: 0,
  },

  // ----------------------------------------------------
  // 2. 카드팩 개봉 누적 업적 (6단계: 10개 ~ 100만개) ➔ 통일 엠블렘: 📦
  // ----------------------------------------------------
  {
    id: 'pack_open_10',
    category: 'PACKS',
    type: 'PACK_COUNT',
    title: '카드팩 10개 개봉하기',
    description: 'NMIXX 공식 부스터 카드팩을 총 10개 개봉하세요.',
    icon: '📦',
    targetValue: 10,
    rewardCoins: 0,
  },
  {
    id: 'pack_open_100',
    category: 'PACKS',
    type: 'PACK_COUNT',
    title: '카드팩 100개 개봉하기',
    description: 'NMIXX 공식 부스터 카드팩을 총 100개 개봉하세요.',
    icon: '📦',
    targetValue: 100,
    rewardCoins: 0,
  },
  {
    id: 'pack_open_1000',
    category: 'PACKS',
    type: 'PACK_COUNT',
    title: '카드팩 1,000개 개봉하기',
    description: 'NMIXX 공식 부스터 카드팩을 총 1,000개 개봉하세요.',
    icon: '📦',
    targetValue: 1_000,
    rewardCoins: 0,
  },
  {
    id: 'pack_open_10000',
    category: 'PACKS',
    type: 'PACK_COUNT',
    title: '카드팩 10,000개 개봉하기',
    description: 'NMIXX 공식 부스터 카드팩을 총 10,000개 개봉하세요.',
    icon: '📦',
    targetValue: 10_000,
    rewardCoins: 0,
  },
  {
    id: 'pack_open_100000',
    category: 'PACKS',
    type: 'PACK_COUNT',
    title: '카드팩 100,000개 개봉하기',
    description: 'NMIXX 공식 부스터 카드팩을 총 100,000개 개봉하세요.',
    icon: '📦',
    targetValue: 100_000,
    rewardCoins: 0,
  },
  {
    id: 'pack_open_1000000',
    category: 'PACKS',
    type: 'PACK_COUNT',
    title: '카드팩 1,000,000개 개봉하기',
    description: 'NMIXX 공식 부스터 카드팩을 총 1,000,000개 개봉하세요.',
    icon: '📦',
    targetValue: 1_000_000,
    rewardCoins: 0,
  },

  // ----------------------------------------------------
  // 3. 부스터 팩 전종 수집 완주 업적 ➔ 통일 엠블렘: 🏆
  // ----------------------------------------------------
  {
    id: 'set_complete_op01',
    category: 'PACK_SETS',
    type: 'PACK_SET',
    targetPackId: 'op01',
    title: 'NX 01 - Fe3O4: FORWARD 카드 모두 수집',
    description: 'NX 01 - Fe3O4: FORWARD 팩 전종 128장을 모두 수집하세요.',
    icon: '🏆',
    targetValue: 128,
    rewardCoins: 0,
  },
  {
    id: 'set_complete_op02',
    category: 'PACK_SETS',
    type: 'PACK_SET',
    targetPackId: 'op02',
    title: 'NX 02 - 2025.ver 카드 모두 수집',
    description: 'NX 02 - 2025.ver 팩 전종 115장을 모두 수집하세요.',
    icon: '🏆',
    targetValue: 115,
    rewardCoins: 0,
  },
  {
    id: 'set_complete_op03',
    category: 'PACK_SETS',
    type: 'PACK_SET',
    targetPackId: 'op03',
    title: 'NX 03 - Blue Valentine 카드 모두 수집',
    description: 'NX 03 - Blue Valentine 팩 전종 124장을 모두 수집하세요.',
    icon: '🏆',
    targetValue: 124,
    rewardCoins: 0,
  },
  {
    id: 'set_complete_op04',
    category: 'PACK_SETS',
    type: 'PACK_SET',
    targetPackId: 'op04',
    title: 'NX 04 - ZERO FRONTIER 카드 모두 수집',
    description: 'NX 04 - ZERO FRONTIER 팩 전종 87장을 모두 수집하세요.',
    icon: '🏆',
    targetValue: 87,
    rewardCoins: 0,
  },


  // ----------------------------------------------------
  // 4. 레어도(Rarity)별 카드 전종 수집 업적 (9종) ➔ 통일 엠블렘: ⭐
  // ----------------------------------------------------
  {
    id: 'rarity_complete_c',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'C',
    title: 'C (Common) 등급 카드 모두 수집',
    description: 'C 등급 노멀 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_uc',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'UC',
    title: 'UC (Uncommon) 등급 카드 모두 수집',
    description: 'UC 등급 유광 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_r',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'R',
    title: 'R (Rare) 등급 카드 모두 수집',
    description: 'R 등급 은박 스탬핑 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_sr',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'SR',
    title: 'SR (Super Rare) 등급 카드 모두 수집',
    description: 'SR 등급 레인보우 홀로 포일 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_ssr',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'SSR',
    title: 'SSR (Special Super Rare) 등급 카드 모두 수집',
    description: 'SSR 등급 파편 글래스 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_ur',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'UR',
    title: 'UR (Ultra Rare) 등급 카드 모두 수집',
    description: 'UR 등급 프리즘 글리터 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_lr',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'LR',
    title: 'LR (Legendary Rare) 등급 카드 모두 수집',
    description: 'LR 등급 금박 엠보싱 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_mr',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'MR',
    title: 'MR (Mythic Rare) 등급 카드 모두 수집',
    description: 'MR 등급 코스믹 오로라 카드를 전부 수집하세요.',
    icon: '⭐',
    targetValue: 0,
    rewardCoins: 0,
  },
  {
    id: 'rarity_complete_xr',
    category: 'RARITY',
    type: 'RARITY_SET',
    targetRarity: 'XR',
    title: 'XR (Transcendent) 초월 카드 획득',
    description: '전종 수집 달성으로 히든 [XR] 초월 카드를 획득하세요.',
    icon: '⭐',
    targetValue: 1,
    rewardCoins: 0,
  },
];
