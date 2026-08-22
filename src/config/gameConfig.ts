import { Rarity } from '../types/card';

export interface RarityConfig {
  name: Rarity;
  label: string;
  probability: number;
  dustDismantle: number;
  dustCraft: number | null;
  colorHex: string;
  glowColor: string;
  badgeBg: string;
}

export const RARITY_CONFIGS: Record<Rarity, RarityConfig> = {
  C: {
    name: 'C',
    label: 'C Common (일반)',
    probability: 0.5000, // 50.00%
    dustDismantle: 5,
    dustCraft: 50,
    colorHex: '#94a3b8', // 슬레이트 실버
    glowColor: 'rgba(148, 163, 184, 0.25)',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-600'
  },
  UC: {
    name: 'UC',
    label: 'UC Uncommon (고급)',
    probability: 0.3000, // 30.00%
    dustDismantle: 15,
    dustCraft: 150,
    colorHex: '#10b981', // 에메랄드 그린
    glowColor: 'rgba(16, 185, 129, 0.5)',
    badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500'
  },
  R: {
    name: 'R',
    label: 'R Rare (희귀)',
    probability: 0.1500, // 15.00%
    dustDismantle: 40,
    dustCraft: 400,
    colorHex: '#0ea5e9', // 스카이 아쿠아
    glowColor: 'rgba(14, 165, 233, 0.65)',
    badgeBg: 'bg-sky-950 text-sky-300 border-sky-400 font-bold'
  },
  SR: {
    name: 'SR',
    label: 'SR Super Rare (초희귀)',
    probability: 0.0400, // 4.00%
    dustDismantle: 120,
    dustCraft: 1200,
    colorHex: '#a855f7', // 로열 퍼플
    glowColor: 'rgba(168, 85, 247, 0.8)',
    badgeBg: 'bg-purple-950 text-purple-200 border-purple-400 font-extrabold shadow-sm'
  },
  SSR: {
    name: 'SSR',
    label: 'SSR Super Special Rare (특급 희귀)',
    probability: 0.0050, // 0.50%
    dustDismantle: 500,
    dustCraft: 5000,
    colorHex: '#f59e0b', // 골든 앰버
    glowColor: 'rgba(245, 158, 11, 0.9)',
    badgeBg: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 text-amber-200 border-amber-400 font-black shadow-md'
  },
  UR: {
    name: 'UR',
    label: 'UR Ultra Rare (극희귀)',
    probability: 0.0030, // 0.30%
    dustDismantle: 1500,
    dustCraft: 15000,
    colorHex: '#ef4444', // 크림슨 루비
    glowColor: 'rgba(239, 68, 68, 0.95)',
    badgeBg: 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-rose-100 border-red-400 font-black shadow-lg ring-1 ring-red-400/50'
  },
  LR: {
    name: 'LR',
    label: 'LR Legend Rare (전설)',
    probability: 0.0015, // 0.15%
    dustDismantle: 4000,
    dustCraft: 40000,
    colorHex: '#ec4899', // 네온 마젠타 프리즘
    glowColor: 'rgba(236, 72, 153, 1)',
    badgeBg: 'bg-gradient-to-r from-fuchsia-900 via-pink-700 to-rose-900 text-yellow-100 border-pink-300 font-black shadow-xl ring-2 ring-pink-400/70 animate-pulse'
  },
  MR: {
    name: 'MR',
    label: 'MR Mythic Rare (신화)',
    probability: 0.0005, // 0.05%
    dustDismantle: 10000,
    dustCraft: null, // 신화 카드는 제작 불가 (오직 극악의 가챠로만 획득)
    colorHex: '#38bdf8', // 코스믹 보이드 레인보우
    glowColor: 'rgba(250, 204, 21, 1)',
    badgeBg: 'bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-400 text-black border-white font-black shadow-2xl ring-2 ring-amber-300 animate-pulse'
  }
};

export interface BoosterPackConfig {
  id: string;
  code: string; // [OP-01], [OP-02], [OP-03], [OP-04]
  name: string;
  subtitle: string;
  description: string;
  slogan: string;
  image: string;
  objectPosition?: string;
  gradient: string;
  glowColor: string;
  themeColor: string;
  totalCards: number;
}

// 원피스 카드게임(OPTCG) 테마 4대 부스터 팩 시리즈 (총 600종 카드)
export const BOOSTER_PACKS: BoosterPackConfig[] = [
  {
    id: 'op01',
    code: 'OP-01',
    name: 'NMIXX 계승되는 의지',
    subtitle: 'ROMANCE DAWN • VOL.01',
    description: 'NMIXX CHANGE UP! 엔써와 함께 새로운 항해의 닻을 올리는 1탄 부스터 팩.',
    slogan: '새로운 항해의 닻을 올려라!',
    image: '/pack_cover_1.jpg',
    objectPosition: 'center 38%',
    gradient: 'from-pink-600 via-purple-600 to-amber-500',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    themeColor: '#ec4899',
    totalCards: 600,
  },
  {
    id: 'op02',
    code: 'OP-02',
    name: 'NMIXX 정점결전',
    subtitle: 'PARAMOUNT WAR • VOL.02',
    description: '올라운더 6인의 한계를 뛰어넘는 최강의 무대! 승리를 향한 결전의 2탄 부스터 팩.',
    slogan: '정점을 향한 타오르는 열정!',
    image: '/pack_cover_2.jpg',
    objectPosition: 'center 20%',
    gradient: 'from-blue-600 via-indigo-700 to-cyan-400',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    themeColor: '#3b82f6',
    totalCards: 600,
  },
  {
    id: 'op03',
    code: 'OP-03',
    name: 'NMIXX 강대한 적',
    subtitle: 'PILLARS OF STRENGTH • VOL.03',
    description: '어떤 시련도 뚫고 전진하는 압도적인 퍼포먼스와 카리스마의 3탄 부스터 팩.',
    slogan: '어떤 시련도 우리를 막을 수 없다!',
    image: '/pack_cover_3.jpg',
    objectPosition: 'center 22%',
    gradient: 'from-emerald-600 via-teal-700 to-amber-400',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    themeColor: '#10b981',
    totalCards: 600,
  },
  {
    id: 'op04',
    code: 'OP-04',
    name: 'NMIXX 신시대의 주역',
    subtitle: 'AWAKENING OF THE NEW ERA • VOL.04',
    description: '새로운 시대를 열어갈 단 하나의 믹스팝 신화! 극상의 비주얼을 담은 4탄 부스터 팩.',
    slogan: '우리가 바로 신시대의 주역!',
    image: '/pack_cover_4.jpg',
    objectPosition: 'center 25%',
    gradient: 'from-fuchsia-600 via-purple-800 to-rose-400',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    themeColor: '#a855f7',
    totalCards: 600,
  },
];

export const GAME_CONFIG = {
  // 게임 타이틀을 'NMIXX TCG'로 설정
  GAME_TITLE: 'NMIXX TCG',
  INITIAL_COINS: 50_000, // 기본 5만원 코인 지급
  INITIAL_DUST: 0,
  DAILY_BONUS_COINS: 5_000, // 매일 출석 보너스 5천원 코인
  
  // 1팩, 5팩, 10팩 가격 설정
  PACK_COST_SINGLE: 100,      // 1팩 (5장)
  PACK_COST_FIVE: 480,        // 5팩 (25장 - 할인 적용)
  PACK_COST_TEN: 900,         // 10팩 (50장 - 10% 할인)
  CARDS_PER_PACK: 5,
  
  PITY_THRESHOLD: 50, // 50팩 미등장 시 SSR 이상 보장
  
  // 기본 기본팩
  PACK_INFO: BOOSTER_PACKS[0],
};
