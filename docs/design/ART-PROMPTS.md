# Art prompts (identity set)

Scope: only the assets below. Nothing decorative inside tools; icons stay Lucide. Art is made by a human (you), with an image generator if you choose, and reviewed before use. The coding agent does **not** generate art; it uses a plain wordmark placeholder until you supply files.

Rules for every asset:
- Never upload or reference the original delphitools art (mascot, hero art, stickers, tiles) as a style or image reference.
- Reverse-image-search the result (Google Lens, TinEye) to catch accidental resemblance to an existing brand.
- Record tool, prompt, date and your edits in `docs/legal/ART-PROVENANCE.md`.
- Purely AI-generated images may have weak or no copyright protection in some jurisdictions. Hand-editing or redrawing the final mark improves your position. Not legal advice.
- Generators are poor at text. Generate symbols without lettering; set the name "Omnitool" in Schibsted Grotesk yourself.

## Palette and style (from `DESIGN.md`)
Paper #EDF0F3, Ink #101828, Cobalt #2447F5, Marker #FFD84D, Rule #BCC5D0. Flat, precise, drafting-bench feel. Typographic and structural, not illustrative.

## Master style block (prepend to every prompt)
```
Flat vector graphic, precise geometric construction, clean edges, solid fills, no gradients, no shadows, no 3D, no texture, no photorealism. Limited palette: ink #101828, cobalt #2447F5, marker yellow #FFD84D, on paper #EDF0F3. Feels like a drafting-bench instrument: exact, calm, utilitarian. No text, no letters, no numbers, no people, no faces, no mascots, no animals, no logos of existing brands.
```

## 1. Logo mark (symbol only)
```
[Master style block]
A simple symbol for a toolbox app called Omnitool. A thick circular ring in cobalt with a single square notch cut out of the ring at the upper right, the notch filled with a marker-yellow square, like a socket holding a tool bit. Perfectly centred, generous empty space around it, readable at 16 px, works in one colour. Square canvas, paper background. Generate 4 variations that differ only in notch position and ring thickness.
```
Alternatives to try if the first set is weak (keep the style block): (a) an open ring formed by three arcs with small gaps, one gap yellow; (b) an "O" made from a tape-measure or caliper outline, minimal.

## 2. App icon and favicon (derive from the chosen mark)
```
[Master style block]
Take the attached logo mark and place it centred on a solid cobalt #2447F5 square, mark in paper #EDF0F3 with the notch in marker yellow #FFD84D. Flat, no border, no shadow, mark occupies 60% of the canvas, safe margin for rounded-corner masking. 1024 x 1024.
```
Then export 512, 192, 180 (Apple touch), 32 and 16 px by hand-checking legibility; favicon should be a simplified SVG (ring + notch only).

## 3. Social / Open Graph image (1200 x 630, no text baked in)
```
[Master style block]
Wide banner 1200x630, paper background. Left third left empty for text added later. Right two-thirds: an abstract index of horizontal hairline rows in rule colour #BCC5D0, each row with a tiny square glyph at the left and a short line at the right, like a table of tools; one row highlighted with a marker-yellow fill, one small cobalt square at its left. Nothing else. No text.
```
Add the headline and tool count yourself in Schibsted Grotesk.

## 4. Spot illustrations (empty states), three images
```
[Master style block]
Monoline illustration, 1.5 px stroke weight look, ink #101828 line on transparent or paper background, with exactly one small marker-yellow accent shape. Square 600x600, centred, lots of empty space.
Subject A: a dashed rectangle with an arrow pointing into it (drop a file here).
Subject B: a magnifying glass over an empty list of three short lines (no results).
Subject C: a plug disconnected from a socket with a small check mark beside it (works offline).
```

## Review checklist (per asset)
- [ ] Reads at 16 px (mark) / at thumbnail size (OG)
- [ ] Works in one colour and in dark mode (provide a light-on-dark variant)
- [ ] No accidental text, artefacts, or odd geometry
- [ ] Reverse image search shows no close match
- [ ] Final mark redrawn or cleaned as SVG by a human; raster only for OG and spot art
- [ ] Provenance recorded

## Where files go
`apps/web/public/brand/` (logo.svg, logo-dark.svg, favicon.svg, icon-512.png, icon-192.png, apple-touch-icon.png, og.png) and `apps/web/src/assets/spots/` (drop.svg or png, empty.*, offline.*).
