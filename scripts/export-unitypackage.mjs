// Exports unity/MyGamedevToolsUI as a .unitypackage for package samples. No Unity needed.
//
//   node scripts/export-unitypackage.mjs                  committed GUIDs
//   node scripts/export-unitypackage.mjs --for scene-loader
//
// Pass --for with the package the kit is going into. Two samples that ship the kit with the same
// GUIDs make Unity reassign one copy's GUIDs on import, which can leave a sample pointing at the
// other sample's assets. With --for, every GUID is derived from the package id and the asset's
// path: unique per package, and identical on every re-export, so updates keep their references.
// The kit's files reference each other by path (USS url(), @import), never by GUID.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kitName = 'MyGamedevToolsUI';
const kitDir = join(root, 'unity', kitName);
const staging = join(root, '.cache/unitypackage');
const forIndex = process.argv.indexOf('--for');
const packageId = forIndex > 0 ? process.argv[forIndex + 1] : undefined;
if (forIndex > 0 && !packageId) throw new Error('--for needs a package id, e.g. --for scene-loader');

const output = join(root, 'dist', packageId ? `${kitName}-${packageId}.unitypackage` : `${kitName}.unitypackage`);

function assets(dir) {
  const found = [dir];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.endsWith('.meta') || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...assets(path));
    else found.push(path);
  }
  return found;
}

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

const guids = [];
for (const path of assets(kitDir)) {
  const assetPath = ['Assets', kitName, ...relative(kitDir, path).split(sep)].filter(Boolean).join('/');
  let meta = readFileSync(`${path}.meta`, 'utf8');
  if (packageId) {
    const guid = createHash('md5').update(`${packageId}:${assetPath}`).digest('hex');
    meta = meta.replace(/^guid: [0-9a-f]{32}$/m, `guid: ${guid}`);
  }
  const guid = meta.match(/^guid: ([0-9a-f]{32})$/m)[1];
  const entry = join(staging, guid);
  mkdirSync(entry);
  writeFileSync(join(entry, 'pathname'), assetPath);
  writeFileSync(join(entry, 'asset.meta'), meta);
  if (statSync(path).isFile()) cpSync(path, join(entry, 'asset'));
  guids.push(guid);
}

mkdirSync(dirname(output), { recursive: true });
execFileSync('tar', ['-czf', output, '-C', staging, ...guids]);
console.log(`exported ${relative(root, output)} (${guids.length} assets${packageId ? `, GUIDs for ${packageId}` : ''})`);
