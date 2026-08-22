import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
const legacyJson = JSON.parse(fs.readFileSync(path.join(root, 'scratch', 'legacy_cards.json'), 'utf8'));

let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

// LEGACY_CARDS 정의 생성
const legacyCardsCode = `\n\n// 🏛️ 구버전 보유 유저를 위한 레거시 소장 카드 풀 (총 ${legacyJson.length}종)\nexport const LEGACY_CARDS: Card[] = ${JSON.stringify(legacyJson, null, 2)};\n`;

// CONCEPT_SETS 이전에 LEGACY_CARDS 삽입
cardsTs = cardsTs.replace(
  /\n\nexport const CONCEPT_SETS/,
  legacyCardsCode + '\nexport const CONCEPT_SETS'
);

fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
console.log('Successfully added LEGACY_CARDS to cards.ts!');
