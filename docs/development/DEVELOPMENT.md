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
- No `eval`, no inline scripts, no third-party runtime requests.
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
| Pure logic | Vitest | ≥ 90% lines in `tool-core` |
| Components | Vitest + Testing Library | key interaction states |
| E2E | Playwright | smoke per tool, offline mode, no unexpected network |
| A11y | axe via Playwright | zero serious/critical |
| Performance | Lighthouse (`pnpm lighthouse`), bundle budget | NFR-002/003 |

E2E rules, so a loaded machine cannot turn into a false verdict:
- Navigate with `gotoApp(page, path)` from `tests/e2e/helpers.ts`, not `page.goto`. It waits for `html[data-app-ready]`, which `apps/web/src/main.tsx` sets after the first React commit (the shell's keyboard listener and stores are live by then). It is a boot signal only — never styled, never read by the app.
- No `waitForTimeout` and no fixed sleeps in a guard. Wait on the state the assertion needs: the dialog is visible, the filtered result list has the expected count, the file chip is rendered.
- One test per route for a cross-route guard. A single test that walks 20+ routes spends a whole timeout navigating and reports a timeout instead of a verdict.
- Playwright workers default to half the available cores locally and 2 on CI (`playwright.config.ts`). CI retries are 0, so a flake is reported rather than hidden.

Lighthouse: `scripts/lighthouse.mjs` measures every prerendered route three times and prints the median and the minimum. It reads the 1-minute load average before and after each run and aborts with exit code 3 and `INVALID: host busy` when it is above a share of the core count; that result is NOT TESTED, not a pass and not a fail. Exit 0 means every route met its budget, exit 1 means an error-level budget failed. The share is 0.25 locally and settable with `LIGHTHOUSE_LOAD_SHARE`; CI sets 0.75 because a shared runner is small, and the CI job is `continue-on-error` (advisory) — the gate is a quiet local run. Each sweep writes `reports/lighthouse/summary.md`, which CI appends to the job summary.

Static first paint: `scripts/prerender.mjs` writes the tool name and description into `#root` at build time, inside the same shell skeleton and with the same classes as the hydrated markup. That is what makes first paint independent of the entry chunk. If you change `ToolFrame`, the shell, `pages/home.tsx`, `pages/about.tsx` or `pages/privacy.tsx`, update the matching markup in `prerender.mjs`: `tests/e2e/prerender.spec.ts` fails when the static text and the hydrated DOM disagree, and when hydration moves the heading or description by more than 1 px.

## 6. Definition of Done
Same as `plan.md` section 7, plus: lint/typecheck/test green; docs updated; no new dependency without a licence note.

## 7. AI-assisted development rules
See `AGENTS.md`. Humans own decisions, copy and review. Agents own implementation and tests. Nothing merges without a human reading the diff.

## 8. Branching
`main` is always releasable. Feature branches `feat/<phase>-<topic>`; squash merge with PR template.
