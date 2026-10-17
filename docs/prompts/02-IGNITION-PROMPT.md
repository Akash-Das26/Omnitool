# Ignition prompt — start implementing (Phase 1: Foundations)

**Before you paste this:** edit the `<decisions_from_the_human>` block so it says what you actually decide (it replaces ticking boxes by hand), and ideally the Stitch design gate (P1-00) is done and exports are in `docs/design/stitch/`. Give the prompt to your coding agent (Claude Code or similar) with this repository as the working directory.

```
<objective>
Implement Phase 1 (Foundations) of Omnitool, in the order of todo.md items P1-01 to P1-13, stopping at the Phase 1 exit gate for human review. Do not start Phase 2.
</objective>

<decisions_from_the_human>
(EDIT these before sending. Record them as ticked in todo.md; anything I leave unanswered, stop and ask.)
DEC-01: Approve plan.md decisions D-01..D-19 as written.
DEC-02: Licence MIT, holder "Omnitool contributors".
DEC-03: Hosting on Cloudflare Pages.
DEC-05: Deferred to Phase 8.
DEC-06: Art is limited to the identity set in docs/design/ART-PROMPTS.md. I make it myself (image generator or by hand); you do not generate art.
</decisions_from_the_human>

<context>
Omnitool is a local-only, no-account browser toolkit. Read, in this order, before writing anything: AGENTS.md, plan.md, todo.md, features.md, docs/srs/SRS.md, docs/development/DEVELOPMENT.md, docs/implementation/IMPLEMENTATION.md, docs/design/DESIGN.md (and docs/design/stitch/ if present), docs/legal/ATTRIBUTION.md, docs/adr/.
The project is a pnpm workspace: apps/web, packages/{tools-registry,tool-core,ui,config}. The registry seed is packages/tools-registry/data/registry.seed.json (descriptions intentionally blank).
A read-only copy of the original is at ../delphitools-main (I may have placed it elsewhere; find it or ask). Use it only to confirm what a feature does or how a flow behaves. Never copy source, text, data or images from it, and never use its art as a reference.
</context>

<instructions>
1. Confirm the gate: every DEC above must be answered. If docs/design/stitch/ is empty, say so, continue using docs/design/DESIGN.md tokens, and record it in the review log.
2. Re-verify tooling (docs/tooling/TOOLING.md section 5): run `pnpm view` for every package you plan to install (version, licence, last publish, deprecation), read the current shadcn Vite + Tailwind v4 install docs, and confirm vite-plugin-pwa supports the installed Vite major. If it does not, stop and report. Pin exact versions; set `packageManager` in the root package.json. Report any package with a licence outside docs/legal/ATTRIBUTION.md section 4 before installing it.
3. Scaffold apps/web (Vite, React, TypeScript strict) and configure Tailwind v4. Run the shadcn init for Vite and connect the shadcn MCP server for your client. Use shadcn components for primitives; add only those you need.
4. Configure Biome, Vitest + Testing Library, Playwright + axe, and a CI workflow running lint, typecheck, unit tests, build and E2E.
5. Implement design tokens from DESIGN.md in packages/ui (CSS variables, light and dark, no-flash theme bootstrap, self-hosted fonts via Fontsource).
6. Implement the typed registry in packages/tools-registry from the seed. Leave descriptions as empty strings; home rows with no description simply omit that line. List in the review log which tools need human-written copy. Do not invent descriptions.
7. Build the shell: header, collapsible category rail, TanStack Router with registry-generated lazy routes and `defaultPreload: 'intent'` behind a `lib/navigation` wrapper, validated shared search params (Valibot), error boundary per tool, 404, privacy page. Add the Comlink worker harness (progress by proxy callback, cancel by terminating the worker) with a unit test.
8. Build the home index (rows with accepts -> produces glyphs, not a card grid) and the omnibox (Ctrl/Cmd+K).
9. Build the shared FileIntake and download helpers (picker, drag and drop, paste; iOS accept extensions).
10. Add `vite-plugin-pwa` per plan.md D-14 and ADR 0003: precache shell and tool chunks (each < 2 MiB), runtime-cache WASM/models, update prompt, CI budget checks (precache total, no file > 20 MiB). Add `_headers` and SPA fallback for Cloudflare Pages with COOP/COEP off.
11. Implement three sample tools to prove the module contract: uuid-genny (T1, logic in tool-core with tests first), qr-genny (T2), and an image-converter stub showing first-use download, progress and cancel states with a fake worker.
12. Add per-route prerendered titles and descriptions.
13. Do not create artwork. Use a plain text wordmark "Omnitool" in Schibsted Grotesk and Lucide icons as placeholders. In the review log, list the brand assets you need from me (logo, favicon, app icons, OG image, three empty-state spots) with target paths from docs/design/ART-PROMPTS.md.
14. Run lint, typecheck, unit tests, build, E2E (including offline and no-unexpected-network checks), axe and Lighthouse. Fix failures; do not weaken thresholds.
</instructions>

<constraints>
- Work only on Phase 1. No tool beyond the three samples.
- Local-only: no analytics, no third-party runtime requests, no CDN fonts.
- No copying from delphitools (source, copy, data, art).
- Pure logic in packages/tool-core with tests written first.
- Do not invent APIs or versions; if docs and your memory disagree, trust the docs and say so.
- Commit in small Conventional Commits. Do not push or merge.
- If a step is blocked, stop that step, record why in the review log, and continue with unblocked steps.
</constraints>

<session_end>
Update features.md (PF-01..PF-10, PF-20..PF-23, PF-25 and the three sample tools), tick todo.md (including the DEC items above), append a Session entry to docs/review/REVIEW-LOG.md using its template (include failing checks, skipped work, assumptions), append measured budgets to docs/implementation/IMPLEMENTATION.md section 9, then print: tasks done, tasks not done, check results (pass/fail with numbers), the brand assets still needed from me, and the decisions you need from me. Request Audit A1 (docs/audit/CHECKLISTS.md); do not mark it passed yourself.
</session_end>

<success_criteria>
`pnpm install && pnpm dev` shows the home index and omnibox; the three sample tools work offline after first load; lint, typecheck, tests, E2E and axe pass; Lighthouse mobile performance >= 90 on home; shell JS <= 200 kB gzip; documents are in sync with the code.
</success_criteria>
```

## Why it is written this way
- Objective and stopping point first, so the agent does not run ahead into later phases.
- A gate check (decisions, design) before any code, because wrong assumptions are costlier than a pause.
- Verification steps ask the agent to look versions up rather than recall them, since tool versions move.
- Explicit failure instructions ("stop that step, record it") avoid silent workarounds.
- Success criteria are measurable so the agent cannot self-certify vaguely.
