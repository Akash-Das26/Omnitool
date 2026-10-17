# Implementation design

Living document. Update after each phase (append to section 9).

## 1. Architecture
Static SPA. `apps/web` is the shell and tool UIs. `packages/tool-core` holds framework-free logic. `packages/tools-registry` is the single source of tool metadata. `packages/ui` wraps shadcn components and design tokens.

## 2. Registry
Typed `Tool` objects: `id`, `name`, `description` (human-written), `category`, `icon` (Lucide name), `accepts: MimePattern[]`, `produces: MimePattern[]`, `flags` (new, beta, wide, atlas, carryColour), `tier`. Seed: `packages/tools-registry/data/registry.seed.json`. Derived at build time: routes, nav, home index, omnibox index, sitemap, prerender list.

## 3. Routing and code splitting
TanStack Router (SPA). Routes: `/` home, `/tools/$toolId` (lazy, via an import map generated from the registry), `/workflows`, `/experiments`, `/editor` (image editor), `/pdf-editor`, `/privacy`, not-found. `defaultPreload: 'intent'` preloads a tool chunk on hover/focus. Shared search params (`color`, handoff run id) are validated with Valibot in `validateSearch`; tool-specific params are parsed by a schema the tool exports. URLs carry configuration only, never file data. Each tool is wrapped in an error boundary and Suspense with a skeleton. Routing is accessed through `lib/navigation` so it can be swapped (ADR 0002).

## 4. File handling
Single `FileIntake` component: picker, drag and drop, paste. iOS needs explicit extensions in `accept` as well as MIME types. Results exposed as `Blob`; filenames derived from input plus suffix. Large files processed from `Blob` streams where possible, never string-encoded.

## 5. Workers and heavy work
All T2/T3 processing in module Web Workers exposed through Comlink (ADR 0004). Progress via a `Comlink.proxy` callback; results and errors via the returned promise; **cancel terminates the worker** (one worker per job). Transferable objects for buffers. Memory guard: reject or downscale inputs above a per-tool pixel/byte budget with a clear message.

## 6. WASM and ML assets
Lazy-load on first use; show size and a Cancel; runtime-cache via the service worker (CacheFirst, versioned keys, expiry). Never bundle files over ~20 MiB (Cloudflare Pages limit is 25 MiB per file); host models and large WASM externally (ADR 0003). CDN allow-list (to confirm): jsDelivr, Hugging Face hub, unpkg-equivalent as needed. Each fetch is user-visible. Fallback: tool shows "needs a one-time download" state and works offline afterwards.

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
- Shell JS: **147.1 kB gzip** (entry + static imports; budget 200 kB).
- Precache candidates: **30 files / 781.1 kB** (budget 8 MiB); largest well under the 2 MiB per-file limit.
- Build files: **34** (limit 20,000); no file over 20 MiB.
- Lighthouse mobile: home **93** performance (first run 95), **100** accessibility, **100** best practices, **100** SEO. Tool pages 93–95 performance.
- axe: **0 serious/critical** on home, privacy, about and the three tools (light and dark).
- Unit tests: **69 passing**; tool-core/registry line coverage **98.6%**.

**Deviations:** Stitch exports were absent, so `DESIGN.md` seed tokens were used. `qrcode` (MIT) is used for the QR sample instead of qr-code-styling. The image converter simulates the first-use codec download and uses native canvas encoding. Category labels for the two original-branded categories were replaced with neutral ones. `produces` metadata and some missing `accepts` were added to the seed provisionally and need review.

**Known gaps:** 94 tools unbuilt; all 97 descriptions blank; brand/OG assets absent; real WASM codecs and JXL deferred to P4; service-worker update prompt not exercised against a real second deployment.
