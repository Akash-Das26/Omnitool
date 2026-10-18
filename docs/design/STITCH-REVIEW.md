# Stitch design review (P1-00)

Reviewed 2026-10-18 · Input: `stitch_developer_tool_directory.zip` (nine screens as HTML + PNG, a `design.md`, and `calm_workshop/DESIGN.md`) · Method: viewed every screenshot, scanned all HTML, computed WCAG contrast for every token pair.

**Verdict: adopt as a layout reference, not as code or as the design system. Fix the listed items first.** The structure is good and matches the brief. The details contain invented claims, sub-12 px text, an unreadable-border gap, and mock-only controls.

## 1. Acceptance checklist (from `STITCH-PROMPTS.md`)
| Item | Result | Evidence |
|------|--------|----------|
| Omnibox is clearly the primary element on home | PASS | Desktop and mobile home lead with it |
| Tool index is not an identical-card grid | PASS | Rows with input → output chips |
| AA contrast in light and dark | **FAIL** | Dark mode delivered for 1 of 9 screens (editor); see section 3 for token results |
| No imagery that is not an icon | **FAIL** | 5 remote `<img>` (lh3.googleusercontent.com) in image converter (3) and editor shell (2); content previews, but remote and generated |
| Tool stages consistent across prompts 2 to 5 | PASS (with note) | Input / Options / Output holds; stages are numbered 01/02/03 (see S2) |
| `DESIGN.md` updated, token names preserved | **FAIL** | `calm_workshop/DESIGN.md` has new front matter (Material-role tokens, Hanken Grotesk + Geist) but the body is still our unchanged seed (Schibsted Grotesk + Geist Mono); `design.md` is identical to our seed |

## 2. What to adopt
| Pattern | Screen | Why |
|---------|--------|-----|
| Tool index row: name, purpose, accepts → produces chips; left rail with counts | desktop home | Matches the "bench index" concept |
| Omnibox overlay: underlined matches, Marker-yellow selected row, dropped-file chip with "tools that accept this file", footer key hints | omnibox | Strongest screen |
| Three-stage tool frame with per-value Copy rows, "Copy all", Export, "Send to" | colour converter | Clear, scannable |
| Sticky action bar, stacked stages, 44 px targets | mobile tool page | Right mobile behaviour |
| First-use download state, determinate progress with always-visible Cancel, before/after size comparison | image converter | Exactly the heavy-tool states in the brief |
| Step cards with status, empty "add step" slot, execution log (optional) | workflow builder | Numbers are justified here: a real sequence |
| Atlas sections: conversions, contrast, harmonies, tonal scale, "send to" | colour atlas | Good content structure |
| Editor layout: tool column, canvas, inspector, layers/history tabs, status bar | image editor | Right anatomy |

## 3. Must fix before building from it
| ID | Finding | Evidence | Fix |
|----|---------|----------|-----|
| M1 | **Text below 12 px** | 377 uses of 8 to 11 px (10 px ×115, 11 px ×244) | Floor at 12 px (our scale); never 10 to 11 px |
| M2 | **Borders too faint for controls** (our token, not only Stitch's) | `--border` #BCC5D0 is 1.53:1 on paper, 1.74:1 on panel (light); #2C3441 is 1.45:1 / 1.31:1 (dark). WCAG 1.4.11 needs 3:1 for control boundaries | Keep `--border` for decorative hairlines only; add `--border-strong` for inputs, buttons, checkboxes, drop zones: light #6B7686 (4.03 / 4.60), dark #6C7A90 (4.17 / 3.76) |
| M3 | **Invented claims and badges** | "Zero Network Latency", "0.2ms compile", "CSS Spec Compliant", "Parser Engine: Culori 4.0", "100% WebAssembly & Web Workers", "libvips 8.15.1 Wasm SIMD", "FFmpeg WebAssembly", "Omnitool Engine v1.0.4 / v3.4 / v2.4", "Closest Pantone 2728 C", "Peak λ ~468 nm" | Show only facts the app can compute or knows to be true. Pantone data is trademarked: do not ship |
| M4 | **Wrong contrast numbers on the atlas screen** | Screen says 6.84, 3.07, 5.76, 2.31; real values for those pairs are 6.37, 3.29, 5.57, 2.57 | Never copy numbers from mock-ups; the real tool computes them |
| M5 | **Mock-only controls** | "Filled / Empty / Error" switch (converter, mobile tool); "SIMULATE: Processing / Wasm Fetch / Ready" (image converter) | Remove; state comes from real app state |
| M6 | **Engine copy conflicts with decisions** | "Multi-threaded Parallel Encoding · SharedArrayBuffer · 8 Worker pool" needs cross-origin isolation (D-13: off); libvips/FFmpeg vs planned jSquash and WebCodecs | Do not build as depicted; keep copy generic (threads, codec names only when true) |
| M7 | **Workflow short link implies a server** | "Preset URL: omnitool.app/w/8f92-c41a"; "Save Pipeline"; mobile "History" tab | Workflow state lives in the URL itself (FR-012, ADR 0002). "Save" and "History" are not planned: drop, or add to backlog |
| M8 | **Mock data is inconsistent and not from the registry** | 42 tools in 8 categories; "PDF" vs "PDF Engine"; tool names differ between desktop and mobile home | Home is generated from the registry (97 tools, 12 categories); none of the mock names or counts are specs |
| M9 | **Layout defects** | Overlapping text in editor top bar and image-converter header badges; "ENCODING (68%)" overlap; "-89.7% Reductions" overlap; buttons wrapping ("Shareable Link", "Save Pipeline", "Cancel Pipeline"); title truncated; mobile output values cut off with "…"; workflow shows overall progress 100% while step 2 is running | Values must wrap or scroll (they are the product); fix header wrapping; make progress consistent |
| M10 | **Ad-hoc status colours fail AA** | Stitch success green #087f5b is 4.37:1 on paper (needs 4.5); coral #ff6b4a and #10b981 used ad hoc | Add `--success` and `--warning` tokens (see `DESIGN.md`) |

## 4. Should fix
| ID | Finding | Evidence | Fix |
|----|---------|----------|-----|
| S1 | All-caps tracked labels | `uppercase` class used 100 times across 9 screens, plus "A · B · C" meta strings in section headers | Sentence case, 600 weight; drop meta strings |
| S2 | Stage headings numbered 01 / 02 / 03 | Tool pages | Remove numbers; keep them only in the workflow builder |
| S3 | Gradients | 23 uses in 6 of 9 files | Only for real colour data (lightness ramp, tonal scale) |
| S4 | Shadows | `shadow-lg` ×10 in editor, plus shadow-sm/md elsewhere | One popover shadow only (`DESIGN.md`) |
| S5 | Icons are Material Symbols | All 9 screens | Lucide (D-15); no icon fonts |
| S6 | Marker used as a status badge ("ACTIVE RUN") | Workflow | Marker is for selection and "new" only; use a neutral or primary badge |
| S7 | Editor inside the app shell | Light category rail around a dark editor | Editor is a full-screen route with its own chrome; follows theme setting |
| S8 | Fonts | Stitch front matter: Hanken Grotesk + Geist (labels). Ours: Schibsted Grotesk + Geist Mono (values only). Mono values render in a fallback face in the PNGs | Keep ours; judge mono usage in the running app, not these PNGs |
| S9 | Dark mode missing | 8 of 9 screens light only | Generate dark variants (prompt in `STITCH-FIX-PROMPTS.md`) |
| S10 | Dense bottom status bars add clutter | Converter, image converter, editor | Keep one line of real status only |

## 5. Not applicable to production
`code.html` files load the Tailwind CDN, Google Fonts and Material Symbols and use remote images. Fine for a mock-up; the app must use none of these (local-only, NFR-001). Use the HTML as a layout reference only. Do not copy it.

## 6. Our own palette: AA results
All text pairs pass (ink 15.5:1 on paper; muted 6.6:1; cobalt 5.6:1 on paper; white on cobalt 6.4:1; destructive 4.95:1 on paper; dark-mode pairs 6.1 to 15.0:1). Only the control-border gap (M2) failed. Fixed in `DESIGN.md`.

## 7. Next steps
1. Optional: one Stitch pass using `STITCH-FIX-PROMPTS.md` (dark variants and the defect fixes).
2. Copy the updated `docs/design/DESIGN.md` into the repo and unzip the Stitch export to `docs/design/stitch/`.
3. Run `docs/prompts/04-DESIGN-ALIGNMENT-PROMPT.md` with your coding agent (small, bounded change to the Phase 1 shell).
4. Re-check with Audit A1 criteria for accessibility.
