import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const oldCardsTs = execSync('git show 00ab7e0:src/data/cards.ts', { maxBuffer: 20 * 1024 * 1024, encoding: 'utf8' });
const match = oldCardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const oldCards = JSON.parse(match[1]);

const currentCardsTs = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'cards.ts'), 'utf8');
const curMatch = currentCardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(curMatch[1]);
const currentIds = new Set(currentCards.map(c => c.id));

// 현재 651장에 없는 과거 카드들을 Legacy 카드로 분류
const legacyCards = [];
oldCards.forEach(c => {
  if (!currentIds.has(c.id)) {
    // Legacy 카드 표식 추가
    legacyCards.push({
      ...c,
      name: c.name.includes('(Legacy)') ? c.name : `${c.name} (Legacy)`,
      description: `${c.description} [구버전 한정 소장 카드]`,
      isLegacy: true,
    });
  }
});

console.log('Total extracted Legacy cards:', legacyCards.length);
fs.writeFileSync('scratch/legacy_cards.json', JSON.stringify(legacyCards, null, 2), 'utf8');
