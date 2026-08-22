import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ARTIFACT_DIR = 'C:\\Users\\gjffp\\.gemini\\antigravity\\brain\\69ef337b-8ea5-41e5-9376-27c9219806d5';

const cardsTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'cards.ts'), 'utf8');
const setsMatch = cardsTs.match(/export const CONCEPT_SETS: ConceptSetCard\[\] = (\[[\s\S]*?\]);\n\nexport const CARDS_DATA/);
const sets = JSON.parse(setsMatch[1]);

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);
const cardMap = new Map(masterCards.map(c => [c.id, c]));

let md = '# 👑 NMIXX 6대 공식 세트 카드 컬렉션 비주얼 갤러리\n\n';
md += '각 세트의 공식 명칭(**Flower 세트 카드, Light 세트 카드, School 세트 카드, NMIXX 세트 카드, Blue Valentine 세트 카드, ZERO FRONTIER 세트 카드**)과 6명 멤버 카드 구성입니다.\n\n';
md += '> [!NOTE]\n> 각 세트의 6명 멤버 카드를 모두 모으면 해당 세트의 상징인 **보상 풀아트 세트 카드**와 **거액의 게임 머니**가 지급됩니다.\n\n';
md += '---\n\n';

sets.forEach((set, sIdx) => {
  const r = set.rewardCard.rarity;
  const icon = r === 'UR' ? '💎' : (r === 'SSR' ? '👑' : (r === 'SR' ? '✨' : '🌟'));
  md += `## ${sIdx + 1}. ${icon} [${r} SET] ${set.setTitle}\n\n`;
  md += `- **등급**: **\`${r}\`**\n`;
  md += `- **소속 팩**: \`${set.packCode}\` (${set.packName})\n`;
  md += `- **세트 완성 보상**: 🪙 **\`+${set.rewardCoins.toLocaleString()} COIN\`**\n`;
  md += `- **보상 카드 가공**: \`${set.rewardCard.finishType}\`\n\n`;
  md += `### 📸 6명 멤버 수집 카드 목록\n\n`;

  set.cardIds.forEach(id => {
    const card = cardMap.get(id);
    if (card) {
      const relImg = card.image.replace(/^\//, '');
      const srcPath = path.join(ROOT_DIR, 'public', relImg);
      const normPath = srcPath.replace(/\\/g, '/');
      md += `#### ${card.name} (NO. #${String(card.collectionNumber).padStart(3, '0')} • ${card.rarity})\n`;
      md += `![${card.name}](${normPath})\n\n`;
    }
  });

  md += '---\n\n';
});

fs.writeFileSync(path.join(ARTIFACT_DIR, 'set_cards_gallery.md'), md, 'utf8');
console.log('Successfully updated set_cards_gallery.md without power/cost!');
