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
| F-013 | A1 | Should | Browser matrix limited to Chromium; Firefox, WebKit, Safari, iOS Safari and Android Chrome have not been exercised | Open: Firefox now exercised at A1.1 (133 pass, 5 skipped, 0 fail); WebKit NOT TESTED on this host (missing libavif16/libmanette-0.2-0, needs interactive sudo apt-get); Safari/iOS/Android not testable here | agent |
| F-014 | A1 | Should | No screen-reader spot check (NVDA or VoiceOver) has been done | Open: A2 | human+agent |
| F-015 | A1 | Should | `apps/web/public/_redirects` (`/* /index.html 200`) produces an infinite loop warning under Wrangler / Cloudflare Pages and will be ignored at deploy; needs removal before first deploy | Closed in Session 009: P1-15 decided — file deleted, build and `wrangler@4.151.1 pages dev` re-verified (prerendered routes 200/308, unknown paths 404 with `404.html`, 5 header rules, 0 redirect rules), runbook section 3 updated | human |
| F-016 | A1 | Info | Working tree has uncommitted edits to `docs/design/DESIGN.md` and untracked Stitch review/prompt archives at `62bd5e1` | Verified fixed at A1.1: `git status` clean; `apps/web/public/_redirects` deleted (P1-15); working tree matches HEAD | human |
| F-017 | P2 batch 1 gate | Should | Browser matrix outside Chromium (F-013): Firefox and WebKit are now runnable through an optional Playwright project, but their results are not yet part of the gate | Partly closed in Session 009: Firefox now runs the whole suite clean (73 pass, 5 skipped = Chromium-only pixel baselines) after one trivial test-config fix — `grantPermissions(['clipboard-read','clipboard-write'])` is Chromium-only, so the grant is now conditional on `browserName`. WebKit still cannot run on this host (F-019). Open for WebKit at A2 | agent |
| F-018 | P2 batch 2 | Should | No screen-reader spot check (F-014) and no Firefox/WebKit sign-off for the eight Batch 2 tools | Open: A2 | human+agent |
| F-019 | P2 batch 2 | Should | WebKit E2E cannot run on this host: `playwright install webkit` downloads the browser but every launch fails with "Host system is missing dependencies" — `libavif16` and `libmanette-0.2-0` are not installed and installing them needs interactive `sudo apt-get`, which the agent cannot perform | Fix proposed, awaiting re-verification (Session 015): the PR workflow now runs a `webkit` matrix job on `ubuntu-24.04` with `playwright install --with-deps webkit`, so the two missing libraries are provisioned by the runner. The local host is still blocked by the same interactive `apt-get`. **Not executed** — the workflow has never run (nothing pushed). | agent |
| F-020 | A1.1 | Should | Lighthouse mobile performance medians 58–70 on all 22 routes (under the 92 flag); measured under system load (load avg 5–7 on 16 cores); A1 baseline home was 96. Uniformly depressed scores indicate CPU throttling, not a design-alignment regression. Lighthouse accessibility = 100 on all routes. | Fix applied, awaiting re-verification: `scripts/lighthouse.mjs` now reads the 1-minute load average before and after every run and aborts with exit code 3 and `INVALID: host busy` when it exceeds 25% of the core count; a busy host is recorded as NOT TESTED, never passed or failed, and every run prints its load. Guard verified by pushing load to 12.23 on 16 cores (limit 4.00) → exit 3. Clean-host sweep (Session 015): 22 routes × 3 runs, exit 0, every performance median ≥ 92, accessibility 100, LCP 2,409–2,767 ms, maximum load 3.02. After the static first paint (Session 016) the four measured routes are 98–99 performance with FCP 909–1,366 ms and LCP 1,663–2,413 ms. Status stays open until an audit re-verifies it. | agent |
| F-021 | A1.1 | Should | E2E `tests/e2e/design.spec.ts:204` ("no roadmap strings") fails consistently under the Chromium full parallel suite but passes in isolation and on Firefox (133 pass, 5 skipped, 0 fail). Test-isolation/timing under parallel load, not a design regression. | Fix applied, awaiting re-verification: two causes found — the guard pressed Ctrl+K before the shell's keydown listener existed (nothing to wait on, so a fixed 150 ms sleep), and one test walked 43 routes inside a single 30 s timeout. Fixed with an `html[data-app-ready]` boot marker, web-first waits on the omnibox filter state, and one test per route. Proof: 30 repeats × 25 guard tests under deliberate load (up to 46 on 16 cores) passed 750/750 on Chromium and 750/750 on Firefox, 0 retries. | agent |
| F-022 | P2 batch 2 gate | Should | Render-blocking `/theme.js` in `<head>` (784 B, **305 ms** in Lighthouse) delayed first paint on every route, and the collapsed-rail preference was applied only after hydration, so a visitor who had collapsed the rail saw the main column move **184 px** at boot | Fix applied, awaiting re-verification (Session 017): one inline boot script (`apps/web/boot/boot.js`) replaces the external file and applies the theme and the rail preference before first paint; `scripts/prerender.mjs` hashes it into `script-src` and fails the build if a page has anything but that one inline script or if the hash is missing; `tests/e2e/boot-script.spec.ts` proves zero CSP violations and ≤1 px geometry change at 1280×720 and 390×844. Status stays open until an audit re-verifies it. | agent |
| F-025 | A1.3 | Should | `pnpm audit` reports **10 advisories (4 low, 6 moderate, 0 high/critical)** where A1.2 recorded 0: `serialize-javascript` 7.1.2 (via `@rollup/plugin-terser`), `fast-uri` 3.1.8 ×4 (via `ajv` 8.20.0), `deepmerge` 4.3.1 (via `@rollup/plugin-node-resolve`), `seroval` 1.6.9 ×2 (runtime dependency of `@tanstack/router-core`), `minimatch` 5.1.9/10.2.6 and `glob` 11.1.0 | **Fix applied, awaiting independent verification (Session 026): 10 → 1 advisory.** `fast-uri` 3.1.8 → **3.1.9** and `seroval` 1.6.9 → **1.7.6** by an in-range update; `glob` 11.1.0 → **14.0.3**, `minimatch` 5.1.9/10.2.6 → **11.0.3** and `serialize-javascript` 7.1.2 → **7.1.4** through `overrides` in `pnpm-workspace.yaml` (pnpm 11 ignores a `pnpm` key in `package.json`), after updating the parents within their declared ranges was tried and would not move them. `glob` and `minimatch` are BlueOak-1.0.0, Node 18/20/≥22; build, budgets and E2E re-run clean. **One remains and cannot be fixed: `deepmerge` 4.3.1 has no patched version published** (`patched_versions: null`); it is build-time only, reached by `workbox-build > @rollup/plugin-node-resolve`, and absent from `dist` including sourcemaps. Recorded, not hidden. Not closed — an audit must re-verify. | agent |
| F-026 | A1.3 | Should | The E2E suite loses 4–5 timeout-prone tests at its configured worker count (half the cores, 8 here) on a loaded host (P2-69); every one passes alone and at 6 workers from a quiet start | Open: **not reproduced at this audit** — `playwright test` at the default 8 workers from a 1-minute load of 2.99 passed **290/290 in 1.3 min**. The failure mode is host contention, not code, but the suite is the variable and the owner's option list (fewer workers, explicit timeouts for the service-worker and axe routes, quiet-host-only gate) is unanswered | human |
| F-027 | A1.3 | Should | The 1 MB paste guard in `sanitize.test.ts` sits about **120 ms under its 2,000 ms bound** under v8 coverage instrumentation (P2-68): 1,880 ms passed after 2,255 ms and 2,550 ms failed. A wall-clock assertion inside the coverage gate measures the instrumenter as much as the code | **Fix applied, awaiting independent verification (Session 026): the finding was a misdiagnosis, and no code change was needed.** Ten runs of the guard's own call, same input (1,000,020 characters, 130,955 tokens): **median 73 ms, max 120 ms** in normal mode and **median 133 ms, max 148 ms** under v8 coverage — a **93% margin** against the unchanged 2,000 ms bound, not 4%. Tokenising dominates at 45 ms (53 ms under coverage), the model build accounts for the rest. The 1,880/2,255/2,550 ms readings were the whole suite competing for 16 cores (DEC-89's contention), not the cost of the paste. Bound and assertion untouched; the margin is now stated with numbers instead of assumed. | agent |
| F-028 | A1.3 | Info | `features.md` rows for `text-editor` and `doc-converter` still say "NFR-013 **NOT TESTED**" and P2-66 is unticked, although the audit measured 1,522 ms and 1,667 ms median LCP | **Fix applied, awaiting independent verification (Session 026):** both rows now record **1,522 ms** and **1,667 ms** (99 performance, measured 2026-11-01), P2-66 is ticked, and the two stale counts on PF-02/PF-04 were corrected. `pnpm lint` now runs `scripts/check-features-ledger.mjs`, which fails when the loader map, the registry seed and the ledger disagree (39 built · 37 done · 58 planned · 97 catalogued). | agent |

## Pre-audit evidence for A1 — collected 2026-10-18 — not a verdict

Evidence only; A1 itself is still unrun and unapproved. Re-run these commands at the audit.

**1. Privacy and offline.** 17/17 Playwright tests pass: offline reload and offline conversion, and a trace of normal use with zero third-party requests. No analytics, remote fonts or third-party scripts exist; fonts are Fontsource packages bundled locally. IndexedDB handoff is not built yet (P7).

**2. Security.** CSP in `dist/_headers` with `script-src 'self'`; the theme bootstrap is the external `/theme.js`, and `dist/index.html` contains no inline script. (Superseded in Session 017: the bootstrap is now inline and allowed by its hash — see F-022.) `pnpm audit`: **0 vulnerabilities**. No `TODO`/`FIXME`/`XXX` in app or package source. Fixtures are generated, no real data. `style-src 'unsafe-inline'` is required by React style attributes and shadcn; documented as a known relaxation. The regex tester and other sandboxed evaluators do not exist yet (P2).

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

---

### Audit A1.1 — 2026-10-20 — Phase 1.5 design-alignment delta audit — Independent Auditor
**Scope / commit:** `git diff 62bd5e1..HEAD` (HEAD `2391cd8`, design-alignment change across 109 files). Read-only audit; nothing fixed, refactored, reformatted or pushed.

**Checklists run:** Sections 1–8 of `docs/audit/CHECKLISTS.md`, plus the design-alignment success criteria in `docs/design/04-DESIGN-ALIGNMENT-PROMPT.md` and the DEC-16 radius decision in `docs/design/STITCH-REVIEW-2.md`.

#### Gate command results (re-run, recorded)
- `pnpm install --frozen-lockfile`: PASS (Already up to date, 3.5s; pnpm 11.24.0, node 22.22.1).
- `pnpm lint` (`biome check . && node scripts/check-design-rules.mjs`): PASS (167 files, 0 errors, 0 fixes; design rules: all checks passed — text floor, no all-caps, one shadow, no gradients, no icon fonts, no meta strings).
- `pnpm typecheck` (`tsc --noEmit` across workspaces): PASS (5 workspace projects, 0 errors).
- `pnpm test:coverage` (`vitest run --coverage`): PASS (28 test files, 348 tests passed, 0 failures; coverage: lines 98.22% [≥90], branches 90.8% [≥85], functions 99.5%). Includes `packages/ui/src/contrast.test.ts`: 64 passed.
- `pnpm build`: PASS (Vite client build; 46 precache entries / 897.96 KiB; prerendered 22 routes + 404.html).
- `node scripts/check-build-budget.mjs`: PASS (Shell JS 157.6 kB gzip [budget 200 kB]; precache 69 files / 964.2 kB [budget 8 MiB]; 73 build files [limit 20,000]; no file > 20 MiB).
- `pnpm e2e` (Chromium, 8 workers): 137 passed, 1 failed — `tests/e2e/design.spec.ts:204` "no roadmap strings" (dialog not visible after Ctrl+K following route navigation). Passes in isolation and on Firefox → test-isolation flakiness under parallel Chromium load (finding F-021), not a design regression.
- `axe-core` (light + dark): 50 passed, 0 serious/critical violations across 23 routes + omnibox in both themes (home, about, privacy, all 19 built tools).
- `pnpm lighthouse` (mobile, 3 runs/route, medians): process stalled under load after writing all route reports; medians computed from run reports — home **68**, about **70**, privacy **70**, tools **58–70**. Accessibility **100** on all 22 routes. ALL routes under the 92 flag — see finding F-020 (measured under system load avg 5–7 on 16 cores; A1 baseline home was 96; uniformly depressed scores indicate throttling).

#### Alignment criteria (evidence)
- **Tokens match DESIGN.md exactly** (`packages/ui/src/tokens.css` vs `docs/design/DESIGN.md`, light and dark): `--border-strong` #6B7686/#6C7A90, `--success` #067A52/#4ADE9B, `--warning` #8A5A00/#F5B93A, `--surface-inset` #EDF0F3/#161B23, `--surface-hover` #EDF0F3/#202733 — all byte-for-byte (case-insensitive hex). `--input` retargeted to --border-strong.
- **Contrast test computes WCAG for every pair in both themes and passes**: `packages/ui/src/contrast.test.ts` reads tokens from `tokens.css` (not hardcoded), asserts text tokens (foreground, muted-foreground, primary, destructive, success, warning) on all 4 surfaces ≥4.5:1, foreground/background pairs ≥4.5:1, `--border-strong` on all surfaces ≥3:1, decorative `--border` intentionally <3:1 — 64 tests passed.
- **No text under 12 px**: minimum text scale used is `text-xs` (0.75rem = 12px); no `text-2xs`/sub-12px anywhere; design-rule `text-floor` passed; Firefox computed-style test (`tests/e2e/visual.spec.ts`) passed for home, uuid-genny, image-converter, omnibox in light and dark.
- **No icon fonts**: only `@fontsource-variable/schibsted-grotesk` and `@fontsource-variable/geist-mono` (bundled locally) + Lucide icons; no `material-symbols`, `font-awesome`, `fonts.googleapis` (design rule passed).
- **No gradients**: zero `linear/radial/conic-gradient()` or `bg-gradient-` anywhere (design rule passed); none needed as no colour-data tool (colour-converter) is built yet.
- **No shadows other than popover**: only `--shadow-popover` (design rule `one-shadow` passed).
- **No uppercase section tags**: no all-caps labels (design rule `no-all-caps` passed); no literal all-caps section tags found.
- **No version/engine badges**: no `Core v`, `v4.8`, `v2.4.0`, `engine v` etc. (uuid-genny `Version` type is a legitimate tool option, not a badge).
- **No row IDs**: no `#0x1B`-style row IDs; only legitimate form/heading `id` attributes.
- **No Marker-filled status badges**: only a `New` badge using `--highlight` — DESIGN.md permits Marker for selection/"new"; no `ACTIVE RUN`/`Standby`/`Buffer: Idle` status badges.
- **Omnibox**: matching text underlined (`underline decoration-2 underline-offset-2`, `omnibox.tsx:54`); selected row Marker-yellow (`rgb(255,216,77)` = #FFD84D, verified in `omnibox.spec.ts`); dropped-file chip with "Tools that accept this file" group (a11y.spec.ts); footer key hints ("arrow keys or Tab … Enter … Escape", `omnibox.tsx:166-167`).
- **Tool frame**: stages unnumbered (`tool-frame.tsx:10` comment; `ToolStage` renders `{title}` only); header name/Share/Reset; per-row Copy button (`output-row.tsx:61-75`, mono values wrapping, no ellipsis); Copy all/Download via actions; sticky mobile action bar (`max-md:fixed max-md:bottom-0`, `tool-frame.tsx:67`).
- **Corner radius DEC-16**: `--radius-control` 6px, `--radius-panel` 10px, `--radius-pill` 9999px — matches DESIGN.md (6/10/pill), keeping the identity radius hierarchy over Stitch's square corners.

#### Stitch code.html absence (check #3)
`docs/design/stitch/` contains only a `.gitkeep` placeholder — no `code.html` was ever committed to the repo (stitch screens were reviewed locally per `STITCH-REVIEW.md`, not imported). Searched `apps/` and `packages/` for distinctive stitch markers: no Google Fonts/Tailwind CDN hosts, no `material-symbols`/`font-awesome`, no remote images (`lh3.googleusercontent` etc.), no Tailwind CDN script. Nothing from stitch code.html appears in `apps/` or `packages/`. PASS.

#### A1 condition re-check
- **P1-15 (`_redirects` removed)**: VERIFIED FIXED — `apps/web/public/_redirects` deleted; `docs/deployment/CLOUDFLARE-PAGES.md` §3 documents the decision (wrangler rejects the `/* /index.html 200` infinite-loop rule).
- **F-016 (working tree clean)**: VERIFIED FIXED — `git status` clean; working tree matches HEAD.

#### Browser matrix (section 8)
- **Firefox** (temp Playwright config `/tmp/kilo/playwright.a11.config.ts`, repo config untouched): 133 passed, 5 skipped (Chromium-only pixel baselines), 0 failed — PASS.
- **WebKit**: NOT TESTED — `webkit.launch()` fails with "Host system is missing dependencies" (`libavif16`, `libmanette-0.2-0` absent; installing needs interactive `sudo apt-get`, which the agent cannot perform). Matches F-019.
- Safari desktop, iOS Safari, Android Chrome: NOT TESTED (not available in this environment).

#### New findings
- F-020 (Should): Lighthouse performance medians 58–70 on all 22 routes (under 92 flag) under system load; accessibility 100 everywhere; not a confirmed regression (A1 baseline home 96).
- F-021 (Should): `design.spec.ts:204` roadmap test flaky under Chromium parallel load; passes in isolation and on Firefox.

#### Closed findings
- F-015 (Should, _redirects): verified fixed — file deleted (A1.1 condition check).
- F-016 (Info, working tree): verified fixed — `git status` clean (A1.1 condition check).
- F-013 (Should, browser matrix): partly exercised — Firefox passes; WebKit not testable on this host.

**Verdict:** PASS WITH CONDITIONS

**Conditions / next actions:**
1. Re-verify Lighthouse on an idle machine before treating any sub-92 score as real (F-020); do not block Phase 2 batch 2 on load-throttled numbers.
2. Investigate the `design.spec.ts:204` parallel-Chromium flakiness (F-021); re-run the E2E gate serially to confirm green.
3. WebKit remains NOT TESTED — needs the owner to install `libavif16`/`libmanette-0.2-0` (interactive `sudo apt-get`) then run `pnpm e2e --project=webkit` (F-019).
4. F-014 (screen-reader spot check) and F-003 (branding/artwork) remain open, deferred per prior decisions.

Phase 2 batch 2 may proceed from a code, quality and design-alignment perspective, subject to conditions 1–3 above.

---

### Audit A1.2 — 2026-10-24 — Batch 6 gate / broad hardening audit — Independent Auditor
**Scope / commit:** HEAD `d3ac956` (delta from `62bd5e1`: 657 files; glyph-browser Unicode search, boot script inline, many new tools/tests, performance hardening). Read-only audit; nothing fixed, reformatted or pushed.

**Checklists run:** All sections of `docs/audit/CHECKLISTS.md` where testable; plus security attack surface, headers/CSP/bundle composition, network traces, licences/provenance/delphitools overlap, quality sweep, and re-check of F-013–F-022.

#### 1) Gate (quiet host)
- **Load:** 1.57/1.59/2.50 on 16 cores (quiet). `scripts/lighthouse.mjs` guard active.
- **Frozen install:** PASS (`pnpm install --frozen-lockfile`, up to date).
- **Lint:** PASS (243 files checked, 0 errors; 1 info; design rules: all passed).
- **Typecheck:** PASS (all 5 workspaces).
- **Tests + coverage:** PASS (718 tests, 0 failures). Coverage: lines 97.26%, branches 89.8%, statements 96.15%, functions 99.29%. Tool-core: 94.85%–100% across packages; lowest coverage files: `markdown/index.ts` 85.4% (missing ~37 lines), `json/index.ts` 92.3%, `cron/index.ts` 96.4%, `recipe/index.ts` 96.6%, `calc/index.ts` 96.7%, `time/index.ts` 96.8% etc. (see §7).
- **Build:** PASS (Vite; 69 precache entries / 1542 KiB; prerendered 37 routes + 404.html; static first paint in `#root`; inline boot script `sha256-AY0BeqXPBY3Z4IZ0v82BLgRyGWyLU0dz6XOiIkg8JO0=`).
- **Budgets:** PASS (`check-build-budget.mjs`: shell JS 142.0 kB gzip ≤200 kB; precache 107 files / 1725.9 kB ≤8 MiB; 558 build files ≤20000; no growth warning).
- **E2E Chromium:** PASS (242 passed, 0 failed).
- **E2E Firefox** (temp config outside repo): PASS (237 passed, 5 skipped = Chromium-only pixel baselines, 0 failed).
- **WebKit:** NOT TESTED (cannot launch on host — missing system deps; matches F-019).
- **Axe (light + dark):** PASS (80 passed, 0 serious/critical across all routes + omnibox in both themes).
- **Lighthouse (3 runs/route, median/min/max):** ALL routes ≥92, medians 98–100; a11y 100 everywhere. Home 99/99/99, tool-qr-genny 98/98/98 (lowest), most 100. Guard did not trigger. **PASS** (quiet host).

#### 2) Security attack surface (manual, not test-reading)
- **regex-tester:** UI enforces 1500 ms deadline in `apps/web/src/tools/regex-tester/index.tsx`, spawns one worker per test, terminates on timeout/error; worker uses `runRegex` in `tool-core` only. Catastrophic patterns (`^(a+)+$` vs 40 'a'+ 'b', `(x+x+)+y`, 1 MB input) — worker killed by `worker.terminate()` on deadline, page responsive, no `eval`/`new Function`. **PASS** (architecture verified).
- **markdown-writer:** Parser (`packages/tool-core/src/markdown/index.ts`) uses markdown-it as tokenizer only (HTML off, linkify off), builds own tree. `safeHref` allows only `http:`, `https:`, `mailto:`; relative paths allowed as-is (no scheme) — blocks `javascript:`, `data:text/html`, etc. Images only `data:image/(png|jpeg|gif|webp);base64,...` allowed; others become alt text and warned. All HTML output escaped via `escapeHtml`. UI renders tree as React (no `dangerouslySetInnerHTML`), exports via `renderMarkdownHtml` with escaped text only. 25+ XSS payload classes — none can execute (tree-based, scheme allowlist, data-uri image allowlist). No network requests from parser/render. **PASS**.
- **font-explorer:** Uses `fontkit` in worker (MIT, recorded). Handles malformed/truncated/oversized files; errors surfaced cleanly; main thread responsive; no persistence/upload. **PASS** (architecture + recorded decision).
- **sci-calc:** Custom recursive-descent parser/evaluator in `tool-core/src/calc` — no `eval`/`new Function`. Limits: MAX_LENGTH 1000, MAX_DEPTH 100, MAX_FACTORIAL 170, max digits 15. Fuzz (deep nesting, huge exponents, long digit strings) — parser enforces depth/length, evaluator uses number arithmetic only, no uncaught exceptions observed in tests (581 tool-core tests). **PASS**.
- **graph-calc:** Uses same compiler, hard cap on evaluations per frame (`MAX_EVALUATIONS` 500), stops plotting with message when capped, runs in main thread with budget. No unbounded work/hang. **PASS**.
- **glyph-browser:** Search uses `@unicode/unicode-16.0.0` build-time data (MIT, recorded), in-memory Map/index. Pathological queries — bounded index, no regex DoS on huge untrusted patterns, cancellation straightforward; no unbounded work. **PASS**.

#### 3) Static checks (dangerous APIs / headers / bundle)
- **`eval`, `new Function`, `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, `insertAdjacentHTML`:** No occurrences in `apps/web/src` or `packages/` (excluding tests/node_modules). `new Parser(...).parse()` is a constructor call, not `new Function`. `postMessage` — none in app/packages source. `localStorage` only in `packages/ui/src/theme.ts` for theme persistence (approved preference storage). **PASS**.
- **Headers/CSP:** `apps/web/public/_headers` / `apps/web/dist/_headers` set strict CSP `script-src 'self' 'sha256-AY0BeqXPBY3Z4IZ0v82BLgRyGWyLU0dz6XOiIkg8JO0='; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'`. Every built HTML page has exactly one inline boot script matching the hash; `prerender.mjs` enforces this. **No `unsafe-inline`/`unsafe-eval` in `script-src`.** Third-party origins only in `connect-src` allow-list for declared CDN fetches (cdn.jsdelivr.net, huggingface.co). **PASS**.
- **Bundle composition:** `node_modules`/dev deps (`@axe-core`, `playwright`, `vitest`) not found in `dist/assets/*.js`. No `tool-core`/`tools-registry` markers in shell chunk `assets/index-BZGlXN4L.js`. Tool libraries (`markdown-it`, `fontkit`) appear only in their lazy tool chunks (build budget check fails if they reach shell). **PASS**.
- **Determinism:** build completed cleanly; hashes stable per build. **PASS**.

#### 4) Network / licences / provenance
- **Network traces:** E2E and app design use same-origin only; network tests expect zero third-party requests. CSP `connect-src` restricts to allow-list; font-explorer/markdown-writer/glyph-browser fetch nothing at runtime (fontkit in worker, markdown parsed locally, glyph data local). **PASS** (architecture verified).
- **Production deps:** No AGPL/GPL found via license scan; recorded decisions in `docs/legal/ATTRIBUTION.md` cover `markdown-it`/`fontkit`/`@unicode/unicode-16.0.0` (all MIT) with transitive licences listed (no GPL/AGPL/SSPL/share-alike). Dev deps `@axe-core/playwright`, `axe-core` MPL-2.0 dev-only (recorded). `lighthouse`/`chrome-launcher` Apache-2.0 dev-only. **PASS**.
- **Committed data/fixtures:** `tests/fixtures/schibsted-grotesk-latin-wght-normal.woff2` SIL OFL 1.1 with `OFL-Schibsted-Grotesk.txt`; used only for font-explorer tests, not saved/uploaded. Unicode data via `@unicode/unicode-16.0.0` MIT (UCD notice carried in glyph-browser footer per ATTRIBUTION). No other curated datasets of unclear provenance identified. **PASS**.
- **Delphitools overlap:** Only references in `features.md`, `README.md`, docs, and `scripts/check-description-overlap.mjs` (by design). `grep` across `apps/`, `packages/` for `delphi.tools`/`1612elphi` returns nothing (only in reference docs). No distinctive strings, identical filenames/hashes, or 4+ consecutive shared words detected in Omnitool source. **PASS**.

#### 5) Quality
- **Lowest coverage tool-core:** `markdown/index.ts` 85.4% (largest gap), `json/index.ts` 92.3%, `files/accepts.ts` 94.3%, `tailwind-cheatsheet/index.ts` 94.7%, `qr/index.ts` 95.0%, etc. — all above 85%, overall 96%+.
- **Sampled tools:** All have `ToolFrame` with `onReset`, `ToolStage`, error states (role="alert"), outputs via `OutputActions`/`OutputRow`. No TODOs without owners in sampled files; dead code not obvious.
- **Prerendering/NFR-013:** 37 routes prerendered with title/description; Lighthouse medians all ≥92 on quiet host. **PASS**.

#### 6) Open findings re-check
- **F-002 (Must, MuPDF AGPL):** Open — plan avoids MuPDF (pdf-lib + pdfjs-dist). No evidence of use. **still open** (no change needed; not blocking current batch).
- **F-003 (Must, artwork/copy):** Open — no original artwork/copy reused; own identity work deferred to Phase 9 (DEC-11). **still open**.
- **F-006 (Should, CC/GPL runtime data):** Open — needs per-tool decision for LUTs/EFF/pandoc.wasm if added. Not present now. **still open**.
- **F-007 (Info, scope):** Open — acknowledged. **still open**.
- **F-013 (Should, browser matrix):** Firefox exercised at A1.1/A1.2 — 237 passed, 0 failed on Firefox. WebKit NOT TESTED (host deps). Safari/iOS/Android NOT TESTED. **partly addressed, still open for WebKit/mobile**.
- **F-014 (Should, screen reader):** Not tested in this environment. **still open**.
- **F-017 (Should, Firefox/WebKit):** Firefox passing; WebKit blocked locally (CI job proposed but not run). **partly closed, WebKit remains open**.
- **F-018 (Should, SR + Firefox/WebKit for batch 2):** **still open**.
- **F-019 (Should, WebKit deps):** Confirmed cannot launch locally; CI job would provision deps. **still open (needs owner/CI)**.
- **F-020 (Should, Lighthouse):** On quiet host (load 1.57–2.50/16), all medians 98–100, a11y 100 — **verified fixed under clean conditions** (guard active; previously throttled on busy host).
- **F-021 (Should, design.spec.ts:204 flakiness):** Chromium 242 passed, Firefox 237 passed, 0 failures in full suite — **verified fixed**.
- **F-022 (Should, boot script CLS):** Inline boot script with hash in CSP, prerender enforces exactly one inline script, tests expect ≤1 px shift — **verified fixed / enforced by build**.

#### New findings
- **F-023 (Info):** `markdown/index.ts` has lowest tool-core coverage at 85.4% (~37 uncovered lines). Not a security issue given tree-based sanitization and extensive tests elsewhere; consider adding tests for edge cases. **Info**.
- **F-024 (Info):** `script-src` uses a single hardcoded hash for the inline boot script; `prerender.mjs` fails the build if hash missing/wrong — good, but any boot script change requires rebuild of all HTML. **Info** (design choice, acceptable).

**Verdict:** PASS WITH CONDITIONS

**Conditions / next actions:**
1. **F-002, F-003, F-006, F-007, F-014, F-018** remain open as documented (some are human decisions/phases or need manual SR testing). None are Must-blockers for Batch 6 start given current scope, but F-002/F-003 are Must per original classification — track explicitly.
2. **F-013/F-017/F-019:** WebKit still not testable locally; rely on CI `webkit` job with `--with-deps` or install `libavif16`/`libmanette-0.2-0` interactively. Safari/iOS/Android NOT TESTED.
3. Consider raising `markdown/index.ts` coverage or documenting the gap (F-023).
4. No dangerous DOM injection patterns, no eval/Function, strict CSP with hashed inline script only, no AGPL/GPL deps, no delphitools source copied — all verified.

Batch 6 may start from a security, quality, licence and performance perspective subject to the above.

---

### Audit A1.3 — 2026-11-01 — Batch 7B gate (`text-editor`, `doc-converter`) — agent, same host as the implementing session
**Scope / commit:** HEAD `045b70f` ("docs(review): record Batch 7B, its checks and the two host-bound failures"), 5 commits after the A1.2 scope at `d3ac956`. Working tree carries one modification, `docs/design/ART-PROMPTS.md`, left untouched per DEC-51/DEC-57/DEC-82. Read-only audit: nothing fixed, reformatted, re-baselined or pushed; `features.md` and `todo.md` were not edited.

**Independence — read this first.** This audit was run by the same agent that built Batch 7B, on the same machine, in a session immediately after. It re-ran every gate against the committed tree and checked the claims by reading the code, but it is **not** an independent audit: it cannot self-approve the batch, and it closes no finding it did not re-verify from evidence. The verdict below is a recommendation to the owner, not a sign-off.

**Checklists run:** all eight sections of `docs/audit/CHECKLISTS.md` where testable, plus a re-check of every open finding F-002–F-028.

#### 1) Gate commands (re-run on this tree)
- **Host:** 16 cores, 1-minute load **2.99** at the start of the E2E gate, 3.55 at the start of the Lighthouse subset (limit 4.00); the host was quiet for every measurement quoted below.
- `pnpm install --frozen-lockfile`: **PASS**, exit 0.
- `pnpm lint` (`biome check` + design rules + URL schemes): **PASS**, 287 files, 0 errors, 0 warnings.
- `pnpm typecheck`: **PASS**, all five workspaces.
- `pnpm test:coverage`: **PASS**, **1,109 tests in 70 files**; **96.32% statements / 90.69% branches / 98.82% functions / 97.58% lines** (thresholds 90/90/90/90). Branch margin +0.69.
- `pnpm build`: **PASS**, exit 0; **43 routes + `404.html`**, one inline boot script on all 44 pages.
- `node scripts/check-build-budget.mjs`: **PASS** — shell **142.7 kB gzip** (budget 200), precache **126 files / 2502.6 kB** (budget 8192), **585** build files (limit 20,000), no file near 20 MiB; growth warning quiet at +0.2 kB since the recorded 142.5.
- **E2E Chromium:** **290 passed, 0 failed** (1.3 min) at the default 8 workers. **E2E Firefox:** **284 passed, 6 skipped, 0 failed** (2.2 min); the 6 skips are the five Chromium-only pixel baselines and the Firefox service-worker offline-emulation gap recorded in Batch 5. **WebKit: NOT TESTED** (F-019).
- **axe:** inside both runs — 43 routes × 2 themes plus the omnibox in two states × 2 themes, **0 serious or critical**. The route list is no longer hand-kept: `a11y.spec.ts` derives it from `TOOL_LOADERS` and fails if the two disagree, which closes the coverage gap Session 024 found (four Batch 6 tools had never been scanned); the check now covers all **39** built tools.
- **Lighthouse (mobile, 3 runs/route, medians; subset reports, not the batch gate):**

| Route | Perf med (runs) | A11y | LCP med | TBT med | CLS | NFR-013 |
|---|---|---|---|---|---|---|
| `/tools/text-editor/` | **99** (98/100/99) | 100 | **1,522 ms** | 111 ms | 0.000 | pass |
| `/tools/doc-converter/` | **99** (99/99/99) | 100 | **1,667 ms** | 100 ms | 0.000 | pass |

  This is the first NFR-013 figure either route has had. P2-66's "NOT TESTED" is answered by measurement, and its "ran past 600 s with no report" hangs did **not** recur: both subset runs finished inside their timeout and wrote reports. **Home was not re-measured** (P1-27 is a per-batch item): `/` remains at its Session 022 median of **2,116 ms** from the 41-route sweep, and that figure is not claimed as today's.

#### 2) Privacy and offline (NFR-001, FR-007) — PASS
- `tests/e2e/offline.spec.ts` and `tests/e2e/network.spec.ts` are inside the 290 Chromium passes: shell and tools work with the context offline after first load, and a trace of normal use makes zero third-party requests.
- The two new tools add no origin: `doc-converter`'s DOCX path runs in a Comlink worker from the same bundle and `text-editor` stores drafts only in IndexedDB (`apps/web/src/tools/text-editor/draft.ts`, database `omnitool-text-editor`), on request, with Restore and Clear.
- CSP `connect-src` still lists only the declared CDN hosts; no new one was added.

#### 3) Security (NFR-007) — PASS, with F-025
- **CSP and inline script, verified independently of the build script:** for all **44** built pages, each was parsed, every `<script>` without `src` hashed with SHA-256, and the result compared with the single hash in `dist/_headers` (`sha256-AY0BeqXPBY3Z4IZ0v82BLgRyGWyLU0dz6XOiIkg8JO0=`). **0 pages failed**, no page has more than one inline script, and `script-src` contains no `'unsafe-inline'` or `'unsafe-eval'`.
- **Dangerous APIs:** `scripts/check-url-schemes.mjs` runs in `pnpm lint` and refuses `eval`, `new Function`, `dangerouslySetInnerHTML`, `document.write` and `insertAdjacentHTML`; it passed. No occurrence in `apps/web/src` or `packages/*/src` outside that checker.
- **New attack surface read, not assumed:** `packages/tool-core/src/zip/index.ts` reads only the end-of-central-directory record and the central directory, never inflates, refuses the ZIP64 sentinels (`0xffff`/`0xffffffff`), and applies 20 MB in / 1,000 entries / 100 MB total / 50 MB per entry / 100:1 **before** `mammoth` is handed the buffer. A zero-compressed entry is refused by the ratio rule rather than special-cased. The DOCX HTML then goes through the same sanitiser as a paste, and `images.imgElement` returns an empty `src` so no image is decoded into a data URI.
- **The sanitiser now decodes attribute entities before the scheme check** (`sanitize/index.ts`), with `safeHref` as the second line — `href="&#106;avascript:..."` is refused rather than kept as a relative address. The 40-payload corpus is shared by the sanitiser's tests and the editor's paste path (`sanitize/corpus.ts`).
- `pnpm audit`: **10 advisories, 4 low and 6 moderate, no high or critical** — a regression against A1.2's zero, recorded as **F-025**. None of the flagged packages is in the shipped bundle; `seroval` is a runtime dependency of TanStack Router, whose vulnerable paths need attacker-controlled serialized data that this app never receives.
- No secrets, tokens or personal data in the tree or in fixtures; the DOCX test file is built in the test (`tests/e2e/docx-fixture.ts`).

#### 4) Accessibility (NFR-004) — PASS, screen reader still open
- axe: 0 serious/critical on every route and the omnibox, both themes, both engines.
- Keyboard and focus: the editor is a `role="textbox"` ProseMirror surface with a visible focus ring; the Batch 7 guards drive it by keyboard. Focus-visible and reduced-motion rules are unchanged.
- Touch targets: unchanged coarse-pointer rules at 44 px.
- **Screen-reader spot check: NOT DONE** (F-014/F-018) — still needs a human with NVDA or VoiceOver.

#### 5) Performance (NFR-002/003) — PASS
- Shell **142.7 kB gzip** against 200; every tool is a lazy chunk and `check:budgets` fails if a tool library reaches the shell graph — the ProseMirror packages sit only in the editor chunk, `mammoth`/`jszip` only in the converter worker.
- TBT 100–111 ms on the two measured routes, well under the 200 ms long-task ceiling; CLS 0.000 on both.
- Heavy-file behaviour: the 1 MB paste and 1 MB JSON guards ran inside the heavy projects, alone, and passed; the DOCX bomb classes are unit tests over `inspectZip`, not E2E.

#### 6) Licence and provenance (NFR-009) — PASS
- `pip`-equivalent scan of `node_modules/.pnpm`: **0 packages declaring AGPL or GPL**. ProseMirror (8 packages, MIT) and `mammoth` (BSD-2-Clause) are recorded in `ATTRIBUTION.md` with their decisions (DEC-80, DEC-85); `jszip`'s MIT option is the one taken. The CMU Pronouncing Dictionary (BSD-2) keeps its verbatim licence in `data/pronunciation/LICENSE`.
- `pandoc-wasm` (GPL-2.0-or-later) is still **not** installed and the converter does not write DOCX; LaTeX and EPUB output are out of scope and the UI says so.
- No artwork, copy, dataset or source from the original: the only references to `delphi.tools`/`1612elphi` are in reference documents; `scripts/check-description-overlap.mjs` reports 0 shared four-word runs.

#### 7) Code quality (NFR-008) — PASS
- Green lint, typecheck, tests; coverage above all four thresholds; **0** TODO/FIXME/XXX in source.
- Module contract holds for both new tools: loader entry, registry row, lazy route, `ToolFrame` with Reset, `role="alert"` errors, output actions, and Playwright guards (`tests/e2e/batch7.spec.ts`, 11 guards across the two tools).
- `markdown/index.ts` remains the lowest-covered file (77.94% branches, F-023) — documented, not closed.

#### 8) Documentation sync — PASS, with F-028
- Spot-checked five rows against the code: `PF-09` (workbox precache, offline test passes), `PF-20` (`FileIntake`/`downloadBlob` in use by both new tools), `text-editor`, `doc-converter` and `PF-10` (43 prerendered routes — the build agrees).
- `todo.md`: P2-61, P2-62, P2-63 and P2-68 tick with their evidence; **P2-66 should be ticked now that both figures exist**, and P2-69, P2-64 and P2-67 correctly remain open (owner's call).
- `REVIEW-LOG.md` has an entry for Session 025 covering every commit in scope. **F-028** records the stale "NFR-013 NOT TESTED" text in the two `features.md` rows.

#### 9) Open findings re-check
| Finding | State after this audit |
|---|---|
| F-002 (Must, MuPDF AGPL) | **Open** — no PDF code exists; the plan still uses pdf-lib/pdfjs-dist, which needs its own recorded decision. |
| F-003 (Must, artwork/copy) | **Open** — no art generated; wordmark placeholder stands; P9-01 is the owner's. |
| F-006, F-007 | **Open** — no new CC/GPL runtime data this batch; scope note unchanged. |
| F-013, F-017 | **Partly** — Firefox re-verified clean (284/0); WebKit still cannot launch here. |
| F-014, F-018 | **Open** — no screen-reader spot check. |
| F-019 | **Open** — the CI `webkit` job still has never run (DEC-71/DEC-56). |
| F-020 | **Verified fixed** — quiet-host subset runs, 98–100 performance, a11y 100, guard exit 0. |
| F-021, F-022 | **Verified fixed / enforced** — 290 Chromium passes; boot hash present and correct on all 44 pages. |
| F-023 | **Open (Info)** — `markdown/index.ts` coverage gap documented in `IMPLEMENTATION.md` §9. |
| F-024 | **Open (Info)** — single hardcoded boot hash, enforced by `prerender.mjs`. |
| **F-025** | **New** — 10 advisories, none shipped. |
| **F-026** | **New** — E2E worker-count contention, not reproduced at this audit. |
| **F-027** | **New** — the 1 MB guard's 120 ms margin in the coverage gate. |
| **F-028** | **New (Info)** — stale NFR-013 text in two `features.md` rows. |

#### Limits of this audit
- Not independent: same agent, same host, immediately after the build. See the note at the top.
- **WebKit, Safari desktop, iOS Safari and Android Chrome: NOT TESTED.** The only route is the CI job, and nothing has been pushed.
- **Home LCP: NOT TESTED today** (last figure 2,116 ms at Session 022). P1-27 stays open as the recurring per-batch item.
- No real-phone check of a 1 MB paste, a DOCX or the 0.9 MB dictionary download; no screen-reader pass.
- The landmark ZIP *bomb* files (entry count, total size, per-entry size, ratio) are covered by unit tests over `inspectZip`; the E2E DOCX fixture covers a well-formed file and a non-ZIP only.
- Lighthouse numbers come from subset runs (`--only`), which are deliberately **not** the batch gate and do not overwrite `reports/lighthouse/summary.md`.

**Verdict: PASS WITH CONDITIONS.** No new Must finding; nothing in the two new tools breaks a checklist. The conditions are the owner's two open batch gates and the three findings above.

**Conditions / next actions:**
1. **Owner:** review P2-64 (`text-editor`) and P2-67 (`doc-converter`, including the `accepts`/`produces` narrowing — LaTeX, EPUB and PDF output were promised by the seed row and are not built). These are human decisions and this audit cannot make them.
2. **Owner:** answer P2-69 (E2E worker policy on a busy host) and P2-68/F-027 (the wall-clock guard in the coverage gate).
3. **Agent, next session:** tick P2-66 and correct the two `features.md` NFR-013 notes to 1,522 ms and 1,667 ms (F-028); nothing else in the ledger was found wrong.
4. **Agent, next session:** address F-025 — an `overrides` bump for `minimatch`, `glob` and `fast-uri` where upstream allows it, and a written note on `seroval`; re-run `pnpm audit` and record the count either way.
5. **Carried forward unchanged:** F-002, F-003, F-006, F-007, F-013, F-014, F-017, F-018, F-019, F-023, F-024, and the unanswered CI run (DEC-71).

**What this audit does not do:** it does not approve Batch 7B, does not close any pre-existing finding, and does not change the thresholds, the budgets, the worker count or any test. The batch gate remains the owner's.
