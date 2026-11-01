# Development guide

## 1. Prerequisites
Node >= 22.19 (`nvm use`), pnpm via `corepack enable`, a current Chromium for Playwright.

## 2. Commands
| Command | Purpose |
|---------|---------|
| `pnpm install` | install |
| `pnpm dev` | web app dev server |
| `pnpm build` | production build of all packages |
| `pnpm test` | unit/component tests (Vitest) |
| `pnpm lint` / `pnpm typecheck` | Biome / tsc |
| `pnpm features:progress` | counts from `features.md` |

## 3. Conventions
- TypeScript strict; no `any` without a comment. Prefer named exports in packages; default export only for lazy tool entry points.
- Tool ids kebab-case; React components PascalCase; files kebab-case.
- Conventional Commits (`feat(colour-converter): …`). One logical change per commit.
- British English in UI copy; strings in one module per tool for later i18n.
- No `eval`; the single inline script is the pre-paint boot script in `apps/web/boot/boot.js`, whose SHA-256 goes into the CSP at build time (see `docs/implementation/IMPLEMENTATION.md` section 8). No third-party runtime requests.
- Pure logic: `packages/tool-core/src/<tool-id>/` with `*.test.ts` beside it.

## 4. How to add a tool (checklist)
1. Row exists in `features.md`; set status 🟨.
2. Add registry entry in `packages/tools-registry` (id, name, category, accepts/produces, tier, human-written description).
3. Write failing tests in `packages/tool-core/src/<id>/`, then the logic.
4. Create `apps/web/src/tools/<id>/index.tsx` (default export, lazy). Use the shared Tool Frame, FileIntake and Download helpers.
5. Heavy work in a worker with progress and cancel (T2/T3).
6. Add an E2E smoke test and an axe check.
7. Update `features.md` (✅), `todo.md`, and `docs/review/REVIEW-LOG.md`.

## 5. Testing strategy
| Layer | Tool | Target |
|-------|------|--------|
| Pure logic | Vitest | ≥ 90% lines and ≥ 90% branches in `tool-core` |
| Components | Vitest + Testing Library | key interaction states |
| E2E | Playwright | smoke per tool, offline mode, no unexpected network |
| A11y | axe via Playwright | zero serious/critical |
| Performance | Lighthouse (`pnpm lighthouse`), bundle budget | NFR-002/003 |

Coverage gate: `pnpm test:coverage` fails below 90% lines, functions and statements, and — since the Batch 7A gate (DEC-70) — below **90% branches**. Branch coverage is measured across `packages/tool-core/src` and `packages/tools-registry/src`. Do not lower a threshold and do not exclude a file to pass it: a branch that can be reached gets a test that asserts its output or its error message, and a branch that genuinely cannot be reached (a token type the parser never emits) is named in the review log rather than covered by a fake test. At the time of writing `markdown/index.ts` is the lowest file at 77.94% branches, because markdown-it refuses to emit `html_block`, `html_inline` and unclosed-emphasis tokens when `html: false`.

E2E rules, so a loaded machine cannot turn into a false verdict:
- Navigate with `gotoApp(page, path)` from `tests/e2e/helpers.ts`, not `page.goto`. It waits for `html[data-app-ready]`, which `apps/web/src/main.tsx` sets after the first React commit (the shell's keyboard listener and stores are live by then). It is a boot signal only — never styled, never read by the app.
- No `waitForTimeout` and no fixed sleeps in a guard. Wait on the state the assertion needs: the dialog is visible, the filtered result list has the expected count, the file chip is rendered.
- One test per route for a cross-route guard. A single test that walks 20+ routes spends a whole timeout navigating and reports a timeout instead of a verdict.
- Playwright workers default to **50% of the available cores locally** (`localWorkers` in `playwright.config.ts`) and **2 on CI**. CI retries are 0, so a flake is reported rather than hidden.
- The heavy specs (`tests/e2e/heavy.spec.ts`, a megabyte through the page) run in their own `*-heavy` project per browser with `fullyParallel: false` and a dependency on that browser's project, so they never share the main thread with other workers. Do not move them back into the general run.

Playwright worker policy: the default is half the cores, not one worker per file, because the suite is CPU-bound (React hydration, canvas, axe) and oversubscribing it makes assertions race the scheduler rather than test the product. A loaded host is still a loaded host: when the suite reports several 30 s timeouts at once, run it from a quiet start (`uptime`, load below about a quarter of the cores) instead of raising timeouts, and treat a single timeout that does not reproduce as an observation, not a cause.

Lighthouse: `scripts/lighthouse.mjs` measures every prerendered route three times and prints the median and the minimum. It reads the 1-minute load average before and after each run; a run whose samples are above the limit does not count. The share is 0.25 locally and settable with `LIGHTHOUSE_LOAD_SHARE`; CI sets 0.75 because a shared runner is small, and the CI job is `continue-on-error` (advisory) — the gate is a quiet local run.

The sweep is resumable and every state is in a file:
- Each finished route is written to `reports/lighthouse/results/<route>.json` immediately, with its three runs, the load before and after each run, the medians, the minima, the median LCP, the LCP element and the commit and build fingerprint.
- If a sample trips the guard, that route's runs are **discarded** and the route is measured again from run 1 after the host has been inside the limit continuously for 30 s (polled every 5 s, up to 10 minutes). Runs from different load conditions are never mixed into one median. After three retries the route is `invalid`.
- `--resume` skips routes whose stored result is `valid` for the same commit **and** build fingerprint; a stale result is deleted and measured again. `--routes /tools/a/,/tools/b/` measures just those paths; `--only <text>` is the older substring filter and writes to `reports/lighthouse/subset/`.
- `summary.md` and `summary.json` list **every** route with its status (`valid`, `INVALID`, `not reached`), the medians and minima, the median LCP, the LCP element and the load range. Exit 0 means every route met its budget, exit 1 an error-level budget failed, and exit 3 means at least one route was not validly measured — NOT TESTED, not a pass and not a fail. A sweep that trips the guard is no longer thrown away: rerun with `--resume`.

The guard logic lives in `scripts/lib/lighthouse-guard.mjs` and is unit-tested with a fake load source and clock in `scripts/lib/lighthouse-guard.test.mjs` (the `scripts` Vitest project).

Static first paint: `scripts/prerender.mjs` writes the tool name and description into `#root` at build time, inside the same shell skeleton and with the same classes as the hydrated markup. That is what makes first paint independent of the entry chunk. If you change `ToolFrame`, the shell, `pages/home.tsx`, `pages/about.tsx` or `pages/privacy.tsx`, update the matching markup in `prerender.mjs`: `tests/e2e/prerender.spec.ts` fails when the static text and the hydrated DOM disagree, and when hydration moves the heading or description by more than 1 px.

## 6. Definition of Done
Same as `plan.md` section 7, plus: lint/typecheck/test green; docs updated; no new dependency without a licence note.

## 7. AI-assisted development rules
See `AGENTS.md`. Humans own decisions, copy and review. Agents own implementation and tests. Nothing merges without a human reading the diff.

## 8. Branching
`main` is always releasable. Feature branches `feat/<phase>-<topic>`; squash merge with PR template.
