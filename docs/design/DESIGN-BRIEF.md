# Design brief — Omnitool

Process: plan → review against the brief → build → critique (per the frontend-design method). This file holds the reasoning; `DESIGN.md` holds the tokens agents consume.

## 1. Subject, audience, job
- **Subject:** a drawer of ~97 single-purpose tools (colour, image, PDF, media, text, dev, calculators).
- **Audience:** designers and developers who arrive with one small task and a file in hand.
- **Primary job of the interface:** get from "I have X" to the right tool in under five seconds, then get out of the way while the tool works.
- **Tone:** exact, calm, workshop-like. Tools are laid out like instruments on a bench, not marketed like products.

## 2. Design plan

### Colour (named, light / dark)
| Name | Light | Dark | Role |
|------|-------|------|------|
| Paper | `#EDF0F3` | `#12161D` (Graphite) | page ground |
| Ink | `#101828` | `#E6EAF0` (Chalk) | text |
| Rule | `#BCC5D0` | `#2C3441` | hairlines, borders |
| Cobalt | `#2447F5` | `#7F98FF` | primary action, links, focus ring |
| Marker | `#FFD84D` | `#FFD84D` | selection, "new", the one highlight |
| Alert | `#C42B1C` | `#FF8A7A` | destructive/error |

Surfaces: Panel `#FFFFFF` / `#1A2029`. Contrast must meet WCAG AA for all text pairs (verify in audit; Marker is never used as text on Paper).

### Type
- **Schibsted Grotesk** (variable): UI and headings; weights 400/500/700; tight optical sizing on headings.
- **Geist Mono**: values only (hex codes, byte sizes, timecodes, regexes, cron). Tabular numerals.
- Self-hosted via Fontsource packages so it works offline (no Google Fonts CDN).
- Scale (1.2 ratio): 12 / 14 / 16 / 19 / 23 / 28 / 34. Body 15–16 px; line length ≤ 70 ch; sentence case everywhere.

### Layout concept
**"The bench index."** The home page is a searchable, dense index, not a wall of identical cards. Each tool is a row showing name, a one-line purpose, and what it takes in and gives out (file-type glyphs). The omnibox is the hero.

```
HOME (desktop)
┌──────────┬─────────────────────────────────────────────────────┐
│ Omnitool │  [ Find a tool or drop a file…            Ctrl K ]   │  ← hero: omnibox
├──────────┤  Drop an image and see what can be done with it.     │
│ Colour 11│ ─────────────────────────────────────────────────── │
│ Images 19│  Colour                                               │
│ Audio/V 16│ ┌ Colour converter   Convert between formats  ·→# ┐ │
│ PDF     6│  │ Contrast checker   WCAG ratios               #  │ │
│ Text   11│  │ …                                               │ │
│ Dev     9│  └──────────────────────────────────────────────────┘ │
│ …        │  Images (19) …                                        │
└──────────┴─────────────────────────────────────────────────────┘
left aligned, one reading column, left rail fixed

TOOL PAGE
┌──────────┬─────────────────────────────────────────────────────┐
│ rail     │ Tool name                         [Share] [Reset]    │
│ (collapses│ ┌─────── input ───────┬───── options ─────┐        │
│  to icons)│ │ drop / paste / type │ controls          │        │
│          │ ├─────────────────────┴───────────────────┤        │
│          │ │ output + [Copy] [Download] [Send to ▾]   │        │
│          │ └──────────────────────────────────────────┘        │
└──────────┴─────────────────────────────────────────────────────┘
```
Mobile: rail becomes a bottom sheet from the omnibox; tool page stacks input → options → output.

### Principles
1. **The omnibox is the one bold element.** Everything else is quiet.
2. **Structure carries information.** Borders separate input / options / output because those are real stages; numbering is used only for workflows (a true sequence).
3. **Corner radius has a hierarchy:** controls 6 px, panels 10 px, toggles/pills fully round. No single radius on everything.
4. **Motion answers actions only:** panel open/close, drop-zone acceptance, progress. No scroll-in animations.
5. **Copy is functional:** verbs on buttons ("Convert", "Download PNG"), errors say what to do. No taglines in the chrome.
6. **Imagery is limited to the identity set** in `ART-PROMPTS.md` (logo, icon, OG image, three empty-state spots). Nothing decorative inside tools or pages. Icons are Lucide (ISC). No stock art. Identity stays typographic and structural; every asset is human-reviewed with provenance recorded.

## 3. Review against generic defaults
Checked the plan against the common AI-design clusters (cream + terracotta serif; near-black + acid accent; broadsheet hairlines with zero radius; identical rounded card grid; template chrome of all-caps eyebrows, middle-dot meta strings, mono labels, arrow-suffixed links).

Revisions made:
- Dropped an initial zero-radius hairline "spreadsheet" look: it matches the original delphitools and the broadsheet cluster; Omnitool needs its own identity.
- Replaced the card grid on home with an index of rows carrying input/output glyphs, because the content (tools that transform file types) is naturally tabular and directional.
- Kept monospace to values only, not labels.
- No all-caps eyebrows, no "→" appended to every link, no gradient washes.
- Chose cobalt + marker yellow (a drafting-pen pairing) rather than a warm clay or acid green accent.

Known remaining risk: grey-blue paper with cobalt is a common "tech" palette. Mitigation: the marker-yellow selection state and the input→output glyph system carry the distinctive character. Re-evaluate against Stitch's output.

## 4. Quality floor
Responsive to 320 px; visible keyboard focus (2 px cobalt ring, 2 px offset); `prefers-reduced-motion` honoured; contrast AA; touch targets ≥ 44 px on mobile; dark mode is designed, not inverted.
