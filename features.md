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
| PF-01 | App shell & layout | Header, collapsible category sidebar, content area; responsive | P1 | ✅ | Header, collapsible rail, responsive to 320 px; skip link |
| PF-02 | Home page | Hero, featured tools (Substrata, QR, Auto Subtitle, Background Remover), suites, tool grid by category | P1 | ✅ | Omnibox hero and category index of rows (not cards); all 97 rows, unbuilt tools marked by phase |
| PF-03 | Tool registry | Single typed registry (id, name, description, icon, href, flags, accepts/produces) drives nav, grid, search and routing | P1 | ✅ | Valibot-validated seed; `produces` and some missing `accepts` added as provisional metadata |
| PF-04 | Per-tool routes, lazy-loaded | `/tools/<id>` routes; each tool code-split | P1 | ✅ | Loader import map, `defaultPreload: 'intent'`; three tools implemented |
| PF-05 | Omnibox / command search | Keyboard-driven search over tools (and accepted file types) | P1 | ✅ | Ctrl/Cmd+K, grouped results, file filter, planned tools disabled |
| PF-06 | Theme toggle (light/dark) | Class-based dark mode with no-flash bootstrap; persists choice | P1 | ✅ | External pre-paint bootstrap, localStorage, system default |
| PF-07 | 404 page | Not-found route | P1 | ✅ | Root not-found route plus static `404.html` |
| PF-08 | Privacy page | States: no accounts, no data collection, runs locally | P1 | ✅ | `/privacy` written in British English |
| PF-09 | Offline / PWA | Works with no internet after first load (service worker + cached assets) | P1 | ✅ | Workbox precache 781 kB, SW update prompt; offline E2E passes |
| PF-10 | Static prerender / SEO | Per-route HTML + meta + OG image for discoverability | P1 | 🟨 | Postbuild HTML and meta for home/privacy/about/every built tool/404; no OG image or canonical URLs until Phase 9 (DEC-10, DEC-11) |
| PF-11 | Changelog popup | "What's new" with versioned entries | P7 | ⬜ |  |
| PF-12 | Colour notation selector | Header-level preference (hex/rgb/hsl/oklch…) read by every colour tool | P3 | ⬜ |  |
| PF-13 | Carry colour across tools | `?color=` query handoff between colour tools | P3 | ⬜ |  |
| PF-14 | Tool-to-tool handoff ("Open in…") | accepts/produces MIME vocabulary; send a result file into another tool without download/upload | P7 | ⬜ |  |
| PF-15 | Workflows | Chain up to 3 tools; files carried between steps via IndexedDB; shareable link; flow progress bar | P7 | ⬜ |  |
| PF-16 | Atlas pattern | One-page "everything about this colour/image/audio/video" pages | P7 | ⬜ |  |
| PF-17 | Suites landing | Dedicated landing for the two flagship editors (image editor, PDF editor) | P8 | ⬜ |  |
| PF-18 | Undo/redo history store | Generic snapshot history (limit 100, transient gestures) used by editors | P8 | ⬜ |  |
| PF-19 | Experiments page | Home for unfinished sketches; excluded from main grid | P2 | ⬜ |  |
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
| `doc-converter` | Document Converter | Convert documents between Markdown, HTML, Word, LaTeX, EPUB and more | – | T3 | P2 | pandoc-wasm (runtime-fetched; GPL binary, see legal) | ⬜ | |
| `text-editor` | Text Editor | Distraction-free Markdown writer | – | T3 | P2 | ProseMirror or TipTap (ADR) | ⬜ | |
| `font-explorer` | Font File Explorer | Explore font file contents | – | T2 | P2 | opentype.js or similar | ⬜ | |
| `glyph-browser` | Glyph Browser | Browse unicode glyphs | – | T2 | P2 | Font parsing | ⬜ | |
| `large-type` | Large Type | Text, but big | – | T1 | P2 | CSS fullscreen | ⬜ | |
| `line-height-calc` | Line Height Calculator | Calculate optimal line heights | – | T1 | P2 | tool-core | ⬜ | |
| `paper-sizes` | Paper Sizes | Reference for paper dimensions | – | T1 | P2 | Own data table | ⬜ | |
| `px-to-rem` | PX to REM | Convert pixels to rem units | – | T1 | P2 | tool-core | ⬜ | |
| `text-diff` | Text Diff | Compare two texts and highlight differences | – | T1 | P2 | diff algorithm (jsdiff or own) | ⬜ | |
| `typo-calc` | Typography Calculator | Convert between typographic units | – | T1 | P2 | tool-core | ⬜ | |
| `word-counter` | Word Counter | Count words, characters and more | – | T1 | P2 | Intl.Segmenter | ⬜ | |

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
| `cron-builder` | Cron Builder | Build a cron expression field by field or decode one | new | T1 | P2 | tool-core | ⬜ | |
| `http-status` | HTTP Status | Search HTTP status codes with phrases and spec references | new | T1 | P2 | Own data table | ⬜ | |
| `json-formatter` | JSON Formatter | Format or minify JSON or look at it | new | T1 | P2 | tool-core | ⬜ | |
| `jwt-decoder` | JWT Decoder | Decode a JWT's header, payload & claims | new | T1 | P2 | tool-core (decode only, no verify keys stored) | ⬜ | |
| `meta-tag-genny` | Meta Tag Generator | Generate HTML meta tags | – | T1 | P2 | tool-core | ⬜ | |
| `regex-tester` | Regex Tester | Test regular expressions | – | T1 | P2 | JS RegExp + Worker timeout guard | ⬜ | |
| `request-builder` | Request Builder | Compose a cURL or HTTP request | new | T2 | P2 | fetch (user-initiated network only) | ⬜ | |
| `tailwind-cheatsheet` | Tailwind Cheat Sheet | Quick reference for Tailwind classes | – | T1 | P2 | Own data | ⬜ | |
| `uuid-genny` | UUID Generator | Generate bulk UUID v4 or v7 and Nano IDs | new | T1 | P2 | crypto.randomUUID | ✅ | P1 sample: v4/v7/Nano ID, copy and download; logic in tool-core with tests |

### Other Tools (5)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `code-genny` | Barcode Generator | Generate Data Matrix, Aztec, PDF417, Code 128, EAN-13, and more | – | T2 | P2 | bwip-js | ⬜ | |
| `decoder` | Cipher Decoder | Decode classical ciphers manually or auto-detect the cipher | – | T2 | P2 | tool-core ciphers | ⬜ | |
| `password-genny` | Password Generator | Generate strong passwords or multi-word passphrases | new | T1 | P2 | crypto.getRandomValues | ⬜ | |
| `qr-genny` | QR Generator | Generate styled QR codes with custom colors, shapes, and logos | – | T2 | P2 | qr-code-styling | 🟨 | P1 sample: PNG/SVG, size, quiet zone, error correction. Styled shapes and logos still P2; used `qrcode` (MIT) instead of qr-code-styling |
| `markdown-writer` | Text Scratchpad | Text editor with manipulation tools | – | T2 | P2 | Markdown editor | ⬜ | |

### Calculators (7)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `algebra-calc` | Algebra Calculator | Symbolic algebra: simplify, factor, solve, derivatives | – | T2 | P2 | mathjs | ⬜ | |
| `base-converter` | Base Converter | Convert between decimal, hex, binary, and octal | – | T1 | P2 | BigInt | ⬜ | |
| `encoder` | Encoding Tools | Base64, URL encoding, and hash generation | – | T1 | P2 | tool-core | ⬜ | |
| `graph-calc` | Graph Calculator | Plot and visualise mathematical functions | – | T2 | P2 | mathjs + Canvas | ⬜ | |
| `sci-calc` | Scientific Calculator | Full-featured scientific calculator with history | – | T1 | P2 | mathjs | ⬜ | |
| `time-calc` | Time Calculator | Unix timestamps, date arithmetic, timezone conversion | – | T1 | P2 | tool-core | ⬜ | |
| `unit-converter` | Unit Converter | Convert between units of length, weight, data, and more | – | T1 | P2 | Own unit table | ⬜ | |

### Turbo-nerd Shit (5)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `shavian-transliterator` | Shavian Transliterator | Transliterate English text to the Shavian alphabet | – | T2 | P2 | Needs dictionary data; check CMU dict licence | ⬜ | |
| `morse-code` | Morse Code | Encode, decode and play Morse code | new | T1 | P2 | tool-core | ⬜ | |
| `braille-converter` | Braille Converter | Turn text into Braille cells | new | T1 | P2 | tool-core | ⬜ | |
| `ipa-transcriber` | IPA Transcription | Transcribe English text into IPA | new | T2 | P2 | tool-core + data | ⬜ | |
| `nato-phonetic` | NATO Phonetic | Translate text to NATO or DIN-5009 calls | new | T1 | P2 | tool-core | ⬜ | |

### Elsewhere (2)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `ios-app` | delphitools for iOS | external link (https://apps.apple.com/us/app/delphitools/id6761313703) | external | – | – | Not applicable | ⛔ | Out of scope: links to the original author's own apps |
| `cli` | delphitools CLI | external link (https://github.com/1612elphi/delphitools-cli) | external | – | – | Not applicable | ⛔ | Out of scope: links to the original author's own apps |

### Alien Delphi's Experiments (2)

| ID | Tool | Original description | Flags | Tier | Phase | Suggested approach | Status | Notes |
|----|------|----------------------|-------|------|-------|--------------------|--------|-------|
| `stupid-units` | Stupid Units | Convert between bananas, Waleses and Warhols | – | T1 | P2 | Own unit table | ⬜ | |
| `recipe-table` | Recipe Table | Write a recipe as a Cooking for Engineers table | – | T1 | P2 | tool-core | ⬜ | |

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
