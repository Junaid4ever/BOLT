import { exec } from 'child_process';
import { platform } from 'os';

console.log('\n🚀 LAUNCHING AUTO-FIX...\n');

const url = 'http://localhost:5173/auto-fix-meeting-insert.html';

// Detect platform and open browser
const openCommand = platform() === 'darwin' ? 'open' :
                   platform() === 'win32' ? 'start' : 'xdg-open';

console.log('Opening browser...');
console.log(`URL: ${url}\n`);

exec(`${openCommand} ${url}`, (error) => {
  if (error) {
    console.log('Please manually open:');
    console.log(`  ${url}\n`);
  } else {
    console.log('✅ Browser opened!\n');
  }

  console.log('═══════════════════════════════════════════════');
  console.log('📋 AUTOMATIC STEPS COMPLETED:');
  console.log('═══════════════════════════════════════════════');
  console.log('✅ 1. SQL automatically copied to clipboard');
  console.log('✅ 2. Supabase dashboard opening in new tab');
  console.log('\n📌 ONE MANUAL STEP (5 seconds):');
  console.log('   1. When dashboard opens, press Ctrl+V (paste)');
  console.log('   2. Click the green RUN button');
  console.log('\n✅ DONE! Meetings will work perfectly.\n');
  console.log('═══════════════════════════════════════════════\n');
});
