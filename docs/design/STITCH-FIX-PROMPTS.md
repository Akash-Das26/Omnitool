# Stitch fix prompts (optional second pass)

Run in the same Stitch project, with the updated `docs/design/DESIGN.md` imported as the design system. One prompt per request; review each. Findings referenced are in `STITCH-REVIEW.md`.

Shared preamble:
> Use the attached DESIGN.md exactly. Sentence case only (no uppercase labels, no "A · B · C" meta strings). Minimum text size 12 px. Use Lucide-style icons, not Material Symbols. No gradients except in real colour-data visuals. No shadows except on popovers and dialogs. No version numbers, engine names, benchmark timings or marketing claims in the interface. No mock state switches. Control borders use the strong border colour. Show real, plausible content only.

1. **Dark variants.** "Create dark-mode versions of the desktop home, colour converter tool page and omnibox overlay using the dark tokens. Keep layout identical."
2. **Home, clean.** "Revise the desktop home: remove the version tag, 'Zero Network Latency' and marketing footer claims; section headers show only the category name and count; keep rows with accepts → produces chips; rows show a one-line purpose."
3. **Tool page, clean.** "Revise the colour converter: unnumbered stage headings Input, Options, Output; remove the Filled/Empty/Error switch, '0.2ms compile', 'Zero-network' and 'CSS Spec Compliant' badges and the bottom status bar; output values on separate rows, each with Copy; values wrap rather than truncate."
4. **Image converter, clean.** "Revise the image converter: remove the SIMULATE control, library/version names and SharedArrayBuffer wording; keep first-use codec download, determinate progress with Cancel, and before/after size; fix overlapping header text; photo previews are placeholders for the user's own file."
5. **Workflow builder, clean.** "Revise the workflow builder: show the full shareable link as a long URL field (no short link); remove Save Pipeline; make overall progress consistent with step status; stop button labels wrapping; neutral status badge instead of yellow."
6. **Mobile.** "Revise mobile home and tool page: same tool names and categories as desktop; remove the History tab; output values wrap; keep the sticky action bar; 12 px minimum text."
7. **Editor, full screen.** "Revise the image editor as a full-screen route with no category rail: top bar (undo/redo, zoom, export), tool column, canvas, inspector, layers and history tabs, one status line; fix overlapping top-bar text; light and dark."
8. **Atlas, honest.** "Revise the colour atlas: remove Pantone match and 'Peak wavelength'; keep conversions, contrast against white and black with correct ratios, harmonies, tonal scale and send-to actions."
