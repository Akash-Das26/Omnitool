# Audit log — updated after each audit

Audits happen at each phase gate (A1..A9) using `CHECKLISTS.md`. Findings have an ID, severity (Must / Should / Info), status and owner. An audit passes when all **Must** items are closed.

## Findings table (running)
| ID | Audit | Severity | Finding | Status | Owner |
|----|-------|----------|---------|--------|-------|
| F-002 | A0 | Must (before P5) | Original uses MuPDF (AGPL-3.0). Using it would impose AGPL on Omnitool | Open: plan avoids it (pdf-lib + pdfjs-dist) | agent |
| F-003 | A0 | Must (P1) | Original artwork, mascot and copy are excluded from its licence and must not be reused | Open: own identity required (PF-24) | human |
| F-004 | A0 | Should | No versions pinned; remembered versions may be stale | Closed in Session 004: versions pinned from `pnpm view`, `packageManager` set, `pnpm-lock.yaml` committed | agent |
| F-005 | A0 | Should | Licence holder, hosting and router are placeholders | Closed in Session 004: MIT "Omnitool contributors" (DEC-02), Cloudflare Pages (DEC-03), TanStack Router (ADR 0002) | human |
| F-006 | A0 | Should | Some data is CC BY / CC BY-SA or GPL-at-runtime (LUTs, EFF list, pandoc.wasm). Needs per-tool decision | Open: P2/P4 | human+agent |
| F-007 | A0 | Info | Scope is large (97 tools + 2 editors); editors comparable to all other tools combined | Open: phase plan | human |
| F-008 | A0.1 | Must (P1) | Cloudflare Pages caps files at 25 MiB (20,000 files free). Decision log claimed unlimited bandwidth only; large WASM/ML cannot live in the bundle | Closed in Session 004: `scripts/check-build-budget.mjs` enforces < 20,000 files and no file > 20 MiB (current build: 35 files) | agent |
| F-009 | A0.1 | Must (P1) | `vite-plugin-pwa` does not precache files over 2 MiB by default; claim that it precaches WASM was wrong | Closed in Session 004: 2 MiB precache limit set, total budget 8 MiB checked in CI; measured 30 files / 781.7 kB | agent |
| F-010 | A0.1 | Should (P1) | COOP/COEP can break cross-origin model/WASM fetches; only needed for SharedArrayBuffer | Closed in Session 004: headers deliberately absent, CSP in `_headers`, policy in ADR 0003 | agent |
| F-011 | A0.1 | Info | nuqs + TanStack Router duplicates URL-state handling; nuqs marks its TanStack adapter experimental | Closed: nuqs rejected | agent |
| F-012 | A1 pre-check | Should | `pnpm audit` reported 4 high, 2 moderate and 1 low advisories, all from `@lhci/cli` transitive dependencies (`tmp`, `extract-zip`, `basic-ftp`, `uuid`, `sprintf-js`) | Closed in Session 005: Lighthouse runs from `scripts/lighthouse.mjs` using `lighthouse` + `chrome-launcher`; `pnpm audit` reports 0 vulnerabilities | agent |

## Pre-audit evidence for A1 — collected 2026-10-18 — not a verdict

Evidence only; A1 itself is still unrun and unapproved. Re-run these commands at the audit.

**1. Privacy and offline.** 17/17 Playwright tests pass: offline reload and offline conversion, and a trace of normal use with zero third-party requests. No analytics, remote fonts or third-party scripts exist; fonts are Fontsource packages bundled locally. IndexedDB handoff is not built yet (P7).

**2. Security.** CSP in `dist/_headers` with `script-src 'self'`; the theme bootstrap is the external `/theme.js`, and `dist/index.html` contains no inline script. `pnpm audit`: **0 vulnerabilities**. No `TODO`/`FIXME`/`XXX` in app or package source. Fixtures are generated, no real data. `style-src 'unsafe-inline'` is required by React style attributes and shadcn; documented as a known relaxation. The regex tester and other sandboxed evaluators do not exist yet (P2).

**3. Accessibility.** axe: 0 serious/critical on home, privacy, about, the three tools, the omnibox and dark mode. Keyboard path through the omnibox (Ctrl/Cmd+K, Escape) is covered by E2E. Touch targets measured at 390×844: every control is at least 44 px in both axes after the coarse-pointer rules in `apps/web/src/styles/app.css`; exceptions are the skip link (1×1 until focused, standard pattern) and the 20×20 checkboxes, whose 44 px label rows are the actual target. **Not done:** screen-reader spot check (NVDA/VoiceOver).

**4. Performance.** Lighthouse mobile (`pnpm lighthouse`, 2026-10-18): home **96** performance, tool pages **92–95**, and **100** for accessibility, best practices and SEO on all six audited routes. Shell JS **147.2 kB gzip** (budget 200 kB); precache **30 files / 781.7 kB** (budget 8 MiB); 35 build files, none over 20 MiB. TBT is 13–69 ms. **Not done:** 24 MP image / 100 MB file / 10-minute media stress tests (no heavy tool in P1) and a dedicated long-task trace beyond Lighthouse TBT.

**5. Licence and provenance.** Every dependency is pinned; licences are recorded in `docs/legal/ATTRIBUTION.md`, with `qrcode` (MIT) and `axe-core`/`@axe-core/playwright` (MPL-2.0, development only) called out. No AGPL/GPL dependency is installed. No source, copy, data or artwork from the original is in the repository.

**6. Code quality.** `pnpm lint`, `pnpm typecheck` and `pnpm test` pass; **69 tests in 10 files**, coverage **98.6% lines / 86% branches** against 90/85 thresholds. Each sample tool follows the module contract (registry entry, lazy route, error boundary, tests for its logic).

**7. Documentation sync.** `features.md`, `todo.md`, `IMPLEMENTATION.md` and this log were updated in Session 005. ADRs 0001–0004 cover the stack, routing/URL state, hosting/caching and worker RPC.

**8. Browser matrix.** Chromium only (Playwright). Firefox, WebKit, Safari, iOS Safari and Android Chrome have not been run. This is the largest outstanding gap before A1 can pass.

**Also not verifiable here:** a real second deployment for the update prompt, Cloudflare Pages serving behaviour, the Stitch design gate (`docs/design/stitch/` is empty) and brand assets.

## Audit entry template
```
### Audit AN — YYYY-MM-DD — <phase> gate — <auditor>
**Scope / commit:**
**Checklists run:** (sections of CHECKLISTS.md)
**Results:** (pass/fail counts; Lighthouse; bundle sizes; axe)
**New findings:** (IDs above)
**Closed findings:**
**Verdict:** PASS / PASS WITH CONDITIONS / FAIL
**Conditions / next actions:**
```

---

### Audit A0 — 2026-10-17 — Planning baseline — Claude
**Scope:** `delphitools-main.zip` metadata and docs; this repository's planning artefacts. No code to audit.
**Checklists run:** Licence (section 5), Documentation sync (section 7).
**Results:** Licences and exclusions read from the original LICENSE and ACKNOWLEDGEMENTS; plan reflects them. Seven findings recorded above.
**Limits of this audit:** based on documents and the tool registry, not on reading every tool's source, and not a legal review.
**Verdict:** PASS WITH CONDITIONS: Must items F-002 and F-003 must be closed at the stated phases.
**Conditions / next actions:** resolve DEC-01..04; re-verify tooling at ignition.

### Audit A0.1 — 2026-10-17 — Decision-log review — Claude
**Scope:** the two decision logs and review notes supplied by the project owner, compared with `plan.md` v1.
**Checklists run:** none from `CHECKLISTS.md` (no code); claim verification against official docs.
**Results:** 4 claims corrected (shadcn "zero runtime footprint", PWA plugin precaching WASM, Pages "unlimited", "server component flexibility"); 1 proposal rejected (nuqs); 1 addition made (Valibot); ID clashes resolved.
**Limits:** web sources only; nothing installed or built; `vite-plugin-pwa` vs the latest Vite major not verified.
**Verdict:** PASS WITH CONDITIONS: F-008 and F-009 must be closed in P1.
**Conditions / next actions:** implement CI budget checks in P1; re-verify tooling at ignition.

