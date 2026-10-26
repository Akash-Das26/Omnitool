# Implementation design

Living document. Update after each phase (append to section 9).

## 1. Architecture
Static SPA. `apps/web` is the shell and tool UIs. `packages/tool-core` holds framework-free logic. `packages/tools-registry` is the single source of tool metadata. `packages/ui` wraps shadcn components and design tokens.

## 2. Registry
Typed `Tool` objects: `id`, `name`, `description` (human-written), `category`, `categoryName`, `icon` (Lucide name, derived from the category), `href` (derived canonical route), `accepts: MimePattern[]`, `produces: MimePattern[]`, `flags` (new, beta, wide, atlas, carryColour, highlight), `tier`, `phase`. Seed: `packages/tools-registry/data/registry.seed.json`. Derived at build time: routes, nav, home index, omnibox index, sitemap, prerender list.

## 3. Routing and code splitting
TanStack Router (SPA). Routes: `/` home, `/tools/$toolId` (lazy, via an import map generated from the registry), `/workflows`, `/experiments`, `/editor` (image editor), `/pdf-editor`, `/privacy`, not-found. `defaultPreload: 'intent'` preloads a tool chunk on hover/focus. Shared search params (`color`, handoff run id) are validated with Valibot in `validateSearch`; tool-specific params are parsed by a schema the tool exports. URLs carry configuration only, never file data. Each tool is wrapped in an error boundary and Suspense with a skeleton. Routing is accessed through `lib/navigation` so it can be swapped (ADR 0002).

## 4. File handling
Single `FileIntake` component: picker, drag and drop, paste. iOS needs explicit extensions in `accept` as well as MIME types. Results exposed as `Blob`; filenames derived from input plus suffix. Large files processed from `Blob` streams where possible, never string-encoded.

## 5. Workers and heavy work
All T2/T3 processing in module Web Workers exposed through Comlink (ADR 0004). Progress via a `Comlink.proxy` callback; results and errors via the returned promise; **cancel terminates the worker** (one worker per job). Transferable objects for buffers. Memory guard: reject or downscale inputs above a per-tool pixel/byte budget with a clear message.

## 6. WASM and ML assets
Lazy-load on first use; show size and a Cancel; runtime-cache via the service worker (CacheFirst, versioned keys, expiry). Never bundle files over ~20 MiB (Cloudflare Pages limit is 25 MiB per file); host models and large WASM externally (ADR 0003). CDN allow-list (implemented, provisional): jsDelivr, Hugging Face (`huggingface.co`, `*.hf.co`); WASM paths are runtime-cached, and unpkg is not allowed. Each fetch is user-visible. The CSP in `apps/web/public/_headers` carries the same list. Fallback: tool shows "needs a one-time download" state and works offline afterwards.

## 7. Handoff and workflows
MIME vocabulary shared by `accepts`/`produces` (plus a `colour` pseudo-type). Handoff stores the `Blob` in IndexedDB (`flow` DB, keyed by run and step), navigates to the next tool, which consumes and deletes it. Workflow definition is encoded in the URL (ids only, no file data). Validate compatibility against registry at build and at runtime.

## 8. Offline, theming, security
- `vite-plugin-pwa`: precache shell and all JS/CSS tool chunks (each < 2 MiB, the plugin's default precache limit; total budget checked in CI); runtime cache for WASM/models; update prompt on new version. COOP/COEP headers off by default. `_headers` holds CSP and cache rules (max 100 rules).
- Boot script: `apps/web/boot/boot.js` is the only inline script in the build and sits in `<head>` before the stylesheets. It resolves the theme (stored choice, else `prefers-color-scheme`), sets the `.dark` class and `color-scheme` on `<html>`, and sets `data-rail="collapsed|expanded"` from the stored rail preference. All storage access is inside `try/catch`, and the defaults are light and expanded. It replaced the external `/theme.js`, which was a render-blocking request (784 B, 305 ms in Lighthouse) that could not carry the rail preference because that was read after hydration.
- Single source of truth: `apps/web/src/lib/preferences.ts` holds the storage keys, the `data-rail` attribute and its values, and `initialRailState()`; the UI and theme stores are seeded from what the script left on `<html>`, never from storage, so hydration cannot move anything that was painted. `preferences.test.ts` reads `boot.js` and fails if its keys or values drift from those constants. CSS (`html[data-rail="collapsed"] [data-slot="rail"]`) makes the first-paint rail width match the hydrated one.
- CSP hash: `scripts/prerender.mjs` finds the single inline script in every written page (22 routes plus `404.html`), hashes its exact text with SHA-256, and substitutes the digest into the `'sha256-BOOT_SCRIPT_SHA256'` marker in `_headers`. The build fails if a page has zero or two inline scripts, if the pages disagree, if `_headers` has no marker or no `script-src`, or if `script-src` ever contains `'unsafe-inline'`/`'unsafe-eval'`. `tests/e2e/boot-script.spec.ts` re-computes the hash from the built HTML and fails if it is not in `script-src`; it also loads every route type with dark theme and a collapsed rail saved and asserts zero `securitypolicyviolation` events.
- Security: strict CSP (`script-src 'self'` plus that one hash), no `eval`, sandboxed parsing in workers, regex tester runs in a worker with a timeout, Request Builder is the only user-initiated outbound tool and says so.

## 9. Phase notes
Append one section per completed phase: what was built, deviations from plan, measured budgets (bundle size, Lighthouse), known gaps.

### P0
Scaffold, SRS, design brief, tooling, legal, prompts, features ledger. No application code yet.

### P1 (2026-10-17)
Built pnpm workspace, React 19/Vite 8 SPA, Tailwind v4 tokens, shadcn primitives, TanStack Router dynamic tool route, registry + Valibot search params, Comlink worker harness, FileIntake/download helpers, home index and omnibox, Cloudflare `_headers`/`_redirects`, postbuild per-route HTML, and three sample tools (`uuid-genny`, `qr-genny`, `image-converter` stub).

**Measured budgets (local production build, 2026-10-17):**
- Shell JS: **147.2 kB gzip** (entry + static imports; budget 200 kB).
- Precache candidates: **30 files / 781.7 kB** (budget 8 MiB); largest well under the 2 MiB per-file limit.
- Build files: **35** (limit 20,000); no file over 20 MiB.
- Lighthouse mobile (`pnpm lighthouse`, 2026-10-18): home **96** performance, tool pages **92–95**, **100** accessibility, best practices and SEO on all six audited routes.
- axe: **0 serious/critical** on home, privacy, about and the three tools (light and dark).
- Unit tests: **69 passing**; tool-core/registry line coverage **98.6%**.

**Deviations:** Stitch exports were absent, so `DESIGN.md` seed tokens were used. `qrcode` (MIT) is used for the QR sample instead of qr-code-styling. The image converter simulates the first-use codec download and uses native canvas encoding. Category labels for the two original-branded categories were replaced with neutral ones. `produces` metadata and some missing `accepts` were added to the seed provisionally and need review.

Lighthouse runs from `scripts/lighthouse.mjs` (direct `lighthouse` + `chrome-launcher`, serving `dist` with Brotli/gzip) rather than `@lhci/cli`, whose pinned transitive dependencies carried four high advisories with no upstream fix. A `robots.txt` was added so crawlers are not served the SPA shell. Coarse-pointer rules in `apps/web/src/styles/app.css` raise touch targets to 44 px.

- No OG image and no PWA install icons. The app works offline after first load but is not installable until the icons exist.
- No canonical URLs or absolute OG tags: no production domain has been chosen (DEC-10).
- The service-worker update prompt and Cloudflare Pages serving have not been tested on a real deployment.
- Real WASM codecs and JXL are deferred to P4.

**Known gaps:** 94 tools unbuilt at the end of P1 (eight more arrive in P2 Batch 1); the remaining tool descriptions are still blank; brand/OG assets deferred to Phase 9 under DEC-11.

### P2 — Batch 1 (2026-10-18)
Eight text and dev tools: `json-formatter`, `jwt-decoder`, `encoder`, `base-converter`, `password-genny`, `word-counter`, `px-to-rem`, `text-diff`. Logic sits in `packages/tool-core` (`json`, `jwt`, `encoder`, `base`, `password`, `words`, `px`, `diff`) with tests beside it; the UIs are thin components under `apps/web/src/tools/<id>` registered in `lib/tool-modules`. No new dependencies: Web Crypto, `Intl.Segmenter`, `BigInt`, `TextEncoder` and a hand-written Myers diff cover everything. Descriptions were drafted by the agent for owner review (DEC-12).

**Measured budgets (local production build, 2026-10-18):**
- Shell JS: **150.8 kB gzip** (budget 200 kB), up 3.6 kB from P1.
- Precache: **53 files / 873.2 kB** (budget 8 MiB), up 23 files / 91.5 kB from P1.
- Build files: **58** (limit 20,000); no file over 20 MiB.
- Lighthouse mobile: home **96** performance, **100** accessibility, best practices and SEO (the six audited routes; tool pages scored 91-93).
- Unit tests: **182 passing in 19 files**; coverage **96.7% statements / 90.2% branches** (thresholds 90/85).
- E2E: **34 passing**, including the 1 MB JSON worker path, offline formatting and 14 axe routes.

**Known gaps:** the remaining P2 tools are unbuilt; the diff caps each side at 20,000 units and 2,000 edits; JSON above 1 MB reports four progress stages rather than byte-level progress; only Chromium is exercised.

### P2 — design alignment (2026-10-18)
The Phase 1 shell was aligned with the accepted Stitch layout reference (`docs/design/STITCH-REVIEW.md`, `STITCH-REVIEW-2.md`). Tokens gained `--border-strong`, `--success`, `--warning`, `--surface-inset` and `--surface-hover`; `packages/ui/src/contrast.test.ts` parses `tokens.css` and asserts every text pair at 4.5:1 and every control border at 3:1 in both themes, and that the decorative hairline stays below 3:1. `scripts/check-design-rules.mjs` (part of `pnpm lint`) enforces the 12 px floor, no all-caps labels, one popover shadow, no gradients, no icon fonts and no "A · B · C" meta strings, and `tests/e2e/visual.spec.ts` measures the rendered 12 px floor in both themes. The omnibox gained underlined matches, the Marker selected row, a dropped-file chip and a "Tools that accept this file" group; the tool frame has unnumbered stages, per-value copy rows and one action bar that is sticky on mobile; the image converter's first-use codec download, cancel and cached states now come from worker progress phases plus a session flag.

**Measured budgets (local production build, 2026-10-18):**
- Shell JS: **151.3 kB gzip** (budget 200 kB), up 0.5 kB on P2 Batch 1.
- Precache: **53 files / 881.9 kB** (budget 8 MiB), up 8.7 kB.
- Build files: **58**; no file over 20 MiB.
- Lighthouse mobile: home **96** performance, **100** accessibility, best practices and SEO; tool pages 91–93 performance.
- Unit tests: **246 passing in 20 files**; coverage **96.73% statements / 90.2% branches** (thresholds unchanged).
- E2E: **65 passing**, including axe in light and dark on every route and five dark screenshot baselines.

**Deviations:** the tool stages stay a single column (DESIGN.md wording) rather than the two-column split in the Stitch screens; "Send to" is hidden until handoff exists (P7) rather than shown disabled; Reset is wired on the three sample tools only. The image converter's codec download is still simulated, with the size labelled as a sample.

**Known gaps:** the eight Batch 1 tools keep the shared frame but have no Reset; per-value copy rows are used where the value is text (QR rows are downloads plus SVG markup copy); the screenshot baselines are Chromium on Linux only.

### P2 — Batch 2 and Batch 3 (not appended at the time)

Recorded as a documentation gap: the figures for Batch 2 (Session 011) and Batch 3 (Session 018) were logged in `docs/review/REVIEW-LOG.md` but never copied into this section. Batch 3's numbers, from its session entry: 28 routes, shell 161.7 kB gzip, precache 83 files / 1149.5 kB, 432 unit tests, E2E 194 (Chromium) and 189 (Firefox, 5 skipped).

### P2 — Batch 4 (2026-10-22)

Four tools — `sci-calc`, `tailwind-cheatsheet`, `stupid-units`, `recipe-table` — plus the Experiments page at `/experiments` (PF-19). No new dependency: the calculator owns its tokenizer and recursive-descent parser (no `eval`, no `Function`); the cheatsheet stores CSS emitted by the repository's pinned Tailwind 4.3.3 compiler through `scripts/generate-tailwind-cheatsheet.mjs`, with a test that runs it with `--check`; both data tables live in `tool-core` with their sources named in code. Logic sits in `packages/tool-core/src/{calc,tailwind-cheatsheet,stupid-units,recipe}` with tests beside it; the UIs are thin components on the shared Tool Frame.

**Measured budgets (local production build, 2026-10-22):**
- Shell JS: **180.9 kB gzip** (budget 200 kB), up 19.2 kB from Batch 3's 161.7 kB. The new tool data did not leak into the shell — the stupid-units table and the cheatsheet entries are in their own chunks (checked by searching the entry for marker strings) — so the growth is shared runtime and UI code. 19.1 kB of headroom left.
- Precache: **92 files / 1395.6 kB** (budget 8192 kB).
- Build files: **96** (limit 20,000); **33 route pages** (home, about, privacy, experiments and 29 tools) plus `404.html`.
- Unit tests: **490 passing in 39 files**; coverage **96.92% statements / 90.41% branches** (thresholds 90/85).
- E2E: Chromium **217 passed**; Firefox **212 passed, 5 skipped** (the Chromium-only pixel baselines); WebKit **NOT TESTED** (F-019, missing system libraries). axe in both themes on 34 routes, including `/experiments`.
- Lighthouse mobile, 3 runs per route over 33 routes (`scripts/lighthouse.mjs`, exit 0): 28 routes at **1,510–1,665 ms** median LCP; `/about/` and `/experiments/` 1,361 ms; home **2,459 ms**; `/privacy/` 2,458 ms; `/tools/large-type/` **2,611 ms**, the only route over NFR-013. Performance 97–100, accessibility/best practices/SEO 100 on every route. Batch 4's four: `recipe-table` 1,511, `tailwind-cheatsheet` 1,511, `stupid-units` 1,512, `sci-calc` 1,662 ms. Minimum LCP of the three runs: 1,510–1,665 ms on the 28 fast tool routes, `/about/` 1,361, `/experiments/` 1,360, home 2,418, `/privacy/` 2,415, `/tools/large-type/` 2,564 — the route misses on its best run too, not only its median.
- `scripts/lighthouse.mjs` now derives the page list from the build instead of naming pages: `/experiments/` had been missing from the hand-written list and would have shipped unmeasured.

**Deviations:** `stupid-units` ships 25 units, not 30; units whose official size could not be confirmed were dropped (no banana, no bus, no Vatican City). `recipe-table`'s density table has 11 ingredients rather than about 15, because only the USDA FoodData Central household measures that could be read directly were kept. `sci-calc` supports explicit multiplication only (DEC-39).

**Known gaps:** `/tools/large-type/` is over NFR-013 by about 110 ms in two sweeps (DEC-41 records the options); the four new descriptions are drafts pending approval (DEC-35); WebKit is still untested locally.

### P2 — Batch 5 (2026-10-23)

Shell attribution first, then `large-type`, then four tools: `graph-calc`, `markdown-writer`, `glyph-browser`, `font-explorer`. Three libraries were approved by the owner and pinned exactly: `markdown-it` 15.0.3 (MIT), `fontkit` 2.0.4 (MIT) and `@unicode/unicode-16.0.0` 2.0.8 (MIT); each loads only in its own tool's chunk, and `scripts/check-build-budget.mjs` fails the build if one reaches the shell.

**Shell JS attribution and the fix (2026-10-23):** `scripts/shell-attribution.mjs` builds with `--sourcemap`, walks each shell chunk's mappings and reports every module's gzip share. The shell was **react-dom 62.8 kB (34.7%), tool-core 32.8 kB, @tanstack/router-core 20.2 kB, qrcode 11.4 kB** — tool-core and qrcode have no business there. Cause: `omnibox.tsx` and `file-intake.tsx` imported the tool-core barrel, and every tool chunk imported it too, so the barrel became a shared chunk the entry also loaded, carrying the recipe table (10.3 kB), the cheatsheet data (5.8 kB), http-status (3.8 kB) and qrcode with it. The package now declares `sideEffects: false` and those two imports use `@omnitool/tool-core/files`; tool-core no longer appears in the shell at all.

**Measured budgets (local production build, 2026-10-23):**
- Shell JS: **142.0 kB gzip** (budget 200 kB), **−38.9 kB** against the recorded 180.9 kB; the attribution warning above +10 kB per batch is in `check:budgets`, which also fails on a tool library in the shell or the shell source graph.
- Precache: **106 files / 1712.5 kB** (budget 8192 kB), +316.9 kB on Batch 4's 1395.6 kB — four new tool chunks, none over 2 MiB.
- Build files: **544** (limit 20,000): 96 from Batch 4 plus **433 generated Unicode JSON parts** and the index. Those are not precached; they are fetched per block and cached by the service worker (`omnitool-unicode-v1`). Unicode data: 338 blocks, 294,885 characters, **11,524.7 kB raw / 1,167.9 kB gzip**, largest part **12.5 kB gzip** against the 200 kB target.
- Unit tests: **553 passing in 42 files**; coverage **95.88% lines / 86.83% branches** (thresholds 90/85; margins +5.88 and +1.83).
- E2E: Chromium **237 passed**; Firefox **232 passed, 5 skipped** (Chromium-only pixel baselines); WebKit **NOT TESTED** — the browser binary cannot launch on this host (`Host system is missing dependencies`, F-019). axe in both themes on 38 routes plus the omnibox: 0 serious or critical.
- Visual baselines updated (both because the new tools changed counts on the page): `home-dark-chromium-linux.png`, `omnibox-file-dark-chromium-linux.png`. No other baseline moved.
- Lighthouse mobile, 3 runs on a quiet host across **37 routes**, `pnpm lighthouse` exit 0: **every route within NFR-013**; performance median **91–100**, accessibility/best practices/SEO **100** on every route. Home **2,173 ms** median LCP (DEC-24 band), `/about/` 1,218 ms, `/experiments/` about 1,215 ms. The four new tools: `graph-calc` **99 / 1,515 ms**, `markdown-writer` **99 / 1,509 ms**, `glyph-browser` **91 / 1,665 ms**, `font-explorer` **100 / 1,662 ms**; `large-type` **100 / 1,510 ms** after DEC-45 (runs: 1,515 / 1,510 / 1,509). Per-run LCP for the four: graph-calc 1,518/1,515/1,513, markdown-writer 1,512/1,509/1,508, glyph-browser 1,669/1,665/1,662, font-explorer 1,662/1,664/1,662.

**Deviations and gaps:**
- `glyph-browser`'s name search filters the selected block. The approved package carries blocks, categories, scripts and names in a build-time table, but no ready-made global name index; the options are recorded as P2-44 for the owner. **Resolved in Session 021 by P2-46 (see below).**
- `glyph-browser` is the weakest route at performance 91 (TBT 350 ms) — still above 90, but the number to watch.
- `markdown-writer` caps the preview at 400 blocks so a 1 MB document cannot freeze the page; the downloads are built from the whole tree.
- `font-explorer` reports script coverage as a sample-based estimate, said so in the UI.
- The Chromium suite timed out in `boot-script.spec.ts:148` on two of three full runs at the default 8 workers and passed twice with the file alone and once at `--workers=4`; it is load-sensitive on this shared host and is recorded in the review log, not papered over.

### P2 — Batch 5 follow-up: global name search (2026-10-24, P2-46)

DEC-50 chose option (a) for P2-44: build the global name index from the Unicode 16 data already approved and committed for `glyph-browser`, with no new source, package or runtime request.

- **Data.** `scripts/generate-unicode-index.mjs` now also writes `apps/web/public/unicode/search-index.json` (440 B gzip: version, source, count, per-chunk first/last/count/gzip) and `apps/web/public/unicode/search/search-01..12.json` — the same entries as the blocks, in code point order, cut when a chunk reaches **100 kB gzip**, with a hard target of 200 kB. Totals: **294,579 entries, 11,524.5 kB raw / 1,160.3 kB gzip** (the manifest's own figures), largest chunk **111,093 B gzip (108.5 kB)**. Served from the same origin under `/unicode/`, so the existing `omnitool-unicode-v1` CacheFirst rule caches each chunk on first use; `globPatterns` does not include JSON, so **precache growth is 0 kB** and a search that has been made once works offline.
- **Search** (`packages/tool-core/src/unicode/search.ts`, `@omnitool/tool-core/unicode/search`): records are prepared once (lower-cased name, block and category words) and scanned in a worker; a query is a word prefix match on any of those words, a pasted character, or any code point notation (`U+1F600`, `0x1F600`, `1F600`). Results keep code point order and stop at **200** with an honest total and a "Show 200 more" button.
- **Worker and cancellation.** `search-worker.ts` loads and keeps the index for the life of the worker; `search-controller.ts` allows one search at a time, queues the latest query, and never terminates the worker to cancel one — terminating threw the loaded index away and made every keystroke re-download 1.16 MB. The worker is terminated only on dispose or after a failure.
- **Correctness fixes found while writing the index.** The package's ranges are half-open `[start, end)`; the generator had read them as inclusive, so every block's boundary code point was duplicated into it and the next block, and U+1F600 carried two blocks (and U+20A0 two categories). Categories were also decided by comparing code lengths, so a two-letter specific category could be replaced by a one-letter group. Both are fixed; the corrected count is **294,579 characters**, not the 294,885 in the Batch 5 notes above.
- **Grid (DEC-54).** The block grid is a `role="listbox"` with roving tabindex, `aria-setsize`/`aria-posinset`, fixed 40 px cells and only the visible rows plus two rows of buffer in the DOM (in a 20,993-character block the DOM holds a few hundred cells), so Home/End/PageUp/PageDown stay instant and reduced motion needs no special case.

**Measured after the change (2026-10-24, same host):**
- Shell JS **142.0 kB gzip** (budget 200), **+0.0 kB** against the recorded baseline: the search code is inside the tool chunk and the worker. Precache **107 files / 1725.9 kB** (budget 8192), +13.4 kB and one file against Batch 5 — the search worker chunk. Build files **558** (limit 20,000): the 12 name chunks, their index and the worker.
- Unit tests **718 passing in 54 files**; coverage **96.15% statements / 89.8% branches / 99.29% functions / 97.26% lines** (thresholds 90/85/90/90).
- E2E: Chromium **242 passed**, three consecutive clean full runs; Firefox **237 passed, 5 skipped** (Chromium-only pixel baselines). WebKit **NOT TESTED** (F-019, the host still lacks its system libraries).
- Lighthouse: **NOT TESTED** for this change. The host's 1-minute load average was 7.8–13.9 against the sweep's 4.00 limit on 16 cores, and the script refuses to report a score it cannot trust. The Batch 5 `/tools/glyph-browser/` figure (91 performance, 1,665 ms median LCP) stands as the last trusted measurement; the search panel adds no network request to first paint.

### P2 — Batch 6 (2026-10-24/25)

Four tools, all with their logic in `packages/tool-core` and a thin UI on the shared tool frame: `code-genny` (`barcode`), `algebra-calc` (`algebra`), `ipa-transcriber` (`ipa`), `shavian-transliterator` (`shavian`). No new dependency and one new data set, both under a recorded decision: the encoders and the algebra are ours (DEC-60, DEC-61), the pronunciation data is the CMU Pronouncing Dictionary at commit `7479086` (DEC-62, BSD-2-Clause, licence committed beside the data), and the Shavian table is written from the Unicode Shavian block (DEC-63).

- **`code-genny`.** Own encoders for Code 128 (code set C for even digit runs), EAN-13, UPC-A, Code 39 and ITF, each with a reference vector in `barcode.test.ts` and the standard cited in the source. Digit counts are validated, check digits computed and explained in words, and a wrong check digit is refused instead of drawn. Output is SVG (a role="img" with a label) and PNG, in the DESIGN.md ink colours with a contrast warning. Data Matrix, Aztec and PDF417 are not implemented; the registry entry says what it produces.
- **`algebra-calc`.** BigInt rational polynomials over the sci-calc tokenizer: simplify, expand, factor, exact linear and quadratic solve, 2–3 unknown linear systems, differentiate and evaluate, with the steps the approach allows. No `eval` and no `Function`. Limits: 1,000 characters, depth 100, exponent 64, all enforced in the worker the UI can terminate. Tests: known results, a numeric-equivalence test at random points, and a seeded fuzz run that proves no hang, no uncaught exception and no `NaN`/`Infinity` in the output. Unsupported operations are named in the UI rather than approximated.
- **`ipa-transcriber` and `shavian-transliterator`.** Both read the CMU dictionary, so both share `apps/web/src/lib/pron/worker.ts` and the seven name chunks; each tool page creates its own worker. The chunks are served from the same origin under `/pron/`, disclosed as a one-time download (size, "stored on this device", Cancel, progress) and cached by a new `omnitool-pron-v1` CacheFirst rule, so a second visit works offline. Chunks are 154–158 kB gzip each, under the 200 kB target. The IPA tool shows every dictionary variant and lists unknown words instead of guessing; the Shavian tool maps all 39 ARPAbet symbols onto the 48 letters of U+10450–U+1047F and says which 7 letters it can never produce.

**Measured (local production build, 2026-10-25):**
- Shell JS: **142.3 kB gzip** (budget 200 kB), **+0.3 kB** against the recorded 142.0 kB. No tool library and no data reached the shell: `check:budgets` walks the shell source graph and fails on `@omnitool/tool-core`, on the tool-only packages and on the `qrcode` marker.
- Precache: **117 files / 1813.2 kB** (budget 8192 kB), +10 files / +87.3 kB on Batch 5's 1725.9 kB — four tool chunks, two worker chunks, the extra prerendered routes and the updated home page. The 4.4 MB of pronunciation JSON is not precached (`globPatterns` has no `json`), and neither is any Unicode data.
- Build files: **576** (limit 20,000); nothing over 2 MiB (largest pronunciation chunk 745 kB raw). 41 routes prerendered plus `404.html`.
- Unit tests: **807 passing in 58 files**; coverage **96.48% lines / 88.25% branches / 99.07% functions / 95.02% statements** (thresholds 90/85/90/90). Line margin +6.48, branch margin +3.25. The branch figure is below the 90 target: `algebra` alone measures 78.87% and is recorded as P2-57 rather than hidden.
- E2E: Chromium **267 passed, 0 failed** at 4 workers (includes axe on every route in both themes). Firefox results are recorded in the session entry of `docs/review/REVIEW-LOG.md`. WebKit: NOT TESTED (F-019).
- Visual baselines: `home-dark-chromium-linux.png` updated, because the home grid gained four tools (page height 2724 → 2947 px). No other baseline changed.
- Lighthouse mobile, 41 routes × 3 runs, exit 0, quiet host (1-minute load 1.60 at the start, 3.60 at the worst run, limit 4.00): every route at **performance 96–100** and accessibility 100, home **2,116 ms** median LCP, `/tools/glyph-browser/` **100 performance / 35 ms TBT / 1,661 ms LCP** (up from 91 / 350 ms / 1,665 ms), `/tools/code-genny/` **99 / 1,661 ms**. **Three routes are over NFR-013**: `/tools/algebra-calc/` **2,568 ms** (`p.text-sm` in the "What this covers" stage), `/tools/ipa-transcriber/` **2,653 ms** (`p.break-words`, the transcription itself, which is rendered only after the 0.9 MB dictionary arrives) and `/tools/shavian-transliterator/` **2,508 ms** (`p.mt-2`, the character-count line). The batch gate therefore stops here: thresholds are reported, not re-baselined (DEC-68).

**Search worker memory budget (glyph-browser, documented here so a regression has a number).** Budget: **150 MB retained** in the worker. Measured on Chromium through the DevTools protocol on the worker target (`Runtime.getHeapUsage`, with `HeapProfiler.collectGarbage` first): **113.7 MB** after the 294,579-record index loads and **113.7 MB** after 20 mixed queries, so queries do not accumulate. A second run without the forced collection peaked at **158.0 MB**, which is garbage the engine had not collected yet rather than memory the page keeps. The obvious lower-memory layout — one name string plus offset arrays instead of an object and a `words` array per record — would save an estimated 80–100 MB, but it is not needed at 114 MB and is not implemented. **Real-phone behaviour is untested and needs a human check**: a mid-range phone gives a tab a few hundred MB, and this index is the largest thing Omnitool holds in memory.

**Deviations and gaps:**
- `code-genny` meets its Definition of Done including NFR-013 (99 performance, 1,661 ms) and is marked done; `algebra-calc`, `ipa-transcriber` and `shavian-transliterator` are over NFR-013 (2,568 / 2,653 / 2,508 ms) and stay 🟨 with the smallest fix proposed in the review log.
- `algebra-calc` covers polynomials in one variable and linear systems in up to three; functions, roots of x and division by x are refused in words.
- The Shavian output is one-way by design: the letters cannot be turned back into English spelling, and the tool says so rather than offering a reverse mode it could not guarantee.
- F-023 (open, Info): `packages/tool-core/src/markdown/index.ts` was the lowest-covered file at **85.43% statements / 75% branches / 87.71% lines** at the end of Batch 6 (superseded: **77.94% branches** after the Batch 7A edge tests, see below). The gap is documented rather than closed in this batch, which is the second of the two options A1.2 condition 3 allows; the file is covered by 54 tests across two files and its XSS corpus, and no threshold depends on it.
- `glyph-browser`'s typing guard now ignores long tasks that began before the observer was installed: it was including the page's own hydration (173–187 ms, 13 ms from the limit) in a test about typing. Page load is covered by NFR-013 instead.

### P2 — Batch 7A (2026-10-25)

No tool shipped in this batch. The session closed the three Batch 6 conditions instead, and stopped both Batch 7 tools at the dependency decision rather than installing something the owner had not named.

- **NFR-013 for the three routes over target (P2-56, DEC-69).** The smallest fix was applied per route, one attempt each: `algebra-calc` folds its "What this covers" paragraph into the existing `ToolHint`, and `ipa-transcriber` and `shavian-transliterator` start with an empty box so the prerendered description is the largest element at first paint. The two panels' empty starting state — including the absence of an output paragraph and the presence of the one-time notice and Cancel — is asserted in `tests/e2e/batch6.spec.ts` before anything is typed, so the guard cannot pass by transcribing a default line again. Measured 3 runs per route on a quiet host (`--only` sweeps, guard exit 0, 1-minute load 1.76 → 2.64 against the 4.00 limit):

| Route | Before | After | Perf | LCP element |
|---|---|---|---|---|
| `/tools/algebra-calc/` | 2,568 ms | **1,664 ms** | 99 | prerendered description (time to first byte 13 ms + 94 ms element render delay) |
| `/tools/ipa-transcriber/` | 2,653 ms | **1,660 ms** | 100 | prerendered description (12 ms + 87 ms) |
| `/tools/shavian-transliterator/` | 2,508 ms | **2,495 ms** | 97 | the post-hydration character-count line `p.mt-2` |

  The Shavian figure is within NFR-013 by 5 ms, not by the ~1 second the other two gained, because its LCP element is a paragraph rendered after hydration rather than the prerendered description. The cause is stated rather than fixed: the one permitted attempt is spent, and shortening that line to one sentence is the DEC-64 precedent, recorded as **P2-59** for the owner.
- **Branch coverage (P2-57, DEC-70).** Three edge-case test files were added: `packages/tool-core/src/algebra/algebra.edges.test.ts`, `packages/tool-core/src/markdown/markdown.edges.test.ts` and `packages/tool-core/src/core.edges.test.ts` (barcode, calculator, cipher and JSON refusals). Coverage went from **88.25% to 90.36% branches** and 96.48% to 96.35% lines across **887 tests in 61 files**; the Vitest `branches` threshold was raised from 85 to **90**, so the target is enforced rather than remembered. `markdown/index.ts` remains the lowest file at **77.94% branches**: the branches left are token types markdown-it never emits with `html: false` (`html_block`, `html_inline`, an unclosed emphasis with no matching open), and they are named here rather than covered by a test that fakes a token stream.
- **The Firefox 30 s timeout (P2-60).** Not reproduced: 114 loaded runs of `tests/e2e/batch1.spec.ts`'s 1 MB JSON guard (12 workers plus 10 CPU burners, 1-minute load up to 32.28) passed without a failure, so no cause can be claimed. What the test *was* doing wrong is visible in the code: it was the last guard navigating with `page.goto` instead of the shared `gotoApp` helper and then clicking a control that only exists after hydration. It now waits for `data-app-ready`, and every failure in that file attaches the route, `document.readyState`, the app-ready flag and the console errors through `tests/e2e/helpers.ts`. Proof run afterwards: **30/30 on Firefox under the same load**, no retries, no longer timeouts.
- **Batch 7 tools blocked.** `text-editor` (P2-61) and `doc-converter` (P2-62) were not built: the decisions block named no editor library and no document-conversion library or binary, and the rule is that nothing is installed unless its line names it. Options with licence, size and maintenance evidence are in `docs/review/BATCH-7A-REVIEW-PACK.md` §4 and §5; the GPL-2.0-or-later `pandoc-wasm` that `features.md` originally imagined needs an ADR before it could ship.

**Measured (local production build, 2026-10-25):**
- Shell JS: **142.3 kB gzip** (budget 200 kB), **+0.0 kB** against the recorded figure — this batch changed no application shell code.
- Precache: **117 files / 1813.0 kB** (budget 8192 kB), unchanged; build files **576** (limit 20,000).
- Unit tests: **887 passing in 61 files**; coverage **96.35% lines / 90.36% branches / 97.59% statements / 99.44% functions** (thresholds 90/90/90/90).
- E2E: Chromium **268 passed, 0 failed**; Firefox **262 passed, 6 skipped, 0 failed** (five Chromium-only pixel baselines plus the Firefox offline-emulation gap recorded in Batch 5). WebKit: **NOT TESTED** (F-019).
- Lighthouse: three `--only` sweeps as above, guard exit 0. The full 41-route sweep was **not** re-run and home LCP was **not** re-measured this session, so no score is claimed for any other route.

### P2 — Batch 7B (2026-10-26)

`text-editor` shipped on ProseMirror (DEC-80), the option the Batch 7A pack recommended: eight MIT packages, pinned exactly and imported only by the editor's lazy chunk (`check:budgets` fails if one reaches the shell). `doc-converter` is still unbuilt (P2-62), and `mammoth` 1.13.0 sits unused in `apps/web/package.json` until that decision is taken.

- **Schema** (`apps/web/src/tools/text-editor/model.ts`). `prosemirror-schema-basic` plus `addListNodes` for bullet and ordered lists, a custom `task_list`/`task_item` pair whose checkbox is a real `<input type="checkbox">` (the plugin writes `checked` back into the node, so it survives export and reload), a `code_block` that carries a `language` attribute (the basic schema has none), `underline` and `strike` marks, and the link mark limited to http/https/mailto both when markup is parsed and when the DOM is written. **There is no image node at all**, so a document cannot reference a resource.
- **Paste and drop** never reach ProseMirror's clipboard parser: our `handlePaste`/`handleDrop` run first, read the clipboard with `getData`, and hand HTML to `@omnitool/tool-core/sanitize`, which never builds a DOM. The sanitiser's 40-payload corpus was moved to `packages/tool-core/src/sanitize/corpus.ts` (exported as `@omnitool/tool-core/sanitize/corpus`) so the editor's own path runs the same attacks: `model.test.ts` asserts the exported HTML has no script, no event handler, no image, no `src=` and no `javascript:` for every payload. A paste longer than `SANITIZE_LIMITS.maxInputLength` (2,000,000 characters) is inserted as plain text cut to the limit, with a note saying so; plain-text pastes keep blank lines as paragraphs and single newlines as hard breaks.
- **Security fix in `tool-core`.** Attribute values are now entity-decoded before the scheme check, because a browser decodes `href="&#106;avascript:alert(1)"` before following it. Previously the encoded form read as a relative URL, so the sanitiser kept it as a link; it now becomes plain text. Two regression tests were added to `sanitize.test.ts`, including one that keeps `?a=1&amp;b=2` escaped on the way out.
- **Find and replace.** `findMatches` builds a text index that maps each run back to a document position, joining blocks with a newline so a match cannot span two paragraphs. The first implementation mixed `textBetween` offsets with a node walk and would have replaced the wrong paragraph in any multi-block document; `model.test.ts` now covers a match in the second block.
- **Numbered lists and rules** use `prosemirror-schema-list`'s `wrapInList` and `prosemirror-commands`' `wrapIn`/`setBlockType` rather than hand-rolled `replaceRangeWith` calls; a task list gets one item per selected block. The horizontal rule is inserted after the current block rather than inside it.
- **Files.** `FileIntake` offers .md/.markdown/.txt/.html up to 2,000,000 bytes; Markdown and plain text go through `parseMarkdown`, HTML through `htmlToModel`, and either replaces the document. A file dropped on the editable surface is handed to the same path instead of letting the browser navigate away.
- **Drafts** are opt-in, in IndexedDB (`omnitool-text-editor`), stored only when Save is pressed, with Restore and Clear, and the panel says whether a draft exists when the page opens.
- **UI details.** All toolbar buttons are in the tab order (no roving tabindex without arrow handling), the editable element is a `role="textbox"` with `aria-label` and `aria-multiline` (axe flagged the unlabelled `div`), the counts are two separate labels rather than a "words · characters" meta string (design rule), and `.ProseMirror` CSS in `app.css` gives the surface a focus ring, list markers and task-item layout that preflight would otherwise reset. The link shortcut was removed from the `ToolHint` because there is no link command yet rather than advertising a key that does nothing.

**Measured (local production build, 2026-10-26):**
- Shell JS: **142.5 kB gzip** (budget 200 kB), **+0.2 kB** against the recorded 142.3 kB; the ProseMirror packages are in the tool chunk only (241.1 kB raw / 73.6 kB gzip).
- Precache: **121 files / 2059.8 kB** (budget 8192 kB); build files **580** (limit 20,000); 42 routes prerendered plus `404.html`.
- Unit tests: **983 passing in 63 files**; coverage **96.23% lines / 90.61% branches / 97.42% statements / 99.48% functions** (thresholds 90/90/90/90).
- E2E: Chromium **276 passed, 0 failed**; Firefox **270 passed, 6 skipped, 0 failed** (five Chromium-only pixel baselines plus the Batch 5 Firefox offline-emulation gap). WebKit: **NOT TESTED** (F-019). axe on `/tools/text-editor` in both themes: 0 serious or critical.
- Visual baselines: `home-dark-chromium-linux.png` and `omnibox-file-dark-chromium-linux.png` regenerated mechanically (`--update-snapshots`) because the tool moved from planned to available and now appears in the dropped-file group; two consecutive runs then passed unchanged. The agent cannot view images, so the geometry guards are the evidence that nothing else moved.
- Lighthouse: **NOT TESTED**. `scripts/lighthouse.mjs --only /tools/text-editor` refused with exit 3 — 1-minute load 4.96 against the 4.00 limit on 16 cores — so NFR-013 has no figure for this route yet.

**Deviations and gaps:**
- `accepts` advertises .md/.txt/.html and the editor now opens exactly those, but it does not save back to the same file; export is a download.
- The link mark exists in the schema and survives parsing and export, but the toolbar has no link command, so a link can only arrive from a paste or an opened file.
- One full-suite Chromium run failed the first text-editor guard with a Playwright timeout while the 1 MB paste test ran in parallel; it passed alone and in the next full run. Recorded as an observation, not explained.
- `mammoth` remains an unused dependency (see above), and `pandoc-wasm` is still not installed.
