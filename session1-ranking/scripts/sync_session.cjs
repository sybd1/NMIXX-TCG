const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sessionName = process.argv[2];
if (!sessionName) {
  console.error('❌ 사용법: node scripts/sync_session.cjs <세션_폴더명>');
  console.error('예시: node scripts/sync_session.cjs session7-offline-save');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const sessionDir = path.join(rootDir, sessionName);

if (!fs.existsSync(sessionDir)) {
  console.error(`❌ 에러: ${sessionName} 폴더를 찾을 수 없습니다.`);
  process.exit(1);
}

// 루트로 덮어씌울 핵심 소스코드 및 설정 파일 목록
const itemsToSync = [
  'src',
  'package.json',
  'tailwind.config.js',
  'postcss.config.js',
  'vite.config.ts',
  'tsconfig.json'
];

console.log(`\n🔄 [Master Sync] '${sessionName}'의 코드를 최상위 루트로 덮어쓰기 시작합니다...\n`);

for (const item of itemsToSync) {
  const srcPath = path.join(sessionDir, item);
  const destPath = path.join(rootDir, item);
  
  if (fs.existsSync(srcPath)) {
    console.log(` 📦 복사 중: ${item}`);
    try {
      execSync(`powershell -Command "Copy-Item -Path '${srcPath}' -Destination '${rootDir}' -Recurse -Force"`);
    } catch (e) {
      console.error(` ⚠️ 복사 실패: ${item}`, e.message);
    }
  }
}

console.log('\n✅ 동기화 완료! 이제 루트 디렉터리가 최신 세션 코드로 업데이트 되었습니다.');
console.log('👉 GitHub에 푸시(Push)하면 Vercel에 최신 코드가 배포됩니다.\n');
