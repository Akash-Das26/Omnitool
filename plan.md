# plan.md — Omnitool master plan

Status: **Phase 1 (Foundations) implemented 2026-10-17, awaiting Audit A1.** Decision log v2 applied in Session 001.
Read order for any session: `AGENTS.md` → this file → `todo.md` → `features.md` → the doc for your task.

## 1. Vision

Omnitool is a collection of ~97 small browser tools for digital creatives and developers (colour, images, PDF, audio/video, text, dev utilities, calculators). It is a re-implementation inspired by delphi.tools: same product idea and feature scope, own code, own design, own identity.

Principles (these are requirements, see `docs/srs/SRS.md`):
1. **Local-only.** No server component, no accounts, no analytics. Files never leave the browser.
2. **Offline after first load.** Large models/WASM are fetched once from a declared CDN and cached.
3. **One tool, one job, done well.** Each tool is an isolated, lazy-loaded module.
4. **Logic is testable.** Pure logic lives outside React in `packages/tool-core`.
5. **Accessible and fast.** WCAG 2.2 AA, small shell, heavy code only when a tool opens.

## 2. Decisions (proposed; change via an ADR in `docs/adr/`)

Decision log v2 (Session 001). Merges the two decision logs you supplied with the original table, after verifying disputed claims. What changed and why is listed under the table.

| ID | Decision | Choice | Why | Alternatives |
|----|----------|--------|-----|--------------|
| D-01 | Package manager | **pnpm** workspaces | Strict dependency isolation, efficient store, solid monorepo support, works with the shadcn CLI | npm (looser, slower), bun (fast; used by the original; less proven for monorepo CI) |
| D-02 | Language | **TypeScript, strict** | Types across package boundaries and the tool-handoff contract | JavaScript |
| D-03 | Build/dev | **Vite** SPA | Fast HMR, static output, module workers via `new Worker(new URL(...), { type: 'module' })` | Next.js (server runtime unused) |
| D-04 | UI framework | **React 19** | Required by shadcn/ui; `ref` as a prop (no `forwardRef`) | Ember (original), Svelte |
| D-05 | Styling | **Tailwind CSS v4** + CSS-variable tokens | CSS-first config, tokens map 1:1 to `DESIGN.md` | Tailwind v3 (config + PostCSS) |
| D-06 | Components | **shadcn/ui (CLI v4) + shadcn MCP** | Code lives in our repo; accessible primitives (Radix/Base UI); agent can search/install real components. Primitives are still bundled dependencies | Mantine, Park/Ark UI |
| D-07 | Routing | **TanStack Router** (SPA, code-based routes generated from the registry; `defaultPreload: 'intent'`) | Typed, validated search params; chunk preload on hover/focus makes lazy tool routes feel instant | React Router (no built-in hover preload in SPA mode) |
| D-08 | State | **Zustand** for UI state (theme, notation, flow); **URL search params via the router's `validateSearch`** for shareable tool state. **No `nuqs`** | One mechanism for URL state. nuqs documents its TanStack adapter as experimental and recommends the router's own APIs | Redux; nuqs; React Context |
| D-09 | Persistence | `localStorage` (prefs) + **IndexedDB via Dexie** (files, flows) | Right tool per data size | OPFS |
| D-10 | Heavy computation | **Web Workers** + WASM/ML, lazy and cached | Keeps UI responsive | Main thread |
| D-11 | Worker messaging | **Comlink**; progress via `Comlink.proxy` callbacks; **cancel = terminate the worker** (workers are disposable per job) | Typed async RPC instead of raw `postMessage`; a busy worker cannot receive a cancel message, termination always works | Raw `postMessage` |
| D-12 | Quality | **Biome**, **Vitest** + Testing Library, **Playwright + axe-core** | Fewer tools; runtime a11y covered by axe because lint rules do not catch everything | ESLint + Prettier |
| D-13 | Hosting | **Cloudflare Pages** (Workers Static Assets is the equivalent alternative; the original uses `wrangler.jsonc`) | Unlimited static bandwidth, free CDN, `_headers` file. **Hard limits: 25 MiB per file, 20,000 files, 100 header rules.** Models and large WASM must come from external hosts, not our bundle | GitHub Pages, Vercel, Netlify |
| D-14 | Offline | **`vite-plugin-pwa` (Workbox)** with an explicit policy: **precache** app shell + all JS/CSS/tool chunks (each < 2 MiB; total budget in CI); **runtime-cache** WASM and models (CacheFirst, versioned, expiry) | Plugin skips files over 2 MiB by default, so large WASM is never auto-precached; precaching tool chunks avoids stale-chunk breakage after a deploy | Network-only hosting |
| D-15 | Icons | **Lucide React** | shadcn default, tree-shakeable, ISC licence | Heroicons |
| D-16 | Telemetry | **None.** No analytics, no opt-in analytics either | Core promise (NFR-001) | Plausible, PostHog |
| D-17 | UI spelling | **British English** | Consistency with the original | American |
| D-18 | Licence | **MIT**, holder "Omnitool contributors" (placeholder) | Permissive | 0BSD |
| D-19 | Schema validation | **Valibot** (via Standard Schema) for search params and file-format parsing | Modular, typically smaller bundles than Zod (measure at ignition) | Zod |

**COOP/COEP:** cross-origin isolation headers are **off by default**. They are only needed for `SharedArrayBuffer`; the planned media stack (WebCodecs) does not need it, and enabling them can break cross-origin model/WASM downloads unless each host sends compatible headers. Enable per tool by ADR only if a tool proves it needs them.

**What changed from the previous table and the two logs you pasted**
- Router: React Router -> TanStack Router (accepted; benefit is real but moderate for registry-generated routes, see ADR 0002).
- `nuqs` rejected as redundant once the router validates search params.
- Added: Comlink (with a cancel rule), Lucide, explicit PWA policy, explicit no-telemetry, Valibot.
- Corrected claims: shadcn does have bundle footprint from primitives; `vite-plugin-pwa` does not precache big WASM by default; Cloudflare Pages is not unlimited in file size; "server component flexibility" is irrelevant for an SPA and was dropped.
- Merged duplicates: the two logs numbered telemetry/spelling/licence differently and the follow-up text proposed IDs that clashed (a second "worker messaging", "PWA", "analytics"). Final numbering is above.

Pin all versions at ignition using `pnpm view <pkg> version`; do not trust remembered versions. Unverified: `vite-plugin-pwa` compatibility with the Vite major the project installs.

## 3. AI tooling (verified 2026-10-17; details in `docs/tooling/TOOLING.md`)

| Job | Tool | Notes |
|-----|------|-------|
| Design exploration (screens, layout, tone) | **Google Stitch** (free, Google Labs) | Generates a portable `DESIGN.md`; MCP server and SDK available; exports to code/Figma/others (check current export menu) |
| Design system hand-off | `docs/design/DESIGN.md` | Seeded here; replace/merge with Stitch export |
| Component library | **shadcn/ui CLI v4 + shadcn MCP** | `pnpm dlx shadcn@latest init --template vite`; `shadcn mcp init --client <client>` |
| Implementation agent | Claude Code (or any agent that reads `AGENTS.md`) | Works from `AGENTS.md`, `plan.md`, `todo.md` |
| Optional design polish | Figma (a Figma MCP connector is available in this workspace) | Only if you want pixel-level edits |
| Verification | Vitest, Playwright, axe, bundle analyser | Agents may not self-certify |

**Human checkpoints (AI never merges alone):** design approval after Stitch; review after each session; audit at each phase gate.
**Fallback if Stitch is unavailable or its output is poor:** build from `docs/design/DESIGN.md` tokens with shadcn blocks; design is not a blocker for logic-only tools.

## 4. Architecture (summary; full detail in `docs/implementation/IMPLEMENTATION.md`)

```
Omnitool/
├─ apps/web/                 Vite + React shell, routing, tool modules
│  └─ src/{app,shell,tools/<id>,lib,styles}
├─ packages/
│  ├─ tools-registry/        typed registry (id, name, category, accepts/produces, tier) + seed JSON
│  ├─ tool-core/             pure TS logic, no DOM/React, 100% unit-testable
│  ├─ ui/                    shadcn-derived components + design tokens
│  └─ config/                shared tsconfig / biome config
├─ docs/                     srs, development, implementation, review, audit, design, tooling, legal, prompts, adr
├─ tests/e2e/                Playwright
└─ plan.md  todo.md  features.md  AGENTS.md
```

**Tool module contract:** every tool is `apps/web/src/tools/<id>/index.tsx` (default export, lazy), one registry entry, logic in `packages/tool-core/src/<id>/` with tests, one `features.md` row. Tool IDs are kebab-case.

## 5. Process per session

1. Read `AGENTS.md`, `plan.md`, `todo.md`; pick the top unchecked task(s) in the current phase only.
2. Write/adjust tests first for pure logic.
3. Implement; run `pnpm lint && pnpm typecheck && pnpm test`.
4. Update `features.md` status, `todo.md`, and add an entry to `docs/review/REVIEW-LOG.md` (what was done, decisions, open issues, next).
5. At a phase gate: run the audit in `docs/audit/CHECKLISTS.md` and record it in `docs/audit/AUDIT-LOG.md`. No phase starts until the previous gate passes.

## 6. Phases and exit gates

| Phase | Scope | Exit gate |
|-------|-------|-----------|
| **P0** Planning | This repository scaffold, SRS, design brief, prompts | Human approves plan and decisions D-01..D-19 |
| **P1** Foundations | Stitch design pass → tokens; scaffold; shell; registry; routing; omnibox; theme; file-intake helper; offline/PWA; 404/privacy; CI | Home and 3 sample tools render; Lighthouse ≥ 90; offline works; axe clean; Audit A1 |
| **P2** Text, dev & calculators | All T1 tools in typography, dev, calculators, turbo-nerd, experiments, plus QR/barcode/password/ciphers/markdown/doc tools | Per-tool DoD; tool-core coverage ≥ 90%; Audit A2 |
| **P3** Colour | Colour suite + notation selector + `?color=` handoff | Audit A3 |
| **P4** Images & social | Canvas tools, codecs (WASM), background remover | Memory/time budgets met on a 24 MP image; Audit A4 |
| **P5** PDF & print | PDF tools, imposers | No AGPL dependency unless approved; Audit A5 |
| **P6** Audio & video | Media tools, subtitles, recorders | Works in Chromium, Firefox, Safari (documented gaps allowed); Audit A6 |
| **P7** Platform extras | Atlases, tool-to-tool handoff, workflows, changelog | Audit A7 |
| **P8** Flagships | Image editor (Substrata-equivalent), PDF editor (Errata-equivalent), history store | Audit A8 |
| **P9** Hardening & release | Full a11y/security/licence/perf audit, docs freeze, v1.0 | Audit A9, all must-fix closed |

Rough effort (single developer with an AI pair, honest estimate): P1 ≈ 1–2 weeks, P2 ≈ 3–4, P3 ≈ 1–2, P4 ≈ 3, P5 ≈ 2, P6 ≈ 3–4, P7 ≈ 2, P8 ≈ 6+, P9 ≈ 1–2. The flagship editors alone are as large as everything else in P2–P3. Ship incrementally; v0.x after each phase.

## 7. Definition of Done (per tool)

Registered; lazy route; logic tested; keyboard and screen-reader usable; works offline; no unexpected network calls; large inputs handled in a worker with progress and cancel; error states explain what to do; own UI copy; `features.md` updated.

## 8. Risk register

| ID | Risk | Likelihood / impact | Mitigation |
|----|------|---------------------|------------|
| R-01 | Scope: 97 tools + 2 editors | High / High | Tiered phases; ship per phase; defer P8 if needed |
| R-02 | Licence contamination (MuPDF AGPL, GPL pandoc.wasm at runtime, CC BY-SA LUTs) | Med / High | Dependency licence check at each audit; prefer permissive libs; document in `docs/legal/` |
| R-03 | Copying original artwork or copy | Med / High | Own identity; PR checklist; audit item |
| R-05 | Large WASM/ML downloads break "offline" claim | Med / Med | Explicit first-use download UI, cache in service worker, size budgets |
| R-06 | Safari/iOS limits (codecs, WebCodecs, memory) | High / Med | Feature-detect; documented per-tool support matrix |
| R-07 | AI-generated code drift, hallucinated APIs | Med / Med | Tests first, human review each session, versions pinned from registry, audits |
| R-08 | Stitch/MCP tooling changes | Med / Low | Design output is just `DESIGN.md` + screens; swappable |
| R-09 | Cloudflare Pages 25 MiB/file and 20,000-file limits; COOP/COEP breaking CDN fetches | Med / Med | Models and big WASM from external hosts; chunk-size CI check; isolation headers off by default |
| R-10 | PWA precache too large (slow install, data use) or too small (stale chunks after deploy) | Med / Med | Precache budget enforced in CI; WASM/models runtime-cached; update prompt on new version |
| R-11 | TanStack Router benefit smaller than expected with registry-generated routes | Low / Low | ADR 0002 names the fallback (React Router); routing sits behind a thin `lib/navigation` wrapper |

## 9. Prompts

- Planning/refresh: `docs/prompts/01-PLANNING-PROMPT.md`
- **Ignition (start implementing P1): `docs/prompts/02-IGNITION-PROMPT.md`**
- Session start/end and audit: `docs/prompts/03-SESSION-PROMPTS.md`
