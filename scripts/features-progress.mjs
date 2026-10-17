// Counts statuses in features.md and prints a progress summary.
// Usage: pnpm features:progress   (or: node scripts/features-progress.mjs)
import { readFileSync } from 'node:fs';

const md = readFileSync(new URL('../features.md', import.meta.url), 'utf8');
const count = (sym) => (md.match(new RegExp(`\\|\\s*${sym}\\s*\\|`, 'g')) ?? []).length;
const done = count('✅'),
  wip = count('🟨'),
  todo = count('⬜'),
  skipped = count('⛔');
const total = done + wip + todo;
const pct = total ? ((done / total) * 100).toFixed(1) : '0.0';
console.log(`Done ${done}  In progress ${wip}  Not started ${todo}  Out of scope ${skipped}`);
console.log(`Progress: ${done}/${total} (${pct}%)`);
