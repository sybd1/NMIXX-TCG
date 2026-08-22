import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

cardsTs = cardsTs.replace(
  /"description": ".*종의 모든 NMIXX 카드를 정복한 전설의 마스터에게만 허락되는 유일무이한 궁극의 초월 카드입니다\."/g,
  '"description": "이 카드를 제외한 모든 카드를 수집하면 자동으로 획득할 수 있는 유일무이한 궁극의 초월 카드입니다."'
);

fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
console.log('Successfully updated XR card description in cards.ts!');
