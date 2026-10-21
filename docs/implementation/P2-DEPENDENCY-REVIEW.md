# Phase 2 dependency review — remaining tools (research only)

Status: research for the owner's decision. **Nothing here is installed in this repository**; the
lockfile was not changed and no package was added to any workspace. The sizes below were measured
in a throwaway directory (`/tmp/deps-probe`) that has since been deleted.

Date: 2026-10-21 (Session 019). Every version, licence and publish date comes from
`pnpm view <pkg> license version dist.unpackedSize time.modified` on that date; weekly downloads come
from `https://api.npmjs.org/downloads/point/last-week/<pkg>`. Gzip figures are **whole-package
imports** bundled with esbuild 0.25 (`--bundle --format=esm --platform=browser --minify`) and
compressed with gzip -9, so they are worst-case upper bounds, not tree-shaken tool chunks.

## 1. Summary

| Tool | Candidate | Licence | Version | Last publish | Downloads / week | Install size | Min+gzip (measured) | Verdict |
|------|-----------|---------|---------|--------------|------------------|--------------|---------------------|---------|
| markdown-writer | `marked` | MIT | 18.1.1 | 2026-10-12 | 51,183,938 | 0.52 MB | 45.6 kB raw / 13.6 kB | **Recommended** for preview HTML |
| markdown-writer | `dompurify` | MPL-2.0 OR Apache-2.0 | 3.4.17 | 2026-10-12 | 42,123,483 | 1.54 MB | 30.4 kB raw / 11.7 kB | **Recommended** to sanitise that HTML |
| markdown-writer | `markdown-it` | MIT | 15.0.3 | 2026-10-16 | 16,608,434 | 1.97 MB | 97.3 kB raw / 40.0 kB | Alternative; larger, no better fit |
| code-genny | `bwip-js` | MIT | 4.11.4 | 2026-08-19 | 730,647 | 12.33 MB | 944.1 kB raw / 255.2 kB | **Recommended** (only candidate covering 2D symbologies) |
| code-genny | `jsbarcode` | MIT | 3.12.3 | 2026-01-07 | 994,209 | 0.59 MB | 66.4 kB raw / 13.3 kB | Insufficient: 1D only, no Data Matrix/Aztec/PDF417 |
| algebra-calc | `nerdamer` | Apache-2.0 | 2.0.0 | 2026-10-02 | 11,558 | 2.95 MB | 454.0 kB raw / 130.6 kB | **Recommended** for symbolic work, in a worker |
| algebra-calc | `mathjs` | Apache-2.0 | 15.2.0 | 2026-04-07 | 2,214,770 | 9.00 MB | 734.3 kB raw / 203.8 kB | Numeric and simplify/derivative only; keep as the maths fallback |
| algebra-calc | `algebrite` | MIT | 1.4.0 | 2021-04-14 | 5,809 | 2.40 MB | 353.4 kB raw / 84.5 kB | Not recommended: no release since 2021 |
| graph-calc | own parser + Canvas | — | — | — | — | — | 0 kB | **Recommended**: reuse the sci-calc tokenizer |
| graph-calc | `function-plot` | MIT | 1.26.0 | 2026-10-11 | 5,865 | 0.75 MB | 222.6 kB raw / 66.8 kB | Optional later for zoom/axes; pulls d3 modules |
| font-explorer | `opentype.js` | MIT | 2.0.0 | 2026-05-06 | 1,571,135 | 3.47 MB | 240.2 kB raw / 66.1 kB | **Recommended** for glyphs, metrics and names |
| font-explorer | `fontkit` | MIT | 2.0.4 | 2024-08-09 | 10,408,378 | 5.35 MB | 357.3 kB raw / 145.9 kB | Choose instead if WOFF2 or variable-font detail is required |
| glyph-browser | `@unicode/unicode-15.1.0` | MIT | 2.0.8 | 2026-10-15 | 19,742 | 1.84 MB | one block measured: Shavian 0.8 kB raw / 0.5 kB | **Recommended**, one block at a time |
| glyph-browser | `unicode-properties` | MIT | 2.0.1 | 2026-10-09 | 11,190,312 | 0.04 MB | 25.0 kB raw / 16.8 kB | Optional helpers for names/categories |
| glyph-browser | `code-points` | MIT | 2.0.0-1 | 2022-06-13 | 6,155 | 4.8 kB | 1.8 kB raw / 0.9 kB | Tiny alternative for plain code point lists |
| shavian-transliterator | CMUdict data + own mapping | BSD-2-Clause-style (CMU) | — | — | — | — | — | **Recommended**: no maintained Shavian package exists |
| shavian-transliterator | `shavian`, `shavian-translator`, `shavian-alphabet`, `shaw-alphabet` | — | — | — | — | — | — | Not found: all returned HTTP 404 from the registry on 2026-10-21 |
| ipa-transcriber | `cmu-pronouncing-dictionary` (npm wrapper) | ISC (wrapper), BSD-2-style data | 3.0.0 | 2021-07-13 | 44,987 | 4.71 MB (135,155 words) | 3831.8 kB raw / 931.7 kB | **Data candidate**, behind an explicit download |
| ipa-transcriber | `ipa-dict` | ISC (package), MIT (data) | 1.0.3 | 2021-01-07 | 85 | 167.4 MB | — | Too large to ship; reference only |
| doc-converter | `mammoth` | BSD-2-Clause | 1.13.0 | 2026-09-26 | 6,153,762 | 1.59 MB | 314.9 kB raw / 97.4 kB | **Recommended** for docx → HTML |
| doc-converter | `turndown` | MIT | 7.2.4 | 2026-04-03 | 6,319,407 | 0.18 MB | 10.6 kB raw / 4.0 kB | **Recommended** for HTML → Markdown |
| doc-converter | `docx` | MIT | 9.13.0 | 2026-10-19 | 4,345,180 | 19.12 MB | 455.9 kB raw / 133.8 kB | **Recommended** for writing .docx |
| doc-converter | `html-docx-js` | MIT | 0.3.1 | 2022-06-18 | 21,790 | — | not measurable: bundles Node `fs` | Not suitable for the browser |
| doc-converter | `pandoc-wasm` | GPL-2.0-or-later | 1.1.0 | 2026-06-11 | 6,035 | 55.90 MB | not measured | **Rejected**: GPL binary at runtime, 56 MB |
| text-editor | `@tiptap/react` + `@tiptap/starter-kit` | MIT | 3.32.0 | 2026-10-13 | 11,348,991 / 11,770,753 | 0.61 MB combined | 420.2 kB raw / 132.5 kB (React external) | WYSIWYG option |
| text-editor | `codemirror` (state + view + language + lang-markdown) | MIT | 6.7.6 / 6.43.15 / 6.13.1 / 6.5.2 | 2026-09-22 / 2026-10-19 / 2026-10-07 / 2026-08-04 | 8,904,351 / 9,005,714 / 8,638,160 / 3,152,411 | 2.00 MB combined | 475.9 kB raw / 164.0 kB | **Recommended** for a Markdown source editor |
| text-editor | `@uiw/react-md-editor` | MIT | 4.1.3 | 2026-10-20 | 450,771 | 4.29 MB | 1074.2 kB raw / 355.8 kB | Not recommended: 356 kB chunk |
| text-editor | `quill` | BSD-3-Clause | 2.0.3 | 2025-01-20 | 3,803,710 | 3.04 MB | 200.3 kB raw / 58.4 kB | Alternative rich-text editor, MIT-adjacent licence |
| request-builder | none | — | — | — | — | — | — | Use `fetch` plus our own cURL formatter |
| request-builder | `curlconverter` | MIT | 4.12.0 | 2025-02-07 | 36,524 | 3.42 MB | bundle failed | Not suitable: node built-ins, and it converts cURL into code, not the other way |

## 2. Per-tool notes

### markdown-writer (Text Scratchpad)

Candidates: `marked` plus `dompurify`, or `markdown-it`. `marked` is smaller and sufficient for a
preview; `markdown-it` adds plugins we do not need yet.

- Recommendation: `marked` (MIT) for parsing and `dompurify` (choose the Apache-2.0 arm of its
  MPL-2.0 OR Apache-2.0 dual licence) for sanitising the preview.
- Security: Markdown may contain raw HTML. The preview must pass through DOMPurify before it reaches
  `dangerouslySetInnerHTML`, and the renderer must run with `breaks`/`gfm` options we choose rather
  than defaults we have not read. No `eval`, no script execution, no remote images by default
  (they would be third-party runtime requests and break the local-only rule).
- ADR: not required for MIT/Apache-2.0, but record the sanitisation rule in the security notes.
- NFR-013 risk: low. About 26 kB gzip in one lazy chunk; import it only when the preview is opened.

### code-genny (Barcode Generator)

`jsbarcode` covers Code 128 and EAN-13 but not Data Matrix, Aztec or PDF417. `bwip-js` (MIT) covers
all of them in the browser, including its own fonts, at the cost of a measured 944 kB raw / 255 kB
gzip chunk (whole package; it ships no ESM exports map, so per-symbology tree-shaking is UNVERIFIED).

- Recommendation: `bwip-js`, dynamically imported when a barcode is generated.
- ADR: none (MIT, single purpose). Record the chunk size in the budget notes.
- NFR-013 risk: medium if imported statically into the route. Keep it a dynamic import so the
  prerendered header stays the LCP element; verify per-symbology imports actually tree-shake
  (UNVERIFIED).

### algebra-calc

`mathjs` simplifies and differentiates but does not factor or solve equations; `nerdamer` does, is
Apache-2.0, and had a release this month (2026-10-02). `algebrite` is MIT and smaller but has not
been published since 2021.

- Recommendation: `nerdamer` in a dedicated worker with a timeout and cancel, so a pathological
  expression cannot freeze the page. Input must never be `eval`'d.
- ADR: **yes** — symbolic maths engine choice, sandboxing, and the supported feature list.
- NFR-013 risk: high (measured 454 kB raw / 131 kB gzip). Dynamic import on first calculate, not at
  route load.

### graph-calc

We already own a tokenizer and recursive-descent parser for `sci-calc`; plotting needs nothing but a
Canvas 2D context and our own axes.

- Recommendation: no dependency. Reuse the tokenizer (add a compile-to-function step that walks the
  AST rather than using `new Function`). If pan/zoom niceties are wanted later, `function-plot` is
  the fallback at 67 kB gzip (measured).
- ADR: none.
- NFR-013 risk: low.

### font-explorer

`opentype.js` parses TTF/OTF and gives glyph paths, metrics and naming tables. `fontkit` handles
WOFF2 and variable-font detail but is larger and pulls more dependencies.

- Recommendation: `opentype.js`, parsing in a worker after the visitor picks a file. WOFF2 support is
  then out of scope unless `fontkit` is chosen later.
- ADR: **yes** if a font parser becomes a shared dependency (binary parsing is a security surface).
- NFR-013 risk: medium; import only after a file is chosen.

### glyph-browser

`@unicode/unicode-15.1.0` ships code point data as per-block modules; the package unpacks to 1.84 MB
and each block is imported on demand — the Shavian block measured 0.8 kB raw / 0.5 kB gzip.
`unicode-properties` (MIT, 25 kB raw / 17 kB gzip) is useful for names and general categories.

- Recommendation: `@unicode/unicode-15.1.0` plus `unicode-properties`, one block at a time.
- ADR: none.
- NFR-013 risk: low, provided blocks are imported lazily.
- UNVERIFIED: whether 15.1.0 is still the current Unicode release (the package was published a few
  days ago, but the Unicode version itself was not checked against unicode.org).

### shavian-transliterator

No maintained npm package was found: `shavian`, `shavian-translator`, `shavian-alphabet` and
`shaw-alphabet` all returned HTTP 404 from the registry on 2026-10-21. The realistic route is a
pronunciation dictionary plus our own phoneme-to-Shavian mapping, built from the Unicode chart for
U+10450–U+1047F (48 code points).

- Data: CMU Pronouncing Dictionary (licence verified, see section 4) for pronunciations; the letter
  mapping is ours.
- Recommendation: no library. A reduced pronunciation list, or a fetched CMUdict asset, plus a
  mapping table we write and test.
- ADR: **yes** — data licence, data size strategy and the English-only limitation.
- NFR-013 risk: high if CMUdict is bundled (measured 3832 kB raw / 932 kB gzip; 4.71 MB unpacked,
  135,155 words). Fetch it on first use with a visible one-time download and cache it in the service
  worker, or ship a compact subset and say so.

### ipa-transcriber

`ipa-dict` carries per-language word→IPA data under MIT but is 167.4 MB unpacked and had 85 downloads
last week — effectively unmaintained. The CMUdict wrapper unpacks to 4.71 MB (135,155 words) and
measures 932 kB gzip; it converts to IPA with our own ARPAbet→IPA table.

- Recommendation: CMUdict phones plus our own ARPAbet→IPA map, loaded only when the tool is used.
  Do not bundle `ipa-dict`.
- ADR: **yes**, shared with the Shavian decision (same data, same size problem).
- NFR-013 risk: high, same as Shavian. Homographs (read/lead/wind) need a choice and a note.
- UNVERIFIED: whether a compact English subset of `ipa-dict` can be extracted under the MIT data
  licence; not tested.

### doc-converter

The original uses pandoc. `pandoc-wasm` is GPL-2.0-or-later, 55.9 MB, and would put a GPL binary in
the runtime — a licence decision this project has not taken. `mammoth` (docx → HTML), `turndown`
(HTML → Markdown) and `docx` (writing .docx) are permissive and cover the common direction pairs.
`html-docx-js` bundles Node's `fs` and cannot be used in the browser (bundle probe failed).

- Recommendation: `mammoth`, `turndown` and `docx`; declare LaTeX and EPUB **out of scope** rather
  than accept GPL. Each converter is imported only for its direction.
- ADR: **yes** — the decision to reject pandoc-wasm (licence and size) and the reduced format list.
- NFR-013 risk: medium; measured 97 kB, 4 kB and 134 kB gzip chunks, one per direction.

### text-editor

`@tiptap/react` + starter kit is a WYSIWYG editor (measured 420 kB raw / 133 kB gzip with React
external) with a rich schema; CodeMirror 6 with the Markdown language is a source editor (476 kB raw
/ 164 kB gzip) and simpler to make accessible for keyboard users. `@uiw/react-md-editor` measures
356 kB gzip and `quill` 58 kB gzip as a third option.

- Recommendation: CodeMirror 6 for a Markdown source editor; revisit TipTap only if WYSIWYG becomes a
  requirement.
- ADR: **yes** — editor engine and its accessibility/keyboard behaviour.
- NFR-013 risk: high; import after first paint and keep the prerendered header as the LCP element.

### request-builder

`curlconverter` converts cURL commands into code, needs node built-ins (the browser bundle failed in
the probe) and is the wrong direction anyway.

- Recommendation: no dependency. Build the cURL text and the request description ourselves, and use
  `fetch` only on an explicit click (DEC-32). CSP `connect-src` must stay closed until that click,
  and the tool must say what it will send.
- ADR: none, but the tool needs its own security review before it ships.

## 3. Cross-cutting notes

- **NFR-013:** every library above must be imported dynamically inside the tool module, never at the
  top of the route chunk. The prerendered header is the LCP element today; a static import of a
  100 kB+ library delays hydration and interactivity even when LCP survives.
- **Workers:** algebra, font parsing and barcode generation belong in a worker with progress and
  cancel, following the regex tester's one-worker-per-job pattern.
- **Security:** markdown HTML must be sanitised; font and document parsers consume untrusted binary
  input; no `eval` or `Function` anywhere, including inside libraries we pick (check each at install).
- **Licences to carry into the notice file:** CMUdict (BSD-2-Clause-style) for any pronunciation data,
  Unicode Terms of Use for Unicode data, MIT/Apache-2.0 for libraries.
- **Budget:** the current shell JS budget is 200 kB gzip; these are all lazy tool chunks and do not
  touch it, but the precache budget (8 MiB) counts them. The two largest additions are `bwip-js`
  (255 kB) and the CodeMirror set (164 kB).

## 4. Data-set licences (verified 2026-10-21)

| Data | Licence | Evidence |
|------|---------|----------|
| CMU Pronouncing Dictionary | BSD-2-Clause-style "Carnegie Mellon University" licence: redistributions must keep the notice, and the contents are deemed source code | `https://raw.githubusercontent.com/cmusphinx/cmudict/master/LICENSE` (read in full) |
| `ipa-dict` data | MIT, Copyright (c) 2016 dohliam | `https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/LICENSE` (read in full) |
| Unicode character data (for Shavian and glyph browsing) | Unicode Terms of Use; the Shavian block is U+10450–U+1047F (48 code points, measured 0.5 kB gzip when imported from `@unicode/unicode-15.1.0/Block/Shavian`) | UNVERIFIED in this session: the licence page was not fetched; the phoneme mapping has not been written yet |

The CMU licence requires the copyright notice and conditions in our documentation. That means an entry
in `docs/legal/ATTRIBUTION.md`, the About page's licence list, and a generated third-party notice
before release.

## 5. Suggested order

1. **graph-calc** — no dependency, reuses our parser; proves the plotting UI cheaply.
2. **markdown-writer** — `marked` + `dompurify`; small and exercises the sanitisation rule.
3. **glyph-browser** — Unicode blocks, lazy per block.
4. **font-explorer** — `opentype.js` in a worker.
5. **text-editor** — CodeMirror after its ADR.
6. **code-genny** — `bwip-js`; largest self-contained chunk.
7. **algebra-calc** — `nerdamer` in a worker after its ADR.
8. **doc-converter** — mammoth/turndown/docx, with LaTeX and EPUB declared out of scope.
9. **ipa-transcriber** — CMUdict data plus our ARPAbet→IPA table.
10. **shavian-transliterator** — the same data plus our own mapping.
11. **request-builder** — no library, but a security review first (DEC-32).

## 6. ADRs needed

- ADR-0005: symbolic maths engine (`nerdamer`) and its worker sandbox.
- ADR-0006: editor engine (CodeMirror 6 rather than TipTap) and keyboard behaviour.
- ADR-0007: pronunciation data (CMUdict) — licence notice, size strategy, IPA and Shavian scope.
- ADR-0008: document conversion without pandoc — reject GPL-2.0+ runtime and declare the reduced
  format list.

## 7. UNVERIFIED

- Whether `bwip-js` can be imported per symbology so the 255 kB whole-package figure shrinks (no
  ESM exports map in 4.11.4).
- Whether `docx` and the CodeMirror packages tree-shake below the measured figures.
- `function-plot`'s transitive footprint beyond the measured bundle.
- `@unicode/unicode-15.1.0` against the current Unicode release (only the Shavian block was measured).
- `nerdamer`'s coverage of the algebra features the tool promises; not exercised.
- A compact English subset of `ipa-dict` under its MIT data licence.
- Quality of any CMUdict phone → Shavian mapping (none exists yet).
- `pnpm audit` for these packages; it must be run in the install branch, not the probe.
- Browser support for `bwip-js`, `fontkit` and `codemirror` in Firefox and Safari.
