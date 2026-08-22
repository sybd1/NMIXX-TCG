import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const targetId = 'card_xr_transcendent_park_741';

// packCode, packId, packName 수정
const regex = new RegExp(`("id":\\s*"${targetId}"[\\s\\S]*?"packCode":\\s*)"[^"]+"([\\s\\S]*?"packId":\\s*)"[^"]+"([\\s\\S]*?"packName":\\s*)"[^"]+"`, 'm');

if (regex.test(cardsTs)) {
  cardsTs = cardsTs.replace(regex, `$1"SECRET"$2"secret_transcendent"$3"특수 비매품 (전종 수집 보상)"`);
  fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
  console.log('Successfully updated XR Park card to secret_transcendent pack!');
} else {
  console.error('Target regex not matched!');
}
