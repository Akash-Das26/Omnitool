/**
 * A readable summary of `pnpm audit`.
 *
 * `pnpm audit` prints one block per advisory, which is hard to compare between
 * runs and impossible to skim in a job summary. This prints the counts by
 * severity, then one line per advisory with the dependency path it arrives by,
 * so a reader can see whether a package is something the site ships or
 * something a build tool pulled in.
 *
 * It always exits 0. Advisories are reported, never enforced here: the decision
 * to upgrade, override or accept one belongs to a person, and a build that fails
 * on a transitive advisory in a dev-only tool teaches people to ignore it.
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.log(`audit: pnpm audit could not run (${result.error.message}). Not tested.`);
  process.exit(0);
}

/** pnpm exits 1 when advisories exist; only an unreadable report is a problem. */
function parse(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}

const report = parse(result.stdout);
if (report === null) {
  console.log('audit: no JSON report was produced, so nothing is claimed. Not tested.');
  if (result.stderr.trim() !== '') console.log(result.stderr.trim());
  process.exit(0);
}

const counts = report.metadata?.vulnerabilities ?? {};
const advisories = Object.values(report.advisories ?? {});
const order = ['critical', 'high', 'moderate', 'low', 'info'];

const summary = order.map((severity) => `${severity} ${counts[severity] ?? 0}`).join(', ');

console.log(`advisories: ${advisories.length} (${summary})`);

if (advisories.length === 0) {
  console.log('nothing to review.');
  process.exit(0);
}

/** The shortest path to an advisory says which of our direct dependencies owns it. */
function shortest(paths) {
  return [...paths].sort((a, b) => a.length - b.length)[0] ?? '(no path)';
}

console.log('');
console.log(
  'package                      installed   severity  scope   advisory              path',
);

const rows = advisories
  .map((advisory) => {
    const finding = advisory.findings?.[0] ?? { version: '?', dev: true, paths: [] };
    return {
      name: advisory.module_name,
      version: String(finding.version),
      severity: advisory.severity,
      scope: finding.dev ? 'dev' : 'runtime',
      id: advisory.github_advisory_id ?? String(advisory.id),
      path: shortest(finding.paths ?? []),
      patched: advisory.patched_versions ?? 'none',
    };
  })
  .sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity) || a.name.localeCompare(b.name),
  );

for (const row of rows) {
  console.log(
    `${row.name.padEnd(28)} ${row.version.padEnd(11)} ${row.severity.padEnd(9)} ${row.scope.padEnd(7)} ${row.id.padEnd(21)} ${row.path}`,
  );
}

const unfixable = rows.filter((row) => row.patched === 'none' || row.patched === '<0.0.0');
if (unfixable.length > 0) {
  console.log('');
  console.log(`no patched version published for: ${unfixable.map((row) => row.name).join(', ')}`);
}

console.log('');
console.log('Counts are the report as it stands; nothing is upgraded by this script.');
