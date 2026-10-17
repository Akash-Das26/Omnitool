# Stitch prompts (design gate P1-00)

How to use (Google Stitch is free; check https://stitch.withgoogle.com for the current UI):
1. Create a project. Import or paste `docs/design/DESIGN.md` as the design system.
2. Run the prompts below one at a time. Review each; iterate in plain language.
3. Export: the design system as `DESIGN.md`, and screens via the export menu (code, Figma, or the Stitch MCP server for your coding agent). Save under `docs/design/stitch/`.
4. Merge any token changes into `docs/design/DESIGN.md`, keeping token names. Record the decision in `docs/review/REVIEW-LOG.md`.
5. Treat Stitch output as reference. Production components come from shadcn/ui + our tokens.

Shared preamble (paste before each prompt):
> Product: Omnitool, a local-only website of small tools (colour, images, PDF, audio/video, text, dev utilities, calculators). No accounts, no ads. Audience: designers and developers with one small task. Use the attached DESIGN.md. Sentence-case copy in British English, functional wording, no taglines, no stock or generated imagery, Lucide icons only. Show light and dark.

## Prompts
1. **Home.** "Desktop home page. Hero is a large search field ('Find a tool or drop a file') with Ctrl K hint. Below it, an index of tools grouped by category (Colour, Images & assets, Audio & video, PDF, Typography & text, Dev tools, Calculators, Other). Each tool is a single row: name, one-line purpose, and small glyphs showing accepted input and produced output. Fixed left rail lists categories with counts. Avoid a card grid."
2. **Tool page template.** "Generic tool page using a colour converter as the example. Header with name, Share and Reset. Three stages separated by hairlines: Input, Options, Output. Output has Copy and a 'Send to' menu. Include empty, filled, and error states."
3. **Omnibox overlay.** "Command palette open over a tool page: query 'pdf', results grouped by category, keyboard hints, a section 'Tools that accept this file' after a PNG is dropped."
4. **Heavy file tool.** "Image converter with a 24 MP photo: file info panel, format and quality options, a determinate progress bar with Cancel, before/after size comparison, Download. Include a first-use 'Downloading codec (2.1 MB)' state."
5. **Workflow builder.** "Build a workflow of up to three tools in a row: step 1 PDF compressor, step 2 PDF page numbers. Numbered steps are allowed here because it is a sequence. Show a shareable link and a progress bar while running."
6. **Mobile.** "Mobile home and tool page at 390 px: omnibox first, category sheet, stacked input/options/output, 44 px targets."
7. **Editor shell.** "Full-screen image editor shell: top bar, left tool column, centre canvas, right panels (layers, inspector), bottom status. Dense, keyboard-first, dark by default."
8. **Atlas.** "One-page overview for a single colour: swatch, conversions in all notations, contrast against black and white, harmonies, shades. Dense and scannable."

## Acceptance checklist for the design gate
- [ ] Omnibox is clearly the primary element on home
- [ ] Tool index is not an identical-card grid
- [ ] AA contrast on all text pairs in light and dark
- [ ] No imagery that is not an icon
- [ ] Tool page stages (Input | Options | Output) are consistent across prompts 2 to 5
- [ ] DESIGN.md updated and token names preserved
