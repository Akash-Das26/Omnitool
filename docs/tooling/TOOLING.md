# Tooling decisions

Verified in a web check on 2026-10-17. Tool versions and features move quickly: re-verify at ignition and at each phase start. Never pin from memory.

## 1. Which AI tool for which part

| Part of the project | Tool | Why | Verified facts / caveats |
|---------------------|------|-----|--------------------------|
| Visual design exploration | **Google Stitch** | Free; prompt/sketch/voice to UI; generates a `DESIGN.md` | Free with usage limits. `DESIGN.md` is an open format that can be extracted from a URL, Figma file or codebase. MCP server and SDK exist for coding agents; export options have changed between versions, so check the export menu |
| Design hand-off to code | `DESIGN.md` + Stitch MCP (optional) | Keeps tokens in one portable file | Stitch MCP proxy is community/Google tooling; treat as optional |
| UI component library | **shadcn/ui** (CLI v4) | Components copied into our repo; Tailwind v4 and React 19 | `pnpm dlx shadcn@latest init --template vite`; `shadcn mcp init --client <claude\|cursor\|vscode>`; supports Radix and Base UI variants; registries supported |
| Component discovery for the agent | **shadcn MCP server** | Agent can search and install real components rather than guessing | Part of the shadcn CLI |
| Implementation | Claude Code, or any agent reading `AGENTS.md` | Follows repository rules and session protocol | Human reviews every session |
| Design polish (optional) | Figma (Figma MCP available in this workspace) | Pixel-level edits if Stitch output needs it | Optional step |
| Alternatives not evaluated | v0, Bolt, Lovable | Other prompt-to-UI tools | Bolt integration with Stitch exists per Bolt's May 2026 post; not evaluated for this project |
| Verification | Vitest, Testing Library, Playwright, axe-core, Lighthouse, budget script | Agents must not self-certify quality | `pnpm lighthouse` runs `lighthouse` + `chrome-launcher` via `scripts/lighthouse.mjs`; `@lhci/cli` was dropped because of unfixable high advisories in its transitive dependencies |

## 2. Package manager and runtime

| Option | Verdict |
|--------|---------|
| **pnpm** | **Chosen.** Strict dependency resolution (catches phantom deps), efficient installs, mature workspaces, works with the shadcn CLI. Enabled via `corepack enable` |
| npm | Simplest, ubiquitous; slower, hoists loosely. Acceptable fallback |
| bun | Fast and used by the original; less proven for CI/monorepo edge cases. Not chosen |

Runtime: Node LTS (>= 22.19, required by `lighthouse` 13; see `.nvmrc`). Pin `packageManager` in root `package.json` at ignition.

## 3. Stack (see `plan.md` section 2)
Vite, React 19, TypeScript strict, Tailwind v4, shadcn/ui, TanStack Router, Zustand, Valibot, Dexie, Comlink, vite-plugin-pwa (Workbox), Lucide React, Vitest, Playwright + axe, Biome. Canonical table: `plan.md` section 2.

## 4. Candidate libraries per tool family
Sourced from the original's published acknowledgements as a starting point, not a commitment. Check licence and maintenance first.

| Family | Candidates | Licence note |
|--------|-----------|--------------|
| QR / barcode | qr-code-styling, bwip-js | MIT |
| Math | mathjs | Apache-2.0 |
| SVG | svgo | MIT |
| Raster tracing | imagetracerjs | Unlicense |
| Image codecs | jSquash (MozJPEG, libwebp, OxiPNG, libavif, libjxl) | Apache-2.0 / BSD wrappers |
| EXIF | exifr | MIT |
| PDF | pdf-lib (MIT), pdfjs-dist (Apache-2.0) | Avoid MuPDF (AGPL-3.0) unless decided |
| Media | mediabunny (MPL-2.0), mediainfo.js (BSD-2) | MPL is file-level copyleft |
| ML in browser | @huggingface/transformers (Apache-2.0) | Models fetched at runtime, own licences |
| Docs conversion | pandoc-wasm wrapper (MIT) | pandoc.wasm binary is GPL-2.0+, fetched at runtime |
| Rich text | ProseMirror modules (MIT) or TipTap | MIT |
| Canvas editing | Fabric.js or Konva | MIT; decide by ADR |
| Drag and drop | dnd-kit | MIT |
| IndexedDB | Dexie | Apache-2.0 |
| Routing | @tanstack/react-router (+ Valibot via Standard Schema) | MIT |
| Worker RPC | comlink | Apache-2.0 (confirm at ignition) |
| PWA | vite-plugin-pwa, Workbox | MIT / MIT (confirm; check Vite-major compatibility) |
| Icons | lucide-react | ISC |

## 5. Re-verification checklist (run at ignition and each phase start)
- [ ] `pnpm view` each pinned package: version, licence, last publish, deprecation
- [ ] shadcn docs for Vite + Tailwind v4 current install steps
- [ ] Stitch export options and MCP setup instructions
- [ ] Browser support for APIs used in the phase (caniuse / MDN)
- [ ] vite-plugin-pwa supports the installed Vite major; Workbox `maximumFileSizeToCacheInBytes` default (2 MiB) unchanged
- [ ] Cloudflare Pages limits (25 MiB/file, 20,000 files, 100 header rules) unchanged
- [ ] TanStack Router: `defaultPreload` and `validateSearch` APIs for the pinned version; nuqs still experimental on TanStack (only matters if reconsidered)

## 6. Verified in Session 001 (2026-10-17)
| Claim | Result |
|-------|--------|
| Cloudflare Pages max single file 25 MiB; 20,000 files (free); 100 `_headers` rules; unlimited static bandwidth | Confirmed in Cloudflare docs and a third-party summary |
| Workers Static Assets also capped at 25 MiB per file | Confirmed in Cloudflare Workers limits docs |
| `vite-plugin-pwa` default `maximumFileSizeToCacheInBytes` is 2 MiB, larger files are not precached | Confirmed in the plugin FAQ |
| nuqs supports TanStack Router | Yes, but documented as experimental, with advice to use the router's own search-param APIs |
| TanStack Router validates search params with Zod, Valibot or a custom function | Confirmed in TanStack docs |
| `vite-plugin-pwa` works with the latest Vite major | Confirmed at ignition (Session 004): 2.0.0 declares Vite `^8.0.0` and built successfully with Vite 8.3.4 |

## 7. Verified in Session 005 (2026-10-18)
| Claim | Result |
|-------|--------|
| `@lhci/cli` 0.15.1 is the newest release | Confirmed with `pnpm view`; still pins `lighthouse` 12.6.1 and vulnerable `tmp`/`uuid`/`extract-zip` chains |
| `lighthouse` 13.5.0 no longer pulls `extract-zip` | Confirmed: it depends on `puppeteer-core` 25, whose `@puppeteer/browsers` 3.2.5 uses `modern-tar` instead |
| `pnpm audit` after the swap | 0 vulnerabilities (previously 4 high, 2 moderate, 1 low, all dev-only via `@lhci/cli`) |
