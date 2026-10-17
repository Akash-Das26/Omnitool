import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const web = join(root, 'apps/web');
const dist = join(web, 'dist');
const templatePath = join(dist, 'index.html');

if (!existsSync(templatePath)) {
  console.error('prerender: dist/index.html is missing; run vite build first');
  process.exit(1);
}

const template = readFileSync(templatePath, 'utf8');
const routeMeta = JSON.parse(readFileSync(join(web, 'src/app/route-meta.json'), 'utf8'));
const registry = JSON.parse(
  readFileSync(join(root, 'packages/tools-registry/data/registry.seed.json'), 'utf8'),
);
const toolsById = new Map(registry.tools.map((tool) => [tool.id, tool]));

const toolIds = readdirSync(join(web, 'src/tools'), { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && existsSync(join(web, 'src/tools', entry.name, 'index.tsx')),
  )
  .map((entry) => entry.name)
  .sort();

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function render({ title, description, robots = false }) {
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );

  const extra = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Omnitool" />',
    '<meta name="twitter:card" content="summary" />',
    robots ? '<meta name="robots" content="noindex" />' : '',
  ]
    .filter(Boolean)
    .join('\n    ');

  return html.replace('</head>', `    ${extra}\n  </head>`);
}

const routes = [
  { path: '/', meta: routeMeta.home },
  { path: '/privacy', meta: routeMeta.privacy },
  { path: '/about', meta: routeMeta.about },
  ...toolIds.map((id) => {
    const tool = toolsById.get(id);
    if (!tool) throw new Error(`prerender: ${id} is not in the registry`);
    return {
      path: `/tools/${id}`,
      meta: {
        title: `${tool.name} — Omnitool`,
        description: tool.description || `${tool.name} is a local-only browser tool from Omnitool.`,
      },
    };
  }),
];

for (const route of routes) {
  const html = render(route.meta);
  if (route.path === '/') {
    writeFileSync(templatePath, html);
    continue;
  }
  const target = join(dist, route.path.slice(1), 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

writeFileSync(join(dist, '404.html'), render({ ...routeMeta['not-found'], robots: true }));

console.log(`prerender: wrote ${routes.length} routes plus 404.html`);
