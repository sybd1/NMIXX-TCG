import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ARTIFACT_DIR = 'C:\\Users\\gjffp\\.gemini\\antigravity\\brain\\69ef337b-8ea5-41e5-9376-27c9219806d5';
const PREVIEW_DIR = path.join(ARTIFACT_DIR, 'set_previews');

if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

const summary = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'scratch', 'sets-summary.json'), 'utf8'));

let md = '# 👑 NMIXX 6인 완전체 세트 컬렉션 (6종) 비주얼 프리뷰\n\n';
md += '현재 게임 내에 구축된 6개 세트(UR 1세트, SSR 1세트, SR 2세트, R 2세트)에 포함된 **6명 멤버(릴리, 해원, 설윤, 배이, 지우, 규진)의 실제 카드 이미지와 구성**입니다.\n\n';
md += '> [!NOTE]\n> 각 세트의 6명 멤버 카드를 모두 모으면 해당 세트의 상징인 **보상 풀아트 세트 카드**가 컬렉션에서 해금됩니다.\n\n';
md += '---\n\n';

summary.forEach((set, sIdx) => {
  md += `## ${sIdx + 1}. [${set.rarity} SET] ${set.setTitle} (${set.packCode})\n\n`;
  md += `- **등급**: **\`${set.rarity}\`**\n`;
  md += `- **활동 에라**: \`${set.era}\`\n`;
  md += `- **소속 팩**: \`${set.packCode}\`\n\n`;
  md += `### 📸 6명 멤버 수집 카드 목록\n\n`;

  set.memberCards.forEach(c => {
    const relImg = c.image.replace(/^\//, '');
    const srcPath = path.join(ROOT_DIR, 'public', relImg);
    const destName = `${set.setId}_${c.member}_${path.basename(c.image)}`;
    const destPath = path.join(PREVIEW_DIR, destName);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
    
    // Windows 절대 경로 표기
    const normPath = destPath.replace(/\\/g, '/');
    md += `#### ${c.name} (${c.rarity})\n`;
    md += `![${c.name}](${normPath})\n\n`;
  });

  md += '---\n\n';
});

fs.writeFileSync(path.join(ARTIFACT_DIR, 'set_cards_gallery.md'), md, 'utf8');
console.log('Successfully generated set_cards_gallery.md with images!');
