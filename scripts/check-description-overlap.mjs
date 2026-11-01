/**
 * Checks that no Omnitool tool description reuses four or more consecutive
 * words from the original's description column in `features.md`.
 *
 * That column is reference material from delphi.tools; our copy must be our own
 * (docs/legal/ATTRIBUTION.md). Run after editing descriptions:
 *
 *   node scripts/check-description-overlap.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const RUN = 4;

function words(text) {
  return text
    .toLowerCase()
    .replace(/[`*_>|]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function runs(list, size) {
  const set = new Set();
  for (let index = 0; index + size <= list.length; index += 1) {
    set.add(list.slice(index, index + size).join(' '));
  }
  return set;
}

function tableRows(markdown, columnIndex) {
  const rows = new Map();
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < columnIndex + 2) continue;
    const id = cells[1]?.match(/^`([a-z0-9-]+)`$/)?.[1];
    if (!id) continue;
    const value = cells[columnIndex];
    if (value && value !== '—' && value !== '') rows.set(id, value);
  }
  return rows;
}

const features = readFileSync(join(root, 'features.md'), 'utf8');
const draft = readFileSync(join(root, 'docs/review/DESCRIPTIONS-DRAFT.md'), 'utf8');

// Tool tables in features.md: | `id` | Tool | Original description | Flags | …
const originals = tableRows(features, 3);
const drafts = tableRows(draft, 3);

const originalRuns = new Map();
for (const [id, text] of originals) originalRuns.set(id, runs(words(text), RUN));

const flagged = [];
let checked = 0;

for (const [id, text] of drafts) {
  const description = words(text);
  if (description.length < RUN) continue;
  checked += 1;
  const own = runs(description, RUN);
  for (const [otherId, otherRuns] of originalRuns) {
    for (const run of own) {
      if (otherRuns.has(run)) flagged.push(`${id} (draft) shares "${run}" with ${otherId}`);
    }
  }
}

const applied = drafts.size;
console.log(
  `descriptions: ${applied} rows in the draft file, ${checked} long enough to check, ${originals.size} original descriptions indexed`,
);

if (flagged.length > 0) {
  console.error(`overlap: ${flagged.length} shared four-word run(s)`);
  for (const line of flagged) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`overlap: 0 shared four-word runs (threshold ${RUN} consecutive words)`);
