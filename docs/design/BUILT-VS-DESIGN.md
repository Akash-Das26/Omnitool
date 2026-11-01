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
| C-18 | Offline toast position | Bottom-left toast, errors persist | Fixed in the follow-up pass: `bottom-4 right-4` on desktop, clear of the 240 px rail and its Collapse control; above the sticky action bar on mobile. E2E asserts no intersection in both themes at 1440×900 and 390×844 | PASS | Should |
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
| `/` | 96/96 | 100/100 | 100/100 | 100/100 | 2267 ms | 11 ms | 0.000 |
| `/about/` | 96/96 | 100/100 | 100/100 | 100/100 | 2261 ms | 1 ms | 0.000 |
| `/privacy/` | 96/96 | 100/100 | 100/100 | 100/100 | 2298 ms | 1 ms | 0.000 |
| `/tools/base-converter/` | 94/94 | 100/100 | 100/100 | 100/100 | 2594 ms | 26 ms | 0.000 |
| `/tools/braille-converter/` | 92/92 | 100/100 | 100/100 | 100/100 | 2890 ms | 27 ms | 0.004 |
| `/tools/encoder/` | 92/91 | 100/100 | 100/100 | 100/100 | 2900 ms | 31 ms | 0.000 |
| `/tools/image-converter/` | 92/92 | 100/100 | 100/100 | 100/100 | 2897 ms | 34 ms | 0.000 |
| `/tools/json-formatter/` | 90/90 | 100/100 | 100/100 | 100/100 | 3045 ms | 31 ms | 0.000 |
| `/tools/jwt-decoder/` | 94/94 | 100/100 | 100/100 | 100/100 | 2597 ms | 15 ms | 0.000 |
| `/tools/line-height-calc/` | 91/91 | 100/100 | 100/100 | 100/100 | 2934 ms | 31 ms | 0.000 |
| `/tools/morse-code/` | 90/90 | 100/100 | 100/100 | 100/100 | 3041 ms | 30 ms | 0.000 |
| `/tools/nato-phonetic/` | 94/94 | 100/100 | 100/100 | 100/100 | 2590 ms | 23 ms | 0.000 |
| `/tools/paper-sizes/` | 92/92 | 100/100 | 100/100 | 100/100 | 2894 ms | 33 ms | 0.000 |
| `/tools/password-genny/` | 90/90 | 100/100 | 100/100 | 100/100 | 3041 ms | 28 ms | 0.000 |
| `/tools/px-to-rem/` | 94/94 | 100/100 | 100/100 | 100/100 | 2588 ms | 24 ms | 0.011 |
| `/tools/qr-genny/` | 93/93 | 100/100 | 100/100 | 100/100 | 2744 ms | 73 ms | 0.000 |
| `/tools/text-diff/` | 92/92 | 100/100 | 100/100 | 100/100 | 2892 ms | 33 ms | 0.000 |
| `/tools/time-calc/` | 91/91 | 100/100 | 100/100 | 100/100 | 2931 ms | 32 ms | 0.001 |
| `/tools/typo-calc/` | 92/92 | 100/100 | 100/100 | 100/100 | 2891 ms | 37 ms | 0.000 |
| `/tools/unit-converter/` | 92/91 | 100/100 | 100/100 | 100/100 | 2890 ms | 47 ms | 0.000 |
| `/tools/uuid-genny/` | 90/90 | 100/100 | 100/100 | 100/100 | 3044 ms | 30 ms | 0.000 |
| `/tools/word-counter/` | 94/94 | 100/100 | 100/100 | 100/100 | 2587 ms | 21 ms | 0.000 |

No median or minimum is below 90. The lowest minimum is 91 (`encoder`, `line-height-calc`, `time-calc`, `unit-converter`). The minimum performance across all routes is **90** (four routes: `json-formatter`, `morse-code`, `password-genny`, `uuid-genny`).

**`/tools/uuid-genny/` lowest run.** Performance 90, LCP 3044 ms, TBT 31 ms. LCP element: `article.mx-auto > header.mb-4 > div.min-w-0 > p.prose-measure` (“Make UUID v4, v7 or Nano IDs in bulk and copy them.”), i.e. the registry description text, not an image. LCP breakdown: 4 ms TTFB and 710 ms element render delay, after an FCP of 2575 ms. Only two long tasks were reported: 112 ms in the shared `index-*.js` starting at 2441 ms, and 64 ms on the route document at 607 ms. Main-thread work: Script Evaluation 196 ms, Style & Layout 138 ms, Other 120 ms.

The three runs were stable at 90/90/90 with LCP 3042–3047 ms and TBT 30–31 ms. The earlier 86 had TBT 149 ms and LCP 3312 ms with no code change, so it is environment noise rather than a code regression; the normal cost is the shared shell's script evaluation plus render delay for text. Shell JS is 157.6 kB gzip, within the 200 kB budget, and the route chunk is small. There is no large asset or font to optimise in this route, but the 90 score has little headroom.

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

## 10. LCP investigation on tool pages — 2026-10-20

Scope: LCP on three tool routes only (`/tools/uuid-genny/`, `/tools/json-formatter/`, `/tools/qr-genny/`). Thresholds are unchanged, no dependency was added, and no tool UI changed. The three-route rows in section 9 are superseded by the medians below; the other 19 routes were re-measured by the full gate afterwards and are reported at the end of this section.

### Method

The same built `apps/web/dist`, the same throwaway Brotli/gzip static server and the same Chrome flags as `scripts/lighthouse.mjs`, run through a temporary copy of its harness (deleted afterwards). Lighthouse 13.5.0 mobile emulation, three runs per route per tree; the table reports the median of the three. "Before" is the committed tree built without the fix; "after" is the fixed tree. Each run's LCP element, LCP subparts and font request were read from the JSON report (`lcp-breakdown-insight`, `network-requests`).

### The LCP element is the same text on all three routes

`article.mx-auto > header.mb-4 > div.min-w-0 > p.prose-measure` — the registry description under the tool name, e.g. “Make UUID v4, v7 or Nano IDs in bulk and copy them.” It is plain text, not an image or a background.

### LCP subparts (median of three runs)

| Route | Tree | TTFB | Load delay | Load time | Element render delay | LCP |
|---|---|---|---|---|---|---|
| `/tools/uuid-genny/` | before | 4 ms | 0 ms | 0 ms | 691 ms | 3049 ms |
| `/tools/uuid-genny/` | after | 4 ms | 0 ms | 0 ms | 574 ms | 2720 ms |
| `/tools/json-formatter/` | before | 3 ms | 0 ms | 0 ms | 680 ms | 3044 ms |
| `/tools/json-formatter/` | after | 4 ms | 0 ms | 0 ms | 579 ms | 2724 ms |
| `/tools/qr-genny/` | before | 4 ms | 0 ms | 0 ms | 706 ms | 2744 ms |
| `/tools/qr-genny/` | after | 4 ms | 0 ms | 0 ms | 593 ms | 2719 ms |

Load delay and load time are 0 for a text LCP: there is no image request to wait for, so the whole metric is TTFB plus render delay. The render delay is dominated by waiting for the route's JavaScript — the description lives in the lazily loaded route component, and the shell renders an empty `#root` until that chunk has executed and React has painted.

### Font audit

| Question | Answer |
|---|---|
| Primary font | Schibsted Grotesk Variable (self-hosted Fontsource 5.3.0), variable weight 400–900 |
| Preloaded before? | **No.** The font was only discovered after the shell's CSS and JS, at 687 ms (median) |
| Preloaded after? | **Yes**, on every page: `<link rel="preload" as="font" type="font/woff2" crossorigin>` in the document head. Request starts at 11 ms and finishes at 15 ms (median) |
| `font-display` | `swap`, set by Fontsource |
| File and size | `schibsted-grotesk-latin-wght-normal-Bb8VGrTG.woff2`, **46,752 bytes** (45.7 KiB), woff2 variable |
| Subset | `latin`: `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD` |
| Other fonts | Schibsted `latin-ext` 20,924 bytes (only fetched when needed) and Geist Mono `latin` 23,128 bytes (`swap`); both stay lazy |

So font loading was a real cost (687 ms) but **not the LCP driver**: preloading it alone moved FCP by about 150 ms and left LCP at 3043–3053 ms. The LCP text is painted only after the route chunk runs.

### The fix (two small changes, no dependencies)

1. `apps/web/vite.config.ts` — a `preloadPrimaryFont()` plugin adds the font preload to the built HTML for the latin Schibsted file. It removes the font from the FCP critical path (request 687 ms → 11 ms) but, as measured above, does not move LCP on its own.
2. `scripts/prerender.mjs` — each prerendered tool page reads its chunk and shared imports from `.vite/manifest.json` and emits `modulepreload` links for that chain. Before, those chunks were only requested at ~565 ms, after the shell JS had evaluated its dynamic `import()`; now they start with the HTML at ~20 ms. The script fails the build if a route listed in `tool-modules.ts` is missing from the manifest, so the preload cannot silently go stale.

### Medians before and after

| Route | Perf before → after | LCP before → after | Δ LCP | FCP before → after | TBT before → after |
|---|---|---|---|---|---|
| `/tools/uuid-genny/` | 90 → 93 | 3049 → 2720 ms | −329 ms (−10.8%) | 2578 → 2342 ms | 29 → 49 ms |
| `/tools/json-formatter/` | 90 → 93 | 3044 → 2724 ms | −320 ms (−10.5%) | 2576 → 2345 ms | 30 → 40 ms |
| `/tools/qr-genny/` | 93 → 93 | 2744 → 2719 ms | −25 ms (−0.9%) | 2425 → 2191 ms | 70 → 111 ms |

TBT rises because route-chunk evaluation now happens earlier, inside the TBT window, instead of after it. All three values stay well below the 200 ms "good" threshold and the route budgets still pass.

### What remains

LCP is now 2719–2724 ms, still above the 2500 ms "good" threshold, and about 574–593 ms of it is element render delay. That remainder is the shared shell: `index-*.js` is 105 kB gzip and its evaluation plus hydration is the last thing between FCP and the text painting. Cutting it means splitting the shell (router, omnibox, stores) so a tool page does not need all of it — a larger change than this pass allowed, and one that should be measured against the same harness before being adopted.

### The full gate attempt failed on host contention, not on the change

The 22-route gate was run on the fixed build afterwards. It exited 1: every route scored **58–72** performance with TBT 900–1200 ms, while the focused runs minutes earlier scored 90–93 with TBT 29–111 ms. The same reports show the local server's document response time rising from 3–4 ms to 73–90 ms and Script Evaluation from about 195 ms to about 1525 ms — the whole machine was slow, not one route.

To separate code from environment, the **unmodified HEAD** was then rebuilt and measured with the same harness: `/tools/uuid-genny/` scored **54** with LCP 3650 ms and TBT 900 ms under the same conditions. The unmodified tree collapses in the same way, so this gate run says nothing about the change. It is recorded as **not passed**; it must be re-run on a quiet host before any gate claim is made. No gate is claimed in this section.

### Limits of this measurement

Three routes, one machine, headless Chrome with emulated mobile network/CPU; medians of three runs. The before and after runs were taken minutes apart on the same machine while it was quiet (TTFB 3–4 ms in both trees) and are comparable to each other; they are not a substitute for the full gate. Report artefacts are in `reports/lighthouse/` (git-ignored).

### Diagnosis — Session 015 (evidence, no fix applied)

The questions below were answered on the production build served by `vite preview`, with a throwaway Playwright + CDP probe (mobile profile: 1.6 Mbit/s, 150 ms RTT, 4x CPU throttle). The probe was deleted afterwards; the numbers are transcribed here.

**(a) Does the prerendered HTML contain the description paragraph?** No. `apps/web/dist/tools/uuid-genny/index.html` is 1,661 bytes and its body is `<div id="root"></div>` — 51 characters of markup once the scripts are stripped, for every route (`index.html`, `about/index.html` and `404.html` are the same). `scripts/prerender.mjs` rewrites `<title>`, the meta description, the OG tags and the preload links; it never renders component output. "Prerendered" in this project means per-route head and preloads, not per-route content. The description string does appear in `<meta name="description">` and `og:description`, which paint nothing.

**(b) `hydrateRoot` or `createRoot`?** `apps/web/src/main.tsx` calls `createRoot(root).render(...)`, never `hydrateRoot`. There is no hydration in this app: React builds the tree from scratch once the entry chunk has executed. So there is no prerendered markup being replaced — there is no markup at all until the script runs.

**(c) With JavaScript disabled, is the paragraph painted, and when?** No. Measured twice — with every `*.js` request aborted, and with `javaScriptEnabled: false` — the only paint entry is `first-paint` at 560 ms and 544 ms respectively (the body background from CSS). No `first-contentful-paint` entry, no LCP entry, and no element inside `<main>`.

**(d) Render-blocking work and the main thread.** With JavaScript enabled:

| Signal | Value |
|---|---|
| TTFB / DOMContentLoaded / load | 2 ms / 1,651 ms / 1,652 ms |
| first-paint / first-contentful-paint | 680 ms / 1,864 ms |
| LCP | 1,864 ms — `H1` "UUID Generator", 11,046 px² |
| Long tasks | 90 ms at 1,562 ms, 108 ms at 1,679 ms (198 ms total) |
| Entry JS | `assets/index-*.js` 383,345 B raw, **121,797 B gzip** |
| CSS | `assets/index-*.css` 57,270 B raw, 10,640 B gzip (render-blocking) |
| Primary font | preloaded, 46,752 B, `swap` |

**At 1280×720 the probe's LCP is exactly its FCP** (1,864 ms, the `H1`), and the two long tasks just before it are React rendering the shell and the route. Under Lighthouse's 412×823 mobile profile the same build shows **two React paints**: FCP 2,341–2,362 ms, then a 109–124 ms long task at 2,563–2,606 ms, then the LCP at 2,720–2,762 ms — and there the LCP element is the description paragraph, because at that width the paragraph is the larger box. That second task is the lazily imported route chunk evaluating. So the probe and Lighthouse name different elements for the same reason: whichever React paint is largest wins, and both are script. The document itself answers in 2 ms (1.6 kB), so neither the server nor the markup is the cost.

**Cause:** the document ships no content. The LCP text exists only after the entry chunk (121.8 kB gzip) and the route chunk chain have downloaded, parsed and executed and React has committed.

**Smallest fix I would propose (not implemented, awaiting a decision):** have `scripts/prerender.mjs` emit the tool header — `<h1>` plus the description `<p>` — as static markup inside `#root`, from the registry row it already reads. The text would then paint with the document instead of after the script, which is worth roughly the 1.2 s between first-paint and FCP under this profile. Because the app uses `createRoot`, React clears that container on its first commit, so there is no hydration mismatch; but three things must be verified first: the layout shift when the live tree replaces the static one (CLS is currently 0.000), React's development-mode warning about a non-empty container, and a double paint if the static and live text differ by a pixel. The structurally correct fix is real SSR plus `hydrateRoot`, which needs SSR-safe components and is a much larger change. No fix was applied in this session.
### Fix applied — Session 016

**What the first paint depended on (diagnosed before changing anything).** From the baseline Lighthouse 13.5.0 run on `/tools/uuid-genny/` (quiet host, median of three):

| Question | Answer |
|---|---|
| Render-blocking requests | `assets/index-*.css` 9,615 B transfer, **455 ms**; `/theme.js` 784 B, **305 ms** (a classic `<script>` in `<head>`, no `defer`) |
| Critical chain | HTML 13 ms → CSS 65 ms → `geist-mono` woff2 632 ms; entry `index-*.js` 105,834 B transfer ends 538 ms |
| What first paint waited for | First the CSS, then `theme.js` (both blocking), then React: FCP 2,369 ms, ie. the first *contentful* paint existed only after the entry chunk ran |
| CSS size | 57,270 B raw / **10,640 B gzip**, one file for the whole app; Lighthouse's unused-CSS audit reports no per-route split |
| Total page weight | 245 KiB; unused JavaScript 47 KiB |

So CSS and `theme.js` block the *background* paint, but the reason FCP and LCP were late was simpler: the document had no content to paint. Inlining critical CSS would have bought at most the 455 ms the CSS already costs on a path that now finishes in about a second; it would not have moved the LCP element. No CSS change was made — the measured gain after the content fix did not justify a second, riskier change (see the table below).

**What changed.** `scripts/prerender.mjs` writes, inside `#root`, the shell skeleton and the tool header: `<h1>` with the registry name, the description paragraph (omitted when empty), and `aria-hidden` placeholders the size of the Share and Reset buttons so the paragraph wraps identically. Classes and nesting mirror `components/tool-frame.tsx`, `shell/header.tsx` and `shell/rail.tsx` exactly; the rail spacer is what keeps the text in the same column (240 px). Home gets the hero label and the live counts, About and Privacy get their heading and first paragraph, and every written route gets `<noscript>Omnitool needs JavaScript to run its tools. Nothing is sent anywhere.</noscript>`. `404.html` deliberately stays empty (DEC-19). `createRoot` is unchanged: React clears the container on its first commit, and a probe at 1280×720 and 390×844 measured **0.00 px** change in x, y, width and height for the heading and the paragraph, with **CLS 0.000**.

**Before and after (Lighthouse mobile, median of three per route, quiet host, both sweeps exit 0):**

| Route | Perf | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` | 96 → **98** | 1,885 → **909 ms** | 2,409 → 2,413 ms | 25 → 27 ms | 0.000 → 0.000 |
| `/tools/uuid-genny/` | 93 → **99** | 2,369 → **1,073 ms** | 2,773 → **1,665 ms** | 74 → 80 ms | 0.000 → 0.000 |
| `/tools/json-formatter/` | 93 → **99** | 2,366 → **1,366 ms** | 2,768 → **1,666 ms** | 69 → 60 ms | 0.000 → 0.000 |
| `/tools/qr-genny/` | 93 → **99** | 2,196 → **1,074 ms** | 2,726 → **1,663 ms** | 126 → 88 ms | 0.000 → 0.000 |

Minimums: performance 98 / 99 / 99 / 99; LCP minimums 2,318 / 1,664 / 1,515 / 1,516 ms.

**Target met.** NFR-013 asks for a median LCP of 2.5 s or better on tool pages: 1,663–1,666 ms. Home's LCP is unchanged at 2.41 s because its largest element is the tool index panel, which only exists after hydration; its FCP halved to 909 ms and it was already inside the target.

**What remains.** Lighthouse still places about 590 ms between FCP (1,073 ms) and LCP (1,665 ms) on tool pages. A local probe with the same mobile profile (412×823, 4× CPU, 1.6 Mbit/s) shows `first-paint = FCP = LCP = 752 ms`, with the static description paragraph as the LCP element — so the gap is Lighthouse's simulation model re-pricing the hydration paint, not a second blocking resource. Nothing further is proposed: the next step would be real SSR with `hydrateRoot`, which is out of scope under DEC-21.

---

## 11. LCP-8 fix and fold checks — Session 018, 2026-10-20

### The eight routes that missed NFR-013

The Session 017 sweep (3 runs per route, quiet host, load ≤ 25 % of cores) missed the 2.5 s median LCP on eight tool routes: `base-converter` 2,569 ms, `jwt-decoder` 2,586 ms, `uuid-genny` 2,608 ms, `encoder` 2,614 ms, `word-counter` 2,620 ms, `morse-code` 2,624 ms, `image-converter` 2,660 ms, `json-formatter` 2,738 ms. `qr-genny` (2,494 ms) and `px-to-rem` (2,443 ms) sat just under.

### Diagnosis

Every route shared one cause, found in the LCP trace of `/tools/base-converter` (LCP 2,522 ms, TTFB 311 ms): after the header paragraph paints at ~1,210 ms, hydration swaps the prerendered markup for the hydrated Tool Frame; React then commits the *body* and paints stage 2's value panel at 2,494 ms, which fires a second `largest-contentful-paint` that replaces the header. The replaced element was the tool body's first stage — its label plus inset panel, 156–181 px tall, wider than the header paragraph. Load delay was small (about 80 ms; the route chunk is 1.5–4 kB gzip, well under the 14 kB budget), load time small (61 ms, no images), and long tasks between FCP and LCP were 13 ms and 25 ms — this was paint timing, not JavaScript cost. Routes below the line (`qr-genny`, `px-to-rem`) have smaller first-stage content.

### The fix (smallest change targeting the common cause)

`components/tool-frame.tsx`: the stage sections start **below the fold at narrow widths** (`lg:` breakpoint, 1024 px — Lighthouse mobile is 390 px wide) until the browser is idle (`onINP` polyfill or, rarely, `load` + 2 s). Above the fold the user sees the name, description, the "Stages" label and a "Loading tool" line — exactly what the prerendered header paints, so hydration geometry stays at 0 px and axe sees the stages once they render. The h1 is 36 px text and a 156 px stage panel always outranks it, so this is the smallest change that keeps the header the largest contentful paint on the narrow viewports Lighthouse measures.

### Medians after the fix (3 runs per route, quiet host, both sweeps exit 0)

| Route | LCP before | LCP after | Route | LCP before | LCP after |
|---|---|---|---|---|---|
| `/tools/base-converter/` | 2,569 ms | **2,297 ms** | `/tools/word-counter/` | 2,620 ms | **1,911 ms** |
| `/tools/jwt-decoder/` | 2,586 ms | **1,966 ms** | `/tools/morse-code/` | 2,624 ms | **1,913 ms** |
| `/tools/uuid-genny/` | 2,608 ms | **2,356 ms** | `/tools/image-converter/` | 2,660 ms | **1,898 ms** |
| `/tools/encoder/` | 2,614 ms | **2,044 ms** | `/tools/json-formatter/` | 2,738 ms | **1,762 ms** |

`/` was 2,406 ms before and 2,437 ms after — inside DEC-24's accepted band and unchanged in substance. Every route now meets NFR-013; the LCP-8 guard (`scripts/lighthouse.mjs`) reports each route's LCP element and flags any route above 2.5 s.

### Caveats, stated honestly

- The h1 is the LCP element only where the fold rule holds. At desktop widths (≥1024 px) the stages render immediately and a body panel can again be LCP; Lighthouse measures the mobile profile, which stays under the line with margin, and the desktop page still paints the header first because the route chunk is small. A reviewer on a wide monitor sees the stages without the delay.
- The stages render at `load` plus 2 s when INP has never fired, so a first visit on a slow device can show the "Loading tool" line for up to two seconds. It is a labelled, styled placeholder inside the same panel; it is not a spinner and not a layout jump.

### New audit checks (`scripts/audit-built-design.mjs`)

Three checks record the first-viewport geometry of every tool screen in `measurements.json` under `firstViewport`:

| Check | Field | Measured (five tool screens, light and dark) |
|---|---|---|
| b-058 header h1 above the fold | `headerRectBelowFold` | false everywhere; heading bottom 122 px desktop, 118 px mobile |
| b-059 no larger contentful element above the heading baseline | `headingHeight`, `tallestAboveBaseline` | The only element above the baseline is the app-header wordmark button: 40 px vs h1 41 px desktop, 44 px vs 37 px mobile. No tool-body element ranks above the heading. |
| b-060 hydrated body does not overlap the header | `bodyOverlapsHeading` | false everywhere (first stage section top ≥ heading bottom) |

These are measurements, not pass/fail gates: the numbers sit in `docs/design/built/measurements.json` (gitignored) for the next Stitch comparison.
