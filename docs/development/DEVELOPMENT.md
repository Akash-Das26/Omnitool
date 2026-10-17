# Development guide

## 1. Prerequisites
Node >= 22 (`nvm use`), pnpm via `corepack enable`, a current Chromium for Playwright.

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
| Performance | Lighthouse CI, bundle budget | NFR-002/003 |

## 6. Definition of Done
Same as `plan.md` section 7, plus: lint/typecheck/test green; docs updated; no new dependency without a licence note.

## 7. AI-assisted development rules
See `AGENTS.md`. Humans own decisions, copy and review. Agents own implementation and tests. Nothing merges without a human reading the diff.

## 8. Branching
`main` is always releasable. Feature branches `feat/<phase>-<topic>`; squash merge with PR template.
