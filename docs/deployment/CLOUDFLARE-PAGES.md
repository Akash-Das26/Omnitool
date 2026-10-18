# Cloudflare Pages deployment runbook

For the static Omnitool build. Written 2026-10-18; settings verified against the current Cloudflare Pages documentation (sources at the end) and against `wrangler@4.151.1` locally.

Nothing here needs to be run by an agent: the owner connects the repository and Cloudflare in the dashboard. No runtime secrets or environment variables are needed.

## 1. What is deployed

- A static site only: no Pages Functions, no Worker script, no server-side rendering.
- Build output: **`apps/web/dist`** (created by `pnpm build`).
- Contents: the app shell, lazy tool chunks, fonts, `_headers`, `_redirects`, `robots.txt`, `manifest.webmanifest`, `sw.js`, a prerendered `index.html` for the home page, about, privacy and every built tool, and `404.html`.
- Current size: **58 files**, shell **150.8 kB gzip**, precache **53 files / 873.2 kB**. Cloudflare's limits are 20,000 files and 25 MiB per file, so there is a lot of headroom.
- Do not commit `apps/web/dist`; Cloudflare builds it.

## 2. Project settings

Connect the GitHub repository `Akash-Das26/Omnitool` (the local `origin`). Use these settings:

| Setting | Value | Why |
|---------|-------|-----|
| Production branch | `main` | The only branch in this repository. |
| Framework preset | **None** (custom) | The Vite preset assumes `npm run build` and `dist`; this is a pnpm workspace under `apps/web`. |
| Root directory | empty, or `/` | The build needs the workspace root so pnpm can resolve `packages/*`. |
| Build command | `pnpm build` | Root script, which runs the web build and the postbuild prerender. |
| Build output directory | `apps/web/dist` | Real output; see `apps/web/package.json`. |
| Node version | `NODE_VERSION=22.22.1` | The v3 build image defaults to Node 22.16.0, below the repo's `engines.node >=22.19` (Lighthouse 13's requirement). `.nvmrc` says `22`; the environment variable is explicit and wins. |
| pnpm version | `PNPM_VERSION=11.24.0` | The v3 image ships pnpm 10.11.1. Its documented limitations include **not** detecting pnpm from `pnpm-lock.yaml` or `package.json`, so `packageManager` alone is not enough. |
| Automatic dependency install | on (default) | Pages runs the install before the build command. |

Both environment variables go under **Settings → Environment variables** and should be set for production **and** preview.

### If the install uses the wrong pnpm

Set `SKIP_DEPENDENCY_INSTALL=1` and change the build command to:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm build
```

That forces the pinned `pnpm@11.24.0` from `package.json` and keeps the lockfile check. It is slower than the default install, so only use it if the first attempt fails with a lockfile or pnpm-version error.

## 3. Before the first deploy: decide about `_redirects`

`apps/web/public/_redirects` contains one rule:

```
/* /index.html 200
```

This is the traditional Pages SPA fallback, but **`wrangler@4.151.1` rejects it**:

```
✨ Parsed 0 valid redirect rules.
▲ [WARNING] Found 1 invalid redirect rule:

  ▶︎ Infinite loop detected in this rule and has been ignored. This will cause a redirect to strip `.html` or `/index` and end up triggering this rule again. Please fix or remove this rule to silence this warning.
      at apps/web/dist/_redirects:1 | /* /index.html 200
```

The rewrite to `/index.html` is normalised to `/`, which matches `/*` again. This is not a local-only quirk: the same rule is reported as rejected by the Workers deploy API. Assume Pages will ignore it and log the warning.

What that means in practice:

- Every current route is prerendered (`/`, `/about/`, `/privacy/`, all eleven tools, `404.html`), so direct navigation and refresh work without a rewrite.
- Unknown paths return `404.html` with a **404** status, which is the better outcome for search engines.
- After the service worker is active, Workbox's `navigateFallback: '/index.html'` provides client-side fallback for navigations, independent of Pages.
- Any future route that is not prerendered would 404 on a hard load until it is added to `scripts/prerender.mjs`.

Recommendation: **delete `apps/web/public/_redirects` before the first deploy** so the deployment log is clean. This session was documents-only, so the file is still present; deleting it is a one-line repository change.

Do not replace it with `/* / 200`: it was tested locally and rewrites JavaScript and CSS requests to HTML. `/tools/* / 200` also rewrites prerendered tool URLs to the home page, which breaks their meta and titles. A Workers Static Assets project with `not_found_handling: "single-page-application"` would solve it properly, but that changes the hosting model (ADR 0003 / DEC-03) and is out of scope here.

## 4. First deploy

1. Create the Pages project, connect the repository, enter the settings from section 2.
2. Start the deployment on `main`.
3. In the build log, confirm:
   - `pnpm build` ran from the repository root;
   - Vite wrote `apps/web/dist`;
   - `prerender: wrote 14 routes plus 404.html`;
   - the PWA generated `dist/sw.js` and reported the precache entries;
   - no error about the Node or pnpm version.
4. Open the `*.pages.dev` URL.

Expected build warning if `_redirects` was not removed: the infinite-loop warning above. It does not fail the build.

## 5. After the first deploy

Replace `$SITE` with the real URL.

```bash
SITE=https://your-project.pages.dev

# Security headers and the CSP (case-insensitive check)
curl -sSI "$SITE/" | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'

# COOP/COEP must be absent
curl -sSI "$SITE/" | grep -iE 'cross-origin-(opener|embedder)' || echo 'COOP/COEP absent'

# Hashed assets are immutable
ASSET=$(curl -sS "$SITE/" | grep -o '/assets/index-[^"]*\.js' | head -1)
curl -sSI "$SITE$ASSET" | grep -i 'cache-control'

# Service worker is revalidated
curl -sSI "$SITE/sw.js" | grep -i 'cache-control'

# Static files and prerendered routes
curl -sS "$SITE/robots.txt"
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "$SITE/privacy/"
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "$SITE/tools/text-diff/"
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "$SITE/not-a-page"
```

Expected:

- `content-security-policy` contains `script-src 'self'` and `frame-ancestors 'none'`; the other four headers are present.
- No COOP/COEP.
- `cache-control: public, max-age=31536000, immutable` for `/assets/*`; `no-cache` for `/sw.js`.
- `robots.txt` is plain text (`User-agent: *`), not HTML.
- `/privacy/` and `/tools/text-diff/` return **200 text/html** with their own titles.
- `/not-a-page` returns **404 text/html** and the Omnitool not-found page. If it returns 200, the redirect rule was applied; check the deployment log and remove the rule.

`/tools/text-diff` without the trailing slash returns a **308** to `/tools/text-diff/`. That is Cloudflare's pretty-URL normalisation and is fine.

### CSP check in the browser

Open DevTools → Console on the home page and on a tool. There should be no "Refused to…" or "Content Security Policy" messages. Then:

- run a tool that uses Web Crypto (Password Generator) and one that uses a worker (Image Converter or a JSON file over 1 MB);
- confirm the theme toggle works (the CSP allows inline styles because React and Radix set style attributes; scripts remain `'self'` only);
- confirm the manifest loads and the console shows no failed font or asset requests.

### Offline check

1. Load the site and wait a few seconds (Application → Service Workers shows it activated).
2. DevTools → Network → Offline.
3. Reload the home page; open JSON Formatter and format something; open Text Diff.
4. Return online.

The service worker precaches the shell and every tool chunk. If this fails on production but passes locally, check that `/sw.js` is served as JavaScript with `no-cache`, and that it is not blocked by the CSP.

### Service-worker update prompt

1. Deploy once and leave a tab open.
2. Make a small change and deploy again (or use **Retry deployment** after a commit).
3. In the open tab, wait for the update check. The prompt should say "A new version of Omnitool is available."
4. Choose Refresh; the page reloads on the new build.

The app registers with `registerType: 'prompt'` and does not call `skipWaiting` automatically. The prompt is implemented but has not yet been exercised against two real deployments.

## 6. Rollback

Cloudflare keeps every successful production deployment.

1. Workers & Pages → the project → **Deployments**.
2. Open **All deployments**, find the last known-good production deployment.
3. Use the three-dot menu → **Rollback to this deployment**, then confirm.

The production URL switches immediately. Preview deployments are not valid rollback targets. Rolling back does not delete the newer deployment; it can be rolled back to again.

Service-worker caveat: visitors who already installed the newer build may keep its precache until the next update check. Verify a rollback in a private window, and expect the update prompt on the next visit.

## 7. Custom domain and canonical URLs

A custom domain can be attached under **Custom domains** once one exists. Canonical URLs, `og:url` and an OG image are not emitted yet because no production domain was chosen (DEC-10) and brand artwork is deferred to Phase 9 (DEC-11). Add them in the Phase 9 work, not in the Cloudflare dashboard.

## 8. Troubleshooting

| Symptom | Cause and fix |
|---------|----------------|
| Build fails with an unsupported engine (`>=22.19`) | `NODE_VERSION` not set or set to a version below 22.19. Set `NODE_VERSION=22.22.1`. |
| `ERR_PNPM_LOCKFILE_MISMATCH` or an unexpected pnpm version | v3 does not read the pnpm version from the lockfile. Set `PNPM_VERSION=11.24.0`; if it still fails, use the `corepack enable` build command in section 2. |
| Deployment log warns about an invalid redirect | The `_redirects` rule; see section 3. Remove the file. |
| Unknown paths return the shell with status 200 | A rewrite rule was applied. Remove `_redirects` and redeploy. |
| Headers missing | `_headers` must be in the output directory, not only in `public/`. The build copies it; confirm with `ls apps/web/dist/_headers`. Headers do not apply to Pages Functions, but this project has none. |
| Site loads but tools fail offline | Check the service worker is active, `/sw.js` is `no-cache`, and the browser is not in a private window that blocks storage. |
| 404 on a newly added route | Add it to `scripts/prerender.mjs`; without a Pages rewrite, only prerendered paths exist as files. |

## 9. Sources

Verified 2026-10-18:

- Build configuration (root directory, build command, output directory): <https://developers.cloudflare.com/pages/configuration/build-configuration/>
- Build image v3 defaults and overrides (`NODE_VERSION`, `PNPM_VERSION`, `.nvmrc`, v3 limitations): <https://developers.cloudflare.com/pages/configuration/build-image/>
- Custom headers (`_headers`, 100 rules, 2,000 characters per line): <https://developers.cloudflare.com/pages/configuration/headers/>
- Redirects (ordering, 200 proxies, limits): <https://developers.cloudflare.com/pages/configuration/redirects/>
- Rollbacks (production only, three-dot menu): <https://developers.cloudflare.com/pages/configuration/rollbacks/>
- Local Pages development with Wrangler: <https://developers.cloudflare.com/pages/functions/local-development/>
- Workers Static Assets SPA mode (`not_found_handling`), for the future hosting option: <https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/>

Local verification used `pnpm dlx wrangler@4.151.1 pages dev apps/web/dist --port 8788`; results are repeated in `docs/review/REVIEW-LOG.md` (Session 007). Wrangler writes a local `.wrangler/` directory (shims, state); it is not tracked and can be deleted after the run.
