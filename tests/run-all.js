// Runs all test files in sequence. Aggregates exit codes.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FILES = ['physics.test.js', 'smoke.test.js', 'dom.test.js'];

function run(file) {
  return new Promise((resolveP) => {
    console.log(`\n=== ${file} ===`);
    const child = spawn(process.execPath, [resolve(__dirname, file)], { stdio: 'inherit' });
    child.on('exit', (code) => resolveP(code ?? 1));
  });
}

let total = 0, fails = 0;
for (const f of FILES) {
  total++;
  const code = await run(f);
  if (code !== 0) fails++;
}

console.log(`\n=== summary: ${total - fails}/${total} test files passed ===`);
process.exit(fails > 0 ? 1 : 0);
