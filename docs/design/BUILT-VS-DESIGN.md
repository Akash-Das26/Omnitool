# Built UI vs DESIGN.md — measured deviation report

Date: 2026-10-19
Build audited: production preview of the working tree at `c81b36d` (Batch 2 changes uncommitted).
Method: rendered-DOM measurements and screenshots from Chromium 1440×900 and 390×844, in both themes. **No screenshot or Stitch image was visually inspected by the agent**; every number below comes from `getComputedStyle`, bounding boxes, text content or Playwright screenshots saved for a human.

Screenshots and raw data: `docs/design/built/` (not committed).

- 44 required screenshots: 11 screens × desktop/mobile × light/dark.
- 1 extra screenshot of selected text: `home-selection-desktop-light.png`.
- `measurements.json` holds the 32 page states plus the empty, `pdf` and dropped-PNG omnibox states for all four combinations. Omnibox states were measured inside the home capture.

The design source of truth is `docs/design/DESIGN.md`; 6/10/pill radii win over the square Stitch screens (DEC-16). Mock names, counts and features in the Stitch screens are not specs (DEC-17). There is no expandable category control on the built home, so "after expanding one category" is captured as the category-filtered home, `/?category=colour` (the closest built equivalent).

## 1. Global measurements

Tokens resolve exactly to the values in `DESIGN.md` in both themes (13 tokens read from `:root`). Surface probes were taken from `body`, `header`, `main .rounded-panel`, `article > div`, `main .bg-surface-inset` and `aside` on every page.

| ID | Area | Spec | Measured | Verdict | Severity |
|----|------|------|----------|---------|----------|
| D-01 | Colour tokens, light | DESIGN table | `--background #edf0f3`, `--surface #fff`, `--surface-inset #edf0f3`, `--surface-hover #edf0f3`, `--foreground #101828`, `--muted-foreground #4a5565`, `--border #bcc5d0`, `--border-strong #6b7686`, `--primary #2447f5`, `--highlight #ffd84d`, `--highlight-foreground #101828` | PASS | Info |
| D-02 | Colour tokens, dark | DESIGN table | `--background #12161d`, `--surface #1a2029`, `--surface-inset #161b23`, `--surface-hover #202733`, `--foreground #e6eaf0`, `--muted-foreground #9aa6b8`, `--border #2c3441`, `--border-strong #6c7a90`, `--primary #7f98ff`, `--highlight-foreground #101828` | PASS | Info |
| D-03 | Page surface | Paper `#EDF0F3` / `#12161D` | `rgb(237,240,243)` / `rgb(18,22,29)` on all 11 screens | PASS | Must |
| D-04 | Panel surface | Panel `#FFFFFF` / `#1A2029` | Home category panel, hero container and tool frame: `rgb(255,255,255)` / `rgb(26,32,41)` | PASS | Must |
| D-05 | Inset surface | `--surface-inset` | `rgb(237,240,243)` light / `rgb(22,27,35)` dark | PASS | Info |
| D-06 | Hover surface | `--surface-hover` | Home row hover: `rgb(237,240,243)` / `rgb(32,39,51)`; equals the token in both themes | PASS | Should |
| D-07 | Borders | `--border` hairlines, `--border-strong` controls | 152 control boundaries; every border colour measured is `rgb(107,118,134)` light or `rgb(108,122,144)` dark. Panels and stage rules use `rgb(188,197,208)` / `rgb(44,52,65)`. Minimum boundary contrast 3.76:1 | PASS | Must |
| D-08 | Panel radius | 10 px | Category panels 10 px, tool frame 10 px, hero container 10 px, omnibox dialog 10 px | PASS | Must |
| D-09 | Control radius | 6 px | Home: 19 controls at 6 px, 1 at 10 px (theme toggle). `uuid-genny` desktop: 23 at 6 px, 9 at 10 px (`Share`, `Reset`, `Generate`, `Copy value N`, `Copy all`, `Download`, select trigger, theme toggle) | **FAIL** | Should |
| D-10 | Pill radius | 9999 px for pills/toggles | No element with `border-radius: 9999px` is rendered on any audited screen. No visible pill/toggle exists to test | NOT TESTED | Info |
| D-11 | Font families | Schibsted Grotesk UI; Geist Mono values only | Body and headings `"Schibsted Grotesk Variable"`; values `"Geist Mono Variable"`. Mono text nodes are UUID values plus two `Ctrl K` keycaps (home) | PASS | Should (keycap note) |
| D-12 | Minimum type | ≥ 12 px | Smallest rendered text: 12 px desktop, 14 px mobile; 0 text nodes below 12 px across the 32 page states. Omnibox group headings are 12 px | PASS | Must |
| D-13 | Control height, desktop | 40 px | 32 px: `UUID v4 (random)` and number input (`uuid-genny`), size/error-correction buttons and input (`qr-genny`), `PNG` (`image-converter`), `2 spaces` (`json-formatter`). 20 px: `Show all` (`home-category`). All other controls 40 px | **FAIL** | Should |
| D-14 | Control height, mobile | 44 px | Every visible button, input and select is 44 px. Checkbox inputs are 20 px inside a 44 px `<label>` target | PASS | Must |
| D-15 | Shadows | Only the popover shadow `0 8px 24px rgb(16 24 40 / 0.16)` | One shadowed element in the whole build: the offline-ready toast `div[role="status"].fixed.bottom-4.left-4`. The omnibox dialog uses a 1 px ring, no shadow | PASS | Info |
| D-16 | Gradients | None except real colour data | 0 gradient backgrounds across 44 states | PASS | Must |
| D-17 | Icon fonts | Lucide only | 0 Material/Font Awesome/icon-font families | PASS | Must |
| D-18 | Uppercase | No all-caps labels | 0 elements with computed `text-transform: uppercase`. Literal capitals are 17 file-format tokens (`PDF`, `PNG`, `JSON`, …), which are values | PASS | Should |
| D-19 | Version/engine badges | None | 0 text nodes matching `vX.Y.Z`, `engine`, `SIMD`, `WASM`, `latency`, `compile` | PASS | Must |
| D-20 | Row IDs / fake ranking | None | 0 matches for `#0x` or `INDEX //` | PASS | Must |
| D-21 | Status text that is not real state | None | 0 matches for `standby`, `idle`, `buffering` | PASS | Should |
| D-22 | Text contrast, enabled | 4.5:1 (3:1 large) | 44 states, 0 enabled text pairs below threshold. Lowest enabled ratios: 6.37:1 on tool pages, 6.61:1 on home | PASS | Must |
| D-23 | Text contrast, disabled | WCAG-exempt | At `opacity: 0.5`, 40 page text pairs and 156/26 omnibox pairs fall below 4.5:1: 1.58:1 light / 1.84:1 dark for disabled primary buttons; 3.28:1 light / 2.16:1 dark for disabled omnibox rows | PASS (exempt) | Info |
| D-24 | Control boundaries | 3:1 | 152 boundaries measured, 0 below 3:1; minimum 3.76:1 | PASS | Must |
| D-25 | Focus visible | 2 px cobalt ring, 2 px offset | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`. Measured on skip link, wordmark, header search, rail link: `2px solid rgb(36,71,245)`, offset 2 px. Tool row: same ring at offset −2 px. Theme toggle: 3 px ring via `box-shadow` at 50% cobalt, no outline | PASS | Must |
| D-26 | Rail width | 240 px, collapses to 56 px | 240 px → 56 px after Collapse; hidden at 390 px width | PASS | Must |
| D-27 | Content width | 1100 px | 1100 px at 1440 px viewport | PASS | Must |
| D-28 | Home hero | Large omnibox, border-strong, panel | 72 px high desktop / 64 px mobile, 10 px panel radius, `rgb(107,118,134)` border, Panel background | PASS | Must |

## 2. Component measurements

| ID | Area | Spec | Measured | Verdict | Severity |
|----|------|------|----------|---------|----------|
| C-01 | Omnibox selected row | Exactly one row on Marker | Every row has the Marker fill: empty 97/97, `pdf` 10/10, dropped PNG 97/97. `aria-selected="true"` on 1 row (empty/file) and 0 rows (`pdf`). Unselected rows carry `data-selected="false"` yet `background-color: rgb(255,216,77)` | **FAIL** | Must |
| C-02 | Omnibox match underline | Underlined, not coloured | Query `pdf`: 6 `<mark>` elements, `text-decoration-line: underline`, background transparent | PASS | Must |
| C-03 | Dropped-file chip | Name, size, type | `sample.png` · `8 B` · `image/png`, plus "Filtering compatible tools" | PASS | Must |
| C-04 | Accepting group first | "Tools that accept this file" first | First group heading `Tools that accept this file (25)` | PASS | Must |
| C-05 | Key hints footer | Navigate, open, cycle, dismiss | `↑↓ Navigate`, `↵ Open`, `Tab Cycle categories`, `Esc Close`, plus `97 results` | PASS | Should |
| C-06 | Omnibox option row | Control radius 6 px, height 40 px | Option rows are 32 px high with 10 px radius; command input is 44 px high | **FAIL** | Should |
| C-07 | Omnibox dialog | Panel radius 10 px | 10 px, Panel background, 1 px Ink-at-10% ring, no border, no popover shadow | PASS | Must |
| C-08 | Tool index row link | Whole row is the link | First built row is `<a href="/tools/image-converter">` wrapping the whole row; 19/19 built rows are links | PASS | Must |
| C-09 | Tool index row anatomy | Name, purpose, accepts → produces | Name present 97/97; glyph container present 97/97; purpose present on 16/97 rows. Missing on 81 rows, including built `image-converter`, `uuid-genny`, `qr-genny` | **FAIL** | Should |
| C-10 | Row focus ring | Ring on the row | `2px solid rgb(36,71,245)`, offset −2 px, on the row link | PASS | Must |
| C-11 | Built vs unbuilt rows | Real state only | Built rows transparent on Panel and hover to `--surface-hover`; unbuilt rows `aria-disabled="true"`, background `rgb(237,240,243)` / `rgb(22,27,35)` and a phase string | PASS (appearance); see H5 | Info |
| C-12 | Tool frame stages | Three stages, unnumbered | `uuid-genny`, `qr-genny`, `image-converter`: `Input`, `Options`, `Output`, all unnumbered. `json-formatter`: 2 (`Input`, `Result`). `word-counter`: 2 (`Text`, `Counts`) | **FAIL** | Should |
| C-13 | Per-value Copy | One per value | `uuid-genny`: 5 rows, 5 `Copy value N` buttons, all 40/44 px | PASS | Must |
| C-14 | Share / Reset | Present in header | Present on all five tool pages; 40 px desktop / 44 px mobile | PASS | Should |
| C-15 | Mobile action bar | Fixed bottom bar, 44 px targets | `[data-slot="tool-actions"]`: `position: fixed`, `bottom: 0px`, height 69 px; buttons 44 px. Desktop: `position: static` | PASS | Must |
| C-16 | Progress / cancel | Cancel always visible, first-use state | `image-converter`: file accepted, `Convert` starts a visible `role="progressbar"` with no `aria-valuenow` (indeterminate), `Cancel` visible at 40/44 px, cancellation ends in a "cancelled" state. Text states the 2.00 MB sample fetch and that this build simulates it | PASS | Should |
| C-17 | 404 page | Not-found route | `/tools/does-not-exist` renders "404 / Page not found / That page does not exist…"; 0 contrast failures | PASS | Should |
| C-18 | Offline toast position | Bottom-left toast, errors persist | When the offline-ready toast appears, it sits at `bottom-4 left-4` over the rail's `Collapse` control at 1440×900; a Playwright click on Collapse was intercepted by the toast in one run (the toast is intermittent) | **FAIL** | Should |
| C-19 | Search entry points | Omnibox is the hero | Two visible `button[aria-keyshortcuts]` on home in every viewport: header 40 px (44 mobile) and hero 72 px (64 mobile). Both open the same dialog | PASS | Info |
| C-20 | Mono usage | Values only | UUID values and `Ctrl K` keycaps only on `uuid-genny`; home has 2 mono keycaps and no other mono text | PASS (keycap note) | Info |

## 3. H1–H7

### H1 — Every omnibox row is Marker-yellow — **FAIL (Must)**

- Compiled CSS: `.data-selected\:bg-highlight[data-selected]{background-color:var(--highlight)}` — an attribute-presence selector.
- Every `[cmdk-item]` carries `data-selected`, with the value `"false"` on unselected rows. 97/97 rows have `background-color: rgb(255, 216, 77)`; `aria-selected="true"` is on exactly 1 row (empty and dropped-file states) and 0 rows for `pdf`.
- Measured counts: empty 97/97 yellow, `pdf` 10/10 yellow, dropped PNG 97/97 yellow, in both themes and both viewports.
- Root cause: cmdk writes `data-selected="false"`; the Tailwind variant matches presence, not value.

### H2 — Muted text on Marker fails AA — **PASS, with a disabled-state caveat**

- Enabled text on Marker is Ink `rgb(16,24,40)` on `rgb(255,216,77)` = **12.83:1**. The selected row's description is also forced to Ink.
- The hypothetical muted pairs are `#4A5565` on Marker = **5.46:1** (passes) and `#9AA6B8` on Marker = **1.78:1** (fails), but neither is rendered: `data-selected:**:text-highlight-foreground` forces Ink on every descendant.
- Disabled unbuilt rows are at `opacity: 0.5`; composited text on composited Marker gives **3.28:1** light and **2.16:1** dark. Disabled controls are exempt from WCAG 1.4.3, but the result is visibly faint (see product decision 4).

### H3 — Tool list panel same background as page — **PASS**

- Page: `rgb(237,240,243)` light, `rgb(18,22,29)` dark.
- Home category panel: `rgb(255,255,255)` light, `rgb(26,32,41)` dark, 10 px radius, 1 px border.
- Hero container and tool frame are also Panel, so the white surface is present and distinct in both themes.

### H4 — Two search inputs — **PASS (fact confirmed)**

- Home at 1440×900 and 390×844: two visible entry points — header `button.ml-2.flex.h-10` (40 px desktop, 44 px mobile) and hero `main button[aria-keyshortcuts]` (72 px desktop, 64 px mobile). Both open the same omnibox dialog.
- `DESIGN.md` requires the hero omnibox but does not forbid a header shortcut; this is a duplication, not a stated violation.

### H5 — "Not built yet — phase N" exposed — **FAIL (Must)**

Visible occurrences of `/not built|phase \d|coming soon/i` per page:

| Page / state | Count |
|---|---|
| Home, all categories | 78 |
| Home filtered to Colour | 11 |
| Omnibox empty | 78 |
| Omnibox query `pdf` | 10 |
| Omnibox after dropped PNG | 78 |
| Each of the five tool pages | 0 |
| 404 | 0 |

By phase on home: phase 2 ×21, phase 3 ×10, phase 4 ×19, phase 5 ×8, phase 6 ×14, phase 7 ×4, phase 8 ×2 (total 78). The string is literal, e.g. `Not built yet — phase 4`, in a `span.text-xs.text-muted-foreground`. It exposes the internal roadmap, which `DESIGN.md` forbids ("status text that is not real state").

### H6 — Rows larger and lighter, no description line — **FAIL (Should)**

- Name: 16 px, weight 500. That is the body size (16 px) and heavier than body 400; `DESIGN.md` has no numeric row-name size, so "larger and lighter" is **NOT TESTED**.
- Row height: 49 px desktop for a single-line row; 69 px mobile without a description and 113 px with one. 11 rows fit in the first 900 px (18 would fit at 49 px without section gaps).
- Description line: present on **16 of 97** rows; absent on 81, including three built tools (`Image Converter`, `UUID Generator`, `QR Generator`). The first built row (`Image Converter`, y = 1302 desktop, y = 1834 mobile) has no purpose line.
- Verdict is FAIL because the row anatomy "name, purpose" is missing on 84% of rows; the size/weight part of the hypothesis is not supported by measurement.

### H7 — Yellow text highlight is `::selection` — **PASS**

- Compiled rule: `::selection { background: var(--highlight); color: var(--highlight-foreground); }`.
- `getComputedStyle(document.documentElement, '::selection')` returns `color: rgb(16,24,40)`, `background-color: rgb(255,216,77)`; ratio **12.83:1**.
- Screenshot with the hero label selected: `home-selection-desktop-light.png`.

## 4. Home composition at 1440×900

- Header 57 px; rail 240 px; content column 1100 px; hero container 72 px high at the top of the content column (y = 240 is the first category).
- Above the fold: **2 category headings** — Colour (11 rows, panel height 590 px) and Images & assets (header at y = 862). **11 rows visible, 0 built.** The first built row, Image Converter, is at y = 1302, about 400 px below the fold. On mobile the first built row is at y = 1834.
- Built vs unbuilt: built rows are links on Panel with a hover surface; unbuilt rows are `aria-disabled`, sit on the inset surface and carry the phase string. They are distinguishable, but the fold contains only unbuilt rows.
- Density: 11 rows per 900 px as laid out; 49 px per desktop row, 69 px per mobile single-line row, 113 px when a description exists. Page height 6035 px desktop, 8975 px mobile.
- Rail and hero match `DESIGN.md`: 240/56 px rail, 1100 px content, 10 px hero panel, `--border-strong` border, Panel fill, 72/64 px height.

## 5. Screenshot inventory

All files are in `docs/design/built/`, suffix `-<viewport>-<theme>.png`:

| Screen | Files |
|---|---|
| Home, top | `home-top-{desktop,mobile}-{light,dark}.png` |
| Home, one category | `home-category-{desktop,mobile}-{light,dark}.png` |
| Omnibox, empty | `omnibox-empty-{desktop,mobile}-{light,dark}.png` |
| Omnibox, `pdf` | `omnibox-pdf-{desktop,mobile}-{light,dark}.png` |
| Omnibox, dropped PNG | `omnibox-dropped-png-{desktop,mobile}-{light,dark}.png` |
| uuid-genny | `tool-uuid-genny-{desktop,mobile}-{light,dark}.png` |
| qr-genny | `tool-qr-genny-{desktop,mobile}-{light,dark}.png` |
| image-converter | `tool-image-converter-{desktop,mobile}-{light,dark}.png` |
| json-formatter | `tool-json-formatter-{desktop,mobile}-{light,dark}.png` |
| word-counter | `tool-word-counter-{desktop,mobile}-{light,dark}.png` |
| 404 | `not-found-{desktop,mobile}-{light,dark}.png` |
| Selected text (extra) | `home-selection-desktop-light.png` |

Desktop screenshots are 1440×900; mobile screenshots are 390×844. The offline-ready toast may appear bottom-right on desktop (above the sticky action bar on mobile) because it is real app state and was not suppressed; its placement is covered in section 9.

## 6. Product decisions for the human

1. **Unbuilt tools.** Keep them in the index with a neutral "Planned" label (no phase number), move them below built tools, or hide them until shipped. Also decide whether the home fold should show at least one working tool; today it shows 11 unbuilt rows and no built tool.
2. **Row purpose.** 81 of 97 rows have no description, including three built tools. Either author the registry descriptions before showing rows or accept rows with name and glyphs only (which contradicts "name, purpose" in `DESIGN.md`).
3. **Two search entry points.** Keep the header shortcut as a convenience, or remove it so the hero omnibox is the only entry.
4. **Disabled-row opacity.** 50% opacity gives 3.28:1 light / 2.16:1 dark on the omnibox's disabled rows. WCAG exempts disabled controls, but decide whether readability matters enough to raise the opacity.
5. **Control geometry.** Bring the 32 px segmented controls and the 10 px button radius to the 40 px / 6 px spec, or amend `DESIGN.md` first. `DEC-16` currently says `DESIGN.md` wins over screenshots.
6. **Stage anatomy.** Enforce Input / Options / Output on every tool, or record that two-stage tools (`json-formatter`, `word-counter`) are allowed and rename the stages accordingly.
7. **Toast placement.** Move the offline/update notice so it does not cover the rail's Collapse control.

## 7. Re-running the audit

```bash
pnpm build
pnpm --filter @omnitool/web preview --host 127.0.0.1 --port 4173
node scripts/audit-built-design.mjs
```

`scripts/audit-built-design.mjs` writes `docs/design/built/measurements.json` and the screenshots. It uses only the rendered DOM: computed styles, bounding boxes, text nodes, CSSOM rules, focus after Tab, and Playwright's file-drop and image-converter interactions.

The folder is now in `.gitignore` and in Biome's ignore list, so `pnpm lint` neither reads `measurements.json` nor prints a size warning. (`docs/design/built/` stays untracked.)

Useful checks on the JSON:

```bash
# H1: every omnibox row is yellow, but only one is aria-selected
jq '.measurements[] | select(.screen=="home-top" and .viewportName=="desktop" and .theme=="light")
    | {empty: .omniboxEmpty | {items: .itemCount, yellow: .yellowRows, selected: .selectedRows},
       pdf: .omniboxQuery | {items: .itemCount, yellow: .yellowRows, selected: .selectedRows}}' \
  docs/design/built/measurements.json

# H5: roadmap strings on home
jq '.measurements[] | select(.screen=="home-top" and .viewportName=="desktop" and .theme=="light")
    | .patterns.counts' docs/design/built/measurements.json

# Contrast: enabled failures must be empty; disabled ones are exempt
jq '[.measurements[] | {screen, viewportName, theme,
    enabled: (.contrast.enabledFailures | length)}]' docs/design/built/measurements.json
```

Compiled selector behind H1:

```bash
grep -o 'data-selected\\:bg-highlight\[data-selected\]{[^}]*}' apps/web/dist/assets/*.css
```

`::selection` rule:

```bash
grep -o '::selection{[^}]*}' apps/web/dist/assets/*.css
```

## 8. Fix pass — 2026-10-19

Scope: home, omnibox, tool index, planned-tool handling and the housekeeping in the review prompt. No new tools, dependencies or artwork. The decisions applied were **PLANNED** (unbuilt tools hidden behind a toggle, built first in the omnibox, muted non-interactive Planned group, no phase numbers) and **HEADER** (compact “Find tool Ctrl K” header button; the hero remains the only full-width search control).

Method is unchanged: production build, Chromium 1440×900 and 390×844, both themes, values read from the rendered DOM. The 44 required screenshots and `measurements.json` were regenerated; the default home capture now shows the 19 built tools only, and `measurements.json` also records the revealed planned state. **No screenshot was viewed by the agent**, so nothing here is a claim of visual match with the Stitch screens.

### H1–H7 before and after

| ID | Before | After | Verdict |
|----|--------|-------|---------|
| H1 | Every option Marker: empty 97/97, `pdf` 10/10, dropped PNG 97/97; `aria-selected` 1/0/1. `.data-selected[data-selected]` matched the value `"false"`. | Options are built tools only: 19, 0 and 19. Marker rows 1, 0 and 1, exactly the `aria-selected="true"` rows. The planned group has 78/10/78 rows and 0 Marker rows. Hover no longer changes selection (`disablePointerSelection`). | **PASS** |
| H2 | Marker text was Ink 12.83:1; the caveat was disabled rows at 50% opacity (3.28:1 light / 2.16:1 dark) and a hypothetical dark muted pair at 1.78:1. | Marker text is still 12.83:1. Planned rows are not disabled: muted text is 7.56:1 light / 6.64:1 dark on the popover; muted on inset is 6.61/7.01. A new E2E contrast sweep over empty, `pdf` and dropped-file states in both themes reports 0 failures. | **PASS** |
| H3 | Panel on Paper in both themes. | Unchanged and re-measured: panel `rgb(255,255,255)` / `rgb(26,32,41)` on page `rgb(237,240,243)` / `rgb(18,22,29)`; section bars are inset in both themes. | **PASS** |
| H4 | Two visible entry points, header 40/44 px and hero 72/64 px. | Header decision applied: a compact 40/44 px “Find tool” + `Ctrl K` button (177 px wide at 1440), hero 72/64 px. The only full-width search control is the hero; the only text input is inside the dialog. | **PASS** |
| H5 | 78 roadmap strings on home, 11 filtered to Colour, 78 in the empty omnibox, 10 for `pdf`. | 0 on home (19 rows), 0 with the planned rows revealed, 0 in the omnibox in all three states, 0 on every built tool page, the planned page and 404. Planned rows carry the word “Planned” only. | **PASS** |
| H6 | Name 16 px/500; rows 49 px desktop, 69 px mobile single-line, 113 px with a description; purpose on 16/97 rows, 16/19 built. | Name 16 px/500; 55 px desktop per description row, 95 px mobile. Purpose is present on 19/19 built rows (three missing registry drafts were filled for built tools). 8 rows are visible in the first 900 px desktop, 4 at 390×844, against 11 unbuilt rows before. | **PASS for built rows** |
| H7 | `::selection` Marker with Ink text. | Unchanged; compiled rule still `::selection{background:var(--highlight);color:var(--highlight-foreground)}`, ratio 12.83:1. | **PASS** |

Home height fell from 6035 px to 1869 px desktop and from 8975 px to 2721 px mobile; the first fold now contains 8 built rows instead of none. The first built row is at the top of the index, not 400 px below the fold.

### Fixed rows

| ID | Before | After |
|----|--------|-------|
| C-01 (Must) | 97/97, 10/10, 97/97 Marker rows. | 1/1, 0/0, 1/1 Marker rows, matching `aria-selected` exactly. Selection follows only `aria-selected="true"`; hover stays `--surface-hover` and does not select. Tested in both themes, including a dropped PNG. |
| C-05 (Should) | `Tab Cycle categories`, `97 results`. | `Tab Move`, and `19 available, 78 planned` / `0 available, 10 planned`. Tab now moves the selection and is covered by E2E. |
| C-06 (Should) | Option rows 32 px high, 10 px radius. | 40 px high, 6 px radius on desktop; 54 px on mobile, which exceeds `DESIGN.md`'s 44 px mobile target. The extra height is the two-line option content and is kept by decision. |
| C-09 (Should) | Purpose on 16/97 rows (16/19 built). | Purpose on 19/19 built rows; empty descriptions are omitted rather than filled with placeholder copy. The 78 planned rows still have no registry description and show only name + “Planned”. |
| D-09 (Should, home part) | Home: 19 controls at 6 px and the theme toggle at 10 px (plus the toast close at 10 px when visible). | All 22 home controls measure 6 px in the audited run, including the theme toggle and toast close. Tool-page buttons are unchanged (see deferred). |
| D-13 (Should, home part) | `Show all` was 20 px high; tool-page segmented controls 32 px. | `Show all` is 40 px desktop / 44 px mobile; the planned-tools toggle is 40/44. No home control is below 40 desktop or 44 mobile. Tool-page controls are unchanged (see deferred). |
| C-19 (Info) | Header duplicated the hero’s search copy at up to 448 px wide. | Header is a compact 177×40 px “Find tool” button; it still opens the same dialog. |

### Planned-tool handling

- **One source of truth.** `TOOL_LOADERS` in `apps/web/src/lib/tool-modules.ts` is now the only definition of “built”; `IMPLEMENTED_TOOL_IDS`/`IMPLEMENTED_TOOL_COUNT` derive from it. Home, rail, omnibox and router all call `isToolImplemented`. A unit test compares those ids with the registry and fails if a loader has no row or a row has no loader.
- **Home.** Planned rows are hidden by default behind `Show planned tools (78)`; the button reports `19 available, 78 planned` in the hero and per-category `N available, M planned` when revealed. Rail rows show an “Available” column heading and the available count, with the full “N available, M planned” text for assistive technology. Planned rows are plain `div`s, not links, and are not focusable.
- **Omnibox.** Built results come first, grouped by category. Planned matches follow under a muted `Planned (N)` group; they are not options (`role="option"` count excludes them), are not focusable and never receive Marker. A query that only matches planned tools (`pdf`) therefore has 0 options and 0 selected rows, rather than a fake selection.
- **Route.** `/tools/<planned-id>` now renders a planned page with the tool name, a “Planned” badge, a sentence of explanation and a link home. It sets `meta[name="robots"]` to `noindex` while mounted and restores the previous value on leave. Unknown ids still 404.
- **Prerender.** `scripts/prerender.mjs` now derives the tool route list from `tool-modules.ts`, verifies every loader has `src/tools/<id>/index.tsx`, fails on an orphan directory, and prints `78 planned routes excluded`. `dist/tools/colour-converter/index.html` is absent; `dist/tools/uuid-genny/index.html` is present. A test asserts both.

### Checks after the fix

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | pass, lockfile unchanged |
| `pnpm lint` | pass, **0 warnings** (Biome 165 files + design rules) |
| `pnpm typecheck` | pass across all projects |
| `pnpm test:coverage` | **348 tests / 28 files**; 97.06% statements, 90.8% branches, 99.5% functions, 98.22% lines |
| `pnpm build` | 22 routes plus `404.html`; 78 planned routes excluded; precache 46 entries / 897.63 KiB |
| `pnpm check:budgets` | shell **157.5 kB gzip** (budget 200); precache **953.4 kB** (budget 8 MiB); 73 files |
| `pnpm e2e --workers=4` | **133 passed** (includes offline, no third-party request, axe in both themes and the new design/omnibox specs) |
| axe | 50 page/omnibox runs (including the planned page), 0 serious or critical |
| Lighthouse mobile | 22 routes: accessibility **100**, best practices **100**, SEO **100**. Performance was **90–96** on the repeat runs; the preceding run scored `/tools/uuid-genny/` **86** (TBT 149 ms vs 35 ms on the final run) and exited 1. Two later runs, including the final build, passed all routes, so that route is borderline/noisy rather than a confirmed regression. |

Visual baselines were regenerated deliberately: `home-dark`, `qr-genny-dark`, `image-converter-dark`, `omnibox-dark` and `omnibox-file-dark`. All five change because the header copy and button geometry changed; home also hides planned rows and uses the new row heights, and the two omnibox shots show the built/planned split and the single Marker row. Baselines are Chromium-on-Linux.

### Deferred, with reasons

- **C-12 stage anatomy** (tool pages use two stages where `DESIGN.md` says three) and the remaining **D-09/D-13** tool-page control geometry are outside this bounded change; no tool page was in scope.
- **C-18 offline toast position** was fixed in the follow-up pass (section 9): bottom-right desktop, above the sticky action bar on mobile.
- **Other disabled controls** keep 50% opacity. WCAG exempts them and they are not text the user is expected to read; the disabled omnibox rows that caused the H2 caveat no longer exist.
- **Planned descriptions.** The 78 planned rows have empty registry descriptions by design of the current draft set. Revealed rows show name + “Planned”; no placeholder copy was added.
- **Three registry descriptions** (`image-converter`, `uuid-genny`, `qr-genny`) were written from `docs/review/DESCRIPTIONS-DRAFT.md` so every built row has a purpose. They remain drafts pending P2-10 owner approval, matching how the Batch 1/2 descriptions were handled.
- **HTTP status for planned URLs.** The SPA renders the planned page, but without the removed `_redirects` fallback Cloudflare Pages can serve the static `404.html` shell with a 404 status before hydration; that shell is noindex. The visible page is the planned page, not the 404 copy.
- **Visual comparison.** No image was viewed by the agent. The Stitch PNGs are not in this checkout, so no claim of visual match is made.

## 9. Follow-up pass — 2026-10-19

Scope: the five follow-up items agreed after the fix pass. No new tools, features, dependencies or artwork. All numbers below come from the rendered DOM, the built artefacts and the three-run Lighthouse reports.

### C-18 — toast placement

**Cause of the intermittent toast.** It is real app state, not a screenshot artefact: `vite-plugin-pwa` calls `onOfflineReady` when Workbox finishes precaching, which lands somewhere around the audit's `networkidle` + 150 ms capture. The defect was its old bottom-left position, which covered the rail's Collapse control at 1440×900 and could intercept a click.

After: bottom-right on desktop, and above the sticky action bar on mobile (`bottom: calc(5rem + env(safe-area-inset-bottom))`). Measured at 1440×900: toast x 1129–1424, Collapse x 8–231, no overlap. At 390×844: toast bottom 764 px, action bar top 779 px, 15 px clearance. A new E2E test asserts no intersection with the rail Collapse control and with `[data-slot="tool-actions"]` in both themes at both viewports; all four cases pass. `DESIGN.md`'s toast rule is updated.

### Planned URLs

`404.html` now uses neutral metadata (title `Omnitool`, home description, `noindex`) and its visible body is empty. A static Pages-like server returns it for `/tools/colour-converter` with status **404**; the body's visible text is the empty string and contains no `Page not found` or `404`. The hydrated page still renders the planned message and a home link, covered by the existing E2E test. The 404 status is kept by decision; with JavaScript disabled the shell shows no text rather than a false 404.

### Mobile omnibox note

The row stays **54 px** on mobile. `DESIGN.md` asks for 44 px on mobile and 40 px on desktop, so the row meets the mobile minimum and exceeds it by 10 px because it carries two lines. The desktop measurement remains 40 px / 6 px radius. Wording in this report and the review log is corrected; no code changed.

### Lighthouse — median of three runs

Each route was measured three times. Budget: median performance/accessibility ≥ 90; best-practices and SEO remain warnings at the same 90 threshold. The table shows median/minimum.

| Route | Perf med/min | A11y med/min | Best med/min | SEO med/min | LCP med | TBT med | CLS med |
|---|---|---|---|---|---|---|---|
| `/` | 96/96 | 100/100 | 100/100 | 100/100 | 2260 ms | 13 ms | 0.000 |
| `/about/` | 96/96 | 100/100 | 100/100 | 100/100 | 2303 ms | 6 ms | 0.000 |
| `/privacy/` | 96/96 | 100/100 | 100/100 | 100/100 | 2260 ms | 1 ms | 0.000 |
| `/tools/base-converter/` | 94/94 | 100/100 | 100/100 | 100/100 | 2589 ms | 23 ms | 0.000 |
| `/tools/braille-converter/` | 92/92 | 100/100 | 100/100 | 100/100 | 2892 ms | 27 ms | 0.004 |
| `/tools/encoder/` | 92/92 | 100/100 | 100/100 | 100/100 | 2889 ms | 32 ms | 0.000 |
| `/tools/image-converter/` | 92/92 | 100/100 | 100/100 | 100/100 | 2900 ms | 26 ms | 0.000 |
| `/tools/json-formatter/` | 90/90 | 100/100 | 100/100 | 100/100 | 3043 ms | 27 ms | 0.000 |
| `/tools/jwt-decoder/` | 94/94 | 100/100 | 100/100 | 100/100 | 2586 ms | 14 ms | 0.000 |
| `/tools/line-height-calc/` | 92/92 | 100/100 | 100/100 | 100/100 | 2890 ms | 33 ms | 0.000 |
| `/tools/morse-code/` | 90/90 | 100/100 | 100/100 | 100/100 | 3036 ms | 30 ms | 0.000 |
| `/tools/nato-phonetic/` | 94/94 | 100/100 | 100/100 | 100/100 | 2591 ms | 17 ms | 0.000 |
| `/tools/paper-sizes/` | 91/91 | 100/100 | 100/100 | 100/100 | 2935 ms | 29 ms | 0.000 |
| `/tools/password-genny/` | 90/90 | 100/100 | 100/100 | 100/100 | 3040 ms | 29 ms | 0.000 |
| `/tools/px-to-rem/` | 94/94 | 100/100 | 100/100 | 100/100 | 2588 ms | 25 ms | 0.011 |
| `/tools/qr-genny/` | 92/92 | 100/100 | 100/100 | 100/100 | 2795 ms | 70 ms | 0.000 |
| `/tools/text-diff/` | 91/91 | 100/100 | 100/100 | 100/100 | 2939 ms | 33 ms | 0.000 |
| `/tools/time-calc/` | 92/91 | 100/100 | 100/100 | 100/100 | 2893 ms | 31 ms | 0.001 |
| `/tools/typo-calc/` | 92/92 | 100/100 | 100/100 | 100/100 | 2893 ms | 33 ms | 0.000 |
| `/tools/unit-converter/` | 92/91 | 100/100 | 100/100 | 100/100 | 2891 ms | 47 ms | 0.000 |
| `/tools/uuid-genny/` | 90/90 | 100/100 | 100/100 | 100/100 | 3045 ms | 29 ms | 0.000 |
| `/tools/word-counter/` | 94/94 | 100/100 | 100/100 | 100/100 | 2590 ms | 26 ms | 0.000 |

No median or minimum is below 90; the two lowest minimums are `time-calc` and `unit-converter` at 91. The minimum performance across all routes is **90** (four routes: `json-formatter`, `morse-code`, `password-genny`, `uuid-genny`).

**`/tools/uuid-genny/` lowest run.** Performance 90, LCP 3045 ms, TBT 29 ms. LCP element: `article.mx-auto > header.mb-4 > div.min-w-0 > p.prose-measure` (“Make UUID v4, v7 or Nano IDs in bulk and copy them.”), i.e. the registry description text, not an image. LCP breakdown: 3 ms TTFB and 705 ms element render delay, after an FCP of about 2575 ms. Only two long tasks were reported: 107 ms in the shared `index-*.js` starting at 2442 ms, and 51 ms on the route document at 609 ms. Main-thread work: Script Evaluation 195 ms, Other 122 ms, Style & Layout 114 ms.

The three runs were stable at 90/90/90 with LCP 3039–3045 ms and TBT 26–28 ms. The earlier 86 had TBT 149 ms and LCP 3312 ms with no code change, so it is environment noise rather than a code regression; the normal cost is the shared shell's script evaluation plus render delay for text. Shell JS is 157.6 kB gzip, within the 200 kB budget, and the route chunk is small. There is no large asset or font to optimise in this route, but the 90 score has little headroom.

### Checks on the follow-up tree

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | pass |
| `pnpm lint` | pass, 0 warnings (167 files + design rules) |
| `pnpm typecheck` | pass |
| `pnpm test:coverage` | 348 tests / 28 files; 97.06% statements, 90.8% branches, 99.5% functions, 98.22% lines |
| `pnpm build` | 22 routes + `404.html`; 78 planned routes excluded; precache 46 entries / 897.83 KiB |
| `pnpm check:budgets` | shell 157.6 kB gzip; precache 953.6 kB; 73 files |
| `pnpm e2e --workers=4` | 138 passed, including offline, no third-party request, 50 axe runs and the new toast/planned-URL tests |
