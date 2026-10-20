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
// The Vite manifest maps each lazy tool route to its chunk and shared imports;
// Lighthouse shows the tool description (the LCP element) painting about
// 470 ms after FCP while those chunks download, so each prerendered tool page
// preloads its own chunk chain.
const manifestPath = join(dist, '.vite/manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

function chunkChain(key, seen = new Set()) {
  const entry = manifest[key];
  if (!entry || seen.has(key)) return [];
  seen.add(key);
  return [entry.file, ...(entry.imports ?? []).flatMap((child) => chunkChain(child, seen))];
}

function preloadTags(ids) {
  const tags = [];
  for (const id of ids) {
    const href = `/${id}`;
    if (template.includes(`href="${href}"`) || template.includes(`src="${href}"`)) continue;
    tags.push(`<link rel="modulepreload" crossorigin href="${href}" />`);
  }
  return tags;
}
const registry = JSON.parse(
  readFileSync(join(root, 'packages/tools-registry/data/registry.seed.json'), 'utf8'),
);
const toolsById = new Map(registry.tools.map((tool) => [tool.id, tool]));

// Built tools come from the lazy-route map, the same source the app uses. A
// planned registry row has no loader and therefore no prerendered HTML.
const modulesSource = readFileSync(join(web, 'src/lib/tool-modules.ts'), 'utf8');
const toolIds = [
  ...modulesSource.matchAll(/^\s*(?:'([a-z0-9-]+)'|([a-z0-9-]+)):\s*\(\)\s*=>\s*import\(/gm),
]
  .map((match) => match[1] ?? match[2])
  .sort();

if (toolIds.length === 0) {
  throw new Error('prerender: no built tools found in src/lib/tool-modules.ts');
}

const toolDirectories = readdirSync(join(web, 'src/tools'), { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && existsSync(join(web, 'src/tools', entry.name, 'index.tsx')),
  )
  .map((entry) => entry.name)
  .sort();

if (new Set(toolIds).size !== toolIds.length) {
  throw new Error('prerender: a tool id is listed twice in src/lib/tool-modules.ts');
}

for (const id of toolIds) {
  if (!toolDirectories.includes(id)) {
    throw new Error(`prerender: ${id} has a loader but no src/tools/${id}/index.tsx`);
  }
}

for (const id of toolDirectories) {
  if (!toolIds.includes(id)) {
    throw new Error(`prerender: src/tools/${id} exists but has no loader in tool-modules.ts`);
  }
}

for (const id of toolIds) {
  if (!manifest[`src/tools/${id}/index.tsx`]) {
    throw new Error(`prerender: ${id} is missing from the Vite manifest`);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function render({ title, description, robots = false, preloads = [] }) {
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );

  const preloadHtml = preloadTags(preloads).join('\n    ');
  const withPreloads = preloadHtml
    ? html.replace('</head>', `    ${preloadHtml}\n  </head>`)
    : html;

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

  return withPreloads.replace('</head>', `    ${extra}\n  </head>`);
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
        preloads: [...new Set(chunkChain(`src/tools/${id}/index.tsx`))],
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

// The static 404 shell is also what a direct planned-tool URL receives before
// hydration. Keep its visible body empty and its metadata neutral; the router
// renders either the planned page or the 404 copy once JavaScript runs.
writeFileSync(
  join(dist, '404.html'),
  render({ title: 'Omnitool', description: routeMeta.home.description, robots: true }),
);

console.log(
  `prerender: wrote ${routes.length} routes plus 404.html; ` +
    `${registry.tools.length - toolIds.length} planned routes excluded`,
);
