# Design alignment prompt (Phase 1.5)

Give to your coding agent in the repo after copying in the updated `docs/design/DESIGN.md`, `docs/design/STITCH-REVIEW.md` and the unzipped Stitch export at `docs/design/stitch/`. Edit the decisions block first.

```
<objective>
Align the existing Phase 1 shell with the reviewed Stitch design, in one bounded change. Do not add tools or features beyond those listed. Do not create artwork.
</objective>

<decisions_from_the_human>
(EDIT before sending.)
DEC-13: Stitch review accepted: adopt as a layout reference with the fixes in docs/design/STITCH-REVIEW.md. <yes | with changes: ...>
DEC-14: Workflow short links, "Save pipeline" and a History tab are out of scope.
DEC-15: Fonts stay Schibsted Grotesk (sans) and Geist Mono (values only).
</decisions_from_the_human>

<context>
Read first: AGENTS.md, plan.md, todo.md, docs/design/DESIGN.md (updated), docs/design/STITCH-REVIEW.md, docs/design/DESIGN-BRIEF.md, docs/implementation/IMPLEMENTATION.md, the last three entries of docs/review/REVIEW-LOG.md.
The Stitch export in docs/design/stitch/ is a LAYOUT REFERENCE ONLY. Look at the screen.png files. Do not copy its HTML, class names, Material Symbols, CDN links, remote images, fonts or any text. Its mock data, tool names, counts and badges are not specifications.
</context>

<instructions>
1. Tokens: update packages/ui tokens to match DESIGN.md exactly: add --border-strong, --success, --warning (light and dark). Use --border-strong for inputs, buttons, checkboxes, selects, drop zones and focus-adjacent boundaries; keep --border for decorative hairlines. Add a unit or visual test that asserts every text/background and control-border pair listed in DESIGN.md meets WCAG AA (4.5:1 text, 3:1 control boundary) in light and dark, computing contrast in code.
2. Type: enforce a 12 px minimum text size (lint rule, grep check or test). Remove all-caps tracked labels and "A · B · C" meta strings. Values that are the product wrap or scroll, never truncate with an ellipsis.
3. Home: compare the existing home with docs/design/stitch/omnitool_desktop_home_page/screen.png and mobile_home. Keep rows with accepts -> produces chips, left rail with counts, omnibox hero. Remove any tagline or claim not backed by facts. Data comes from the registry only.
4. Omnibox: add underlined matches, Marker-yellow selected row, a dropped-file chip (name, size, type) with a first group "Tools that accept this file", and footer key hints, per DESIGN.md. Keep it accessible (combobox/listbox roles, focus management, Esc).
5. Tool frame: unnumbered Input | Options | Output stages; per-value Copy rows; Copy all / Download / "Send to" (disabled with an explanation until handoff exists, or hidden); sticky mobile action bar. Apply to the three sample tools.
6. Heavy-tool states: make the image-converter stub show first-use download (name, size, Cancel, cached state), determinate progress with always-visible Cancel, and before/after size, driven by real harness state. Remove any mock-state control.
7. Remove from the app: icon fonts, gradients (except real colour data), shadows other than the popover shadow, status badges that use Marker, any version/engine/benchmark badge.
8. Add a dark-mode Playwright screenshot test for home, a tool page and the omnibox so regressions are visible; run axe in both themes.
9. Run: install with frozen lockfile, lint, typecheck, tests with coverage, build with budgets, E2E, axe (light and dark), Lighthouse on home. Report shell JS and precache changes. Do not weaken thresholds.
</instructions>

<constraints>
- Only the changes above. No new tools, no workflows, no editor, no brand assets.
- Local-only: no CDN, no remote images, no third-party requests.
- No copying from docs/design/stitch/ code or text, or from delphitools.
- Do not invent versions or APIs; check docs for the pinned versions.
- Small Conventional Commits, no attribution trailers (AGENTS.md). Do not push.
- If blocked, record why in the review log and continue.
</constraints>

<session_end>
Tick todo.md, update docs/design/DESIGN.md only if implementation proves a token wrong (say why), append a Session entry to docs/review/REVIEW-LOG.md, and print: changes made, check results with numbers, deviations from the Stitch screens and why, and decisions you need from me.
</session_end>

<success_criteria>
Every contrast assertion passes in both themes; no text under 12 px; no icon fonts, gradients, heavy shadows or invented badges remain; omnibox and tool frame match DESIGN.md; all existing checks stay green and budgets hold.
</success_criteria>
```
