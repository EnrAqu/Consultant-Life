// Browser smoke tests: builds, serves dist/ with `vite preview` on :4173 and runs every smoke script.
// Uses the locally installed Google Chrome (set CHROME_PATH to override). Usage: npm run smoke
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
execSync('npm run build', { stdio: 'inherit' });
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
let failed = false;
try {
  for (const script of ['smoke.mjs', 'smoke3.mjs', 'smoke4.mjs']) {
    const out = execSync(`node ${join(here, script)}`, { encoding: 'utf8' });
    process.stdout.write(out);
    if (/^FAIL/m.test(out) || !/ERRORS:\nnone/.test(out)) failed = true;
  }
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
