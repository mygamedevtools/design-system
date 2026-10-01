// Dependency-free static server for the reference site and templates.
// Serves the repo root so site/ and templates/ can reach tokens, fonts and logos by relative path.
// Run directly for the dev server, or import startServer (scripts/store.mjs renders through it).
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
};

/**
 * Starts the server on `port` (0 picks a free one) and resolves with the listening server.
 * `mounts` maps URL prefixes to extra folders, e.g. { '/listing/': '/path/to/store' }.
 */
export function startServer(port, mounts = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(302, { Location: '/site/' });
      return res.end();
    }

    const mount = Object.keys(mounts).find((prefix) => url.pathname.startsWith(prefix));
    const base = mount ? mounts[mount] : root;
    const rest = mount ? url.pathname.slice(mount.length) : url.pathname;
    let path = normalize(join(base, decodeURIComponent(rest)));
    if (path !== base && !path.startsWith(base + sep)) {
      res.writeHead(403);
      return res.end();
    }

    try {
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      await stat(path);
      res.writeHead(200, {
        'Content-Type': types[extname(path).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      createReadStream(path).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4321);
  await startServer(port);
  console.log(`Reference site: http://localhost:${port}/site/`);
}
