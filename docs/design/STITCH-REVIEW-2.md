# Stitch design review, pass 2

Reviewed 2026-10-18 · Input: `design_tar.gz` (your `docs/design/` folder: 18 screens = 9 light + 9 dark, `technical_workshop/DESIGN.md`, copies of review files) · Method: viewed 7 screenshots (home light and dark, omnibox, workflow, editor dark, mobile tool dark), scanned all 18 HTML files, recomputed contrast and colour values.

**Verdict: much better. Accept as the layout reference after a short fix list.** Pass 1's serious defects are mostly resolved. One design-system decision was reversed (square corners) and needs your call.

## 1. Pass-1 findings: status
| Pass-1 item | Status | Evidence |
|-------------|--------|----------|
| M1 text under 12 px | **Fixed** | 377 uses → 5 across 18 screens |
| M2 control borders under 3:1 | **Fixed** | Stitch adopted `#6B7686` / `#6C7A90`; dark screens use them (94 uses of `#6c7a90`) |
| M3 invented claims | **Mostly fixed** | Gone: Zero Network Latency, ms compile, Culori, libvips, FFmpeg, Pantone, Peak λ, SharedArrayBuffer. Remain: "Omnitool Core v4.8" (editor), "v2.4.0" (mobile home), "Zero external calls" and `CLIENT_OFFLINE_READY` (workflow), `STANDBY` / `Buffer: Idle` status text |
| M4 wrong contrast numbers | **Fixed** | Mobile tool page shows 6.37:1 and 3.29:1, matching my calculation |
| M5 mock-only controls | **Fixed** | No Filled/Empty/Error or SIMULATE controls found |
| M6 SharedArrayBuffer / engine copy | **Fixed** | Not present |
| M7 short link, Save, History tab | **Fixed (one note)** | Workflow shows the full URL with state in the hash ("no server storage"); no Save; mobile has no History tab. Note: ADR 0002 specifies search params, the mock uses a hash. Either is private (hashes are not sent to servers); decide in P7 |
| M8 inconsistent mock data | **Partly fixed** | Search says 97 tools, sidebar "48 TOOLS", sections add to 54; mock tools and categories still differ from the registry |
| M9 layout defects | **Mostly fixed** | Mobile values now wrap; sticky bar OK. New: editor has duplicate top bars (below) |
| M10 ad-hoc status colours | **Open** | Our `--success` / `--warning` not in the Stitch system; warning orange `#f5a624`, accent colours used ad hoc |
| S1 all-caps labels | **Not fixed** | `uppercase` 116 uses (was 100); "01 — TEXT" section tags, "INDEX // ACTIVE VIEW", "TOOLS THAT ACCEPT THIS FILE" |
| S2 numbered stage headings | **Fixed** | Tool pages unnumbered; "STEP 01/02/03" only in the workflow (allowed) |
| S3 gradients | **Resolved** | Remaining hits are a grid pattern, a colour spectrum and an icon named "gradient" |
| S4 shadows | **Partly** | Editor still uses `shadow-md` ×17 and `shadow-xl` (the many `shadow-[inset…]` hits are 1 px borders, fine) |
| S5 Material Symbols | **Not fixed** | All 18 screens (layout reference only; the app uses Lucide) |
| S9 dark mode | **Fixed** | Dark version of every screen; dark screens use our dark tokens (`#12161d`, `#1a2029`, `#e6eaf0`, `#9aa6b8`, `#2c3441`, `#7f98ff`) |

Also verified: the second-pass colour values are **correct** (OKLCH `0.5068 0.2580 266.41`, HSL `229.95 91.27% 55.10%`, P3, naive CMYK `85% 71% 0% 4%`). The first pass's `oklch(0.518 0.231 267.3)` was wrong. Even so, mock numbers must never become test vectors; compute them in `tool-core` and test against an independent reference.

## 2. Decision for you: corner radius (DEC-16)
`technical_workshop/DESIGN.md` specifies **0 px radius everywhere**, and every screen renders square. Our `DESIGN.md` says 6 px controls, 10 px panels, pill toggles. Your own `design/DESIGN.md` still says 6/10, so Stitch overrode it.
- Square corners are closer to the original delphitools look. The brief chose the radius hierarchy specifically to avoid that (identity).
- Square corners also read as more "instrument-like" and suit the dense layout. This is a taste call, not a defect.
- **Recommendation:** keep 6 / 10 / pill for identity. If you prefer square, change `DESIGN.md` first so the tokens, not the screenshots, stay the source of truth.

## 3. New findings
| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| N1 | Must | **Editor has two stacked top bars** with duplicate undo/redo, zoom, Share and Export, and two filenames ("Untitled_Composite_01.png" vs "hero-banner-export…") | One top bar: file name, undo/redo, zoom, theme, Share, Export |
| N2 | Must | **Tool counts disagree** (97 / 48 / sum 54) and mock tools/categories are not the registry's (e.g. "Bcrypt & PBKDF2 Generator", "Network & HTTP") | Everything from the registry (97 tools, 12 categories); screens are not a spec |
| N3 | Must | **`#D92D20` destructive** in `technical_workshop/DESIGN.md` is 4.22:1 on paper (AA text needs 4.5) | Keep ours: `#C42B1C` (4.95:1 on paper, 5.66:1 on panel) |
| N4 | Should | **Two extra dark surfaces** used heavily (`#161B23` inset, `#202733` hover), not in our tokens | Added as `--surface-inset` and `--surface-hover`; AA verified (text 6.1 to 14.3:1, strong border 3.45 to 3.97:1) |
| N5 | Should | **`technical_workshop/DESIGN.md` has no dark tokens, no success/warning, no radius** (and sets 28 px compact controls) | Our `DESIGN.md` stays the source of truth; control height 40 px desktop, 44 px mobile. Do not adopt the Stitch file |
| N6 | Should | **Fonts and mono usage**: Hanken Grotesk + Geist everywhere, with Geist (mono) also on buttons, labels, chips and key names. Our spec: Schibsted Grotesk, mono for values only | Keep ours (DEC-15) |
| N7 | Should | **Noise and invented ranking**: row IDs like `#0x1B`, a "RECOMMENDED" badge, `SYS_INIT` / `MAX_BUFFER_LIMIT` style labels, `INDEX //` prefixes | Plain sentence-case labels; no ranking unless it is real |
| N8 | Should | **Features not in the plan**: "Starred (5)", "Recently Executed", "Saved to browser", "Pinned" | Not in scope; backlog (X-04) if wanted |
| N9 | Info | **One remote photo** remains (editor dark); jargon in descriptions ("Cryptographic Hash Digest Engine") | Placeholder user image; descriptions follow the registry, written plainly |
| N10 | Info | **Workflow log table** is long and technical | Keep a short log, collapsed by default |

## 4. What to adopt now
Everything listed as "adopt" in `STITCH-REVIEW.md`, plus: dark screens as the dark-layout reference; the omnibox's dropped-file chip and grouped results (keep underline and Marker row); the workflow's URL-state banner; the mobile tool page as the target for stacked stages with wrapping values.

## 5. Next steps
1. Decide DEC-16 (radius) and DEC-17 below.
2. Give your agent `docs/prompts/04-DESIGN-ALIGNMENT-PROMPT.md` (updated with these findings).
3. Re-run the accessibility checks in Audit A1 after alignment.

**DEC-17:** the screens' mock tool names, counts and categories are not specs; everything comes from the registry. (Confirm.)
