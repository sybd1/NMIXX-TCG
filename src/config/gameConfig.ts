import { Rarity, FinishType } from '../types/card';

export interface RarityConfig {
  name: Rarity;
  label: string;
  probability: number;
  weight: number; // 정수 가중치 (총합 10,000)
  dustDismantle: number;
  dustCraft: number | null;
  colorHex: string;
  glowColor: string;
  badgeBg: string;
  finishType: FinishType;
}

export interface FinishConfig {
  type: FinishType;
  nameKo: string;
  matchedTier: Rarity;
  visualSpec: string;
  weight: number;
}

export const FINISH_CONFIGS: Record<FinishType, FinishConfig> = {
  MATTE: { type: 'MATTE', nameKo: '무광 / 노멀', matchedTier: 'C', visualSpec: '반사 없음, 기본 텍스처', weight: 5000 },
  GLOSSY: { type: 'GLOSSY', nameKo: '유광', matchedTier: 'UC', visualSpec: '은은한 표면 하이라이트 반사', weight: 3000 },
  SILVER_STAMPING: { type: 'SILVER_STAMPING', nameKo: '은박 스탬핑', matchedTier: 'R', visualSpec: '테두리/텍스트 메탈릭 라인 반사', weight: 1500 },
  RAINBOW_FOIL: { type: 'RAINBOW_FOIL', nameKo: '레인보우 포일', matchedTier: 'SR', visualSpec: '선형 그라데이션 무지개빛 스펙트럼', weight: 400 },
  SHATTERED_GLASS: { type: 'SHATTERED_GLASS', nameKo: '크랙 / 파편', matchedTier: 'SSR', visualSpec: '유리 파편 패턴 굴절 이펙트', weight: 50 },
  PRISM_GLITTER: { type: 'PRISM_GLITTER', nameKo: '프리즘 글리터', matchedTier: 'UR', visualSpec: '다이아몬드/별빛 파티클 굴절', weight: 30 },
  TEXTURE_GOLD: { type: 'TEXTURE_GOLD', nameKo: '금박 엠보싱', matchedTier: 'LR', visualSpec: '양각 입체감 + 골드 텍스처 포일', weight: 15 },
  COSMIC_GHOST: { type: 'COSMIC_GHOST', nameKo: '코스믹 오로라', matchedTier: 'MR', visualSpec: '인터랙티브 펄/오로라 색상 변환 최상위 연출', weight: 5 },
  TRANSCENDENT_COSMIC: { type: 'TRANSCENDENT_COSMIC', nameKo: '초월 코스믹 / 신의 가공', matchedTier: 'XR', visualSpec: '전종 수집자에게만 주어지는 유일무이한 궁극의 초월 이펙트', weight: 0 },
};

export const RARITY_TO_FINISH: Record<Rarity, FinishType> = {
  C: 'MATTE',
  UC: 'GLOSSY',
  R: 'SILVER_STAMPING',
  SR: 'RAINBOW_FOIL',
  SSR: 'SHATTERED_GLASS',
  UR: 'PRISM_GLITTER',
  LR: 'TEXTURE_GOLD',
  MR: 'COSMIC_GHOST',
  XR: 'TRANSCENDENT_COSMIC',
};

export const RARITY_CONFIGS: Record<Rarity, RarityConfig> = {
  C: {
    name: 'C',
    label: 'C Common (일반)',
    probability: 0.5166, // 51.66%
    weight: 5166,
    dustDismantle: 5,
    dustCraft: 50,
    colorHex: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-600',
    finishType: 'MATTE',
  },
  UC: {
    name: 'UC',
    label: 'UC Uncommon (고급)',
    probability: 0.3000, // 30.00%
    weight: 3000,
    dustDismantle: 15,
    dustCraft: 150,
    colorHex: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500',
    finishType: 'GLOSSY',
  },
  R: {
    name: 'R',
    label: 'R Rare (희귀)',
    probability: 0.1500, // 15.00%
    weight: 1500,
    dustDismantle: 40,
    dustCraft: 400,
    colorHex: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.65)',
    badgeBg: 'bg-sky-950 text-sky-300 border-sky-400 font-bold',
    finishType: 'SILVER_STAMPING',
  },
  SR: {
    name: 'SR',
    label: 'SR Super Rare (초희귀)',
    probability: 0.0250, // 2.50%
    weight: 250,
    dustDismantle: 120,
    dustCraft: 1200,
    colorHex: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    badgeBg: 'bg-purple-950 text-purple-200 border-purple-400 font-extrabold shadow-sm',
    finishType: 'RAINBOW_FOIL',
  },
  SSR: {
    name: 'SSR',
    label: 'SSR Super Special Rare (특급 희귀)',
    probability: 0.0045, // 0.45%
    weight: 45,
    dustDismantle: 500,
    dustCraft: 5000,
    colorHex: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.9)',
    badgeBg: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 text-amber-200 border-amber-400 font-black shadow-md',
    finishType: 'SHATTERED_GLASS',
  },
  UR: {
    name: 'UR',
    label: 'UR Ultra Rare (극희귀)',
    probability: 0.0025, // 0.25%
    weight: 25,
    dustDismantle: 1500,
    dustCraft: 15000,
    colorHex: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.95)',
    badgeBg: 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-rose-100 border-red-400 font-black shadow-lg ring-1 ring-red-400/50',
    finishType: 'PRISM_GLITTER',
  },
  LR: {
    name: 'LR',
    label: 'LR Legend Rare (전설)',
    probability: 0.0012, // 0.12%
    weight: 12,
    dustDismantle: 4000,
    dustCraft: 40000,
    colorHex: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 1)',
    badgeBg: 'bg-gradient-to-r from-fuchsia-900 via-pink-700 to-rose-900 text-yellow-100 border-pink-300 font-black shadow-xl ring-2 ring-pink-400/70 animate-pulse',
    finishType: 'TEXTURE_GOLD',
  },
  MR: {
    name: 'MR',
    label: 'MR Mythic Rare (신화)',
    probability: 0.0002, // 0.02%
    weight: 2,
    dustDismantle: 10000,
    dustCraft: null,
    colorHex: '#38bdf8',
    glowColor: 'rgba(250, 204, 21, 1)',
    badgeBg: 'bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-400 text-black border-white font-black shadow-2xl ring-2 ring-amber-300 animate-pulse',
    finishType: 'COSMIC_GHOST',
  },
  XR: {
    name: 'XR',
    label: 'XR Transcendent Rare (초월)',
    probability: 0.0000, // 0.00% (가챠 획득 불가, 올 컬렉션 달성 특전 전용)
    weight: 0,
    dustDismantle: 50000,
    dustCraft: null,
    colorHex: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 1)',
    badgeBg: 'bg-gradient-to-r from-rose-600 via-purple-600 to-amber-400 text-white border-white font-black shadow-2xl ring-2 ring-rose-400 animate-pulse',
    finishType: 'TRANSCENDENT_COSMIC',
  }
};

export interface BoosterPackConfig {
  id: string;
  code: string; // [NX-01], [NX-02], [NX-03], [NX-04] (NX - 1 ~ NX - 4)
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

// NMIXX 테마 4대 부스터 팩 시리즈 (총 600종 카드)
export const BOOSTER_PACKS: BoosterPackConfig[] = [
  {
    id: 'op01',
    code: 'NX-01',
    name: 'NX1 Fe3O4: FORWARD',
    subtitle: 'Fe3O4: FORWARD • VOL.01',
    description: 'NMIXX CHANGE UP! 미지의 필드를 개척하며 한계를 뚫고 나아가는 《Fe3O4: FORWARD》 1탄 부스터 팩.',
    slogan: '새로운 필드를 향해 거침없이 전진하라, Fe3O4: FORWARD!',
    image: '/card-pack-image/nx1-fe3o4-foward/logo.jpg',
    objectPosition: 'center center',
    gradient: 'from-pink-600 via-purple-600 to-amber-500',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    themeColor: '#ec4899',
    totalCards: 127,
  },
  {
    id: 'op02',
    code: 'NX-02',
    name: 'NMIXX 정점결전',
    subtitle: 'PARAMOUNT WAR • VOL.02',
    description: '올라운더 6인의 한계를 뛰어넘는 최강의 무대! 승리를 향한 결전의 2탄 부스터 팩.',
    slogan: '정점을 향한 타오르는 열정!',
    image: '/pack_cover_2.jpg',
    objectPosition: 'center 20%',
    gradient: 'from-blue-600 via-indigo-700 to-cyan-400',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    themeColor: '#3b82f6',
    totalCards: 740,
  },
  {
    id: 'op03',
    code: 'NX-03',
    name: 'NMIXX Blue Valentine',
    subtitle: 'BLUE VALENTINE • VOL.03',
    description: '어떤 시련도 뚫고 전진하는 압도적인 퍼포먼스와 카리스마의 3탄 부스터 팩.',
    slogan: '파란빛 감성의 몽환적인 발렌타인 멜로디!',
    image: '/pack_blueval.jpg',
    objectPosition: 'center center',
    gradient: 'from-blue-600 via-indigo-800 to-cyan-400',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    themeColor: '#3b82f6',
    totalCards: 740,
  },
  {
    id: 'op04',
    code: 'NX-04',
    name: 'NMIXX ZERO FRONTIER',
    subtitle: 'ZERO FRONTIER • VOL.04',
    description: '새로운 시대를 열어갈 단 하나의 믹스팝 신화! 극상의 비주얼을 담은 4탄 부스터 팩.',
    slogan: '신시대를 여는 믹스팝의 개척자, ZERO FRONTIER!',
    image: '/pack_zerop.jpg',
    objectPosition: 'center center',
    gradient: 'from-fuchsia-600 via-purple-800 to-rose-400',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    themeColor: '#a855f7',
    totalCards: 740,
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
