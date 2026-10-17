# 0003. Hosting and offline caching

Date: 2026-10-17 · Status: proposed (awaiting DEC-03)

## Context
Static site, heavy optional WASM/ML assets, offline requirement (FR-007). Verified 2026-10-17: Cloudflare Pages allows 25 MiB per file, 20,000 files (free), 100 `_headers` rules, unlimited static bandwidth. `vite-plugin-pwa` skips precaching files over 2 MiB by default.

## Decision
Host on Cloudflare Pages (Workers Static Assets is an equivalent fallback). Models and WASM larger than ~20 MiB are never in our bundle: fetched from an allow-listed external host on first use, then runtime-cached (CacheFirst, versioned, expiry). App shell and all JS/CSS tool chunks are precached with a CI-enforced total budget and a per-file limit under 2 MiB. COOP/COEP stay off unless a tool needs `SharedArrayBuffer` (separate ADR).

## Consequences
Good: offline for every non-model tool; no stale-chunk breakage after deploys; no host lock-in (headers are plain `_headers`). Bad: first-visit background download grows with the number of tools; model tools need a one-time online fetch from a third-party host (disclosed in the UI).

## Alternatives considered
GitHub Pages (no custom headers), Vercel/Netlify (bandwidth tiers), precaching everything including WASM (breaks size limits and install time).
