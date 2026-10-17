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
| `--foreground` (Ink) | #101828 | #E6EAF0 |
| `--muted-foreground` | #4A5565 | #9AA6B8 |
| `--border` (Rule) | #BCC5D0 | #2C3441 |
| `--primary` (Cobalt) | #2447F5 | #7F98FF |
| `--primary-foreground` | #FFFFFF | #0B1020 |
| `--highlight` (Marker) | #FFD84D | #FFD84D |
| `--highlight-foreground` | #101828 | #101828 |
| `--destructive` | #C42B1C | #FF8A7A |
| `--ring` | #2447F5 | #7F98FF |

Rules: Marker is a fill for selection/"new" only, never body text colour. Verify AA for every text/background pair.

## Typography
- Sans: **Schibsted Grotesk** variable, 400/500/700. Mono: **Geist Mono**, for values only, `font-variant-numeric: tabular-nums`.
- Scale (px): 12, 14, 16, 19, 23, 28, 34. Headings 700, tight tracking (-0.01em). Body 400, line-height 1.55. Max line length 70ch.
- Sentence case. No all-caps labels.

## Layout
- Left rail 240 px (collapses to 56 px icons), content max-width 1100 px, tool pages full available width.
- 4 px spacing base: 4, 8, 12, 16, 24, 32, 48.
- Left-aligned text throughout; no centred paragraphs.
- Breakpoints: 640, 768, 1024, 1280.

## Elevation and shape
- Flat by default; separation by 1 px `--border`. One shadow level for popovers/dialogs only: `0 8px 24px rgb(16 24 40 / 0.16)`.
- Radius: controls 6 px, panels 10 px, pills/toggles 9999 px.

## Components
- **Omnibox:** large input, `Ctrl/Cmd K`, results list grouped by category, file-drop target; matching text underlined, selected row on Marker.
- **Tool index row:** name, purpose, accepts → produces glyphs; whole row is the link; focus ring on the row.
- **Tool frame:** header (name, Share, Reset), then three stages: Input | Options | Output separated by 1 px rules. Output always shows Copy and/or Download; "Send to" appears when handoff is available.
- **Drop zone:** dashed 1 px border; on drag-over, Marker 20% fill and solid border.
- **Progress:** determinate bar when known, with Cancel always visible for work > 1 s.
- **Buttons:** primary (Cobalt fill), secondary (border), ghost; min height 40 px desktop, 44 px mobile.
- **Toasts:** bottom-left, concise, past tense ("Copied"). Errors persist until dismissed and say how to fix.
- **Icons:** Lucide, 1.5 px stroke, 20 px.

## Do
Use tokens, never raw hex in components. Give every control a visible label or accessible name. Keep copy plain and specific. Respect reduced motion.

## Don't
No decorative gradients, stock imagery, or imagery outside the identity set in `ART-PROMPTS.md`. No tracked all-caps eyebrows. No identical-card grids for the tool index. No numbered markers except for real sequences (workflow steps). No copying the original delphitools artwork, copy or mascot.
