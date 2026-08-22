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

let md = '# 👑 NMIXX 세트 카드 (6종) - 사용자 지정 멤버 사진 매핑 비주얼 갤러리\n\n';
md += '`SET` 폴더 내에 직접 붙여주신 멤버별 사진 이름(`릴리.jpg`, `해원.jpg`, `설윤.jpg`, `배이.jpg`, `지우.jpg`, `규진.jpg`)을 100% 매칭하여 게임 내 카드 이름과 이미지를 완벽히 일치시켰습니다.\n\n';
md += '> [!NOTE]\n> 각 세트의 6명 멤버 카드를 모두 모으면 해당 세트의 상징인 **보상 풀아트 세트 카드**가 컬렉션에서 완성/해금됩니다.\n\n';
md += '---\n\n';

sets.forEach((set, sIdx) => {
  const r = set.rewardCard.rarity;
  const icon = r === 'UR' ? '💎' : (r === 'SSR' ? '👑' : '✨');
  md += `## ${sIdx + 1}. ${icon} [${r} SET] ${set.setTitle}\n\n`;
  md += `- **등급**: **\`${r}\`**\n`;
  md += `- **소속 팩**: \`${set.packCode}\` (${set.packName})\n`;
  md += `- **보상 카드 스펙**: ⚡ POWER ${set.rewardCard.power.toLocaleString()} / 💎 COST ${set.rewardCard.cost} (${set.rewardCard.finishType})\n\n`;
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
console.log('Successfully updated set_cards_gallery.md with exact named member photos!');
