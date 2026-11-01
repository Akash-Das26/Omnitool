/**
 * Keeps `features.md` honest about what is built.
 *
 * Three lists describe the same catalogue and used to drift apart by hand: the
 * loader map (what the app can actually route to), the registry seed (what is
 * catalogued) and the ledger (`features.md`, what is claimed). This check reads
 * all three and fails when they disagree, so "done" cannot quietly survive the
 * tool it describes.
 *
 * It also checks the counts written into the category headings and into the two
 * ledger notes that quote a number, because a heading like "### Colour (11)" is
 * a claim that no test was reading.
 *
 * Runs as part of `pnpm lint`. Nothing is written; it only reports.
 */

import { readFileSync } from 'node:fs';

const LEDGER = 'features.md';
const MODULES = 'apps/web/src/lib/tool-modules.ts';
const REGISTRY = 'packages/tools-registry/data/registry.seed.json';

const failures = [];

/** The loader map is the only list that says a tool is built. */
function builtIds() {
  const source = readFileSync(MODULES, 'utf8');
  const start = source.indexOf('TOOL_LOADERS');
  const end = source.indexOf('};', start);
  if (start === -1 || end === -1) throw new Error('the loader map is not where it was');
  return [
    ...source.slice(start, end).matchAll(/'?([a-z][a-z0-9-]*)'?:\s*\(\)\s*=>\s*import\(/g),
  ].map((match) => match[1]);
}

const registryIds = JSON.parse(readFileSync(REGISTRY, 'utf8')).tools.map((tool) => tool.id);
const built = builtIds();

/**
 * Tools that are built and deliberately partial. Their rows are 🟨 and say what
 * is missing, so they are not drift; anything else that is built must be ✅.
 * An entry here for a tool that is built and ✅, or not built at all, fails.
 */
const PARTIAL = new Map([
  ['qr-genny', 'P1 sample: styled shapes and logos are still P2'],
  ['image-converter', 'P1 stub: the real codecs arrive in P4'],
]);

const ledger = readFileSync(LEDGER, 'utf8').split('\n');

/** A tool row: the id in backticks, and the status cell before the notes. */
const ROW = /^\| `([a-z0-9-]+)` \|.*\| (✅|🟨|⬜|⛔) \|/;
const rows = new Map();
const sections = [];

for (const line of ledger) {
  const heading = /^### (.+?) \((\d+)\)\s*$/.exec(line);
  if (heading) {
    sections.push({ title: heading[1], claimed: Number(heading[2]), rows: 0 });
    continue;
  }
  const row = ROW.exec(line);
  if (row) {
    rows.set(row[1], row[2]);
    if (sections.length > 0) sections[sections.length - 1].rows += 1;
  }
}

for (const id of built) {
  const status = rows.get(id);
  if (status === undefined) failures.push(`${id} is built but has no row in ${LEDGER}`);
  else if (status === '🟨' && PARTIAL.has(id)) continue;
  else if (status !== '✅') failures.push(`${id} is built but its row is marked ${status}`);
}

for (const [id, reason] of PARTIAL) {
  if (!built.includes(id)) failures.push(`${id} is listed as partial but is not built (${reason})`);
  else if (rows.get(id) !== '🟨')
    failures.push(`${id} is listed as partial but its row is ${rows.get(id)}`);
}

for (const [id, status] of rows) {
  if (status !== '✅') continue;
  if (!built.includes(id)) {
    failures.push(`${id} is marked ✅ but the loader map has no entry for it`);
  }
  if (!registryIds.includes(id))
    failures.push(`${id} is marked ✅ but is not in the registry seed`);
}

for (const id of registryIds) {
  if (!rows.has(id)) failures.push(`${id} is in the registry seed but has no row in ${LEDGER}`);
}

for (const section of sections) {
  if (section.rows !== section.claimed) {
    failures.push(
      `heading "${section.title} (${section.claimed})" holds ${section.rows} row${section.rows === 1 ? '' : 's'}`,
    );
  }
}

const done = [...rows.values()].filter((status) => status === '✅').length;
const planned = [...rows.values()].filter((status) => status === '⬜').length;
const total = rows.size;

console.log(
  `ledger: ${built.length} built · ${done} marked done · ${planned} planned · ${total} rows · ` +
    `${registryIds.length} in the registry · ${sections.length} category headings`,
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`ledger: ${failure}`);
  process.exit(1);
}

console.log('ledger: the loader map, the registry and features.md agree');
