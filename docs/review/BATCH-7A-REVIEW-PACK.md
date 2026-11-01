# Batch 7A review pack

Written for a reviewer who has not read the code. Everything here is a check you can do in a browser, a command you can paste, or a decision you can answer. No prior knowledge of the repository is assumed.

**What this batch set out to do:** fix the three routes over NFR-013, raise `tool-core` branch coverage to 90%, investigate the Firefox 30 s timeout, then build `text-editor` and `doc-converter` and stop at the batch gate.

**What it actually did:** the three routes were fixed and measured, coverage reached 90.36% and is now enforced, the Firefox timeout did not reproduce and the guard was made deterministic anyway. **Neither Batch 7 tool was built.** Your decisions block named no editor library and no document-conversion library or binary, and the project rule is that nothing is installed unless its line names it. §4 and §5 are written so you can answer that question now.

**What this pack is not:** there is no paste-sanitising corpus and no conversion checklist here, because those belong to tools that do not exist yet. They are written when the tools are built, against the library you choose.

---

## 1. Five checks for the NFR-013 fixes

Run `pnpm build && pnpm preview` and open each route at a phone width (Chrome DevTools, 412 × 915, or just a narrow window).

1. **`/tools/ipa-transcriber` starts blank.** The big text box is empty, the words "One-time download: 0.9 MB, stored on this device." are visible with a Cancel button, and no transcription paragraph appears anywhere on the page. *Expected:* three things true, and the page has nothing computed before you ask.
2. **Typing is what triggers the download.** Type `hello` in the box. *Expected:* a progress bar labelled "Pronunciation dictionary download" appears, then the transcription `həˈloʊ` after it finishes; the phrase "Transliterated"/"Transcribed" status appears below the box.
3. **`/tools/shavian-transliterator` follows the same pattern.** Blank box and the notice on arrival; type `hello world`. *Expected:* Shavian characters appear, the footer names the CMU Pronouncing Dictionary and its licence, and the word list at the bottom names every word it used.
4. **`/tools/algebra-calc` shows its supported-work paragraph in the hint, not as its own heading.** Scroll to the bottom of the tool. *Expected:* one "What this covers" stage, with the supported-operations sentence and the `2*x` note inside a single hint line. Conversely, the tool still works: type `x^2-2*x+1=0`, choose Solve, and read `x = 1`.
5. **Nothing regressed for a normal reader.** On each of the three routes the tool name and its one-line description are the first things painted (they are written into the HTML at build time; they do not wait for JavaScript). Disable JavaScript and reload: the name and description are still there, with the "needs JavaScript" notice.

If you would rather trust the numbers than the screen: `reports/lighthouse/subset/summary.md` holds the last sweep, and the before/after table is in `docs/implementation/IMPLEMENTATION.md` §9, Batch 7A.

**The honest caveat.** `/tools/shavian-transliterator/` measures **2,495 ms**, which passes the 2,500 ms target by 5 ms, not by the second the other two gained. Its largest painted element is the character-count line under the box (`p.mt-2`), which is drawn after the JavaScript runs, so the route is one line of copy away from failing again. The fix is to shorten that line to one sentence — the same fix that worked for `glyph-browser`'s download notice. It is **not applied** because this batch was allowed one attempt per route. It is **P2-59** in `todo.md`.

## 2. The coverage gate

Paste `pnpm test:coverage`. *Expected:* `887 passed` in 61 files, `All files` at or above 90% branches and 90% lines, exit code 0. The threshold in `vitest.config.ts` is now **90** for branches (it was 85), so a future batch that drops below it fails the suite instead of being noted in a review log.

What was added, in three files, and why each is a behaviour and not a line count:

- `packages/tool-core/src/algebra/algebra.edges.test.ts` — what the parser refuses and the sentence it uses (`“@” is not something this tool understands.`), each solve degree, exact fractions from plain numbers, a zero denominator, an unknown operation.
- `packages/tool-core/src/markdown/markdown.edges.test.ts` — blocked images keep their words, unsafe link destinations stay as text, heading ids from punctuation, ordered list start numbers, the exported HTML for emphasis, code, a titled link and a code block with no language.
- `packages/tool-core/src/core.edges.test.ts` — barcode, calculator, cipher and JSON refusals, each asserting the message a person sees.

Numbers: **88.25% → 90.36% branches**, **96.48% → 96.35% lines**. `markdown/index.ts` is still the lowest file at **77.94% branches**; the branches left need token types markdown-it never emits with HTML disabled (`html_block`, `html_inline`, a closing emphasis with no matching open). A test that fabricated those tokens would cover the line and prove nothing, so the gap is written down in `IMPLEMENTATION.md` §9 instead.

## 3. The Firefox timeout

**It did not reproduce.** 114 runs of the 1 MB JSON guard on Firefox, at 12 workers with 10 CPU burners saturating all 16 cores (1-minute load reached 32.28), **0 failures**. So no cause is claimed.

What the test was doing that a loaded machine would punish:

- it was the last guard navigating with Playwright's `page.goto` rather than the shared `gotoApp` helper, so nothing waited for the application to become interactive;
- it then clicked a **Format** button that only exists once the application has hydrated. Under load, that click can land before hydration and do nothing, and the only thing left to fail is the 30-second wait for output.

Both are fixed: the test waits for `html[data-app-ready]`, and every failure in `tests/e2e/batch1.spec.ts` now attaches the route, `document.readyState`, the app-ready flag and every console error to the report (`attachDiagnostics` in `tests/e2e/helpers.ts`). No timeout was lengthened, no retry added, no sleep introduced.

Proof: **30 of 30 runs passed on Firefox** under the same load after the change.

To repeat it yourself: `for i in $(seq 1 10); do (while :; do :; done) & done; PLAYWRIGHT_BROWSERS=all pnpm exec playwright test tests/e2e/batch1.spec.ts --project=firefox --grep "formats input over 1 MB" --repeat-each=30 --workers=12` — then kill the burners with `kill %1 %2 …` or by closing the terminal.

## 4. Decision: the editor library (P2-61)

`text-editor` needs a rich-text editor for notes and short documents. The requirements (headings, marks, lists, links limited to http/https/mailto, find and replace, Markdown/plain/HTML export, a structured document model that never renders trusted HTML) are in the objective, not in the repository. **Nothing is installed.** The four realistic routes, all measured from the npm registry on 2026-10-25 with `pnpm view <pkg> version license time.modified deprecated dist.unpackedSize`:

| Route | Version | Licence | Last publish | Unpacked | What it means |
|---|---|---|---|---|---|
| **Tiptap** (`@tiptap/core` + `@tiptap/starter-kit`) | 3.32.0 | MIT | 2026-10-13 | 3.30 MB + 54 kB | A friendly layer over ProseMirror. `starter-kit` alone pulls **~30 sibling extension packages**, each a separate licence to list. Its model is a ProseMirror document, which is exactly the "structured document, never trusted HTML" requirement, and paste handling is a documented ProseMirror plugin. |
| **ProseMirror directly** (`prosemirror-model`, `-state`, `-view`, plus schema/commands) | 1.25.12 (model) | MIT | 2026-09-21 | 530 kB (model) | The same engine without the wrapper: fewer packages, more code to write for the toolbar and keymap. Highest amount of our own code, lowest amount of other people's. |
| **Lexical** (`lexical` + `@lexical/react`) | 0.52.0 | MIT | 2026-10-23 | 3.23 MB + 920 kB | Meta's editor. Its own document model, one dependency (`@lexical/internal`), but the package version is still 0.x, so breaking changes are expected on a minor bump. |
| **own minimal editor** | — | — | — | — | No dependency at all: a documented subset over the model in `packages/tool-core/src/markdown`, with `contenteditable` **not** allowed, so it would be a textarea-plus-model editor rather than a true WYSIWYG. The existing `markdown-writer` tool is already close to this. |

**Two things I could not verify without installing, and will check before writing any editor code:**

1. whether the library writes pasted content into the DOM with `innerHTML` internally — the objective says to report exactly where and stop for your decision if so;
2. the full transitive licence list (Tiptap's ~30 packages, Lexical's internal package) against `docs/legal/ATTRIBUTION.md` §4.

**What I would recommend:** ProseMirror directly, pinned, because it gives the structured model and the paste-transform hook without thirty sibling packages and without a 0.x API. My estimate is a day of extra work for a smaller licence surface and a stable API. Tiptap is the faster route if you would rather have the toolbar given to you.

**Answer needed:** one of "approved: `<package>@<version>` list" (with the transitive licences I report before installing), or "none — write an own minimal editor", or "decide after your proposal" if you want the two open questions above answered first.

## 5. Decision: the document converter (P2-62)

`doc-converter` converts documents entirely in the browser. `features.md` imagines `pandoc-wasm`, which is the one option that needs your explicit decision, because it is **GPL-2.0-or-later**: distributing it (or a site that serves it) has obligations this project has so far avoided. Measured the same way, same date:

| Option | Version | Licence | Last publish | Unpacked | Notes |
|---|---|---|---|---|---|
| `pandoc-wasm` | 1.1.0 | **GPL-2.0-or-later** | 2026-06-11 | **58.6 MB** | Pandoc itself: DOCX, EPUB, LaTeX, HTML, Markdown, everything. Needs an ADR and your recorded decision before it could ship, a fetched binary of tens of MB cached on the device, and a CSP entry for WebAssembly. |
| `mammoth` (DOCX → HTML) + `turndown` (HTML → Markdown) | 1.13.0 / 7.2.4 | BSD-2-Clause / MIT | 2026-09-26 / 2026-04-03 | 1.67 MB / 192 kB | Read-only Word: DOCX in, HTML and Markdown out. **Cannot write DOCX.** mammoth pulls 8 packages (`jszip`, `@xmldom/xmldom`, `argparse`, `underscore`, …). |
| `docx` (write DOCX) + `jszip` (EPUB as a zip of XHTML) | 9.14.0 / 3.10.2 | MIT / (MIT OR GPL-3.0-or-later) | 2026-10-23 / 2026-09-08 | 21.7 MB / 693 kB | Gives DOCX and EPUB output. JSZip is dual-licensed, so MIT is available — but that has to be stated, not assumed. |
| own converters | — | — | — | — | Markdown ↔ HTML ↔ plain text are already possible with the model in `tool-core`. DOCX and EPUB are OOXML/zip formats and would be a large, error-prone job to hand-write. |

**What I would recommend:** start with the pairs that need no binary — Markdown ↔ HTML ↔ plain text, which the existing tool-core model already parses and renders — and add DOCX *reading* with mammoth if you want Word input. That keeps the repository free of GPL code and free of a 58 MB download. EPUB and DOCX *writing* are the point at which the option set gets expensive.

**Answer needed:** "approved: `<package>@<version>` and the exact wasm/binary source and licence" (I will re-verify the licence from the source, pin it, list every transitive licence, and record the binary's size, cache rule and first-use notice), or "none", or "decide after your proposal".

## 6. If you see this, it's a bug

- Any transcription or Shavian text on `/tools/ipa-transcriber` or `/tools/shavian-transliterator` **before** you type: the empty starting state has regressed, and the route is probably over NFR-013 again.
- A progress bar or a Cancel button that appears **before** you type on those two routes: the dictionary is being fetched at page load again, which is the download-before-consent defect Batch 6 fixed.
- On `/tools/algebra-calc`, a visible "What this covers" paragraph as its own text block: the paragraph that was the LCP element is back.
- Any test failure whose report has **no** `page-state` attachment in `tests/e2e/batch1.spec.ts`: the diagnostics are broken, and the next loaded failure will be another mystery.
- `pnpm test:coverage` failing with a branch figure between 85 and 90: someone lowered the threshold instead of writing the test.
- A `shavian` Lighthouse run above 2,500 ms: expected, and P2-59 is the fix.

## 7. What is not done

- `text-editor` and `doc-converter` (§4, §5 — waiting on you).
- `request-builder` was out of scope by your instruction.
- The full 41-route Lighthouse sweep and the home LCP re-measure were not run this session; only the three changed routes were measured.
- WebKit is still untestable on this host (F-019). CI has still never run (DEC-71).
- No audit finding was closed, and Audit A2 was not requested.
