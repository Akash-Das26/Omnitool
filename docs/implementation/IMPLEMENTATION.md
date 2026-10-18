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
- Theme: `.dark` class set by a tiny inline script before paint; preference in `localStorage`; follows system by default.
- Security: strict CSP (no inline script except hashed bootstrap), no `eval`, sandboxed parsing in workers, regex tester runs in a worker with a timeout, Request Builder is the only user-initiated outbound tool and says so.

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
