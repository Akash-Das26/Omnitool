# DESIGN.md — Omnitool design system (seed)

> Portable design-system file for AI tools (Google Stitch DESIGN.md format, agent-readable).
> Seeded from `DESIGN-BRIEF.md`. After the Stitch design pass (P1-00), merge or replace with the Stitch export, keeping token names stable.

## Overview
Exact, calm, workshop-like. A dense, searchable index of single-purpose tools. One bold element per screen (the omnibox on home; the output on a tool page); everything else is quiet.

## Colors
Tokens are CSS variables; `dark` values apply under `.dark` on `<html>`.

| Token | Light | Dark |
|-------|-------|------|
| `--background` (Paper) | #EDF0F3 | #12161D |
| `--surface` (Panel) | #FFFFFF | #1A2029 |
| `--surface-inset` (nested trays, code wells) | #EDF0F3 | #161B23 |
| `--surface-hover` (row hover, pressed controls) | #EDF0F3 | #202733 |
| `--foreground` (Ink) | #101828 | #E6EAF0 |
| `--muted-foreground` | #4A5565 | #9AA6B8 |
| `--border` (Rule, decorative hairlines only) | #BCC5D0 | #2C3441 |
| `--border-strong` (controls: inputs, buttons, checkboxes, drop zones) | #6B7686 | #6C7A90 |
| `--primary` (Cobalt) | #2447F5 | #7F98FF |
| `--primary-foreground` | #FFFFFF | #0B1020 |
| `--highlight` (Marker) | #FFD84D | #FFD84D |
| `--highlight-foreground` | #101828 | #101828 |
| `--destructive` | #C42B1C | #FF8A7A |
| `--success` | #067A52 | #4ADE9B |
| `--warning` | #8A5A00 | #F5B93A |
| `--ring` | #2447F5 | #7F98FF |

Rules: Marker is a fill for selection/"new" only, never body text colour, never a status badge. Both extra surfaces verified AA with chalk, muted, cobalt and destructive text and the strong border (Stitch review pass 2). Destructive stays #C42B1C (Stitch's #D92D20 is 4.22:1 on Paper, fails AA). Verified AA (text 4.5:1, control boundaries 3:1) for every pair above on both Paper and Panel (Stitch review, 2026-10-18); `--success` light is 5.4:1 on Panel, 4.7:1 on Paper. Use `--border` for decorative hairlines and `--border-strong` for anything that identifies a control. No other status colours.

## Typography
- Sans: **Schibsted Grotesk** variable, 400/500/700. Mono: **Geist Mono**, for values only, `font-variant-numeric: tabular-nums`.
- Scale (px): 12, 14, 16, 19, 23, 28, 34. Headings 700, tight tracking (-0.01em). Body 400, line-height 1.55. Max line length 70ch.
- Sentence case. No all-caps labels. **Minimum text size 12 px**; never 10 to 11 px. Values that are the product (colour codes, hashes) wrap or scroll, never truncate with an ellipsis.

## Layout
- Left rail 240 px (collapses to 56 px icons), content max-width 1100 px, tool pages full available width.
- 4 px spacing base: 4, 8, 12, 16, 24, 32, 48.
- Left-aligned text throughout; no centred paragraphs.
- Breakpoints: 640, 768, 1024, 1280.

## Elevation and shape
- Flat by default; separation by 1 px `--border`. One shadow level for popovers/dialogs only: `0 8px 24px rgb(16 24 40 / 0.16)`.
- Radius: controls 6 px, panels 10 px, pills/toggles 9999 px.

## Components
- **Omnibox:** large input, `Ctrl/Cmd K`, results list grouped by category, file-drop target; matching text underlined, selected row on Marker. After a file is dropped, show a chip with its name, size and type and a first group "Tools that accept this file". Footer shows key hints (navigate, open, cycle category, dismiss).
- **Tool index row:** name, purpose, accepts → produces glyphs; whole row is the link; focus ring on the row.
- **Tool frame:** header (name, Share, Reset), then three stages: Input | Options | Output separated by 1 px rules. Stage headings are unnumbered. Output lists each value on its own row with a per-row Copy button, plus Copy all / Download and, when handoff is available, "Send to". On mobile the stages stack and the actions sit in a sticky bottom bar (44 px targets).
- **Drop zone:** dashed 1 px border; on drag-over, Marker 20% fill and solid border.
- **Progress:** determinate bar when known, with Cancel always visible for work > 1 s. First use of a codec or model shows its name, size and a Cancel, then a cached state.
- **Workflow step:** numbered card (numbers are allowed here, a real sequence) with status, input source, parameters and an empty "add step" slot; up to three steps; state lives in the URL.
- **Editor:** full-screen route with its own chrome (tool column, canvas, inspector, layers/history tabs, one status line); follows the theme setting.
- **Buttons:** primary (Cobalt fill), secondary (border), ghost; min height 40 px desktop, 44 px mobile.
- **Toasts:** bottom-left, concise, past tense ("Copied"). Errors persist until dismissed and say how to fix.
- **Icons:** Lucide, 1.5 px stroke, 20 px.

## Do
Use tokens, never raw hex in components. Give every control a visible label or accessible name. Keep copy plain and specific. Respect reduced motion.

## Don't
No decorative gradients (gradients only for real colour data such as a lightness ramp), no heavy shadows, no icon fonts (Lucide only), no stock imagery, and no imagery outside the identity set in `ART-PROMPTS.md`. No invented claims or version/engine badges: show only what the app computes or knows to be true. No mock-only state switches. No short links or other server-implying UI. No row IDs, ranking badges ("Recommended") unless real, code-style labels (SNAKE_CASE, `//` prefixes), uppercase section tags, or status text that is not real state ("Standby", "Buffer: Idle"). Key-value labels are sentence case. Control height is 40 px desktop, 44 px mobile (not 28 px). Corner radius per the Elevation section; screenshots that show square corners do not override it (DEC-16). No tracked all-caps eyebrows. No identical-card grids for the tool index. No numbered markers except for real sequences (workflow steps). No copying the original delphitools artwork, copy or mascot.
