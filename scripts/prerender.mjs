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

/**
 * Static first paint.
 *
 * The app is client-rendered, so without this the first text appears only after
 * the entry chunk (121.8 kB gzip) has executed: Lighthouse mobile measured FCP
 * 2.35 s and LCP 2.72 s on `/tools/uuid-genny/`, with nothing painted at all when
 * JavaScript was blocked. The markup below mirrors the hydrated structure
 * class-for-class (see `apps/web/src/components/tool-frame.tsx`, `shell/*.tsx`
 * and `pages/*.tsx`) so React's first commit replaces it without moving it.
 *
 * The shell skeleton is part of the mirror on purpose: the rail is 240 px wide at
 * `md`, so tool content without it would paint 150 px to the left and shift on
 * hydration. The `aria-hidden` action placeholders occupy the same box as the
 * hydrated Share and Reset buttons, so the description wraps identically before
 * and after. All 19 built tools pass `onReset`, so Reset is always present.
 */
const TOOL_ACTIONS = `<div class="flex shrink-0 flex-wrap items-center gap-2" aria-hidden="true"><span class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-background bg-clip-padding px-3 text-sm font-medium whitespace-nowrap"><svg class="size-4" aria-hidden="true" focusable="false"></svg>Share</span><span class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-clip-padding px-3 text-sm font-medium whitespace-nowrap">Reset</span></div>`;

const NOSCRIPT = `<noscript><p class="mx-auto w-full max-w-[760px] px-4 py-4 text-sm text-muted-foreground md:px-8">Omnitool needs JavaScript to run its tools. Nothing is sent anywhere.</p></noscript>`;

function shell(main) {
  return `<div class="min-h-dvh"><header class="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"><div class="flex h-14 items-center gap-3 px-3 md:px-5"><span class="rounded-control px-1 text-lg font-bold tracking-[-0.02em]">Omnitool</span></div></header><div class="flex"><aside aria-hidden="true" class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col border-r border-border bg-background md:flex"></aside><div class="min-w-0 flex-1"><main id="main">${main}${NOSCRIPT}</main></div></div></div>`;
}

function toolBody(tool) {
  const description = tool.description
    ? `<p class="prose-measure mt-2 text-muted-foreground">${escapeHtml(tool.description)}</p>`
    : '';
  return shell(
    `<article class="mx-auto w-full max-w-[1100px] px-4 py-6 pb-24 md:px-8 md:pb-6"><header class="mb-4 flex flex-wrap items-start justify-between gap-4"><div class="min-w-0"><h1 class="text-2xl md:text-3xl">${escapeHtml(tool.name)}</h1>${description}</div>${TOOL_ACTIONS}</header></article>`,
  );
}

function homeBody(available, planned) {
  return shell(
    `<div class="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-8 md:py-10"><div class="overflow-hidden rounded-panel border border-border-strong bg-surface"><div class="flex min-h-16 w-full items-center gap-3 px-3 md:min-h-[72px] md:px-5"><span class="size-6 shrink-0"></span><span class="min-w-0 flex-1 text-lg text-muted-foreground md:text-xl">Find a tool or drop a file</span></div><p class="border-t border-border bg-surface-inset px-3 py-2 text-sm text-muted-foreground md:px-5">${available} tools available, ${planned} planned. Drop a file here to see which ones can open it.</p></div></div>`,
  );
}

function pageBody({ heading, paragraph }) {
  return shell(
    `<article class="mx-auto w-full max-w-[760px] px-4 py-8 md:px-8 md:py-12"><h1 class="text-2xl break-words md:text-3xl">${escapeHtml(heading)}</h1><div class="prose-measure mt-6 space-y-5"><p>${escapeHtml(paragraph)}</p></div></article>`,
  );
}

function render({ title, description, robots = false, preloads = [], body = '' }) {
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );

  if (!html.includes('<div id="root"></div>')) {
    throw new Error('prerender: dist/index.html has no empty <div id="root"></div> to fill');
  }

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

  return withPreloads
    .replace('</head>', `    ${extra}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

// Copy for the three non-tool pages is duplicated from `pages/home.tsx`,
// `pages/about.tsx` and `pages/privacy.tsx` because the build cannot render React.
// `tests/e2e/prerender.spec.ts` compares it with the hydrated DOM, so a change to
// either side fails the guard instead of drifting silently.
const routes = [
  {
    path: '/',
    meta: routeMeta.home,
    body: homeBody(toolIds.length, registry.tools.length - toolIds.length),
  },
  {
    path: '/privacy',
    meta: routeMeta.privacy,
    body: pageBody({
      heading: 'Privacy',
      paragraph:
        'Omnitool runs entirely in your browser. There is no server that receives your files, no account to create and no analytics or telemetry of any kind.',
    }),
  },
  {
    path: '/about',
    meta: routeMeta.about,
    body: pageBody({
      heading: 'Acknowledgements',
      paragraph:
        'Omnitool is an independent toolkit. It shares a product idea with earlier browser tool collections but uses its own code, design and copy.',
    }),
  },
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
      body: toolBody(tool),
    };
  }),
];

for (const route of routes) {
  const html = render({ ...route.meta, body: route.body });
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
    `${registry.tools.length - toolIds.length} planned routes excluded; ` +
    'static first paint in #root for every written route (404.html stays empty, DEC-19)',
);
