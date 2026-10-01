// Creates missing .meta files in the Unity UI kit (unity/MyGamedevToolsUI).
//
// The kit ships inside samples as an exported .unitypackage, so its GUIDs must be stable across
// exports: existing .meta files are never touched, and new ones are created once and committed.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kitDir = join(root, 'unity/MyGamedevToolsUI');

const footer = '  userData: \n  assetBundleName: \n  assetBundleVariant: \n';

const importers = {
  folder: () => `folderAsset: yes\nDefaultImporter:\n  externalObjects: {}\n${footer}`,
  '.cs': () =>
    'MonoImporter:\n  externalObjects: {}\n  serializedVersion: 2\n  defaultReferences: []\n' +
    `  executionOrder: 0\n  icon: {instanceID: 0}\n${footer}`,
  '.asmdef': () => `AssemblyDefinitionImporter:\n  externalObjects: {}\n${footer}`,
  '.uss': () =>
    'ScriptedImporter:\n  internalIDToNameTable: []\n  externalObjects: {}\n  serializedVersion: 2\n' +
    `${footer}  script: {fileID: 12385, guid: 0000000000000000e000000000000000, type: 0}\n  disableValidation: 0\n`,
  '.tss': () =>
    'ScriptedImporter:\n  internalIDToNameTable: []\n  externalObjects: {}\n  serializedVersion: 2\n' +
    `${footer}  script: {fileID: 12388, guid: 0000000000000000e000000000000000, type: 0}\n` +
    '  disableValidation: 0\n  unsupportedSelectorAction: 0\n',
  '.ttf': (file) =>
    'TrueTypeFontImporter:\n  externalObjects: {}\n  serializedVersion: 4\n  fontSize: 16\n' +
    '  forceTextureCase: -2\n  characterSpacing: 0\n  characterPadding: 1\n  includeFontData: 1\n' +
    `  fontNames:\n  - ${basename(file, '.ttf').split('-')[0].replace(/([a-z])([A-Z])/g, '$1 $2')}\n` +
    '  fallbackFontReferences: []\n  customCharacters: \n  fontRenderingMode: 0\n' +
    `  ascentCalculationMode: 1\n  useLegacyBoundsCalculation: 0\n  shouldRoundAdvanceValue: 1\n${footer}`,
  '.png': () =>
    'TextureImporter:\n  internalIDToNameTable: []\n  externalObjects: {}\n  serializedVersion: 12\n' +
    '  mipmaps:\n    enableMipMap: 0\n    sRGBTexture: 1\n  isReadable: 0\n  textureFormat: 1\n' +
    '  maxTextureSize: 2048\n  textureSettings:\n    serializedVersion: 2\n    filterMode: 1\n' +
    '    aniso: 1\n    mipBias: 0\n    wrapU: 1\n    wrapV: 1\n    wrapW: 1\n  nPOTScale: 0\n' +
    '  lightmap: 0\n  compressionQuality: 50\n  spriteMode: 0\n  alphaUsage: 1\n' +
    `  alphaIsTransparency: 1\n  textureType: 2\n  textureShape: 1\n${footer}`,
  '.md': () => `TextScriptImporter:\n  externalObjects: {}\n${footer}`,
  '.txt': () => `TextScriptImporter:\n  externalObjects: {}\n${footer}`,
  'package.json': () => `PackageManifestImporter:\n  externalObjects: {}\n${footer}`,
};

function metaFor(path, isFolder) {
  const importer = isFolder
    ? importers.folder
    : (importers[basename(path)] ?? importers[extname(path)] ?? importers.folder);
  const body = importer === importers.folder && !isFolder
    ? `DefaultImporter:\n  externalObjects: {}\n${footer}`
    : importer(path);
  return `fileFormatVersion: 2\nguid: ${randomUUID().replaceAll('-', '')}\n${body}`;
}

let created = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.endsWith('.meta') || entry.name.startsWith('.') || entry.name.endsWith('~')) continue;
    const path = join(dir, entry.name);
    const meta = `${path}.meta`;
    if (!existsSync(meta)) {
      await writeFile(meta, metaFor(path, entry.isDirectory()));
      console.log('meta:', relative(root, meta));
      created++;
    }
    if (entry.isDirectory()) await walk(path);
  }
}

if (!existsSync(`${kitDir}.meta`)) {
  await writeFile(`${kitDir}.meta`, metaFor(kitDir, true));
  console.log('meta:', relative(root, `${kitDir}.meta`));
  created++;
}
await walk(kitDir);
console.log(`unity kit: ${created} new .meta file(s)`);
