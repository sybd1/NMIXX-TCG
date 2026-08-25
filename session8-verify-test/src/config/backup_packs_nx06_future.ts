import { BoosterPackConfig } from './gameConfig';

// 📦 NX-06 이후 및 레거시 카드팩 백업 데이터
// 필요 시 언제든 gameConfig.ts로 복원하여 사용할 수 있습니다.
export const BACKUP_FUTURE_PACKS: BoosterPackConfig[] = [
  {
    id: 'pack-nx-11',
    code: 'NX-11',
    name: 'NX-11 정점결전',
    subtitle: 'PARAMOUNT WAR • VOL.11',
    description: '올라운더 6인의 한계를 뛰어넘는 최강의 무대! 승리를 향한 결전의 레거시 부스터 팩.',
    slogan: '정점을 향한 타오르는 열정!',
    image: '/pack_cover_2.jpg',
    objectPosition: 'center 20%',
    gradient: 'from-blue-600 via-indigo-700 to-cyan-400',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    themeColor: '#3b82f6',
    totalCards: 486,
  },
  {
    id: 'pack-nx-12',
    code: 'NX-12',
    name: 'NX-12 대항해시대',
    subtitle: 'GREAT VOYAGE • VOL.12',
    description: '거친 파도를 헤치고 전진하는 압도적인 항해와 모험의 클래식 부스터 팩.',
    slogan: '새로운 바다를 향한 당당한 출항!',
    image: '/pack_blueval.jpg',
    objectPosition: 'center center',
    gradient: 'from-cyan-600 via-teal-700 to-emerald-400',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    themeColor: '#14b8a6',
    totalCards: 160,
  },
  {
    id: 'pack-nx-13',
    code: 'NX-13',
    name: 'NX-13 신세계 개척',
    subtitle: 'NEW WORLD • VOL.13',
    description: '새로운 시대를 열어갈 단 하나의 믹스팝 신화! 극상의 비주얼을 담은 클래식 부스터 팩.',
    slogan: '신세계를 개척하는 찬란한 빛!',
    image: '/pack_zerop.jpg',
    objectPosition: 'center center',
    gradient: 'from-purple-600 via-violet-800 to-pink-500',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    themeColor: '#a855f7',
    totalCards: 160,
  },
];
