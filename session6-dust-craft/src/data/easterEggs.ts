export interface EasterEggDefinition {
  id: string;
  name: string;
  category: 'LORE' | 'SECRET_CARD' | 'SPECIAL_EVENT';
  description: string;
  rewardType: 'COINS' | 'CARD' | 'TITLE';
  rewardAmount?: number;
  rewardCardId?: string;
  hint: string;
}

export const EASTER_EGGS: Record<string, EasterEggDefinition> = {
  MMU_FLYBY: {
    id: 'MMU_FLYBY',
    name: 'MMU 차원 도약 보급선',
    category: 'LORE',
    description: '팩오픈 화면 진입 시 쾌속 횡단하는 MMU 우주선 포착 및 보급 수령',
    rewardType: 'COINS',
    rewardAmount: 500000,
    hint: '팩오픈 화면에 접속하고 3초 뒤 우측에서 날아오는 MMU 우주선을 클릭하세요.',
  },
  JYP_TRANSCENDENT: {
    id: 'JYP_TRANSCENDENT',
    name: 'J.Y. Park 초월자 각성',
    category: 'SECRET_CARD',
    description: '전설의 히든 프로듀서 XR 카드 획득',
    rewardType: 'CARD',
    rewardCardId: 'card_xr_transcendent_park_741',
    hint: '특정 히든 커맨드 또는 비밀 이벤트를 달성하세요.',
  },
};
