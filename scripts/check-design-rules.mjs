/**
 * Guards the design rules in docs/design/DESIGN.md that can be checked
 * mechanically: the 12 px text floor, no all-caps labels, one popover shadow,
 * no decorative gradients, no icon fonts and no "A · B · C" meta strings.
 *
 * Run through `pnpm lint` so CI enforces it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const roots = ['apps/web/src', 'packages/ui/src'];
const extensions = new Set(['.ts', '.tsx', '.css']);

const px = (value) => Number.parseFloat(value);
const rem = (value) => Number.parseFloat(value) * 16;

const rules = [
  {
    id: 'text-floor',
    message: 'text is below the 12 px floor (DESIGN.md, Typography)',
    pattern: /text-\[(\d+(?:\.\d+)?)px\]/g,
    fails: (match) => px(match[1]) < 12,
  },
  {
    id: 'text-floor',
    message: 'text is below the 12 px floor (DESIGN.md, Typography)',
    pattern: /text-\[(\d+(?:\.\d+)?)rem\]/g,
    fails: (match) => rem(match[1]) < 12,
  },
  {
    id: 'text-floor',
    message: 'font-size is below the 12 px floor (DESIGN.md, Typography)',
    pattern: /font-size:\s*(\d+(?:\.\d+)?)px/g,
    fails: (match) => px(match[1]) < 12,
  },
  {
    id: 'text-floor',
    message: 'font-size is below the 12 px floor (DESIGN.md, Typography)',
    pattern: /font-size:\s*(\d+(?:\.\d+)?)rem/g,
    fails: (match) => rem(match[1]) < 12,
  },
  {
    id: 'no-all-caps',
    message: 'all-caps tracked labels are not allowed (DESIGN.md, Typography)',
    pattern: /text-transform:\s*uppercase/g,
  },
  {
    id: 'no-all-caps',
    message: 'all-caps tracked labels are not allowed (DESIGN.md, Typography)',
    pattern: /\buppercase\b/g,
    // Only class lists: a real `uppercase` option in a tool is not a label.
    onlyWhen: /className=|class=/,
  },
  {
    id: 'one-shadow',
    message: 'only the popover shadow is allowed (DESIGN.md, Elevation and shape)',
    pattern: /\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner)\b|\bshadow-\[/g,
  },
  {
    id: 'no-gradients',
    message: "decorative gradients are not allowed (DESIGN.md, Don't)",
    pattern: /bg-gradient-|(?:linear|radial|conic)-gradient\(/g,
  },
  {
    id: 'no-icon-fonts',
    message: "icon fonts are not allowed; use Lucide (DESIGN.md, Don't)",
    pattern: /material-symbols|font-awesome|fonts\.googleapis/gi,
  },
  {
    id: 'no-meta-strings',
    message: 'drop "A · B · C" meta strings; use separate labels (STITCH-REVIEW S1)',
    pattern: /\s·\s/g,
    skipComments: true,
  },
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const failures = [];

for (const directory of roots) {
  const base = join(root, directory);
  let files;
  try {
    files = walk(base);
  } catch {
    continue;
  }
  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    const lines = source.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isComment =
        trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');

      for (const rule of rules) {
        if (rule.skipComments && isComment) continue;
        if (rule.onlyWhen && !rule.onlyWhen.test(line)) continue;
        for (const match of line.matchAll(rule.pattern)) {
          if (rule.fails && !rule.fails(match)) continue;
          failures.push(
            `${relative(root, path)}:${index + 1}  [${rule.id}] ${rule.message}  ->  ${match[0].trim()}`,
          );
        }
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`design rules: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('design rules: all checks passed');
