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
| F-013 | A1 | Should | Browser matrix limited to Chromium; Firefox, WebKit, Safari, iOS Safari and Android Chrome have not been exercised | Open: A2/Phase 9 | agent |
| F-014 | A1 | Should | No screen-reader spot check (NVDA or VoiceOver) has been done | Open: A2 | human+agent |
| F-015 | A1 | Should | `apps/web/public/_redirects` (`/* /index.html 200`) produces an infinite loop warning under Wrangler / Cloudflare Pages and will be ignored at deploy; needs removal before first deploy | Open: P1-15 | human |
| F-016 | A1 | Info | Working tree has uncommitted edits to `docs/design/DESIGN.md` and untracked Stitch review/prompt archives at `62bd5e1` | Open | human |

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


### Audit A1 — 2026-10-18 — Phase 1 gate — independent session (verdict reported by the owner)
**Scope / commit:** Phase 1 as delivered at commit `da0d381`, working tree clean.
**Checklists run:** sections 1–7 against the evidence pack below; section 8 (browser matrix) only partially.
**Results (owner-reported):** lint, typecheck, 69/69 tests and 17/17 E2E pass; Lighthouse mobile home 96 with 100 accessibility/best practices/SEO; axe 0 serious/critical; `pnpm audit` 0 vulnerabilities; shell 147.2 kB gzip, precache 30 files / 781.7 kB, 35 build files.
**New findings:** F-013 (browser matrix, Should), F-014 (screen reader, Should).
**Closed findings:** F-004, F-005, F-008, F-009, F-010, F-012.
**Verdict:** PASS — no open Must findings.
**Conditions / next actions:** F-013 and F-014 carry forward to A2. P1-00 (Stitch gate) accepted for now under DEC-09; P1-13b and artwork moved to Phase 9 under DEC-11.
**Transcription note:** the verdict was supplied by the project owner from an audit run independently of the session that built the code. This entry records that verdict; it was not produced by the implementing session.

---

### Audit A1 (Independent Verification) — 2026-10-18 — Phase 1 gate — Independent Auditor
**Scope / commit:** Omnitool Phase 1 verified at HEAD (`62bd5e1`, includes Phase 1 foundations and Batch 1 text/dev tools).
**Checklists run:** Sections 1 to 8 of `docs/audit/CHECKLISTS.md` for Phase 1 scope.

#### Gate Command Results
- `pnpm install --frozen-lockfile`: PASS (clean install in 708ms, pnpm v11.24.0, node v22.22.1).
- `pnpm lint` (`biome check .`): PASS (129 files checked, 0 errors, 0 fixes).
- `pnpm typecheck` (`tsc --noEmit` across all workspaces): PASS (5 workspace projects checked, 0 errors).
- `pnpm test:coverage` (`vitest run --coverage`): PASS (19 test files, 182 passed tests, 0 failures; `tool-core` coverage: 98.03% lines [threshold 90%], 90.2% branches [threshold 85%]).
- `pnpm build`: PASS (Vite v8.3.4 client production build in 528ms; prerendered 14 routes + 404.html; workbox precache 38 entries, 828.69 KiB).
- `node scripts/check-build-budget.mjs`: PASS (Shell JS: 150.8 kB gzip [budget 200.0 kB]; precache candidates: 53 files, 873.2 kB [budget 8192.0 kB]; total build files: 58 [limit 20,000]; largest file: 367 kB [limit 20 MiB]).
- `pnpm e2e` (`playwright test`): PASS (34 tests passed across 8 workers in 18.2s).
- `axe-core`: PASS (16 pages/states scanned via `@axe-core/playwright`, 0 critical, 0 serious violations).
- `pnpm lighthouse` (mobile profile on home `/`): PASS (Performance 96, Accessibility 100, Best Practices 100, SEO 100; LCP 2273 ms, TBT 31 ms, CLS 0.000).

#### Checklist Results (Sections 1–8)
1. **Privacy and offline (NFR-001, FR-007):**
   - [PASS] E2E offline reload and tools: `tests/e2e/offline.spec.ts` passes with network blocked (`context.setOffline(true)`) for home, privacy, `uuid-genny`, `image-converter`, `json-formatter`, `word-counter`.
   - [PASS] Network trace: `tests/e2e/network.spec.ts` verified zero third-party requests (`external = []`).
   - [PASS] Third-party origins: No third-party analytics, fonts, or scripts; fonts bundled locally (`@fontsource-variable/*` woff2 in `dist/assets/`).
   - [PASS] Persistence: No automatic storage of user files; IndexedDB handoff not in scope (scheduled for P7).
2. **Security (NFR-007):**
   - [PASS] CSP & scripts: `apps/web/public/_headers:6` sets strict CSP (`script-src 'self'`); zero inline scripts in `apps/web/dist/index.html`; theme bootstrap is external `/theme.js`. COOP/COEP absent.
   - [PASS] `pnpm audit`: 0 vulnerabilities reported.
   - [PASS] Defensive parsing: `packages/tool-core/src/json/index.ts:39` enforces `MAX_DEPTH = 1000`; `dataUrlToBlob` validates header/comma; malformed inputs throw handled errors.
   - [NOT TESTED] Regex tester sandboxing: Out of scope for Phase 1 (scheduled for Phase 2).
   - [PASS] Secrets: Repo files, `.npmrc`, and full `git log -p` verified free of tokens, API keys, credentials or user data.
3. **Accessibility (NFR-004):**
   - [PASS] axe scans: 0 serious/critical violations on home, about, privacy, dark mode, omnibox dialog, and all 11 tool routes.
   - [PASS] Keyboard walkthrough: `tests/e2e/home.spec.ts` verifies skip link, Ctrl/Cmd+K omnibox opening, arrow navigation, and Escape dismissal.
   - [NOT TESTED] Screen-reader spot check: NVDA/VoiceOver not testable in headless Linux environment. Tracked as open finding F-014.
   - [PASS] Contrast, focus & motion: Contrast AA verified by axe; visible focus rings on `--ring`; `@media (prefers-reduced-motion: reduce)` respected.
   - [PASS] Touch targets: Minimum 44 px targets enforced on coarse pointers via `apps/web/src/styles/app.css`.
4. **Performance (NFR-002/003):**
   - [PASS] Lighthouse mobile performance: 96 on home `/` (threshold >= 90), 100 on a11y, best practices, SEO.
   - [PASS] Shell JS & lazy chunks: Shell JS is 150.8 kB gzip (budget 200 kB); all tool modules are separate lazy chunks in `dist/assets/`.
   - [NOT TESTED] Heavy tool stress tests (24 MP image / 100 MB file / 10-minute media): Heavy tools belong to P4/P6. (Worker cancellation and progress harness verified in `job.test.ts` and `batch1.spec.ts`).
   - [PASS] Main-thread long tasks: Lighthouse TBT <= 78 ms across all routes (31 ms on home); no blocking tasks > 200 ms.
5. **Licence and provenance (NFR-009):**
   - [PASS] Dependency licences: Every dependency recorded in `docs/legal/ATTRIBUTION.md`.
   - [PASS] No AGPL/GPL: Full scan of 1014 packages in `node_modules/.pnpm` confirmed zero AGPL or GPL dependencies.
   - [PASS] Clean provenance: Zero source code, UI copy, or artwork copied from `delphitools-main` or `../delphitools-main.zip`. All 8 implemented tool descriptions are original British English. `tests/fixtures/sample.png` has no match in original.
   - [NOT TESTED] `THIRD-PARTY-NOTICES.md`: Phase 9 item (credits currently listed on `/about`).
6. **Code quality (NFR-008):**
   - [PASS] CI checks: lint, typecheck, tests all green.
   - [PASS] Coverage: `tool-core` lines coverage is 98.03% (>= 90%), branches 90.2% (>= 85%).
   - [PASS] Clean source: Zero TODO, FIXME, or XXX comments in `apps/web/src` or `packages/*/src`.
   - [PASS] Module contract: All tools implement lazy route exports, registry metadata, and error boundary isolation.
7. **Documentation sync:**
   - [PASS] `features.md` matches reality: 5 spot-checked rows (`PF-06`, `uuid-genny`, `PF-07`, `json-formatter`, `password-genny`) verified against active code.
   - [PASS] `todo.md` ticks: Ticks accurately match delivered work; P1-15 correctly left open.
   - [PASS] Review log: Sessions 001–007 recorded in `docs/review/REVIEW-LOG.md`.
   - [PASS] SRS verification: Functional and non-functional requirements backed by automated tests.
   - [PASS] ADRs: ADRs 0001–0004 document stack, routing, hosting/caching, and worker RPC.
8. **Browser matrix (NFR-006):**
   - [NOT TESTED] Full browser matrix: Only Chromium tested via Playwright. Firefox, WebKit/Safari, iOS Safari, and Android Chrome not tested in this environment. Open finding F-013.
   - [PASS] Support matrix: Documented in `docs/development/SUPPORT-MATRIX.md`.

#### Specific Verification Items
- Same-origin network only: PASS (`tests/e2e/network.spec.ts`).
- Built entry inline scripts: PASS (0 inline scripts in `dist/index.html`; `/theme.js` external).
- CSP in `_headers`: PASS (`script-src 'self'`).
- COOP/COEP absent: PASS (headers absent from `_headers`).
- File size <= 20 MiB & precache in budget: PASS (largest file 367 kB; precache total 873.2 kB <= 8 MiB).
- `axe-core` & devDependencies absent from bundle: PASS (0 matches in `dist/`).
- Licence compliance: PASS (all licences recorded, 0 AGPL/GPL).
- URL search params: PASS (`lib/search-params.ts` drops unknown & file-like keys).
- Worker cancellation: PASS (worker terminated on cancel via `job.ts:81-86`).
- No copied code/art/copy from delphitools: PASS (0 matches).
- Registry descriptions: PASS (8 original British English, 89 empty).
- No secrets in repo/git: PASS (0 secrets or API keys found).

**New findings:**
- F-015 (Should): `apps/web/public/_redirects` rule `/* /index.html 200` causes an infinite loop warning on Cloudflare Pages / Wrangler and is ignored; should be deleted before first deployment (P1-15).
- F-016 (Info): Working tree contains uncommitted changes to `docs/design/DESIGN.md` and untracked Stitch prompts/archives at commit `62bd5e1`.

**Closed findings:** None (as an independent auditor, no Must findings are self-closed). F-004, F-005, F-008, F-009, F-010, F-012 remain closed from prior sessions.

**Verdict:** PASS WITH CONDITIONS

**Conditions / next actions:**
1. Resolve F-015 before first production deploy: remove `apps/web/public/_redirects` as recommended in `docs/deployment/CLOUDFLARE-PAGES.md` section 3.
2. F-013 (browser matrix outside Chromium) and F-014 (screen-reader spot check) remain open as recorded Should findings to be addressed in Phase 2 / Phase 9.
3. F-003 (own branding & artwork) remains Open under human decision DEC-11 (deferred to Phase 9).
4. Clean up or commit working tree modifications (`docs/design/DESIGN.md` and untracked Stitch review files) before starting subsequent phase work.
Phase 2 may proceed from a code and quality perspective subject to the above conditions.
