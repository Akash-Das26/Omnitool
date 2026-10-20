# Review log — what was done after each session

Append a new entry after **every** session, newest at the bottom. Be honest about gaps.

## Entry template
```
### Session NNN — YYYY-MM-DD — <phase> — <agent/human>
**Goal:**
**Done:** (bullets, with file paths)
**Features touched:** (IDs from features.md and new status)
**Decisions:** (link ADRs)
**Verification:** lint / typecheck / tests / E2E / a11y results (paste counts)
**Not done / uncertain:**
**Problems and risks found:**
**Next session should:**
**Human review:** [ ] diff read  [ ] approved  (initials/date)
```

---

### Session 000 — 2026-10-17 — P0 Planning — Claude
**Goal:** Plan the Omnitool clone of delphi.tools before any building; create the project scaffold, documents and prompts.

**Done:**
- Analysed `delphitools-main.zip` (1,178 files, ~170 MB unpacked, Ember + Crayon CSS): README, LICENSE, CONTRIBUTING, ACKNOWLEDGEMENTS, DESIGN.md, `app/lib/tools.ts` registry, `package.json`, flow-store/history-store/colour-query. Extracted only text files; nothing from the archive's assets was copied.
- Parsed the registry into `features.md`: 97 in-app tool entries across 12 categories (+2 external links marked out of scope), each assigned a tier (T1 37 / T2 42 / T3 18), phase and approach.
- Listed 24 platform features (omnibox, workflows, handoff, atlases, offline, theme…) from code and changelog.
- Verified current AI tooling by web search: Google Stitch (free, `DESIGN.md`, MCP/SDK), shadcn CLI v4 with MCP server and Vite template.
- Created: `README.md`, `plan.md`, `todo.md`, `features.md`, `AGENTS.md`, `CLAUDE.md`, `docs/{srs,development,implementation,review,audit,design,tooling,legal,prompts,adr}`, workspace config (`pnpm-workspace.yaml`, `package.json`, `.npmrc`, `.nvmrc`, `.editorconfig`, `.prettierrc.json`, `.gitignore`, `LICENSE`), package stubs, `scripts/features-progress.mjs`, PR template, registry seed JSON.
- Wrote the design brief with a self-review against generic design defaults, seeded `DESIGN.md`, and wrote Stitch prompts.
- Wrote the planning, ignition and session prompts.

**Features touched:** none implemented. all ⬜ (124 rows incl. 3 optional X items) except 2 external links ⛔.

**Decisions:** D-01..D-14 proposed in `plan.md`, awaiting approval.

**Verification:** `node scripts/features-progress.mjs` runs (0 done, 124 not started, 2 out of scope at the time (125 after Session 001 added PF-25)). No application code exists, so no tests yet.

**Not done / uncertain:**
- `https://delphi.tools/` is a client-rendered SPA; fetching it returned only page metadata, so behaviour was inferred from the zip, not observed live. Tool descriptions and behaviour beyond the registry/changelog were not verified by reading each tool's source.
- Tier, phase and library hints in `features.md` are estimates.
- No dependency versions pinned (deliberately deferred to ignition).
- Licence holder and hosting target are placeholders.

**Problems and risks found:** see Audit 000 in `docs/audit/AUDIT-LOG.md` (AGPL MuPDF, artwork exclusion, scope size).

**Next session should:** get the human decisions in `todo.md` (DEC-01..04), run the Stitch design gate (P1-00), then start P1 with `docs/prompts/02-IGNITION-PROMPT.md`.

**Human review:** [ ] diff read  [ ] approved

### Session 001 — 2026-10-17 — P0 Planning — Claude
**Goal:** Compare the two decision logs and review notes you supplied with the existing plan; adopt what holds up after verification; update the project.

**Done:**
- Compared both logs against the original `plan.md` table. They share D-01..D-15 and differ only in numbering of telemetry/spelling/licence; the pasted follow-up proposed IDs that clash (a second "worker messaging", "PWA", "analytics").
- Verified disputed claims by web search (see `docs/tooling/TOOLING.md` section 6): Cloudflare Pages/Workers limits, nuqs on TanStack Router, `vite-plugin-pwa` precache limit.
- Published decision log v2 (D-01..D-19) in `plan.md` section 2, with a change summary and a COOP/COEP policy.
- Added ADRs 0002 (routing and URL state), 0003 (hosting and offline caching), 0004 (Comlink workers).
- Propagated changes: `todo.md` (new P1 tasks 07b, 07c, 11, 11b), `docs/tooling/TOOLING.md`, `docs/implementation/IMPLEMENTATION.md`, `docs/srs/SRS.md` (FR-015, FR-016, NFR-012; NFR-011 tightened), `docs/prompts/02-IGNITION-PROMPT.md`, `features.md` (PF-25 added; PF-04, PF-09 notes), risks R-09..R-11, audit findings F-008..F-011.

**Decisions:** accepted TanStack Router, Comlink, vite-plugin-pwa, Lucide, no telemetry, Valibot (new); rejected nuqs; corrected four claims (see plan.md). All still **proposed** until DEC-01.

**Verification:** `node scripts/features-progress.mjs` runs; cross-references re-checked. No code exists, so no tests.

**Not done / uncertain:**
- `vite-plugin-pwa` compatibility with the latest Vite major is unverified (the original project builds with a recent Vite major; the plugin version needed is unknown). Check at ignition.
- Valibot "smaller than Zod" is a general expectation, not measured here.
- TanStack Router's benefit for registry-generated routes is modest; ADR 0002 records the fallback.
- Precache total budget and CDN allow-list have no numbers yet (set at P1).

**Problems and risks found:** see F-008..F-011.

**Next session should:** resolve DEC-01..DEC-03, run the Stitch gate, then use the ignition prompt.

**Human review:** [ ] diff read  [ ] approved

### Session 002 — 2026-10-17 — P0 Planning — Claude
**Goal:** Prepare the start of implementation now that the Omnitool repo and the original are extracted locally; provide art prompts.

**Done:**
- Rewrote `docs/prompts/02-IGNITION-PROMPT.md`: decisions block (human-edited), reference-folder rule for the read-only original, no-art rule for the agent, placeholder wordmark, brand-asset list in the session report.
- Added `docs/design/ART-PROMPTS.md` (logo, app icon/favicon, OG image, three spot illustrations, master style block, review checklist) and `docs/legal/ART-PROVENANCE.md`.
- Narrowed the "no generated imagery" rule to an identity set (design brief principle 6, `DESIGN.md`, ATTRIBUTION section 3), at the owner's request for art prompts. Added DEC-06 and P1-13b to `todo.md`; added reference/no-art rules to `AGENTS.md`.

**Decisions:** art approach (DEC-06) proposed, pending owner confirmation in the ignition prompt.
**Verification:** documents only; cross-references checked.
**Not done / uncertain:** no art generated; prompts are untested against any specific generator; I have not seen where the original was extracted, so the `../delphitools-main` path is an assumption.
**Next session should:** run the ignition prompt.
**Human review:** [ ] diff read  [ ] approved

### Session 003 — 2026-10-17 — P0 Planning — Claude
**Goal:** At the owner's request, remove the original author's AI policy from the project's rules and attempt to generate identity art with Higgsfield.

**Done:**
- Removed the AI-policy item from `docs/audit/AUDIT-LOG.md` (F-001), `plan.md` (R-04), `todo.md` (DEC-04), `docs/legal/ATTRIBUTION.md` (section 3 replaced by "Art provenance" with practical rules only) and the ignition prompt (decisions block). Older log entries edited only to drop the references; the DEC numbering has a deliberate gap at DEC-04.
- Kept: licence facts about the original (0BSD, exclusions such as MuPDF AGPL and artwork), the "do not copy original code, copy, data or art" rule, provenance logging, and the rule that the coding agent generates no art in Phase 1 (scope control, not policy).
- Higgsfield: loaded the tools, read preferences (no automatic project), preflighted cost (0.5 credits per image at medium 1k), then submitted a batch of 8 images (4 logo concepts, social image, 3 spot illustrations). All 8 were rejected with "Requires basic plan or higher". Nothing was generated and no credits were spent.

**Decisions:** none recorded. Art route (upgrade Higgsfield, use Figma image generation, or use the prompts in any generator) is the owner's choice.
**Verification:** documents only; grep confirms no remaining AI-policy references except this entry.
**Not done / uncertain:** no art exists yet; the prompts are untested against any generator.
**Next session should:** get the art route decision, then run the ignition prompt.
**Human review:** [ ] diff read  [ ] approved


### Session 004 — 2026-10-17 — P1 Foundations — Buffy
**Goal:** Implement Phase 1 from `todo.md` P1-01 to P1-13, stop at the exit gate and request Audit A1.

**Done:**
- Verified and pinned versions with `pnpm view` (incl. licence, deprecation and publish time), set `packageManager` to `pnpm@11.24.0`, and confirmed `vite-plugin-pwa@2.0.0` declares Vite `^8.0.0` support. Installed with pnpm 11.24.0 on Node 22.
- Workspace: `apps/web`, `packages/{config,tools-registry,tool-core,ui}`. Vite 8.3.4, React 19.3.1, TypeScript 7.0.2 strict, Tailwind 4.3.3, shadcn CLI 4.22.0 (`radix` base), TanStack Router 1.170.45, Valibot 1.5.0, Zustand 5.0.15, Comlink 4.4.2, Lucide 1.59.0.
- Design tokens in `packages/ui/src/tokens.css` (light/dark, shadcn variable mapping, radius hierarchy, reduced motion), self-hosted Schibsted Grotesk + Geist Mono via Fontsource, external pre-paint `apps/web/public/theme.js` for no-flash theming.
- Registry: `packages/tools-registry/src/index.ts` validates the 97-tool seed with Valibot; categories, counts, search, file matching and labels derived from it. `produces` metadata and some missing `accepts` were added provisionally.
- Shell: header, collapsible rail, footer, skip link, insecure-context notice, `/privacy`, `/about`, 404, per-route document meta. TanStack Router code-based routes behind `apps/web/src/lib/navigation`; tool route loads from `lib/tool-modules` with `defaultPreload: 'intent'`; per-tool error and pending components.
- URL state: Valibot `validateSearch` for `category`, `color`, `run`, `q`; unknown/file-like keys are dropped. Tests cover `data=`, `file=`, `blob=` probes.
- Home: omnibox hero with drop target, category filter, 97-row index grouped by category with accepts→produces glyphs. Unbuilt tools are non-links marked with their phase. Omnibox: Ctrl/Cmd+K, grouped results, file filtering, planned tools disabled, Escape to close.
- `FileIntake` (picker, drag/drop, paste, reject message, iOS extension expansion) and download helpers (`downloadBlob`, `downloadText`, `dataUrlToBlob`).
- Comlink harness `apps/web/src/lib/worker/job.ts`: progress through `Comlink.proxy`, cancel by terminate, duplicate terminate guarded; unit tested with fake workers.
- Sample tools: `uuid-genny` (v4, v7, Nano ID, copy/download; logic in `packages/tool-core/src/uuid` with tests), `qr-genny` (PNG/SVG, size, margin, error correction, downloads), `image-converter` (T3 stub: native PNG/JPEG/WebP in a worker, simulated first-use codec download, progress, cancel, download).
- PWA/hosting: `vite-plugin-pwa` precache (`maximumFileSizeToCacheInBytes` 2 MiB), runtime cache for WASM/models, update prompt; `_headers` (CSP, cache) and `_redirects` SPA fallback; COOP/COEP deliberately absent. Budget script enforces shell ≤ 200 kB gzip, precache ≤ 8 MiB, per-file < 2 MiB precache, no file > 20 MiB, < 20,000 files.
- Postbuild `scripts/prerender.mjs` writes title/description/OG meta HTML for home, privacy, about, three tool routes and `404.html`.
- Tooling/CI: Biome, Vitest projects (node + jsdom), Testing Library, Playwright + axe, GitHub Actions (lint, typecheck, coverage, build, budgets, E2E, Lighthouse). shadcn MCP config in `.mcp.json`.

**Features touched:** PF-01 ✅, PF-02 ✅, PF-03 ✅, PF-04 ✅, PF-05 ✅, PF-06 ✅, PF-07 ✅, PF-08 ✅, PF-09 ✅, PF-10 🟨, PF-20 ✅, PF-21 ✅, PF-22 ✅, PF-23 ✅, PF-25 ✅, PF-24 🟨. Tools: `uuid-genny` ✅ (P1 sample), `qr-genny` 🟨 (sample; styling/logos P2), `image-converter` 🟨 (stub; codecs P4).

**Decisions:** DEC-01, DEC-02, DEC-03 and DEC-06 confirmed; DEC-05 deferred to P8. `@axe-core/playwright`/`axe-core` are MPL-2.0 development-only; recorded in `docs/legal/ATTRIBUTION.md`. Category labels for "Turbo-nerd Shit" and "Alien Delphi's Experiments" replaced with neutral "Turbo-nerd" and "Experiments". QR uses `qrcode` (MIT) rather than qr-code-styling.

**Verification:**
- `pnpm lint`: pass (Biome, 0 errors).
- `pnpm typecheck`: pass (root E2E config + 4 packages).
- `pnpm test`: **69 tests / 10 files pass**; coverage **98.6% lines, 86% branches** (tool-core + registry), thresholds 90/85 pass.
- `pnpm build`: pass. **Shell JS 147.2 kB gzip** (budget 200 kB). Precache **30 files / 781.4 kB** (budget 8 MiB). **34 build files**; no file > 20 MiB.
- `pnpm e2e`: **17 tests pass** — home/omnibox, three tools, offline reload + offline conversion, no third-party requests, axe on six routes + omnibox + dark mode (0 serious/critical).
- `pnpm lighthouse`: home **93 performance**, 100 accessibility, 100 best practices, 100 SEO (mobile). About/privacy/tools 93–95. 404 SEO 60 warning is expected from `noindex`.
- Responsive check: no horizontal overflow at 320/390/768/1440 after fixing the About heading.

**Copy needed from the owner (all 97 descriptions are still `""`):**
- Colour: `colour-atlas`, `colorblind-sim`, `colour-converter`, `contrast-checker`, `gradient-genny`, `harmony-genny`, `palette-collection`, `palette-extractor`, `palette-genny`, `pixel-picker`, `tailwind-shades`
- Images & assets: `image-atlas`, `substrata`, `errata`, `artwork-enhancer`, `background-remover`, `favicon-genny`, `image-clipper`, `image-compressor`, `image-converter`, `image-deskewer`, `image-masker`, `image-splitter`, `image-stitcher`, `image-tracer`, `metadata-stripper`, `paste-image`, `placeholder-genny`, `svg-optimiser`, `base64-image-encoder`
- Social media: `matte-genny`, `scroll-genny`, `social-cropper`, `watermarker`
- Audio & video: `audio-atlas`, `video-atlas`, `audio-extractor`, `audio-normaliser`, `audio-trimmer`, `auto-subtitle`, `frame-extractor`, `screen-recorder`, `subtitle-converter`, `subtitle-studio`, `timecode-calc`, `video-muter`, `video-to-gif`, `video-trimmer`, `voice-recorder`, `waveform-genny`
- Typography & text: `doc-converter`, `text-editor`, `font-explorer`, `glyph-browser`, `large-type`, `line-height-calc`, `paper-sizes`, `px-to-rem`, `text-diff`, `typo-calc`, `word-counter`
- PDF: `pdf-preflight`, `pdf-organiser`, `image-to-pdf`, `pdf-rotate-crop`, `pdf-page-numberer`, `pdf-compressor`
- Print & production: `imposer`, `zine-imposer`
- Dev tools: `cron-builder`, `http-status`, `json-formatter`, `jwt-decoder`, `meta-tag-genny`, `regex-tester`, `request-builder`, `tailwind-cheatsheet`, `uuid-genny`
- Other tools: `code-genny`, `decoder`, `password-genny`, `qr-genny`, `markdown-writer`
- Calculators: `algebra-calc`, `base-converter`, `encoder`, `graph-calc`, `sci-calc`, `time-calc`, `unit-converter`
- Turbo-nerd: `shavian-transliterator`, `morse-code`, `braille-converter`, `ipa-transcriber`, `nato-phonetic`
- Experiments: `stupid-units`, `recipe-table`

**Brand assets still needed (target paths in `apps/web/public/brand/`):** `logo.svg`, `logo-dark.svg`, `favicon.svg`, `icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `og.png`; empty-state spots `apps/web/src/assets/spots/{drop,empty,offline}.svg`. Until then the text wordmark and Lucide icons are used, the favicon is suppressed, the PWA manifest has no icons and no `og:image` is emitted.

**Not done / uncertain:**
- `docs/design/stitch/` is empty: P1-00 design gate was not run. The build uses the `DESIGN.md` seed tokens. This needs owner acceptance or a later Stitch pass.
- 94 tools are not implemented (correct for P1); home rows mark their phase and are not links.
- Tool descriptions are empty, so home rows omit the description line (as instructed) and meta descriptions fall back to a generic sentence.
- Brand assets absent: P1-13b not done; PWA installability and social previews are incomplete.
- `image-converter` is deliberately a stub with simulated codec download; real codecs, JXL and resizing are P4.
- `qr-genny` has no styled shapes/logos yet.
- The service-worker update prompt is implemented but not exercised against a real second deployment.
- The shadcn MCP server is configured manually in `.mcp.json`; Freebuff is not in the CLI's built-in client list (`claude`, `cursor`, `vscode`, `codex`, `opencode`).
- `produces` and some `accepts` metadata are provisional and need owner/audit review.
- No git repository existed in the working directory at session start. A local repository was initialised at the end of the session and the work committed in logical Conventional Commits; no remote was configured and nothing was pushed.

**Problems and risks found:**
- TypeScript 7 removed `baseUrl`; switched to relative `paths`.
- Invalid `?category=` was being rendered as an empty index because raw search params leaked to the page; now re-validated in the home component and covered by E2E.
- Initial 2×2 PNG fixture was undecodable by Chromium; regenerated with a valid zlib/CRC PNG.
- About heading overflowed at 320 px; reduced mobile heading scale and allowed wrapping. Planned rows no longer rely on opacity for contrast.
- CSP allows `style-src 'unsafe-inline'` (React style attributes, shadcn). Script CSP remains `'self'`; no inline scripts.
- Cloudflare nested `index.html` serving is assumed, not tested against a real Pages deployment.

**Next session should:** close the copy and brand-asset items, review the provisional registry metadata, run Audit A1, then start P2 only after A1 passes.

**Human review:** [ ] diff read  [ ] approved

### Session 005 — 2026-10-18 — P1 Foundations (hardening) — Buffy
**Goal:** Finish the verification the Session 004 completion check had skipped, and fix what it exposed. No new features, no Phase 2 work.

**Done:**
- Ran `pnpm audit` for the first time (audit checklist section 2). It reported **4 high, 2 moderate, 1 low**, all dev-only through `@lhci/cli@0.15.1`: `tmp`, `uuid`, `extract-zip` (no patched release), `basic-ftp` and `sprintf-js`. `@lhci/cli` is already the newest release and pins `lighthouse` 12.6.1.
- Replaced `@lhci/cli` with `lighthouse@13.5.0` + `chrome-launcher@1.2.2` (both Apache-2.0) and a new runner, `scripts/lighthouse.mjs`. It serves `apps/web/dist` from an in-process static server (SPA fallback, Brotli/gzip like Cloudflare), audits six prerendered routes, asserts performance/accessibility ≥ 90 (errors) and best practices/SEO ≥ 90 (warnings), and writes HTML + JSON reports to `reports/lighthouse/`.
- Deleted `lighthouserc.json`; updated `package.json`, `.gitignore`, `biome.json` and the CI workflow artifact path. `pnpm audit` now reports **0 vulnerabilities**.
- Added `apps/web/public/robots.txt` (crawlers were being served the SPA shell, costing 9 SEO points) and a coarse-pointer block in `apps/web/src/styles/app.css` giving 44 px touch targets, plus 44 px icon buttons and 44 px checkbox rows (`size-5` boxes).
- Recorded pre-audit evidence for A1 in `docs/audit/AUDIT-LOG.md` and closed F-004, F-005, F-008, F-009, F-010 and the new F-012.

**Features touched:** none changed status. PF-23 (performance budgets) and PF-24 (identity) stay as recorded; PF-24 is still amber pending brand assets.

**Decisions:** none new. Dependency swap within the approved stack; the licence note for `lighthouse`/`chrome-launcher` (Apache-2.0, development only) is recorded in `docs/legal/ATTRIBUTION.md`.

**Verification:**
- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: 69/69 tests, 10 files.
- `pnpm build`: pass.
- `pnpm check:budgets`: shell JS 147.2 kB gzip (budget 200 kB); precache 30 files / 781.7 kB (budget 8 MiB); 35 build files, none over 20 MiB.
- `pnpm e2e`: 17/17 pass, including offline reload/conversion, zero third-party requests and axe (0 serious/critical).
- `pnpm lighthouse`: home **96** performance, tool pages **92–95**, 100 accessibility/best practices/SEO on all six routes. LCP 2.3–2.8 s, TBT 1–69 ms, CLS 0.
- `pnpm audit`: 0 vulnerabilities (was 7).
- Touch targets at 390×844: all ≥ 44 px except the skip link (1×1 until focused) and 20×20 checkboxes inside 44 px label rows.
- Overflow: none at 320/390/768/1440 px on home, about and both sample tools.

**Not done / uncertain:**
- Audit A1 still not run and not self-approved; the evidence pack is preparation only.
- Screen-reader spot check (NVDA/VoiceOver) not done.
- Browser matrix is Chromium only; Firefox, WebKit, Safari, iOS Safari and Android Chrome untested.
- Lighthouse before this session ran through LHCI without compression, which is why it reported 93; the new runner reports 96 because it matches production compression. The older 93 figure should not be compared directly.
- `reports/lighthouse/` is ignored; CI uploads it as an artifact.
- No long-task trace and no heavy-file stress test (no heavy tool exists in P1).

**Problems and risks found:**
- The Session 004 "all checks pass" claim did not cover `pnpm audit`, and `@lhci/cli` had been chosen without an audit pass. Fixed here rather than carried into A1.
- `robots.txt` was missing entirely; the SPA fallback would have returned HTML for `/robots.txt` in production.
- Touch targets were 20–40 px in several places on mobile; the checklist required 44 px.

**Next session should:** run Audit A1 from `docs/audit/CHECKLISTS.md` using the evidence pack, close the copy/brand-asset items, and only then start P2.

**Human review:** [ ] diff read  [ ] approved

### Session 006 — 2026-10-18 — P2 Batch 1 — Buffy
**Goal:** Close Phase 1 using the A1 result, then build the eight text and dev tools in the agreed order and stop at the batch gate.

**Done:**
- Recorded Audit A1 as PASS with no open Must findings, transcribed from the owner's independent run at commit `da0d381`. Added F-013 (browser matrix) and F-014 (screen reader) as Should findings for A2.
- Recorded DEC-07..DEC-12, accepted the Stitch gate for now (DEC-09), kept the wordmark placeholder, and moved P1-13b and all artwork to a new Phase 9 section (DEC-11).
- Documented the Phase 1 gaps in `docs/implementation/IMPLEMENTATION.md`: no OG image, no PWA install icons, no canonical URLs, and no real-deployment test of the update prompt or Cloudflare Pages.
- Added eight `tool-core` modules with tests: `json`, `jwt`, `encoder`, `base`, `password`, `words`, `px`, `diff` (plus a barrel test). No new dependencies; platform APIs and a hand-written Myers diff cover everything.
- Built the eight tools with lazy routes, error and pending states, shared `TextArea` and `OutputActions`: `json-formatter`, `jwt-decoder`, `encoder`, `base-converter`, `password-genny`, `word-counter`, `px-to-rem`, `text-diff`. JSON over 1 MB runs in a worker with four progress stages and terminate-based cancel.
- Drafted the eight registry descriptions (DEC-12) and corrected `produces` for encoder, word-counter, px-to-rem and text-diff.
- Added E2E smoke tests for all eight, the 1 MB worker path, offline JSON and word counting, and axe coverage on all fourteen tool and static routes.

**Features touched:** eight rows in `features.md` moved to ✅. PF-04 note now says eleven tools; PF-09 precache figure updated to 873 kB. PF-10 and PF-24 stay 🟨 (Phase 9).

**Decisions:** DEC-07..DEC-12 recorded as ticked. No new dependencies, so no licence decision was needed.

**Verification:**
- `pnpm lint`, `pnpm typecheck`: pass.
- `pnpm test`: **182 tests in 19 files** pass.
- `pnpm test:coverage`: **96.73% statements, 90.2% branches, 100% functions, 98.03% lines**; thresholds unchanged.
- `pnpm build`: pass. Shell JS **150.8 kB gzip** (budget 200 kB); precache **53 files / 873.2 kB** (budget 8 MiB); 58 build files, none over 20 MiB.
- `pnpm e2e`: **34 pass**, including offline use, the 1 MB worker case, zero third-party requests and axe (0 serious/critical on every route).
- `pnpm lighthouse`: home **96** performance, 100 accessibility/best practices/SEO; other audited routes 91–93 performance. LCP 2.3–2.9 s, CLS 0.
- `pnpm audit`: 0 vulnerabilities (unchanged).

**Descriptions drafted for owner approval:** see the session report; all eight are one sentence, en-GB and written for Omnitool rather than copied from the original.

**Not done / uncertain:**
- The batch gate is not approved; P2-09 stays open for the owner.
- The eight descriptions need owner review before they are treated as final copy.
- The rest of P2 (cron builder, HTTP status, meta tags, regex tester, request builder, Tailwind cheat sheet, decoders, calculators and the remaining typography tools) is untouched.
- F-013 and F-014 remain open: Chromium only, no screen-reader pass.
- Lighthouse still audits six routes; the new tool pages are covered by axe and E2E but not by the Lighthouse budget script.
- Diff is capped at 20,000 units and 2,000 edits per side; the message tells the user to use a coarser mode.
- JSON worker progress is stage-based, not byte-based.

**Problems and risks found:**
- Adding eight modules dropped coverage to 89.31% statements / 83.13% branches. Fixed by testing the JSON scanner and failure paths, not by changing thresholds. One unreachable `atob` catch was removed.
- E2E caught a duplicate accessible name: the base-converter stage and its input were both called "Value". The stage is now "Number".
- `RandomBytes` clashed between `uuid` and `password`; the password type is now `RandomByteSource`.

**Next session should:** wait for the owner's review of the batch and descriptions, then continue the remaining P2 tools; book the screen-reader and cross-browser checks for A2.

**Human review:** [ ] diff read  [ ] approved

### Session 007 — 2026-10-18 — Review preparation — Buffy
**Goal:** Prepare the project for the owner's review and first deployment without changing any tool: a review guide, a Cloudflare Pages runbook, production-like local verification, and drafts for all 97 descriptions.

**Done:**
- Wrote `docs/review/HUMAN-REVIEW-GUIDE.md`: prerequisites and commands with expected numbers, a click-through checklist, the local commit list, the files worth reading and why, and commands that prove there is no attribution text or secret material in history.
- Wrote `docs/deployment/CLOUDFLARE-PAGES.md`: project settings, the Node and pnpm overrides the v3 build image needs, first-deploy checks, CSP/offline/update-prompt checks, rollback and troubleshooting. Cloudflare claims were checked against current Pages docs on 2026-10-18, not memory.
- Verified the production output locally with `wrangler@4.151.1 pages dev apps/web/dist`:
  - 5 header rules parsed; CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` present; COOP and COEP absent.
  - Hashed assets `immutable`; `/sw.js` `no-cache`.
  - 0 CSP violations and 0 page errors in Chromium; service worker active and controlling; 38 Workbox precache manifest entries; offline reload and tool use worked.
  - Unknown path returned `404.html` with status 404; `/tools/text-diff` returned a 308 to the prerendered trailing-slash URL.
- Found a real deployment defect: `_redirects` (`/* /index.html 200`) is rejected as an infinite loop, so Pages ignores it. Alternatives were tested and rejected: `/* / 200` rewrites assets to HTML, and `/tools/* / 200` rewrites prerendered tool URLs to home. All current routes are prerendered, so the site works without the rule; the runbook recommends removing it.
- Drafted 97 descriptions in `docs/review/DESCRIPTIONS-DRAFT.md`, all one sentence, at most 100 characters (longest 90), en-GB. Automated four-word overlap check against the "Original description" column flagged **1** draft (`image-to-pdf`); a second, independently written checker then caught one the first regex had missed (`nato-phonetic`). Both were rewritten; final runs by both checkers flag **0**. The eight Batch 1 drafts match the copy already in the registry so the review table and the live site agree. The registry itself was not edited.
- Recorded P1-15 (`_redirects` decision) and P2-10 (description approval) in `todo.md`.

**Features touched:** none; no tool, UI, dependency or registry change.

**Decisions:** no new decisions. P1-15 and P2-10 are follow-ups for the owner.

**Verification:**
- `pnpm build`: pass; 14 prerendered routes plus 404.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: pass (182 tests, 19 files).
- Wrangler local run as above. `wrangler` was invoked through `pnpm dlx` and was not added to the project.
- Re-ran the Wrangler checks after the final document edits: 5 header rules parsed, 0 valid redirect rules, all five security headers present, COOP/COEP absent, `/assets/*` immutable, `/sw.js` `no-cache`, unknown path `404 text/html`, `/tools/text-diff` `308`, `/tools/text-diff/` `200 text/html`, `robots.txt` `text/plain`. A headless Chromium pass over seven routes produced 0 console errors, 0 page errors, 0 failed requests and 0 CSP violations, with the service worker controlling the page.

**Not done / uncertain:**
- The `_redirects` file is unchanged because this session was documents-only; the owner must remove it or accept the deploy warning.
- Descriptions are drafts; nothing has been written into the registry and no owner approval exists yet.
- The 86 unbuilt tools' descriptions describe intended behaviour, which is based on the feature ledger, not on implemented code.
- No real Cloudflare deployment was made: the runbook's post-deploy checks are written but unexecuted.
- `docs/design/stitch_developer_tool_directory.zip` remains untracked and unused.
- Nothing was pushed.

**Problems and risks found:**
- The SPA fallback in `_redirects` has never worked on Pages; it is silently ignored. This would have surfaced only after the first deploy.
- Cloudflare's v3 build image defaults to Node 22.16.0, below the repository's `>=22.19` engine, and does not detect the pnpm version from the lockfile. Both need explicit environment variables.

**Next session should:** get approval for the descriptions and the batch gate, decide P1-15, then either write the descriptions into the registry or continue the remaining P2 tools.

**Human review:** [ ] diff read  [ ] approved

### Session 008 — 2026-10-18 — Phase 1 shell: Stitch alignment — Buffy
**Goal:** Align the existing Phase 1 shell with the reviewed Stitch layout reference in one bounded change: tokens, typography floor, home, omnibox, tool frame, heavy-tool states, removals, dark screenshots and axe in both themes. No new tools, no artwork.

**Done:**
- **Tokens** (`packages/ui/src/tokens.css`): added `--border-strong` (light `#6b7686`, dark `#6c7a90`), `--success`, `--warning`, `--surface-inset`, `--surface-hover`, and pointed `--input` at `--border-strong`; exposed `--color-border-strong`, `--color-success`, `--color-warning`, `--color-surface-inset`, `--color-surface-hover` through `@theme inline`. `--border` stays for decorative hairlines.
- **Contrast test** (`packages/ui/src/contrast.test.ts`, 64 tests): parses `tokens.css` at run time and computes WCAG ratios in code, asserting foreground, muted-foreground, primary, destructive, success and warning at ≥ 4.5:1 on all four surfaces, primary-on-primary and highlight-foreground-on-Marker at ≥ 4.5:1, `--border-strong` at ≥ 3:1 on all four surfaces, and that the decorative `--border` stays below 3:1. It also asserts that light and dark define the same token set. No token value needed changing: every pair in `DESIGN.md` was confirmed accurate (success light 4.69 paper / 5.37 panel, warning light 5.18 / 5.93, border-strong light 4.03–4.60, dark 3.45–4.17).
- **Design-rule guard** (`scripts/check-design-rules.mjs`, wired into `pnpm lint` as `pnpm check:design`): fails on sub-12 px text (`text-[…]`, `font-size`), all-caps class labels, any shadow other than `shadow-popover`, gradients, icon fonts and ` · ` meta strings. Fixed the four hits it found (an 11 px kbd in the header, `shadow-md` on the select popover, two meta strings in the image converter).
- **Home** (`apps/web/src/pages/home.tsx`, `components/tool-row.tsx`): omnibox hero on `--border-strong` with the `Ctrl K` key shown as a real key cap and a real tool count from the registry; category sections got `--surface-inset` headers with per-category counts; rows keep name, purpose and accepts → produces chips, whole-row link with the focus ring on the row; unbuilt rows read "Not built yet — phase N" and sit on `--surface-inset`. The tagline paragraph was replaced by one factual line ("97 tools. Drop a file here to see which ones can open it.").
- **Omnibox** (`components/omnibox.tsx`, `components/ui/command.tsx`): matching text underlined (never coloured), selected row on Marker with `--highlight-foreground` forced for descendants (muted text on Marker would be 1.79:1 in dark), a dropped-file chip showing name, size and type with a remove button, a first group "Tools that accept this file (n)" that de-duplicates out of the category groups, footer key hints as key caps (no dot separators) and a live result count. Radix Dialog keeps the combobox/listbox roles, focus trap and Escape handling; cmdk keeps arrow navigation and `loop`.
- **Tool frame** (`components/tool-frame.tsx`, new `components/output-row.tsx`): header with name, Share and Reset, then unnumbered stages (Input, Options, Output) separated by 1 px rules with `--surface-inset` stage headers; one action row holding Copy all / Download that is inline on desktop and fixed to the bottom on mobile at 44 px targets; `OutputRow`/`OutputList` give each value its own row (sentence-case label, mono value that wraps or scrolls, per-row Copy) with no ellipsis truncation. Applied to `uuid-genny` (one row per value, per-row copy), `qr-genny` (PNG row, SVG row with "Copy SVG markup", downloads in the action bar) and `image-converter`. Reset is implemented on those three tools; "Send to" is hidden until handoff exists (P7).
- **Heavy-tool states** (`tools/image-converter/*`): the worker now reports a phase (`prepare` / `convert`) with real byte progress through the job helper (`lib/worker/job.ts` grew an optional `phase` argument); the UI shows the codec name and size, a "Fetching" state with a determinate bar and a Cancel that is visible for the whole run, "Ready — cached for this session" after the first successful conversion (module-scope session flag), cancellation returning to "missing", and before/after size rows with a real percentage change computed from the input file and the produced blob. The mock-state control warning does not apply: there is no state switch, only real transitions, and the copy states plainly that this build simulates the fetch.
- **Removals:** no gradients, no icon fonts, no heavy shadows (only `--shadow-popover`), no Marker used as a status colour (the insecure-context banner now uses `--warning` on `--surface`, 5.18:1 light / 10.26:1 dark), no version/engine/benchmark badges, no uppercase section tags, no `//` prefixes, no row IDs, no "Recommended", no status text that is not real state, and no ` · ` meta strings. Nothing in `docs/design/stitch/` was copied: no HTML, class names, Material Symbols, CDN links, fonts, images or copy.
- **Tests:** `tests/e2e/a11y.spec.ts` now runs axe on all fourteen routes in both themes plus the omnibox, empty and with a dropped file (32 runs). New `tests/e2e/visual.spec.ts` adds five dark screenshot baselines (home, `qr-genny`, image-converter first-use, omnibox, omnibox with a dropped file), asserts the computed dark background, that the selected omnibox row is Marker with ink text, that a match is underlined with no fill colour, that the dropped-file chip shows name, size and type, that the mobile action bar is `position: fixed` at the viewport bottom with a 44 px target, and measures the rendered 12 px floor on three routes plus the omnibox in both themes.

**Features touched:** PF-01, PF-02, PF-05 notes updated; PF-09 precache figure updated to 882 kB. No statuses changed.

**Decisions:** DEC-14 to DEC-17 recorded as settled (fonts, radius from `DESIGN.md`, registry as the only source of truth, workflow links out of scope). DEC-13 is left open: the prompt arrived with the placeholder text unedited, so the session proceeded on the objective ("align the shell with the reviewed Stitch design"), and `DESIGN.md` was treated as the source of truth wherever a screen disagreed. No dependency was added or changed, so no licence decision was needed.

**Verification:**
- `pnpm install --frozen-lockfile`: unchanged lockfile, no new packages.
- `pnpm lint`: pass (biome over 133 files + design rules, 0 problems).
- `pnpm typecheck`: pass across all four packages.
- `pnpm test`: **246 tests in 20 files** pass.
- `pnpm test:coverage`: **96.73% statements, 90.2% branches, 100% functions, 98.03% lines**; thresholds unchanged.
- `pnpm build`: pass; 14 prerendered routes plus 404.
- `pnpm check:budgets`: shell JS **151.3 kB gzip** (was 150.8 kB, budget 200 kB); precache **53 files / 881.9 kB** (was 53 / 873.2 kB, budget 8 MiB); 58 build files, none over 20 MiB.
- `pnpm e2e`: **65 pass** (was 34). Two consecutive runs pass with the same baselines.
- axe: 0 serious/critical in light and dark on all fourteen routes and the omnibox (including with a dropped file).
- `pnpm lighthouse`: home **96** performance, **100** accessibility, best practices and SEO; tool pages **91–93** performance; LCP 2.26–2.95 s, CLS ≤ 0.001.

**Not done / uncertain:**
- The Stitch `screen.png` files were not visually inspected: this agent has no image-viewing tool. Structure was read from the review documents and from the HTML layout (classes and element order), which is exactly the material the reviews describe. Anything that depends on the screenshots' fine appearance (spacing rhythm, exact column split) is unverified.
- The three stages stay one column, matching the wording in `DESIGN.md` ("three stages: Input | Options | Output separated by 1 px rules") rather than the two-column split in the desktop screens; on mobile the action bar is fixed to the viewport bottom, not inside the output stage.
- "Send to" is hidden rather than shown disabled, because `DESIGN.md` says it appears "when handoff is available".
- Reset is implemented on the three sample tools only; the eight Batch 1 tools share the new frame but have no Reset button yet.
- The QR tool's rows describe the two images and offer "Copy SVG markup" instead of per-row Copy of binary data.
- The codec download in the image converter is still simulated (2.0 MB, labelled as a sample); only the state transitions are real.
- Screenshot baselines are Chromium on Linux; a different platform or font stack will need `--update-snapshots`.
- `docs/design/stitch_developer_tool_directory.zip` remains untracked and unused.
- Nothing was pushed; `_redirects` (P1-15) is still unchanged.

**Problems and risks found:**
- Contrast in dark mode would have failed on the Marker row if the item's muted text had been kept: muted on Marker is 1.79:1 in dark. The item now forces `--highlight-foreground` on its descendants.
- `packages/ui` had no Node types, so the new contrast test could not read `tokens.css`; `packages/ui/tsconfig.json` now sets `types: ["node"]`, matching the root and `apps/web` configs.
- A uuid-genny screenshot baseline was not viable (random values); the tool-page baseline uses `qr-genny`, which is deterministic.

**Next session should:** continue the remaining P2 tools, decide P1-15 and DEC-13, finish the per-tool Reset work, and keep the new design checks in mind when adding UI.

**Human review:** [ ] diff read  [ ] approved

### Session 011 — 2026-10-19 — P2 Batch 2 (continued) — Buffy
**Goal:** Finish P2 Batch 2: build `unit-converter`, `time-calc`, `line-height-calc`, `typo-calc` and `paper-sizes`, each with pure logic and tests in `packages/tool-core`, a thin React UI, registry wiring and E2E coverage; then record the batch gate without starting a later phase.

**Done:**
- **Shared rounding** (`packages/tool-core/src/number/index.ts`): one `roundTo` helper; `px` re-exports it so existing imports and tests keep working.
- **Unit converter** (`packages/tool-core/src/units/`): eleven categories (length, mass, temperature, area, volume, speed, time, data, angle, pressure, energy) with exact factors; temperature uses `(value - offset) * factor` so Celsius, Fahrenheit, Kelvin and Rankine round-trip; `convert` and `convertAll` with 0–12 decimal places and typed errors. UI: category, value, from/to, swap, precision, result and a full-unit table with the target row highlighted.
- **Time calculator** (`packages/tool-core/src/time/`): `parseDuration` for `1h 30m`, `1:30`, `90s`, `2d 4h` and long unit names; `splitDuration`, `formatDuration`, `formatClock`; `difference`; zone-aware `parseZonedDateTime`, `formatZonedDateTime` and `formatOffset` using `Intl` (no dependency). Ambiguous wall-clock times resolve to the earlier instant; times inside the spring-forward gap move forward by the change. Tests cover both London DST days (23 h and 25 h). UI: duration arithmetic, a start/end comparison with an IANA zone field and a datalist, and a seconds breakdown.
- **Line height** (`packages/tool-core/src/line-height/`): `fromRatio` and `fromBaseline` produce unitless, px and rem, with a WCAG 1.4.12 warning below 1.5 and a baseline table. UI shows the three values, a CSS snippet and the baseline table.
- **Type scale** (`packages/tool-core/src/type-scale/`): eight named ratios, custom ratio, base and root sizes, steps up and down (capped at 16 sizes), px and rem per step, `--text-minus-N` / `--text-0` / `--text-N` custom properties and a `:root` CSS block. UI: preset picker, ratio, sizes, steps, table and CSS block.
- **Paper sizes** (`packages/tool-core/src/paper/`): ISO A, B and C series (0–10) plus Letter, Legal, Tabloid, Executive, Half Letter and Junior Legal; conversion to inches, points and pixels at 72, 96 and 300 dpi. UI: series filter, full table and a plain-text export.
- **Wiring:** `packages/tool-core/src/index.ts` exports the five modules; `apps/web/src/lib/tool-modules.ts` and its unit test list nineteen tools; the five registry rows gained the drafted descriptions (still `draft` in `docs/review/DESCRIPTIONS-DRAFT.md`, whose four affected drafts and intro were corrected to match what was built); `tests/e2e/batch2.spec.ts` gained fourteen tests, and `reset.spec.ts` and `a11y.spec.ts` cover the five new routes.
- No dependency was added. No artwork, no emoji, British English throughout, 12 px floor kept.

**Features touched:** `unit-converter`, `time-calc`, `line-height-calc`, `typo-calc`, `paper-sizes` ⬜ → ✅; PF-04 note updated to nineteen implemented tools.

**Decisions:** none new. Description ownership stays with DEC-12; approval is still P2-10.

**Verification:**
- `pnpm lint`: pass (biome over 161 files plus design rules, 0 problems).
- `pnpm typecheck`: pass across all five workspace projects.
- `pnpm test`: **347 tests in 28 files** pass (was 288).
- `pnpm build`: pass; **22 routes** prerendered plus `404.html`; PWA precache 46 entries / 893 KiB.
- `pnpm check:budgets`: shell **156.6 kB gzip** (budget 200 kB), precache **949.1 kB** (budget 8 MiB), 73 build files, all checks passed.
- `pnpm e2e --workers=4`: **116 passed** (Chromium). This includes 14 Batch 2 tests, Reset on all nineteen routes, axe in light and dark on the five new routes, the offline check and the unchanged visual baselines.
- `pnpm exec playwright test tests/e2e/a11y.spec.ts tests/e2e/reset.spec.ts --workers=4`: 69 passed.

**Not done / uncertain:**
- Descriptions for all 97 tools remain `draft`; P2-10 and the Batch 2 gate approval are still human decisions.
- `time-calc` does not convert Unix timestamps, which the original tool did; it covers durations, elapsed time between zoned date-times and a seconds breakdown.
- `typo-calc` builds a modular scale rather than converting points, picas, ems and millimetres; the registry description was corrected to say so.
- `line-height-calc` takes a font size and ratio or baseline, not a text measure; the draft description was corrected accordingly.
- `paper-sizes` includes six common US sizes, not the full ANSI A–E set.
- The project has no image-viewing tool, so the new UIs were checked structurally and through axe and Playwright, not visually reviewed by a human.
- Visual baselines were not regenerated; none of the reviewed screens changed.
- Session entries 009 and 010 are absent from this log even though `todo.md` cites Session 010 for the Morse, NATO and Braille work; that gap predates this session.
- Nothing was committed or pushed.

**Problems and risks found:**
- The paper-size table overflowed at the 1280 px test viewport, and axe reported `scrollable-region-focusable`. `tabIndex` on the scroll container is rejected by Biome's `noNoninteractiveTabindex`, so the table cells were allowed to wrap instead, which removes the overflow rather than papering over it.
- `getByLabel` matches substrings, so several E2E locators collided with the category rail and section headings; they now use roles or `exact: true`.
- `DEFAULT_ROOT_FONT_SIZE` and `ConversionRow` already existed in `px`, so the new modules import the former rather than re-exporting it and rename the latter to `UnitConversionRow`; duplicate star exports would otherwise be ambiguous.

**Next session should:** continue with the remaining P2 rows (`cron-builder`, `http-status`, `meta-tag-genny`, `regex-tester`, `request-builder`, `tailwind-cheatsheet`, `code-genny`, `decoder`, `markdown-writer`, the remaining calculators and the Turbo-nerd rows), or pause for the owner review of the 97 descriptions that P2-10 requires.

**Human review:** [ ] diff read  [ ] approved

### Session 012 — 2026-10-19 — P2 (design fix pass) — Buffy
**Goal:** Fix the home and omnibox deviations in `docs/design/BUILT-VS-DESIGN.md` in one bounded change: single Marker selection, planned-tool handling, header/hero entry point, row anatomy, contrast, housekeeping. No new tools, dependencies or artwork.

**Done:**
- **One source of truth** (`apps/web/src/lib/tool-modules.ts`): `IMPLEMENTED_TOOL_IDS` and `IMPLEMENTED_TOOL_COUNT` derive from `TOOL_LOADERS`; `isToolImplemented`/`loadTool` use own-property checks. A new unit test compares the loader ids with the registry and fails on either mismatch.
- **Home** (`pages/home.tsx`, `components/tool-row.tsx`): 19 built tools by default, 78 planned behind `Show planned tools (78)` / `Hide planned tools (78)` with `aria-expanded`/`aria-controls`. Hero reads “19 tools available, 78 planned”. Category headers and rail show available counts (rail adds an “Available” heading and the full available/planned text for assistive technology). Planned rows are non-focusable divs with a “Planned” badge only; “Not built yet — phase N” is gone. A planned-only category explains its empty state. Row anatomy: whole-row link, 16 px/500 name, description from the registry (omitted when empty), glyphs, 44 px minimum, 55 px desktop with a description (95 px mobile). `Show all` is 40 px.
- **Omnibox** (`components/omnibox.tsx`, `components/ui/command.tsx`): Marker styling moved from `data-selected` presence to `[aria-selected="true"]`; `disablePointerSelection` keeps hover on `--surface-hover`; Tab is translated into arrow movement; Enter opens the selected built tool. Built results are grouped first; planned matches are a muted non-interactive `Planned (N)` group (not options, not focusable). Option rows are 40 px desktop / 54 px mobile at 6 px radius; footer says “Tab Move” and “N available, M planned”.
- **Header** (`shell/header.tsx`): compact 177×40 px “Find tool Ctrl K” button; hero is the only full-width search control.
- **Planned routes** (`app/router.tsx`, `pages/planned-tool.tsx`, `lib/document-meta.ts`): `/tools/<planned-id>` renders a planned page with a home link and `meta[name="robots"] = noindex` (restored on leave); unknown ids still 404.
- **Prerender** (`scripts/prerender.mjs`): route list now comes from `tool-modules.ts`, with checks for missing directories and orphan directories; output reports `78 planned routes excluded`.
- **Housekeeping:** `docs/design/built/` added to `.gitignore` and Biome's ignore list; lint is warning-free. Theme-toggle and toast-close radii corrected to 6 px. Visual baselines regenerated for the five changed dark shots.
- **Docs:** `docs/design/BUILT-VS-DESIGN.md` gained a “Fix pass” section with before/after numbers for H1–H7 and every fixed row, the deferred list and the check results.

**Features touched:** PF-01 (note: compact header), PF-02 (note: planned toggle, truthful counts), PF-05 (note: single Marker, planned group), PF-09 (precache 898 kB), PF-10 (note: planned routes excluded, noindex). No statuses changed.

**Decisions:** the PLANNED and HEADER decisions in the prompt were applied as written. Three drafted descriptions (`image-converter`, `uuid-genny`, `qr-genny`) were moved into the registry so every built row has a purpose; they remain drafts under P2-10, following the Batch 1/2 precedent. C-18 (toast placement) and the tool-page stage/control geometry were not changed because they are outside this bounded scope.

**Verification:**
- `pnpm install --frozen-lockfile` pass; lockfile unchanged.
- `pnpm lint` pass, **0 warnings** (165 files + design rules). `pnpm typecheck` pass.
- `pnpm test:coverage`: **348 tests / 28 files**, 97.06% statements, 90.8% branches, 99.5% functions, 98.22% lines.
- `pnpm build`: 22 routes + `404.html`, 78 planned routes excluded, precache 46 entries / 897.63 KiB. `pnpm check:budgets`: shell **157.5 kB gzip**, precache **953.4 kB**, 73 files.
- `pnpm e2e --workers=4`: **133 passed**, including offline, no third-party request, the 50 axe runs in both themes (the planned page is included), and the new `design.spec.ts` and `omnibox.spec.ts`.
- New E2E proves, in both themes, that Marker rows equal `aria-selected` rows and never exceed 1 in the empty, `pdf` and dropped-PNG states; that hover does not select; that Tab/arrows/Enter work; that omnibox text passes 4.5:1 in all three states; that the toggle/counts/planned labels are correct; that no `/not built|phase \d/i` text appears on any page or omnibox state; that planned routes are not prerendered; and that the planned page is noindex with a home link.
- `pnpm lighthouse`: 22 mobile routes, accessibility/best practices/SEO **100**. The first run **failed** with `/tools/uuid-genny/` performance **86** (TBT 149 ms, LCP 3.31 s); an immediate repeat with no code change scored **90** and the whole suite 90–96, and the final build again scored 90–96 (LCP 2.26–3.11 s, CLS ≤ 0.011). The route is borderline; one of three runs failed the 90 threshold, so this is reported rather than claimed as a clean pass on every run.
- Audit rerun: 45 screenshots (44 required + selected text) and 32 page states with 12 omnibox states. H1 1/1, 0/0, 1/1; row 55 px/16 px/500; 8 built rows in the first 900 px desktop; 0 enabled contrast failures; 0 roadmap strings.

**Not done / uncertain:**
- Planned descriptions for the other 78 tools are still empty; revealed rows show name + “Planned” only. P2-10 approval is still outstanding.
- Three descriptions are now live as drafts without explicit owner approval.
- C-12 (two-stage tool pages), the remaining D-09/D-13 tool-page control geometry and C-18 toast placement are deferred with reasons recorded in `BUILT-VS-DESIGN.md`.
- The mobile omnibox option row is 54 px. `DESIGN.md` asks for 44 px on mobile and 40 px on desktop, so 54 px exceeds the mobile target; Session 013 confirmed this is kept and corrected the wording rather than shrinking the row.
- Direct planned URLs can return the static 404 shell with a 404 status on Cloudflare Pages before hydration; the visible page is the planned page, and that shell is noindex.
- No screenshot or Stitch image was viewed; no visual match is claimed.
- Visual baselines only exist for Chromium on Linux.
- **Nothing was committed.** The working tree still contains the uncommitted Batch 2 work from Session 011 (five untracked tool directories, `tool-core` exports and its specs). Committing only this fix would reference those untracked tools in `tool-modules.ts` and leave a broken checkout, so the changes are left in the working tree for the owner to review and commit together.

**Problems and risks found:**
- The rail’s first aria-label attempt failed axe `label-content-name-mismatch` because the visible “0” was not in the accessible name. The count now carries visually hidden “available, N planned” text instead of an overriding label.
- The audit’s dark row-hover measurement was flaky until a settle delay was added; the after data now reads `rgb(32, 39, 51)`.
- `rounded-control` alone lost to `rounded-lg` in the compiled CSS for the theme toggle; the two overrides use `rounded-control!`.
- The new 40 px planned-tools toggle measured 40 px on mobile because `min-h-10` beat the coarse-pointer rule. Switched to `h-10`, and the planned-page home link to `h-11 md:h-10`; both now measure 44 px at 390×844.

**Next session should:** get P2-10 approval for the descriptions, decide C-18 (toast position) and whether two-stage tool pages are allowed, and continue the remaining P2 tools.

**Human review:** [ ] diff read  [ ] approved

### Session 013 — 2026-10-19 — P2 (wrap-up) — Buffy
**Goal:** Safely commit the two uncommitted sessions, prove each commit alone, then make the five agreed follow-up fixes and run the full checks on the final tree.

**Done:**
- **Commit safety**, in three commits split by hunk where registry, loader, test and axe files contained both sessions:
  - `5acd622` `feat(tools): add braille, unit, time, typography and paper tools` (27 files).
  - `867d40e` `fix(web): align home and omnibox with the measured design rules` (30 files).
  - `b6eb6d9` `docs: record Batch 2 and the home/omnibox fix pass` (5 files).
- **Follow-up commits**, one per agreed fix, followed by this session's documentation commits (record, then reconciliation with the final check run):
  - `7042d0f` `fix(web): place toasts clear of the rail and mobile action bar` (3 files).
  - `b299df6` `fix(web): keep planned URLs as 404 with a neutral static shell` (2 files).
  - `b5c424c` `perf(ci): use three-run Lighthouse medians per route` (1 file).
- **Isolated proofs.** Temporary worktrees at each of the six code commits, frozen install, lint, typecheck and unit tests: all six passed. The first commit had 347 tests; the other five had 348. Worktrees removed.
- **Toast** (`shell/update-prompt.tsx`, `docs/design/DESIGN.md`, `tests/e2e/toast.spec.ts`): bottom-right desktop, above the sticky action bar on mobile (`calc(5rem + env(safe-area-inset-bottom))`). E2E asserts no intersection with the rail Collapse control at 1440×900 and with `[data-slot="tool-actions"]` at 390×844, in both themes. Measured clearance: desktop toast x 1129–1424 vs Collapse x 8–231; mobile toast bottom 764 px vs action bar top 779 px.
- **Planned URLs** (`scripts/prerender.mjs`, `tests/e2e/planned-url.spec.ts`): `404.html` now has title `Omnitool`, the home description, `noindex` and an empty visible body. A Pages-like static server returns status 404 for `/tools/colour-converter`; the static body text is empty, with no “Page not found” or “404”. The hydrated planned page still shows the planned message and home link.
- **Mobile omnibox note:** 54 px kept; `DESIGN.md` asks for 44 px on mobile, so the row meets the mobile target and exceeds it by 10 px because of its two lines. Wording corrected in `BUILT-VS-DESIGN.md` and this log; no code changed.
- **Lighthouse** (`scripts/lighthouse.mjs`): three runs per route, median and minimum per category, failure on median below 90 (thresholds unchanged), lowest-run reports and a UUID analysis. All 22 routes passed; see `BUILT-VS-DESIGN.md` section 9.
- **Docs:** `docs/design/BUILT-VS-DESIGN.md` section 9; DEC-18, DEC-19 and DEC-20 in `todo.md`; P1-18 ticked. The existing Session 012 mobile-row note was corrected.

**Features touched:** no new tools or feature statuses. PF-09/PF-10 notes remain accurate.

**Decisions:** DEC-18 (toast placement), DEC-19 (planned URLs keep 404), DEC-20 (Lighthouse median of three at ≥90, minimum reported) accepted as written.

**Verification on the follow-up tree:**
- `pnpm install --frozen-lockfile`: pass.
- `pnpm lint`: pass, **0 warnings** (167 files + design rules).
- `pnpm typecheck`: pass.
- `pnpm test:coverage`: **348 tests / 28 files**, 97.06% statements, 90.8% branches, 99.5% functions, 98.22% lines.
- `pnpm build`: 22 routes + `404.html`, 78 planned routes excluded, precache 46 entries / 897.83 KiB.
- `pnpm check:budgets`: shell **157.6 kB gzip**, precache **953.6 kB**, 73 files.
- `pnpm e2e --workers=4`: **138 passed**, including offline, no-third-party-request, 50 axe runs and the new toast and planned-URL tests.
- `pnpm lighthouse`: **22 routes × 3 runs**; medians 90–96 performance, 100 accessibility/best-practices/SEO; minimum performance 90 (four routes: `json-formatter`, `morse-code`, `password-genny`, `uuid-genny`), lowest minimum 91 (`encoder`, `line-height-calc`, `time-calc`, `unit-converter`).
- UUID lowest run: performance 90, LCP 3044 ms on the description paragraph, TBT 31 ms; 112 ms shared-shell long task and 64 ms route long task; Script Evaluation 196 ms, Style & Layout 138 ms, Other 120 ms. The three runs were 90/90/90 with LCP 3042–3047 ms and TBT 30–31 ms.

**Not done / uncertain:**
- With JavaScript disabled, a planned URL now shows a blank neutral shell (by decision) rather than the planned message. Hydration renders the planned page.
- `/tools/uuid-genny/` sits exactly at the 90 performance threshold; three runs were stable at 90, but there is little headroom. The earlier 86 is attributed to environment noise because TBT jumped to 149 ms with no code change.
- The toast E2E waits for the real service-worker `offlineReady` event (20 s timeout); it does not inject fake state.
- No screenshot or Stitch image was viewed; no visual match is claimed.
- Tool-page stage anatomy and control geometry remain deferred from Session 012.
- Nothing was pushed.

**Problems and risks found:**
- One Lighthouse run before the three-run budget scored `uuid-genny` 86 and exited 1. The median budget reports the minimum and does not hide that run; subsequent runs were 90.
- Splitting the two sessions required temporary intermediate versions of `tool-modules.ts`, its test, `a11y.spec.ts` and `registry.seed.json`; each commit was still proved in isolation.
- The static 404 shell has no visible fallback for no-JS visitors. This follows the no-false-404 decision but is worth reviewing.

**Next session should:** get owner review of the commits and DEC-18–20, then continue the remaining P2 tools. No phase gate is claimed.

**Human review:** [ ] diff read  [ ] approved

### Session 014 — 2026-10-20 — P1 follow-up (LCP investigation) — Buffy
**Goal:** Explain the LCP on tool pages without touching thresholds: report the LCP element, its subparts and the primary font's loading for `/tools/uuid-genny/` and two other tool routes; apply the smallest fix if render delay or font loading dominates; measure three runs per route before and after.

**Done:**
- Measured the committed tree and the fixed tree with one harness (a temporary copy of `scripts/lighthouse.mjs`'s server and Chrome flags; deleted afterwards). Three runs per route, medians reported.
- LCP element on all three routes is the registry description paragraph (`article.mx-auto > header.mb-4 > div.min-w-0 > p.prose-measure`), i.e. text. Load delay and load time are 0 ms; the gap was TTFB (3–4 ms) plus 680–706 ms of element render delay.
- Font audit: Schibsted Grotesk Variable latin, 46,752 bytes, `font-display: swap`, variable 400–900. It was **not** preloaded and only requested at 687 ms, after the shell's CSS and JS.
- `apps/web/vite.config.ts`: added a `preloadPrimaryFont()` plugin that emits `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the latin Schibsted file. The font now starts at 11 ms. On its own this moved FCP by about 150 ms but **did not move LCP** (3043–3053 ms), so font loading was not the LCP driver.
- `scripts/prerender.mjs`: each tool page now emits `modulepreload` links for its route chunk and shared imports from `.vite/manifest.json`. Chunks were previously requested at ~565 ms (after the shell evaluated its dynamic import) and now start with the HTML at ~20 ms. The script throws if a route in `tool-modules.ts` is missing from the manifest.
- Wrote the investigation up in `docs/design/BUILT-VS-DESIGN.md` section 10, including the failed gate attempt.

**Features touched:** none; no feature status changes.

**Decisions:** none. Thresholds unchanged (DEC-20 still stands).

**Verification:**
- `pnpm lint`: pass, 0 warnings (167 files + design rules).
- `pnpm typecheck`: pass.
- `pnpm test`: **348 passed / 28 files**.
- `pnpm build`: 22 routes + `404.html`; font preload present in every page, route `modulepreload` chain on tool pages only.
- `pnpm check:budgets`: shell 157.6 kB gzip (budget 200), precache 964.2 kB, 73 files — pass.
- Focused Lighthouse, median of three, before → after: `uuid-genny` LCP 3049 → 2720 ms, performance 90 → 93; `json-formatter` 3044 → 2724 ms, 90 → 93; `qr-genny` 2744 → 2719 ms, 93 → 93. Element render delay fell 691 → 574, 680 → 579, 706 → 593 ms.
- **`pnpm lighthouse` (22 routes) did not pass on this machine.** Every route scored 58–72 performance with TBT 900–1200 ms, versus 90–93 minutes earlier; the same reports show document response time 73–90 ms (normally 3–4 ms) and Script Evaluation ~1525 ms (normally ~195 ms). A control run of the unmodified HEAD under the same conditions scored `uuid-genny` **54** with LCP 3650 ms, so the collapse is host contention, not the change. It is recorded as not passed and needs a re-run on a quiet host.

**Not done / uncertain:**
- LCP is still 2719–2724 ms, above the 2500 ms "good" threshold. About 574–593 ms is render delay caused by the shared shell (`index-*.js`, 105 kB gzip) evaluating and hydrating before the route text paints. Splitting the shell is a larger change and was not attempted.
- The full gate has not been re-run successfully; no phase gate is claimed.
- TBT rose (29 → 49 ms on `uuid-genny`, 70 → 111 ms on `qr-genny`) because route-chunk work now happens earlier. Still far under 200 ms.
- Only three routes were measured in the paired before/after runs; the other 19 were only in the (environmentally invalid) gate attempt.
- Measurement is one machine, headless Chrome, emulated mobile; the fail/retry state of the host was not under my control.

**Problems and risks found:**
- The host's performance became unusable for Lighthouse during the session (same build, 7x script-evaluation time, server TTFB ~20x). Any future gate run should check for this before trusting the scores; the control-run method above distinguishes environment from code.
- Preloading the route chunk chain duplicates information already in the Vite manifest, so the prerender step now fails loudly if the manifest and `tool-modules.ts` disagree — deliberate, but it makes the build stricter.
- The font preload is kept even though it does not improve LCP: it removes a 687 ms font fetch from FCP and the 45.7 kB file is fetched once, but it is one more head tag on every page.

**Next session should:** re-run `pnpm lighthouse` on a quiet machine and confirm the 22-route table; then decide whether splitting the shell is worth a measured attempt.

**Human review:** [ ] diff read  [ ] approved
