# todo.md — working task list

Rule: only work on the **current phase**. Tick items as done and mirror status in `features.md`.
Format: `- [ ] ID task (owner: human|agent)`

## Decisions needed from the human (blocks P1)
- [x] DEC-01 Approve D-01..D-19 in `plan.md` (or amend via ADR); note D-07 TanStack Router and D-13 Cloudflare limits (human)
- [x] DEC-02 Confirm licence and copyright holder name (default MIT, "Omnitool contributors") (human)
- [x] DEC-03 Confirm hosting target (Cloudflare Pages proposed) (human)
- [x] DEC-06 Confirm art approach: identity set only (logo, icon, OG image, empty-state spots), made with an image generator or by hand (see `docs/design/ART-PROMPTS.md`) (human)
- [x] DEC-05 Decide image-editor canvas library (Fabric.js vs Konva) via ADR before P8 (human; deferred to P8)

## P0 Planning (done in Sessions 000-001)
- [x] P0-01 Analyse zip: structure, registry (97 tools), design doc, licence (agent)
- [x] P0-02 Verify AI tooling: Stitch, shadcn CLI/MCP (agent)
- [x] P0-03 Create repo scaffold, SRS, design brief, tooling, legal, prompts (agent)
- [x] P0-04 Generate `features.md` and registry seed (agent)
- [x] P0-06 Merge and verify external decision logs; publish decision log v2 (agent, Session 001)
- [ ] P0-05 Human review of plan (human)

## P1 Foundations (implementation complete; awaiting Audit A1)
- [ ] P1-00 Design gate: run Stitch prompts in `docs/design/STITCH-PROMPTS.md`; save exports to `docs/design/stitch/`; update `docs/design/DESIGN.md` (human)
- [x] P1-01 Pin versions (`pnpm view`), set `packageManager`, install (agent)
- [x] P1-02 Scaffold `apps/web` with Vite + React + TS strict (agent)
- [x] P1-03 Tailwind v4 + `shadcn init --template vite`; connect shadcn MCP (agent; MCP config in `.mcp.json`, client not in CLI's built-in list)
- [x] P1-04 Biome, Vitest, Playwright + axe, CI workflow (agent)
- [x] P1-05 Tokens from `DESIGN.md` into `packages/ui` (agent)
- [x] P1-06 `tools-registry` typed from seed (agent; all 97 descriptions remain empty, awaiting owner copy)
- [x] P1-07 Shell: header, sidebar, theme (no-flash), TanStack Router with registry-generated routes, `defaultPreload: 'intent'`, thin `lib/navigation` wrapper, 404, privacy (agent)
- [x] P1-07b Typed shared search params (`color`, handoff run id) with Valibot `validateSearch`; test that no file data can enter the URL (agent)
- [x] P1-07c Worker harness: Comlink wrapper, progress via proxy callback, cancel by terminate; unit test with a fake slow worker (agent)
- [x] P1-08 Home + tool index from registry (agent; rows rather than a card grid)
- [x] P1-09 Omnibox (Cmd/Ctrl+K) (agent)
- [x] P1-10 File-intake + download helpers (drag/drop/paste/picker; iOS accept extensions) (agent)
- [x] P1-11 `vite-plugin-pwa` per D-14: precache shell + tool chunks, runtime-cache WASM/models, update prompt, CI precache budget and per-file < 2 MiB check (agent)
- [x] P1-11b Hosting config: `_headers` (CSP, cache headers; COOP/COEP off), `_redirects` SPA fallback; CI check for any file > 25 MiB or > 20,000 files (agent; enforced at 20 MiB)
- [x] P1-12 Three sample tools proving the contract: `uuid-genny` (T1), `qr-genny` (T2), `image-converter` shell (T3 stub) (agent)
- [x] P1-13 Prerender/SEO per route (agent)
- [ ] P1-13b Brand assets supplied by the owner into `apps/web/public/brand/`; agent wires favicon, manifest icons, OG tags (human, then agent)
- [ ] P1-14 Audit A1 recorded (human+agent; requested in Session 004, not self-approved)

## Later (do not start early)
- [ ] P2 Text, dev & calculators — see `features.md` rows tagged P2
- [ ] P3 Colour · P4 Images · P5 PDF/print · P6 Audio/video · P7 Platform extras · P8 Flagships · P9 Hardening
