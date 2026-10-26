#!/usr/bin/env node
/**
 * Static guard for link producers.
 *
 * Runtime tests prove the shared check refuses a scheme trick; this guard
 * proves every producer calls it. It walks the application and package source
 * and fails on:
 *
 *   1. an `href`, `src`, `action` or `formAction` attribute (JSX) whose value is
 *      an expression that does not go through `safeHref`, `checkUrl` or
 *      `safeImageSrc`, unless the expression is a literal path;
 *   2. the same shapes written as object properties, which is how a ProseMirror
 *      `toDOM` or an anchor spec is built, and inside template-literal markup
 *      (`<a href="${...}">`), which is how the Markdown HTML export and the
 *      meta tag snippet are built. A variable counts as checked when it was
 *      assigned from one of the shared checks earlier in the same file;
 *   3. `window.open`, `location.assign`, `location.replace` and assigning to
 *      `location.href` with a non-literal argument;
 *   4. markup and code injection sinks: `innerHTML`/`outerHTML` assignment,
 *      `insertAdjacentHTML`, `document.write`, `dangerouslySetInnerHTML`,
 *      `eval` and `new Function`.
 *
 * Exempt: test files, this script, and the shared check itself. Comments are
 * skipped line by line; the guard is about what the code does, not what its
 * comments say.
 *
 * A file may mark a value it generates itself with `url-check: local-asset` on
 * the line or the line above: an object URL for a chosen file, or a data URL a
 * canvas produced. That is a claim the reviewer can see and check, not a silent
 * pass.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const roots = ['apps/web/src', 'packages/tool-core/src', 'packages/tools-registry/src'];
const extensions = new Set(['.ts', '.tsx']);
const SAFE = /(?:safeHref|checkUrl|safeImageSrc|absoluteHttpsHref)\s*\(/;
const LITERAL_PATH = /^\s*(?:['"`])(?:[.#]|\.{0,2}\/|https?:\/\/|mailto:)/;

const violations = [];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (extensions.has(extname(path)) && !/\.test\.tsx?$/.test(path)) files.push(path);
  }
  return files;
}

const ATTRIBUTE = /\b(?:href|src|action|formAction)=\{([^}]*)\}/g;
const PROPERTY = /(?:^|[\s{,])(?:href|src|action)\s*:\s*([^,}\n]+)/g;
/** `<a href="${expr}">` inside a template literal. */
const TEMPLATE = /\b(?:href|src|action)\s*=\s*[\\]?"\$\{([^}]*)\}/g;
/** A binding whose value came from the shared check: `const href = safeHref(x)`. */
const SAFE_BINDING =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*[^;\n]*?(?:safeHref|checkUrl|safeImageSrc|absoluteHttpsHref)\s*\(/;

function report(file, line, message) {
  violations.push({ file, line, message });
}

for (const directory of roots) {
  for (const file of walk(join(root, directory))) {
    const relativePath = relative(root, file);
    if (relativePath.endsWith('packages/tool-core/src/url/index.ts')) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    /** Names in this file known to hold a checked URL. Per file, not per scope. */
    const safeNames = new Set();
    const mentionsChecked = (expression) =>
      [...safeNames].some((name) => new RegExp(`\\b${name}\\b`).test(expression));
    lines.forEach((raw, index) => {
      const trimmed = raw.trim();
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('{/*')
      ) {
        return;
      }

      const exemptLine =
        /url-check:\s*[a-z-]+/.test(raw) || /url-check:\s*[a-z-]+/.test(lines[index - 1] ?? '');

      for (const match of raw.matchAll(ATTRIBUTE)) {
        const expression = match[1] ?? '';
        const checked =
          SAFE.test(expression) || LITERAL_PATH.test(expression) || mentionsChecked(expression);
        if (!checked && !exemptLine) {
          report(relativePath, index + 1, `${match[0]} is not passed through the shared URL check`);
        }
      }

      for (const match of raw.matchAll(TEMPLATE)) {
        const expression = match[1] ?? '';
        const checked =
          SAFE.test(expression) || LITERAL_PATH.test(expression) || mentionsChecked(expression);
        if (!checked && !exemptLine) {
          report(relativePath, index + 1, `${match[0]} is not passed through the shared URL check`);
        }
      }

      const binding = SAFE_BINDING.exec(raw);
      if (binding) safeNames.add(binding[1]);

      for (const match of raw.matchAll(PROPERTY)) {
        const value = (match[1] ?? '').trim();
        if (value === '' || value.startsWith('{')) continue;
        if (SAFE.test(value) || LITERAL_PATH.test(value) || exemptLine) continue;
        if (/^(?:string|number|boolean|unknown|any|readonly|undefined|null)\b/.test(value))
          continue;
        report(
          relativePath,
          index + 1,
          `${match[0].trim()} is not passed through the shared URL check`,
        );
      }

      if (
        /location\s*\.\s*(?:assign|replace)\s*\(/.test(raw) ||
        /location\s*\.\s*href\s*=/.test(raw) ||
        /window\s*\.\s*open\s*\(/.test(raw)
      ) {
        if (!SAFE.test(raw) && !LITERAL_PATH.test(raw.replace(/^.*?\(|=/, ''))) {
          report(
            relativePath,
            index + 1,
            'navigation target is not passed through the shared URL check',
          );
        }
      }

      if (/\b(?:innerHTML|outerHTML)\s*=/.test(raw)) {
        report(relativePath, index + 1, 'assignment to innerHTML/outerHTML is not allowed');
      }
      if (/\binsertAdjacentHTML\s*\(/.test(raw)) {
        report(relativePath, index + 1, 'insertAdjacentHTML is not allowed');
      }
      if (/\bdocument\s*\.\s*write(?:ln)?\s*\(/.test(raw)) {
        report(relativePath, index + 1, 'document.write is not allowed');
      }
      if (/\bdangerouslySetInnerHTML\b/.test(raw)) {
        report(relativePath, index + 1, 'dangerouslySetInnerHTML is not allowed');
      }
      if (/(?:^|[^.\w])eval\s*\(/.test(raw)) {
        report(relativePath, index + 1, 'eval is not allowed');
      }
      if (/\bnew\s+Function\s*\(/.test(raw)) {
        report(relativePath, index + 1, 'the Function constructor is not allowed');
      }
    });
  }
}

if (violations.length === 0) {
  console.log('url schemes: every producer uses the shared check');
  process.exit(0);
}

for (const violation of violations) {
  console.error(`${violation.file}:${violation.line}  ${violation.message}`);
}
console.error(`url schemes: ${violations.length} violation(s)`);
process.exit(1);
