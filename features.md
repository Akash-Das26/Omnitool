# features.md — Omnitool feature ledger

> Source of truth for **what the original has** and **what Omnitool has completed**.
> Reference: `delphitools-main.zip` (Zero-Clause BSD) and https://delphi.tools/, audited 2026-10-17.
> Update the Status cell as part of every session (see `AGENTS.md`). Run `pnpm features:progress` for counts.

**Legend** — Status: ⬜ not started · 🟨 in progress · ✅ done · ⛔ out of scope. 
Tier: **T1** pure logic · **T2** canvas / PDF / moderate · **T3** heavy (WASM, ML, media pipeline, editor). 
Phase: see `plan.md` section 6. Original descriptions are quoted for reference only; Omnitool writes its own copy.

## 0. Progress snapshot

Run `pnpm features:progress` for live counts. Baseline at planning time:

- Tools in original registry: **97** in-app entries (+ 2 external links, out of scope)
- By tier: T1 = 37, T2 = 42, T3 = 18
- Platform features: see section 1 (all ⬜ at planning time)

## 1. Platform & shell features

| ID | Feature | What the original does | Phase | Status | Notes |
|----|---------|------------------------|-------|--------|-------|
| PF-01 | App shell & layout | Header, collapsible category sidebar, content area; responsive | P1 | ✅ | Compact “Find tool” header button (40/44 px) with the hero as the only full-width search entry; collapsible rail with available counts; responsive to 320 px; skip link |
| PF-02 | Home page | Hero, featured tools (Substrata, QR, Auto Subtitle, Background Remover), suites, tool grid by category | P1 | ✅ | Omnibox hero and category index of rows (not cards); 39 available tools by default, 58 planned behind “Show planned tools” (no phase strings); truthful available/planned counts, driven by the registry rather than hard-coded; section headers on `--surface-inset`, rows with accepts → produces chips |
| PF-03 | Tool registry | Single typed registry (id, name, description, icon, href, flags, accepts/produces) drives nav, grid, search and routing | P1 | ✅ | Valibot-validated seed; `produces` and some missing `accepts` added as provisional metadata |
| PF-04 | Per-tool routes, lazy-loaded | `/tools/<id>` routes; each tool code-split | P1 | ✅ | Loader import map, `defaultPreload: 'intent'`; thirty-nine tools implemented |
| PF-05 | Omnibox / command search | Keyboard-driven search over tools (and accepted file types) | P1 | ✅ | Ctrl/Cmd+K; built results first, one Marker row driven only by `aria-selected`; arrows and Tab move it, hover uses the hover surface; muted non-interactive Planned group; dropped-file chip and key hints |
| PF-06 | Theme toggle (light/dark) | Class-based dark mode with no-flash bootstrap; persists choice | P1 | ✅ | Inline pre-paint boot script hashed into CSP `script-src` (DEC-26), localStorage, system default |
| PF-07 | 404 page | Not-found route | P1 | ✅ | Root not-found route plus static `404.html` |
| PF-08 | Privacy page | States: no accounts, no data collection, runs locally | P1 | ✅ | `/privacy` written in British English |
| PF-09 | Offline / PWA | Works with no internet after first load (service worker + cached assets) | P1 | ✅ | Workbox precache 898 kB, SW update prompt; offline E2E passes |
| PF-10 | Static prerender / SEO | Per-route HTML + meta + OG image for discoverability | P1 | 🟨 | Postbuild HTML and meta for home/privacy/about/experiments plus 39 built tool routes and 404; NFR-013 (median LCP ≤ 2.5 s) held on all 37 routes in the Session 020 sweep (1,212–2,180 ms), including `/tools/large-type/` at 1,510 ms after DEC-45; the 2026-11-01 sweep, resumed after an earlier abort, measured all **43 routes validly** — medians **1,358–2,488 ms**, none over target, performance 98–100, load maximum 3.81 against 4.00 — with home at **2,118 ms** median (99 performance, 31 ms TBT); planned routes are derived from the loader map and excluded; planned pages render with noindex; no OG image or canonical URLs until Phase 9 (DEC-10, DEC-11) |
| PF-11 | Changelog popup | "What's new" with versioned entries | P7 | ⬜ |  |
| PF-12 | Colour notation selector | Header-level preference (hex/rgb/hsl/oklch…) read by every colour tool | P3 | ⬜ |  |
| PF-13 | Carry colour across tools | `?color=` query handoff between colour tools | P3 | ⬜ |  |
| PF-14 | Tool-to-tool handoff ("Open in…") | accepts/produces MIME vocabulary; send a result file into another tool without download/upload | P7 | ⬜ |  |
| PF-15 | Workflows | Chain up to 3 tools; files carried between steps via IndexedDB; shareable link; flow progress bar | P7 | ⬜ |  |
| PF-16 | Atlas pattern | One-page "everything about this colour/image/audio/video" pages | P7 | ⬜ |  |
| PF-17 | Suites landing | Dedicated landing for the two flagship editors (image editor, PDF editor) | P8 | ⬜ |  |
| PF-18 | Undo/redo history store | Generic snapshot history (limit 100, transient gestures) used by editors | P8 | ⬜ |  |
| PF-19 | Experiments page | Home for unfinished sketches; excluded from main grid | P2 | ✅ | `/experiments` lists the sketches with what each does not do yet; Experiments stays in the home index and the rail exactly as before, so the "excluded from main grid" clause is deliberately not copied (DEC-38) |
| PF-20 | Download helper & file intake | Consistent drag/drop, paste, picker, filename and download behaviour; iOS accept-extension handling | P1 | ✅ | `FileIntake`, `downloadBlob`, data-URL helper; accept extensions expanded; unit tested |
| PF-21 | Secure-context & small-screen notices | Graceful messaging when an API or screen size is unsupported | P1 | ✅ | Insecure-context banner; per-tool API errors; 320 px layout verified |
| PF-22 | Keyboard shortcuts & a11y baseline | Shortcut sheet in editors; focus-visible; reduced motion | P1 | ✅ | Skip link, Ctrl/Cmd+K, focus-visible ring, reduced-motion override; editor shortcut sheet is P8 |
| PF-23 | Acknowledgements / About | Credits for open-source dependencies and licences | P1 | ✅ | `/about` lists runtime, dev-only and font licences |
| PF-25 | Typed, shareable URL state | Original uses `?color=` and shareable workflow links; Omnitool validates all search params with one approach (FR-015) | P1 | ✅ | Valibot `validateSearch`; unknown and file-like keys dropped; tests |
| PF-24 | Branding & artwork | Original uses commissioned hero art, stickers, tiles. **Not reusable.** Omnitool needs its own identity | P1 | 🟨 | Deferred to Phase 9 under DEC-11; plain text wordmark and Lucide placeholders only |

## 2. Tools by category

### Social Media (4)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `matte-genny` | Matte Generator | Put non-square images on a square matte | – | T2 | P4 | Canvas | ⬜ | |
| `scroll-genny` | Seamless Scroll Generator | Split images for Instagram carousel scrolls | – | T2 | P4 | Canvas | ⬜ | |
| `social-cropper` | Social Media Cropper | Crop images for Instagram, Bluesky & Threads | – | T2 | P4 | Canvas | ⬜ | |
| `watermarker` | Watermarker | Add watermarks to images | – | T2 | P4 | Canvas | ⬜ | |

### Colour (11)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `colour-atlas` | Colour Atlas | Everything about one colour, on one page | new, atlas, carryColour | T2 | P7 | Colour kit + atlas shell | ⬜ | |
| `colorblind-sim` | Colour Blindness Simulator | Simulate how colours appear to colour blind users | carryColour | T2 | P3 | Canvas, matrix transforms | ⬜ | |
| `colour-converter` | Colour Converter | Convert between colour formats | carryColour | T1 | P3 | tool-core colour maths | ⬜ | |
| `contrast-checker` | Contrast Checker | Check WCAG colour contrast compliance | carryColour | T1 | P3 | WCAG 2.x (+ APCA optional) | ⬜ | |
| `gradient-genny` | Gradient Generator | Create linear, corner, and mesh gradients | carryColour | T2 | P3 | Canvas | ⬜ | |
| `harmony-genny` | Harmony Generator | Generate colour harmonies | carryColour | T1 | P3 | tool-core colour maths | ⬜ | |
| `palette-collection` | Palette Collection | Browse curated colour palettes | – | T1 | P3 | Own curated data (do not copy original) | ⬜ | |
| `palette-extractor` | Palette Extractor | Extract colour palettes from images | – | T2 | P3 | Canvas, k-means/median-cut | ⬜ | |
| `palette-genny` | Palette Generator | Generate beautiful colour palettes | – | T1 | P3 | tool-core colour maths | ⬜ | |
| `pixel-picker` | Pixel Picker | Sample colours from any image with a zoom loupe | – | T2 | P3 | Canvas + loupe | ⬜ | |
| `tailwind-shades` | Tailwind Shade Generator | Generate Tailwind colour scales | carryColour | T1 | P3 | OKLCH scale generation | ⬜ | |

### Images & Assets (19)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `image-atlas` | Image Atlas | Everything about one image, on one page | beta, new, atlas | T2 | P7 | exifr + atlas shell | ⬜ | |
| `substrata` | Substrata | Edit, arrange and mark up images in the browser | beta, highlight | T3 | P8 | Canvas lib (Fabric.js or Konva; decide ADR) | ⬜ | |
| `errata` | Errata | Edit PDFs in your browser. Yeah. For real. | beta | T3 | P8 | pdf-lib + pdfjs-dist | ⬜ | |
| `artwork-enhancer` | Artwork Enhancer | Add colour noise overlay to artwork | – | T2 | P4 | Canvas | ⬜ | |
| `background-remover` | Background Remover | Remove backgrounds from images automatically | beta | T3 | P4 | transformers.js model (runtime-fetched) | ⬜ | |
| `favicon-genny` | Favicon Generator | Generate favicons from any image | – | T2 | P4 | Canvas + ICO writer | ⬜ | |
| `image-clipper` | Image Clipper | Trim transparent edges from PNGs to the smallest dimensions | – | T2 | P4 | Canvas | ⬜ | |
| `image-compressor` | Image Compressor | Shrink JPEG, WebP, PNG and AVIF files | new | T3 | P4 | jSquash codecs (WASM) | ⬜ | |
| `image-converter` | Image Converter | Convert between PNG, JPEG, WebP, JXL, GIF, BMP, TIFF, ICO, ICNS with resize and format options | – | T3 | P4 | jSquash codecs (WASM) | 🟨 | P1 stub: file intake, simulated codec download, progress and cancel, native PNG/JPEG/WebP encoding in a Comlink worker. Real codecs, JXL and resizing in P4 |
| `image-deskewer` | Image De-skewer | Straighten an image by the corners | new | T2 | P4 | Canvas + angle detection | ⬜ | |
| `image-masker` | Image Masker | Cut images into shapes | new | T2 | P4 | Canvas | ⬜ | |
| `image-splitter` | Image Splitter | Split images into tiles | – | T2 | P4 | Canvas | ⬜ | |
| `image-stitcher` | Image Stitcher | Combine multiple images into one | – | T2 | P4 | Canvas | ⬜ | |
| `image-tracer` | Image Tracer | Trace raster images to SVG vectors | – | T2 | P4 | imagetracerjs | ⬜ | |
| `metadata-stripper` | Metadata Stripper | Strip EXIF and GPS metadata from images | new | T2 | P4 | exifr | ⬜ | |
| `paste-image` | Paste Image | Paste and download an image from your clipboard | – | T1 | P4 | Clipboard API | ⬜ | |
| `placeholder-genny` | Placeholder Generator | Generate placeholder images | – | T1 | P4 | Canvas/SVG | ⬜ | |
| `svg-optimiser` | SVG Optimiser | Optimise and minify SVG files | – | T2 | P4 | svgo | ⬜ | |
| `base64-image-encoder` | Base64 Image Encoder | Convert images to Base64 strings for CSS/HTML embedding | – | T1 | P4 | FileReader | ⬜ | |

### Audio & Video (16)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `audio-atlas` | Audio Atlas | Everything about one audio file, on one page | new, atlas | T3 | P7 | Media parsing + atlas shell | ⬜ | |
| `video-atlas` | Video Atlas | Everything about one video file | new, atlas | T3 | P7 | mediainfo.js + atlas shell | ⬜ | |
| `audio-extractor` | Audio Extractor | Extract the audio out of a video file | new | T3 | P6 | mediabunny (WebCodecs) | ⬜ | |
| `audio-normaliser` | Audio Normaliser | Normalise audio loudness | new | T3 | P6 | Web Audio / OfflineAudioContext | ⬜ | |
| `audio-trimmer` | Audio Trimmer | Cut and fade audio, export as WAV | new | T3 | P6 | Web Audio + waveform | ⬜ | |
| `auto-subtitle` | Auto Subtitle | Transcribe audio and video to subtitles | new | T3 | P6 | transformers.js Whisper (runtime-fetched) | ⬜ | |
| `frame-extractor` | Frame Extractor | Grab stills and contact sheets from video | new | T2 | P6 | Video element + Canvas | ⬜ | |
| `screen-recorder` | Screen Recorder | Record your screen with optional tab audio (supported browsers only) and microphone audio | new | T2 | P6 | getDisplayMedia + MediaRecorder | ⬜ | |
| `subtitle-converter` | Subtitle Converter | Convert, shift and rescale SRT and VTT subtitles | new | T1 | P6 | SRT/VTT parser (tool-core) | ⬜ | |
| `subtitle-studio` | Subtitle Studio | Burn subtitles to video | new | T2 | P6 | Timeline editor UI | ⬜ | |
| `timecode-calc` | Timecode Calculator | Add and subtract timecodes, drop-frame aware | new | T1 | P6 | tool-core | ⬜ | |
| `video-muter` | Video Muter | Strip the audio from a video | new | T3 | P6 | mediabunny | ⬜ | |
| `video-to-gif` | Video to GIF | Turn video clips into looping GIFs | new | T3 | P6 | mediabunny + GIF encoder | ⬜ | |
| `video-trimmer` | Video Trimmer | Cut a video in/out style | new | T3 | P6 | mediabunny | ⬜ | |
| `voice-recorder` | Voice Recorder | Record voice memos in the browser | new | T2 | P6 | MediaRecorder | ⬜ | |
| `waveform-genny` | Waveform Generator | Render audio waveforms as PNG or SVG | new | T2 | P6 | Web Audio + Canvas | ⬜ | |

### Typography & Text (11)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `doc-converter` | Document Converter | Convert documents between Markdown, HTML, Word, LaTeX, EPUB and more | – | T3 | P2 | mammoth 1.13.0 (BSD-2-Clause, worker) for DOCX input; no DOCX writer (DEC-85) | ✅ | Batch 7B: Markdown, HTML and plain text in, and Markdown, HTML and plain text out, through one document model (`@omnitool/tool-core/doc`). Each input is read as what it is: Markdown by the Markdown parser, HTML by the sanitiser that never builds a DOM, plain text by its own reader so a `#` or a `[link](...)` in a .txt file stays literal text. DOCX is unpacked in a worker by mammoth after Omnitool's own zip guard (DEC-86) has checked the numbers the file writes about itself — 20 MB in, 1,000 entries, 100 MB total, 50 MB per entry, 100:1 ratio — so a bomb is refused before a byte is inflated; images are dropped before they are decoded, and the HTML mammoth produces goes through the same sanitiser as a paste. Every removal is counted in words ("1 script removed"), Markdown output escapes anything that could become markup elsewhere, HTML output is a whole page with no script and no remote reference, and nothing is uploaded or stored. LaTeX, EPUB and writing DOCX are **out of scope** (DEC-85). 48 unit tests in `tool-core` (33 doc + 15 zip) and 5 Playwright guards. NFR-013 met: **1,667 ms** median LCP, 99 performance, 100 ms TBT, 0.000 CLS, measured 2026-11-01 over three runs with `scripts/lighthouse.mjs --only` on a quiet host (1-minute load 3.45, limit 4.00). Descriptions are drafts pending approval (DEC-83); no longer overlaps `text-editor` as a planned row |
| `text-editor` | Text Editor | Distraction-free Markdown writer | – | T3 | P2 | ProseMirror (DEC-80) | ✅ | Batch 7A/7B: ProseMirror schema built on `prosemirror-schema-basic` with links limited to http/https/mailto at parse and render time and no image node at all, so nothing can point at a remote resource; headings, bold, italic, underline, strike, inline code, links, bullet/numbered/task lists whose boxes can be ticked, blockquote, code block with language, horizontal rule, undo/redo, find and replace that maps text offsets back to document positions, word and character counts as two labels, keyboard shortcuts named in the UI, Markdown/plain text/HTML export. Paste and drop go through `@omnitool/tool-core/sanitize`, which never builds a DOM from the input; the sanitiser's 40-payload attack corpus now runs through the editor's own paste path in `model.test.ts`, and a paste past the converter's 2,000,000-character limit goes in as plain text with a note saying so. Attribute entities are decoded before the scheme check, so `&#106;avascript:` is refused like `javascript:` (tool-core fix with its own test). Drafts are opt-in, stored in IndexedDB on this device only, with Restore and Clear. A .md/.markdown/.txt/.html file can be opened: Markdown and plain text through the parser, HTML through the sanitiser, up to the same 2,000,000-byte limit, and a dropped file is handed to that path instead of letting the browser navigate away. 20 model tests, 6 Playwright guards (including a 1 MB paste), axe clean in both themes. NFR-013 met: **1,522 ms** median LCP, 99 performance, 111 ms TBT, 0.000 CLS, measured 2026-11-01 over three runs with `scripts/lighthouse.mjs --only` on a quiet host (1-minute load 3.55, limit 4.00). Descriptions are drafts pending approval (DEC-72); overlaps `markdown-writer`, which stays as it is |
| `font-explorer` | Font File Explorer | Explore font file contents | – | T2 | P2 | fontkit 2.0.4 (MIT, worker) | ✅ | Name table, glyph count, code points, units per em, variable axes with live sliders, script-coverage estimate, FontFace preview under a random family name; 50 MB limit, malformed files explained, nothing persisted. E2E reads a real OFL font fixture. Perf 100, LCP 1,660 ms |
| `glyph-browser` | Glyph Browser | Browse unicode glyphs | – | T2 | P2 | @unicode/unicode-16.0.0 (build-time data) | ✅ | 338 blocks, 294,579 characters, generated into 433 JSON parts (largest 12.5 kB gzip) fetched per block and cached by the service worker; copies character, U+ code point, UTF-8 bytes and HTML entity; Unicode 16.0.0 and licences shown. Global name search (P2-46) covers every block: a 12-chunk index of 1,188 kB gzip (largest chunk 111 kB) fetched once on the first search in a worker and cached by the same rule, 200 results at a time, by name words, a pasted character or any code point notation; typing never blocks the page |
| `large-type` | Large Type | Text, but big | – | T1 | P2 | tool-core + CSS fullscreen | ✅ | P2 Batch 3: per-character glyphs in flex wrap, font size fits the viewport, copy and .txt download; starts empty with a placeholder since Session 020 (DEC-45), so the prerendered description is the LCP element: 1,510 ms median, performance 100 |
| `line-height-calc` | Line Height Calculator | Calculate optimal line heights | – | T1 | P2 | tool-core | ✅ | P2 Batch 2: ratio or baseline grid to unitless, px and rem; WCAG 1.4.12 note below 1.5 |
| `paper-sizes` | Paper Sizes | Reference for paper dimensions | – | T1 | P2 | Own data table | ✅ | P2 Batch 2: ISO A, B and C plus six US sizes; mm, inches, points and pixels at 72/96/300 dpi |
| `px-to-rem` | PX to REM | Convert pixels to rem units | – | T1 | P2 | tool-core | ✅ | P2 Batch 1: configurable root, px to rem and back, common-value table |
| `text-diff` | Text Diff | Compare two texts and highlight differences | – | T1 | P2 | diff algorithm (jsdiff or own) | ✅ | P2 Batch 1: line, word and character Myers diff; inline and side-by-side views |
| `typo-calc` | Typography Calculator | Convert between typographic units | – | T1 | P2 | tool-core | ✅ | P2 Batch 2: modular scale from a base size and ratio with presets, px, rem and CSS custom properties; the original's point and pica conversion is not included |
| `word-counter` | Word Counter | Count words, characters and more | – | T1 | P2 | Intl.Segmenter | ✅ | P2 Batch 1: Intl.Segmenter words and sentences, characters, paragraphs and reading time |

### PDF (6)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `pdf-preflight` | PDF Preflight | Analyse PDFs for print-readiness issues | – | T2 | P5 | pdf-lib + pdfjs-dist | ⬜ | |
| `pdf-organiser` | PDF Organiser | Merge, split and rearrange PDF pages | – | T2 | P5 | pdf-lib + pdfjs-dist + DnD | ⬜ | |
| `image-to-pdf` | Images to PDF | Turn images into a PDF, or pages into PNGs | – | T2 | P5 | pdf-lib | ⬜ | |
| `pdf-rotate-crop` | PDF Rotate & Crop | Rotate or crop pages or entire documents | – | T2 | P5 | pdf-lib | ⬜ | |
| `pdf-page-numberer` | PDF Page Numbers | Add page numbers or stamps to documents | – | T2 | P5 | pdf-lib | ⬜ | |
| `pdf-compressor` | PDF Compressor | Shrink PDF filesizes | – | T3 | P5 | Re-encode images via pdf-lib; avoid MuPDF (AGPL) | ⬜ | |

### Print & Production (2)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `imposer` | Print Imposer | Impose PDF pages for booklet, saddle-stitch, and N-up printing | – | T3 | P5 | pdf-lib imposition engine | ⬜ | |
| `zine-imposer` | Zine Imposer | Impose single-sheet zines: 8-page mini-zine and accordion folds | – | T2 | P5 | pdf-lib imposition engine | ⬜ | |

### Dev Tools (9)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `cron-builder` | Cron Builder | Build a cron expression field by field or decode one | new | T1 | P2 | tool-core | ✅ | P2 Batch 3: five fields with lists/ranges/steps, names and aliases; OR rule, field-named errors, next 10 runs in UTC and any IANA zone via Intl; LCP 1,673 ms |
| `http-status` | HTTP Status | Search HTTP status codes with phrases and spec references | new | T1 | P2 | Own data table | ✅ | P2 Batch 3: 60 codes derived in our own words from IANA + RFC 9110 (cited in code); search and class filter; LCP 1,512 ms |
| `json-formatter` | JSON Formatter | Format or minify JSON or look at it | new | T1 | P2 | tool-core | ✅ | P2 Batch 1: format, minify and validate with line and column; worker above 1 MB with progress and cancel |
| `jwt-decoder` | JWT Decoder | Decode a JWT's header, payload & claims | new | T1 | P2 | tool-core (decode only, no verify keys stored) | ✅ | P2 Batch 1: header, payload and registered claims; decode only, no verification, storage or requests |
| `meta-tag-genny` | Meta Tag Generator | Generate HTML meta tags | – | T1 | P2 | tool-core | ✅ | P2 Batch 3: escaped HTML snippet, https-only URL validation, OG/Twitter fields, length guidance as varying display limits; no network; LCP 1,663 ms |
| `regex-tester` | Regex Tester | Test regular expressions | – | T1 | P2 | JS RegExp + one-shot worker | ✅ | P2 Batch 3: flags, groups, live matches and test outcome, clear match/flag errors; each run happens in a fresh worker the UI terminates on a deadline, so backtracking cannot freeze the page; LCP 1,659 ms |
| `request-builder` | Request Builder | Compose a cURL or HTTP request | new | T2 | P2 | fetch (user-initiated network only) | ⬜ | |
| `tailwind-cheatsheet` | Tailwind Cheat Sheet | Quick reference for Tailwind classes | – | T1 | P2 | Own data | ✅ | P2 Batch 4: 336 entries across ten categories; CSS generated by the repo's own pinned Tailwind 4.3.3 compiler through a dev-only script, with a test that regenerates and compares so an upgrade fails until reviewed (DEC-40); search by class, property or words; copy buttons |
| `uuid-genny` | UUID Generator | Generate bulk UUID v4 or v7 and Nano IDs | new | T1 | P2 | crypto.randomUUID | ✅ | P1 sample: v4/v7/Nano ID, copy and download; logic in tool-core with tests |

### Other Tools (5)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `code-genny` | Barcode Generator | Generate Data Matrix, Aztec, PDF417, Code 128, EAN-13, and more | – | T2 | P2 | own encoder (DEC-60) | ✅ | P2 Batch 6: Code 128 (digit mode for even runs), EAN-13, UPC-A, Code 39 and ITF with own encoders tested against published reference vectors (ISO/IEC 15417, 15420, 16388, 16390), check digits computed and explained, size, margin, DESIGN.md ink colours with a contrast warning, SVG and PNG. Data Matrix, Aztec and PDF417 are not implemented. NFR-013 met: **99 performance, 1,661 ms median LCP**. Before printing, scan a real sample |
| `decoder` | Cipher Decoder | Decode classical ciphers manually or auto-detect the cipher | – | T2 | P2 | tool-core ciphers | ✅ | P2 Batch 3: Caesar (all shifts, frequency-ranked), ROT13, Atbash, Vigenère, rail fence; non-letters kept; LCP 1,667 ms |
| `password-genny` | Password Generator | Generate strong passwords or multi-word passphrases | new | T1 | P2 | crypto.getRandomValues | ✅ | P2 Batch 1: passwords and passphrases; rejection sampling removes modulo bias, nothing stored |
| `qr-genny` | QR Generator | Generate styled QR codes with custom colors, shapes, and logos | – | T2 | P2 | qr-code-styling | 🟨 | P1 sample: PNG/SVG, size, quiet zone, error correction. Styled shapes and logos still P2; used `qrcode` (MIT) instead of qr-code-styling |
| `markdown-writer` | Text Scratchpad | Text editor with manipulation tools | – | T2 | P2 | markdown-it 15.0.3 (tokenizer only) | ✅ | Split editor and preview with an accessible mobile toggle; tokens become an own tree rendered as React elements, no HTML strings anywhere; http/https/mailto links, local data images only, raw HTML as text; 16-payload XSS corpus in unit tests and E2E with zero third-party requests; 1 MB document stays usable |

### Calculators (7)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `algebra-calc` | Algebra Calculator | Symbolic algebra: simplify, factor, solve, derivatives | – | T2 | P2 | own parser, BigInt fractions (DEC-61) | ✅ | P2 Batch 6: simplify, expand, factor, exact linear/quadratic solve, differentiate, evaluate and 2–3 unknown linear systems over exact rational polynomials; no `eval`/`Function`; steps shown; 1,000-character, depth-100 and exponent limits with worker termination; fuzz and numeric-equivalence tests; unsupported operations named in the UI. Functions, roots of x and division by x are out of scope. NFR-013 met: **1,664 ms** median LCP (99 performance, 72 ms TBT, 0.000 CLS); the “What this covers” paragraph now sits inside the `ToolHint`, so the prerendered description is the largest element again (DEC-69)
| `base-converter` | Base Converter | Convert between decimal, hex, binary, and octal | – | T1 | P2 | BigInt | ✅ | P2 Batch 1: BigInt, bases 2-36, clear digit-range errors |
| `encoder` | Encoding Tools | Base64, URL encoding, and hash generation | – | T1 | P2 | tool-core | ✅ | P2 Batch 1: Base64, URL, HTML entity and hex with correct UTF-8 round trips |
| `graph-calc` | Graph Calculator | Plot and visualise mathematical functions | – | T2 | P2 | none (own parser, no eval) | ✅ | Six functions y = f(x) on a canvas with pan, wheel/pinch/button/keyboard zoom, adapting ticks, pointer and keyboard trace, table of values, written summary of each curve, PNG export; gaps at domain errors and asymptotes, 1,500 evaluations per function cap, token colours plus a dash and a label per function. Perf 99, LCP 1,515 ms |
| `sci-calc` | Scientific Calculator | Full-featured scientific calculator with history | – | T1 | P2 | Own parser (no mathjs) | ✅ | P2 Batch 4: own tokenizer and recursive-descent parser, no `eval`/`Function`; three angle modes, 17 functions, `ans`; 12 significant digits by default; plain domain-error messages; 1,000-char and depth-100 limits; key grid + live region; explicit multiplication only (DEC-39); 10,000-string seeded fuzz test proves no throw/hang; syntax note folded into a `ToolHint` so the prerendered header stays the LCP |
| `time-calc` | Time Calculator | Unix timestamps, date arithmetic, timezone conversion | – | T1 | P2 | tool-core | ✅ | P2 Batch 2: duration arithmetic, elapsed time between zoned date-times with DST tests, seconds breakdown; Unix timestamp conversion is not included |
| `unit-converter` | Unit Converter | Convert between units of length, weight, data, and more | – | T1 | P2 | Own unit table | ✅ | P2 Batch 2: eleven categories with exact factors, offset temperatures, 0–12 decimal places and a full-unit table |

### Turbo-nerd Shit (5)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `shavian-transliterator` | Shavian Transliterator | Transliterate English text to the Shavian alphabet | – | T2 | P2 | own Unicode mapping + CMUdict phonemes (DEC-63) | ✅ | P2 Batch 6: all 48 letters of U+10450–U+1047F documented with their phoneme and verified against the Unicode character names in tests; 39 ARPAbet symbols mapped, 7 merged letters never produced and said so in the UI; stress dropped (Shavian does not write it), namer dot on names, unknown words pass through unchanged and are listed; one-way, stated in the UI. NFR-013 met: **2,495 ms** median LCP (97 performance, 22 ms TBT) after starting the box empty (DEC-69) — but only by 5 ms, because the LCP element is the post-hydration character-count line (`p.mt-2`), not the prerendered description; P2-59 proposes shortening that line and is waiting on the owner
| `morse-code` | Morse Code | Encode, decode and play Morse code | new | T1 | P2 | tool-core | ✅ | Session 010 |
| `braille-converter` | Braille Converter | Turn text into Braille cells | new | T1 | P2 | tool-core | ✅ | Session 010; grade 1 only |
| `ipa-transcriber` | IPA Transcription | Transcribe English text into IPA | new | T2 | P2 | CMUdict + own ARPAbet→IPA table (DEC-62) | ✅ | P2 Batch 6: CMU Pronouncing Dictionary commit 7479086 (BSD-2-Clause) as seven same-origin chunks, 0.9 MB gzip in total, at most 158 kB gzip each, parsed in a worker, disclosed as a one-time download and cached by a new `omnitool-pron-v1` rule; General American, stress marks, every dictionary variant shown; unknown words listed and never guessed; no letter-to-sound fallback. NFR-013 met: **1,660 ms** median LCP (100 performance, 17 ms TBT); the box starts empty, so the transcription no longer paints after the 0.9 MB download and the prerendered description is the largest element (DEC-69)
| `nato-phonetic` | NATO Phonetic | Translate text to NATO or DIN-5009 calls | new | T1 | P2 | tool-core | ✅ | Session 010; DIN-5009 not implemented, ICAO only |

### Elsewhere (2)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `ios-app` | delphitools for iOS | external link (https://apps.apple.com/us/app/delphitools/id6761313703) | external | – | – | Not applicable | ⛔ | Out of scope: links to the original author's own apps |
| `cli` | delphitools CLI | external link (https://github.com/1612elphi/delphitools-cli) | external | – | – | Not applicable | ⛔ | Out of scope: links to the original author's own apps |

### Alien Delphi's Experiments (2)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `stupid-units` | Stupid Units | Convert between bananas, Waleses and Warhols | – | T1 | P2 | Own unit table | ✅ | P2 Batch 4 (experiment): 25 units across length, area, volume, mass and time, each with SI value, one-line definition, named source and exact/approximate flag; official sizes verified from rule books via web search and listed in code; marked as an experiment
| `recipe-table` | Recipe Table | Write a recipe as a Cooking for Engineers table | – | T1 | P2 | tool-core | ✅ | P2 Batch 4 (experiment): parses integers, decimals, fractions, mixed numbers, unicode fractions and ranges plus nine units; scales by servings; metric and US customary; volume-to-weight for an 11-ingredient USDA FoodData Central density table shown as approximate; CSV and text output; unrecognised lines pass through and are flagged |

## 3. Deliberately not cloned

- **Branding & artwork** (hero art, stickers, tiles, mascot, onboarding art). Owned by their artists and excluded from the original licence.
- **UI copy and descriptions.** Omnitool writes its own; original descriptions above are reference only.
- **External links** to the original iOS app and CLI.
- **Original curated datasets** where their licence or authorship is unclear (palettes, LUTs). Replace with openly licensed or self-made data.
- **MuPDF (AGPL-3.0)**. Prefer permissively licensed PDF libraries unless the project consciously accepts AGPL obligations (see `docs/legal/ATTRIBUTION.md`).

## 4. Additions beyond the original (optional backlog)

| ID | Idea | Status |
|----|------|--------|
| X-01 | Installable PWA with explicit "available offline" badge per tool | ⬜ |
| X-02 | Per-tool unit-test + a11y badge in the registry (quality dashboard) | ⬜ |
| X-03 | Import/export of user settings as a single JSON file | ⬜ |
