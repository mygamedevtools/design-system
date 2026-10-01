// Renders unity/Examples with the UI kit to site/img/*.png, using a real Unity Editor and a
// scratch project in .cache/unity (created on first run). Set UNITY to an Editor binary, or the
// newest Unity 6 in Unity Hub is used. (Exporting the kit doesn't need Unity; see
// export-unitypackage.mjs.)
//
//   node scripts/unity.mjs render
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, '.cache/unity');
const tasks = {
  render: { method: 'MgtTools.Render', output: join(root, 'site/img') },
};

const task = tasks[process.argv[2]];
if (!task) {
  console.error(`Usage: node scripts/unity.mjs <${Object.keys(tasks).join('|')}>`);
  process.exit(1);
}

function findUnity() {
  if (process.env.UNITY) return process.env.UNITY;
  const hub = '/Applications/Unity/Hub/Editor';
  const versions = existsSync(hub) ? readdirSync(hub).filter((v) => v.startsWith('6000.')).sort() : [];
  if (!versions.length) throw new Error('No Unity 6 found. Set UNITY to the Editor binary.');
  return join(hub, versions.at(-1), 'Unity.app/Contents/MacOS/Unity');
}

const unity = findUnity();
const run = (args) => execFileSync(unity, ['-batchmode', '-quit', '-logFile', '-', ...args], { stdio: 'inherit' });

if (!existsSync(join(project, 'Assets'))) {
  console.log(`Creating ${project} (first run only)…`);
  mkdirSync(dirname(project), { recursive: true });
  run(['-createProject', project]);
}

// Mirror the kit (with its committed .meta files, so GUIDs stay stable) and the examples.
const assets = join(project, 'Assets');
for (const [from, to] of [
  ['unity/MyGamedevToolsUI', 'MyGamedevToolsUI'],
  ['unity/Examples', 'Examples'],
]) {
  rmSync(join(assets, to), { recursive: true, force: true });
  cpSync(join(root, from), join(assets, to), { recursive: true });
}
cpSync(join(root, 'unity/MyGamedevToolsUI.meta'), join(assets, 'MyGamedevToolsUI.meta'));
mkdirSync(join(assets, 'Editor'), { recursive: true });
cpSync(join(root, 'scripts/unity/MgtTools.cs'), join(assets, 'Editor/MgtTools.cs'));

mkdirSync(task.output, { recursive: true });
process.env.MGT_OUT = task.output;
run(['-projectPath', project, '-executeMethod', task.method]);
