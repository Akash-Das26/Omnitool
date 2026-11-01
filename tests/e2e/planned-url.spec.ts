import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const DIST = resolve('apps/web/dist');

function contentType(path: string) {
  const extension = extname(path);
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.js') return 'text/javascript; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

/**
 * Minimal Pages-like static server: a real file wins, otherwise the request
 * gets 404.html with status 404. No SPA fallback.
 */
async function startStaticServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname);
    const candidates = [join(DIST, pathname), join(DIST, pathname, 'index.html')];
    for (const candidate of candidates) {
      if (!candidate.startsWith(DIST)) continue;
      try {
        const body = await readFile(candidate);
        response.writeHead(200, { 'content-type': contentType(candidate) });
        response.end(body);
        return;
      } catch {
        // Try the next candidate, then the 404 shell.
      }
    }
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    response.end(await readFile(join(DIST, '404.html')));
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Static server has no port');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test('a planned URL is a 404 with a neutral shell and no visible 404 copy', async ({ request }) => {
  const { server, baseUrl } = await startStaticServer();
  try {
    // APIRequestContext never executes JavaScript, so this is the static shell.
    const response = await request.get(`${baseUrl}/tools/colour-converter`, {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);

    const html = await response.text();
    const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
    const visible = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    expect(visible).toBe('');
    expect(html).not.toMatch(/>\s*Page not found\s*</i);
    expect(visible).not.toMatch(/\b404\b/i);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }
});
