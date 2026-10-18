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
