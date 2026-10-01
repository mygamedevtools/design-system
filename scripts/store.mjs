// Produces everything an Asset Store listing needs, in brand style, from a package's listing folder.
//
//   npm run store -- ../scene-loader/store        a listing folder anywhere (usually the package's repo)
//   npm run store -- example                      shorthand for store/example in this repo
//   npm run store -- <folder> --out <folder>      write the output somewhere else
//
// Reads listing.json and description.md from the listing folder and writes <listing>/dist/:
//   icon.png (160×160), card.png (420×280), cover.png (1950×1300), social.png (1200×630),
//   screenshot-NN.png (2400×1600), description.html, description.txt, Third-Party Notices.txt,
//   checklist.md, and a self-contained index.html to review it all.
// Images are rendered from templates/asset-store with headless Chrome (set CHROME to override).
import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { startServer } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outArg = outFlag >= 0 ? args.splice(outFlag, 2)[1] : undefined;
const target = args[0];
if (!target) {
  console.error('Usage: npm run store -- <listing folder | name in store/> [--out <folder>]');
  process.exit(1);
}

// npm runs scripts from the repo root; INIT_CWD is where the command was typed.
const cwd = process.env.INIT_CWD ?? process.cwd();
const sourceDir = [resolve(cwd, target), join(root, 'store', target)].find((dir) =>
  existsSync(join(dir, 'listing.json')),
);
if (!sourceDir) {
  console.error(`No listing.json in ${resolve(cwd, target)} or store/${target}`);
  process.exit(1);
}
const outDir = outArg ? resolve(cwd, outArg) : join(sourceDir, 'dist');
const listing = JSON.parse(readFileSync(join(sourceDir, 'listing.json'), 'utf8'));
const descriptionSource = readFileSync(join(sourceDir, 'description.md'), 'utf8');
mkdirSync(outDir, { recursive: true });

// Requirements, from Unity's key image article and Submission Guidelines (see store/README.md).
const SIZES = {
  icon: [160, 160],
  card: [420, 280],
  cover: [1950, 1300],
  social: [1200, 630],
  screenshot: [2400, 1600],
};
const MIN_SCREENSHOT_WIDTH = 1200;
const KEYWORD_LIMIT = 255;
const MIN_UNITY = [2022, 3];

const KIT_FONTS = [
  { name: 'Russo One', license: 'SIL Open Font License 1.1', file: 'assets/fonts/russo-one/OFL.txt' },
  { name: 'Rethink Sans', license: 'SIL Open Font License 1.1', file: 'assets/fonts/rethink-sans/OFL.txt' },
  { name: 'Red Hat Mono', license: 'SIL Open Font License 1.1', file: 'assets/fonts/red-hat-mono/OFL.txt' },
];

const isPlaceholder = (value) => typeof value === 'string' && value.includes('[CONFIRM');
const filled = (value) => value && !isPlaceholder(value);

// Media paths: "/x" is from this repo's root (e.g. /site/img/…), anything else is relative to the
// listing folder, which the render server mounts at /listing/.
const mediaUrl = (path) =>
  path.startsWith('/') ? path : `/listing/${posix.normalize(path).split('/').map(encodeURIComponent).join('/')}`;
const mediaFile = (path) => (path.startsWith('/') ? join(root, path.slice(1)) : join(sourceDir, path));

// Images --------------------------------------------------------------------------------
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error('Chrome not found. Set CHROME to a Chrome or Chromium binary.');
  return found;
}

const chrome = findChrome();
const server = await startServer(0, { '/listing/': sourceDir });
const base = `http://127.0.0.1:${server.address().port}`;

// Async on purpose: Chrome loads the pages from the server in this same process, so a blocking
// call would deadlock it.
const run = promisify(execFile);
async function render(template, params, [width, height], file) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=4000',
    `--window-size=${width},${height}`,
    `--screenshot=${join(outDir, file)}`,
    `${base}/templates/asset-store/${template}.html?${query}`,
  ], { timeout: 60000 });
  return file;
}

const images = {
  icon: await render('icon', {}, SIZES.icon, 'icon.png'),
  card: await render('card', { name: listing.title }, SIZES.card, 'card.png'),
  cover: await render('cover', {
    name: listing.title,
    tagline: listing.tagline,
    image: listing.media?.cover && mediaUrl(listing.media.cover),
  }, SIZES.cover, 'cover.png'),
  social: await render('social', {
    image: listing.media?.social && mediaUrl(listing.media.social),
  }, SIZES.social, 'social.png'),
};
const screenshots = [];
for (const [i, shot] of (listing.screenshots ?? []).entries()) {
  screenshots.push(await render('screenshot', {
    eyebrow: listing.title,
    caption: shot.caption,
    image: mediaUrl(shot.image),
  }, SIZES.screenshot, `screenshot-${String(i + 1).padStart(2, '0')}.png`));
}
server.close();

function pngSize(file) {
  const buffer = readFileSync(join(outDir, file));
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

// Description ---------------------------------------------------------------------------
const thirdParty = [...(listing.includesUiKit ? KIT_FONTS : []), ...(listing.thirdParty ?? [])];
const dependencies = (listing.dependencies ?? []).filter(filled);

const extra = [];
if (dependencies.length) extra.push(`## Requirements\n\n${dependencies.map((d) => `- ${d}`).join('\n')}`);
extra.push(`## Compatibility\n\nUnity ${listing.unity} or newer.`);
if (thirdParty.length) {
  // Submission Guidelines 1.2.a asks for this sentence for each third-party component.
  extra.push(thirdParty.map((t) => `Asset uses ${t.name} under ${t.license}; see Third-Party Notices.txt for details.`).join('\n\n'));
}
if (filled(listing.aiDisclosure)) extra.push(`## AI disclosure\n\n${listing.aiDisclosure}`);
const links = Object.entries(listing.links ?? {}).filter(([, v]) => v);
if (links.length) {
  extra.push(`## Links\n\n${links.map(([k, v]) => `- ${k[0].toUpperCase()}${k.slice(1)}: ${v.includes('@') ? v : `[${v}](${v})`}`).join('\n')}`);
}
const markdown = [descriptionSource.trim(), ...extra].join('\n\n');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

// A small Markdown subset: paragraphs, "## " headings (as bold lines), "- " lists, bold, code, links.
function toHtml(md) {
  return md.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => l.startsWith('- '))) {
      return `<ul>\n${lines.map((l) => `  <li>${inline(l.slice(2))}</li>`).join('\n')}\n</ul>`;
    }
    if (block.startsWith('## ')) return `<p><strong>${inline(block.slice(3))}</strong></p>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}

const toText = (md) =>
  md.replace(/^## (.+)$/gm, (_, h) => h.toUpperCase())
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$2')
    .replace(/^- /gm, '• ');

writeFileSync(join(outDir, 'description.html'), `${toHtml(markdown)}\n`);
writeFileSync(join(outDir, 'description.txt'), `${toText(markdown)}\n`);

if (thirdParty.length) {
  const notices = thirdParty.map((t) => {
    const text = t.file ? readFileSync(join(root, t.file), 'utf8').trim() : (t.text ?? '');
    return `${t.name}\nLicense: ${t.license}\n\n${text}`;
  });
  writeFileSync(
    join(outDir, 'Third-Party Notices.txt'),
    `This asset is governed by the Asset Store EULA; however, the following components are governed by the licenses indicated below:\n\n${notices.join(`\n\n${'-'.repeat(72)}\n\n`)}\n`,
  );
}

// Checks --------------------------------------------------------------------------------
const checks = [];
const check = (ok, text, level = 'error') => checks.push({ status: ok ? 'pass' : level, text });

for (const [kind, file] of Object.entries(images)) {
  const [w, h] = pngSize(file);
  check(w === SIZES[kind][0] && h === SIZES[kind][1], `${kind}: ${file} is ${w}×${h} (needs ${SIZES[kind].join('×')})`);
}
check(screenshots.length > 0, `${screenshots.length} screenshot(s) rendered`, 'warn');
check(!listing.media?.social, listing.media?.social
  ? 'Social image uses a supplied image: confirm it contains no text at all (Unity rule)'
  : 'Social image is the text-free mark version', 'warn');

// Source images narrower than their frame get upscaled and look soft. PNG only.
const FRAMES = { screenshot: 2160, cover: 900 };
function sourceWidth(path) {
  const file = mediaFile(path);
  if (!file.toLowerCase().endsWith('.png') || !existsSync(file)) return undefined;
  return readFileSync(file).readUInt32BE(16);
}
for (const shot of listing.screenshots ?? []) {
  const width = sourceWidth(shot.image);
  if (width !== undefined) {
    check(width >= FRAMES.screenshot, `Screenshot source ${shot.image} is ${width}px wide; capture at ${FRAMES.screenshot}px or more so it isn't upscaled`, 'warn');
  }
}
for (const file of screenshots) {
  const [w, h] = pngSize(file);
  check(w >= MIN_SCREENSHOT_WIDTH, `${file} is ${w}×${h} (at least ${MIN_SCREENSHOT_WIDTH}px wide)`);
}
check(filled(listing.title), 'Title is set');
check(filled(listing.summary), `Summary is set (${listing.summary?.length ?? 0} characters; check the Publisher Portal's limit)`);
check(filled(listing.tagline), 'Cover tagline is set', 'warn');
check(filled(listing.category), 'Category is confirmed', 'warn');
const keywords = (listing.keywords ?? []).join(' ');
check(keywords.length > 0 && keywords.length <= KEYWORD_LIMIT, `Keywords: ${keywords.length}/${KEYWORD_LIMIT} characters`, 'warn');
const [major, minor] = String(listing.unity).split('.').map(Number);
const unityOk = major > 2022 || (major === MIN_UNITY[0] && minor >= MIN_UNITY[1]);
check(unityOk, `Unity ${listing.unity} meets the 2022.3+ requirement (guideline 1.3.a)`);
check(!(listing.dependencies ?? []).some(isPlaceholder), 'Dependencies are confirmed and listed in the description (1.1.c)', 'warn');
check(filled(listing.links?.documentation), 'Documentation link is set (2.3)', 'warn');
check(!thirdParty.length || existsSync(join(outDir, 'Third-Party Notices.txt')),
  `Third-Party Notices.txt generated for ${thirdParty.map((t) => t.name).join(', ') || 'nothing'} (1.2.a); ship it in the package root`);
check(!isPlaceholder(listing.aiDisclosure), 'AI disclosure is confirmed: describe AI-assisted content, or remove the field if none (1.6)', 'warn');

const manual = [
  'Card shows only the title and publisher (template enforces it).',
  'Social image has no text (template enforces it; check that the source image has none either).',
  'Screenshots are not only Unity Editor screenshots, and none show the default Skybox.',
  'No watermarks, Unity logos or sale banners in any image.',
  'Samples or demo content are included (1.1.f) and documentation ships in the package (2.3).',
  'All code is in your own namespaces (2.5.a); no errors or warnings after setup (1.1.b).',
  'Run Tools > Asset Store > Validator (Asset Store Publishing Tools) before uploading.',
];

const icon = { pass: '[x]', warn: '[!]', error: '[ ]' };
const checklist = `# ${listing.title} — Asset Store checklist

Generated by \`npm run store\` from ${relative(root, sourceDir) || sourceDir}. [x] passed, [!] needs attention, [ ] failed.

## Automatic

${checks.map((c) => `- ${icon[c.status]} ${c.text}`).join('\n')}

## Manual

${manual.map((m) => `- [ ] ${m}`).join('\n')}
`;
writeFileSync(join(outDir, 'checklist.md'), checklist);

// Review page -----------------------------------------------------------------------------
// Self-contained so it works wherever the output lives: tokens inlined, fonts copied alongside.
for (const font of ['russo-one', 'rethink-sans', 'red-hat-mono']) {
  cpSync(join(root, 'assets/fonts', font), join(outDir, 'fonts', font), { recursive: true });
}
const reviewCss = [
  readFileSync(join(root, 'build/tokens.css'), 'utf8'),
  readFileSync(join(root, 'assets/fonts/fonts.css'), 'utf8').replaceAll("url('./", "url('fonts/"),
].join('\n');
const figure = (file, label) =>
  `<figure><img src="${file}" alt="${escapeHtml(label)}"><figcaption>${escapeHtml(label)}</figcaption></figure>`;
writeFileSync(join(outDir, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(listing.title)} — Asset Store kit</title>
<style>
${reviewCss}

body{margin:0;padding:32px 16px;background:var(--mgt-color-bg);color:var(--mgt-color-text);font-family:var(--mgt-font-family-body)}
main{max-width:1100px;margin:0 auto}h1,h2{font-family:var(--mgt-font-family-display);font-weight:400}
.grid{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}figure{margin:0}
figure img{display:block;max-width:100%;height:auto;border:1px solid var(--mgt-color-border);border-radius:8px}
figcaption{font-family:var(--mgt-font-family-mono);font-size:12px;color:var(--mgt-color-text-muted);margin-top:6px}
.wide img{width:1100px}.desc{background:var(--mgt-color-surface);border:1px solid var(--mgt-color-border);border-radius:8px;padding:8px 20px}
pre{white-space:pre-wrap;font-family:var(--mgt-font-family-mono);font-size:13px}
</style></head><body><main>
<h1>${escapeHtml(listing.title)}</h1>
<p>${escapeHtml(listing.summary ?? '')}</p>
<h2>Key images</h2>
<div class="grid">${figure('icon.png', 'Icon · 160×160')}${figure('card.png', 'Card · 420×280')}${figure('social.png', 'Social · 1200×630')}</div>
<div class="grid wide">${figure('cover.png', 'Cover · 1950×1300')}</div>
<h2>Screenshots</h2>
<div class="grid wide">${screenshots.map((f) => figure(f, `${f} · 2400×1600`)).join('')}</div>
<h2>Description</h2>
<div class="desc">${toHtml(markdown)}</div>
<h2>Checklist</h2>
<pre>${escapeHtml(checklist)}</pre>
</main></body></html>
`);

const summary = { pass: 0, warn: 0, error: 0 };
for (const c of checks) summary[c.status]++;
console.log(`store: ${relative(cwd, outDir) || outDir} — ${summary.pass} passed, ${summary.warn} to review, ${summary.error} failed`);
for (const c of checks.filter((c) => c.status !== 'pass')) console.log(`  ${icon[c.status]} ${c.text}`);
if (summary.error) process.exitCode = 1;
