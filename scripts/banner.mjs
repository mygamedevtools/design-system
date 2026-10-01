// Renders a README banner in light and dark from templates/social/readme-banner.html.
//
//   npm run banner -- --name "Design System" --tagline "The brand for …" [--out <folder>]
//
// Writes banner-light.png and banner-dark.png (1280×320 at 2x, so 2560×640) to --out, which
// defaults to assets/readme. Use them in a README with <picture> so GitHub picks the one that
// matches the reader's theme. Set CHROME to override the browser.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { startServer } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const name = option('name');
const tagline = option('tagline');
if (!name) {
  console.error('Usage: npm run banner -- --name "<name>" [--tagline "<tagline>"] [--out <folder>]');
  process.exit(1);
}

const cwd = process.env.INIT_CWD ?? process.cwd();
const outDir = option('out') ? resolve(cwd, option('out')) : join(root, 'assets/readme');
mkdirSync(outDir, { recursive: true });

const chrome = process.env.CHROME ?? [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((path) => existsSync(path));
if (!chrome) throw new Error('Chrome not found. Set CHROME to a Chrome or Chromium binary.');

// Async on purpose: Chrome loads the page from the server in this same process.
const run = promisify(execFile);
const server = await startServer(0);
const base = `http://127.0.0.1:${server.address().port}`;

for (const theme of ['light', 'dark']) {
  const query = new URLSearchParams({ theme, name, ...(tagline && { tagline }) });
  const file = join(outDir, `banner-${theme}.png`);
  await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--virtual-time-budget=4000',
    '--window-size=1280,320',
    `--screenshot=${file}`,
    `${base}/templates/social/readme-banner.html?${query}`,
  ], { timeout: 60000 });
  console.log(`banner: ${relative(cwd, file) || file}`);
}
server.close();
