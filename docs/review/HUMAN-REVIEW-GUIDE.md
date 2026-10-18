# Human review guide

Written 2026-10-18 for the owner's review of Phase 1 (foundations) and Phase 2 Batch 1 (eight text and dev tools). Nothing has been pushed; the repository has a local `origin` pointing at `https://github.com/Akash-Das26/Omnitool.git`.

## 1. What is in this repository

- pnpm workspace: `apps/web` (React 19 + Vite 8 single-page app), `packages/tool-core` (framework-free logic), `packages/tools-registry` (typed catalogue of 97 tools), `packages/ui` (tokens and primitives), `packages/config` (shared TypeScript config).
- Eleven working tools: the three Phase 1 samples (`uuid-genny`, `qr-genny`, `image-converter` stub) and the eight Batch 1 tools (`json-formatter`, `jwt-decoder`, `encoder`, `base-converter`, `password-genny`, `word-counter`, `px-to-rem`, `text-diff`).
- 86 tools still show on the home index as planned, ordered by phase, and are not links.
- Static, local-only: no backend, no analytics, no third-party runtime requests except user-initiated ones.
- Brand artwork is intentionally absent (deferred to Phase 9 under DEC-11). The wordmark is plain text.

## 2. Prerequisites and commands

Node 22.19 or newer is required (`lighthouse` 13 needs it); `.nvmrc` contains `22`. pnpm is pinned in `package.json` as `pnpm@11.24.0`.

```bash
nvm use                 # or install Node >= 22.19 yourself
corepack enable         # provides the pinned pnpm
pnpm install --frozen-lockfile
```

| Task | Command | Expected |
|------|---------|----------|
| Dev server | `pnpm dev` | Vite on `http://localhost:5173`, home index with 97 rows |
| Production build | `pnpm build` | `apps/web/dist`, "prerender: wrote 14 routes plus 404.html" |
| Preview the build | `pnpm preview` | `http://localhost:4173`, the built app |
| Lint and format check | `pnpm lint` | Biome, no output beyond the checked count |
| Types | `pnpm typecheck` | tsc for root config and four packages |
| Unit and component tests | `pnpm test` | 182 tests in 19 files |
| Coverage | `pnpm test:coverage` | statements 96.73%, branches 90.2%, functions 100%, lines 98.03% |
| Browser tests | `pnpm e2e` | 34 tests, including offline, axe and the 1 MB JSON worker case |
| Budgets | `pnpm check:budgets` | shell 150.8 kB gzip, precache candidates 53 files / 873.2 kB, 58 files (Workbox precaches 38 entries; prerendered route HTML is served through the SPA fallback) |
| Lighthouse | `pnpm lighthouse` | six routes audited; home 96 performance, 100 elsewhere |
| Feature counts | `pnpm features:progress` | 23 done, 4 in progress, 98 not started, 2 out of scope |

`pnpm e2e` and `pnpm lighthouse` start their own local servers and need Chromium/Chrome installed.

## 3. Click-through checklist

Run `pnpm dev` (or `pnpm build && pnpm preview` for the production bundle) and work through these.

### Home and navigation
- [ ] Home lists tools grouped by category, without a card grid; rows show accepts → produces glyphs.
- [ ] The eight Batch 1 tools are links and show a one-line description; planned tools are marked with their phase and are not links.
- [ ] Category filter updates the URL (`?category=pdf`) and survives a reload; `?category=nonsense` falls back to all categories.
- [ ] A file dropped on the home hero filters the index to tools that accept it.

### Omnibox
- [ ] `Ctrl+K` (or `Cmd+K`) opens the dialog and focuses the search field.
- [ ] Typing `json` lists JSON Formatter; choosing it navigates to `/tools/json-formatter`.
- [ ] Typing a file type (for example `image/`) filters by accepted type.
- [ ] `Escape` closes the dialog; focus returns sensibly.
- [ ] Planned tools appear disabled rather than linking to a missing page.

### Theme and shell
- [ ] The theme toggle switches light and dark, and the choice survives a reload.
- [ ] Reloading in dark mode does not flash light first (the pre-paint `theme.js` runs before React).
- [ ] Tab from the top of the page reveals "Skip to content"; the focus ring is visible.
- [ ] At 320 px wide there is no horizontal scrolling; controls remain at least 44 px tall on touch.

### Sample tools
- [ ] `uuid-genny`: Generate gives five v4 UUIDs; v7 and Nano ID work; Copy all and Download .txt work.
- [ ] `qr-genny`: a QR code renders from the default URL; size, margin and error correction change it; PNG and SVG downloads work.
- [ ] `image-converter`: choose `tests/fixtures/sample.png`; Convert shows progress; Cancel stops it; converting again produces a download. This is a labelled stub: the codec download is simulated and encoding uses the browser canvas.

### Batch 1 tools
- [ ] `json-formatter`: invalid JSON gives a line and column; Format indents; Minify compacts; Validate reports valid JSON.
- [ ] `jwt-decoder`: paste a token and see header, payload, claims and times; the signature is shown but explicitly not verified.
- [ ] `encoder`: Base64, URL, HTML entity and hex encode and decode; accented text and emoji round-trip.
- [ ] `base-converter`: 255 in base 10 becomes FF in base 16; an invalid digit names the digit and the allowed range.
- [ ] `password-genny`: Generate produces a 20-character password by default; options change the character mix; nothing is stored (check Application → Local Storage).
- [ ] `word-counter`: counts update as you type; reading and speaking times are shown.
- [ ] `px-to-rem`: 16 px is 1 rem at the default root; changing the root to 10 px makes 24 px equal 2.4 rem.
- [ ] `text-diff`: two versions compare by line, word or character; inline and side-by-side views mark removed and added text.

### Offline, 404 and static pages
- [ ] Load the app, wait a moment for the service worker, then go offline in DevTools → Network and reload. Home still renders; `json-formatter` still formats.
- [ ] `pnpm e2e --grep offline` passes without manual DevTools work.
- [ ] A nonsense URL such as `/not-a-page` shows the Omnitool not-found page with a 404 status (verified locally through Wrangler).
- [ ] `/privacy` and `/about` are readable and list their licences; `/robots.txt` returns plain text.

### Security headers (production-like)
`pnpm preview` does not apply `_headers`. Use Wrangler:

```bash
pnpm build
pnpm dlx wrangler@4.151.1 pages dev apps/web/dist --port 8788
curl -sSI http://127.0.0.1:8788/ | sed -n '1,20p'
```

Expect `content-security-policy`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy` and `permissions-policy`; there must be **no** `cross-origin-opener-policy` or `cross-origin-embedder-policy`. Wrangler prints a redirect warning — see `docs/deployment/CLOUDFLARE-PAGES.md`, section 3; it is a real finding, not a local quirk.

## 4. Local commits

`git log --oneline` at the time of writing (newest first). The commit containing this guide is the newest one and is not listed.

```
e1b6928 docs: correct the module count in the Batch 1 log
a901fda docs: record Batch 1 and the Phase 1 close-out
f63f1ad test(tool-core): cover the scanner and failure paths
be0572e feat(web): add the eight Batch 1 text and dev tools
587ae78 feat(tool-core): add logic for the first eight text and dev tools
6d1bd8d docs: record the A1 pass and the decisions that unblock Phase 2
da0d381 docs: record the audit fixes and pre-audit evidence
2f7ab1e fix(web): meet 44px touch targets and serve a real robots.txt
932d5dd fix(tooling): run Lighthouse directly to clear vulnerable dev dependencies
37f28aa docs: align the ledger and implementation notes with the build
e051249 docs: refresh the measured build budgets
b0f5bcc fix(web): declare British English in the PWA manifest
6240447 feat(tools-registry): expose icon and href on tool entries
bf5cf6c docs: correct the lint result in the session log
d9d9d86 docs: record Phase 1 delivery, budgets and review items
fbf0902 test(e2e): cover tools, offline mode, a11y and network isolation
0b9dc94 feat(web): add the registry-driven shell, home index and sample tools
be1a410 feat(ui): add design tokens and theme helpers
18c2e33 feat(tools-registry): validate the seed and derive navigation data
1a8a8f3 feat(tool-core): add UUID, QR and file helpers with tests
a15b475 chore: set up the pnpm workspace and quality toolchain
```

Useful slices:
- Phase 1 shell and samples: `git show --stat 0b9dc94`.
- Batch 1 logic: `git show --stat 587ae78`.
- Batch 1 UI, registry copy and E2E: `git show --stat be0572e`.
- Everything since the first commit: `git diff a15b475..HEAD --stat`.

## 5. Files most worth reading

| File | Why |
|------|-----|
| `packages/tools-registry/data/registry.seed.json` | The catalogue that drives routes, home, omnibox and prerendering; eight descriptions are now real copy, the rest are blank pending your approval. |
| `packages/tools-registry/src/index.ts` | Valibot validation of the seed and the derived search, category and file-matching data. |
| `packages/tool-core/src/json/index.ts` | Formatting, minifying, and a hand-written scanner so errors always get a line and column even when the engine omits one. |
| `packages/tool-core/src/diff/index.ts` | Myers diff, tokenisation and the caps that stop pathological input exhausting memory. |
| `packages/tool-core/src/password/index.ts` | Rejection sampling for unbiased random indexes; the local passphrase word list; no logging or storage. |
| `packages/tool-core/src/jwt/index.ts` | Base64URL and UTF-8 decoding with explicit refusals; decode only, no verification. |
| `apps/web/src/lib/worker/job.ts` | The Comlink job wrapper: proxy progress, terminate-based cancel, one worker per job. |
| `apps/web/src/lib/tool-modules.ts` and `apps/web/src/app/router.tsx` | The lazy import map and registry-driven routing with `defaultPreload: 'intent'`. |
| `apps/web/src/tools/json-formatter/` | The one tool that switches to a worker above 1 MB, including progress stages and cancel. |
| `apps/web/src/styles/app.css` | Token wiring, no-flash theme rules and the coarse-pointer touch-target rules. |
| `apps/web/public/_headers` and `_redirects` | The security policy, cache rules and the redirect rule discussed in the deployment runbook. |
| `apps/web/vite.config.ts` | PWA precache policy, runtime caching and the 2 MiB per-file limit. |
| `scripts/prerender.mjs`, `scripts/check-build-budget.mjs`, `scripts/lighthouse.mjs` | Per-route HTML and meta, the size gates, and the Lighthouse budget runner. |
| `tests/e2e/` | The behaviour the app promises: offline, no third-party requests, axe on every route and the worker path. |
| `docs/implementation/IMPLEMENTATION.md` | Architecture and the measured budgets per phase. |
| `docs/review/DESCRIPTIONS-DRAFT.md` | The 97 descriptions awaiting approval; the registry is unchanged until you approve them. |

## 6. Confirm no attribution text or secrets in history

All commands run at the repository root. Expect the first three to print nothing; the fourth prints only the repository's own 77-byte PNG fixture (`tests/fixtures/sample.png`), which is generated test data.

```bash
# AI attribution, co-author and generator trailers anywhere in history
git log --all --format='%B' | grep -Ein 'codebuff|generated with|co-authored-by|noreply@|🤖'

# Likely secret shapes in every patch ever committed
git log --all -p | grep -nE 'sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{20,}'

# Environment files and credential-looking filenames in the tree
git ls-files | grep -Ei '(^|/)\.env|secret|credential|\.pem$|\.key$'

# History contents: no real user data or fixtures from outside the repo
git log --all --stat | grep -Ei 'fixture|sample\.|\.zip|delphitools' | head
```

`.env` and `.env.*` are ignored (`.gitignore`), as is the read-only `delphitools-main/` reference folder. `.npmrc` contains pnpm settings only and no registry token; check it with `cat .npmrc`.

If a leak is ever found, the fix is a history rewrite before the first push; nothing has been pushed yet, so that remains cheap.

## 7. Known limitations at review time

- Audit A1 is recorded as PASS from your independent run; the session that built the code did not audit it.
- 86 tools remain planned; only eleven work. Descriptions for all 97 are drafted but not in the registry.
- Brand assets, OG image, PWA install icons and canonical URLs are deferred to Phase 9. The app works offline but is not installable from a browser UI until icons exist.
- `image-converter` is a labelled stub; real WASM codecs and JXL arrive with the image phase.
- The service-worker update prompt has not been exercised against a second real deployment; the runbook covers how to test it after the first two deploys.
- The `_redirects` SPA rule is rejected by Wrangler as an infinite loop; current routes are prerendered so they still work. Read the deployment runbook before deciding what to do about it.
- Browser coverage is Chromium only; Firefox, WebKit, Safari and mobile browsers are untested. Screen-reader checks are outstanding (findings F-013 and F-014).
