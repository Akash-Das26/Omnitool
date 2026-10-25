# Batch 6 review pack

For a reviewer who does not need to read code. Every check is a thing you can do in the
browser in a minute. The batch is **not** declared done: Lighthouse could not run on this host
(see the end), so NFR-013 is unmeasured for the four new routes.

Run `pnpm build && pnpm preview`, then open `http://127.0.0.1:4173`.

## code-genny — Barcode Generator (`/tools/code-genny`)

The encoder is our own (no barcode library). Reference vectors live in
`packages/tool-core/src/barcode/barcode.test.ts`.

1. **The check digit is computed and explained.** The page opens on EAN-13 with
   `5901234123457`. The preview is labelled "EAN-13 barcode for 5901234123457", and the
   Output region reads: "weighted sum 83, remainder 3" and "115 modules, 10-module quiet zone".
2. **A missing check digit is added.** Clear "Text or digits" and type `590123412345`
   (twelve digits). The barcode becomes the same 13-digit code, and the Output says
   "sum is 83; the check digit is 10 minus the remainder" and "check digit was added".
3. **A wrong check digit is refused, not drawn.** Type `5901234123456` (ending in 6). A red
   message says "check digit is 7, not 6" and no barcode is drawn.
4. **UPC-A.** Choose Barcode type → UPC-A, type `03600029145`. The preview is labelled
   "UPC-A barcode for 036000291452": the eleven digits get a check digit of 2.
5. **Code 39 upper-cases, ITF pads, and the file downloads.** Choose Code 39, type `ab-1`:
   the barcode is for `AB-1` and a note says it was "changed to upper case". Choose ITF, type
   `123`: the barcode is for `0123` and a note says a "leading zero was added". Press
   "Download SVG": the file is named `ean13-5901234123457.svg` when you are back on EAN-13,
   or `itf-0123.svg` for the padded ITF code.

**Before printing anything**, scan the result with a real scanner. The symbiology is checked
against published reference encodings, but print size, printer resolution and ink spread are
not something a test can promise.

## algebra-calc — Algebra Calculator (`/tools/algebra-calc`)

Exact arithmetic only: fractions stay fractions. Multiply with `*` (write `2*x`, not `2x`).

1. **Factor.** Operation → Factor, Expression `x^2-5*x+6`, press "Work it out". The result is
   `(x - 2)(x - 3)`, with "x = 2 is a root" (and the same for 3) in the steps.
2. **Solve a linear equation.** Operation → Solve an equation, Expression `2*x+3=11`, press
   "Work it out". The answer is `x = 4`.
3. **Expand, then evaluate.** Operation → Expand, Expression `(x+1)^3` gives
   `x^3 + 3x^2 + 3x + 1`. Then Operation → Evaluate, Expression `x^2+2*x+1`, "Value of x" `3`
   gives `16`.
4. **Solve a system.** Operation → Solve a system, in the equations box write `x+y=5` on one
   line and `x-y=1` on the next, press "Work it out". The answer is `x = 3, y = 2`.
5. **Differentiate, and refuse the unsupported.** Operation → Differentiate, Expression
   `x^3+2*x` gives `3x^2 + 2`. Then Operation → Simplify, Expression `1/x`: a red message says
   "Dividing by something containing x is not supported." (The tool never silently gives a
   wrong answer for functions, roots or non-integer powers — it names them as unsupported.)

## ipa-transcriber — IPA Transcription (`/tools/ipa-transcriber`)

1. **The download is disclosed before it happens.** On a fresh profile (or after clearing
   site data), the Transcription panel shows "One-time download: 0.9 MB, stored on this
   device.", a progress bar and a Cancel button. Cancel then says the download was cancelled
   before the dictionary arrived, and nothing is guessed in its place.
2. **Known words.** Type `hello world`: the transcription is `həˈloʊ ˈwɝld`.
3. **Variants are shown, not chosen for you.** Type `read`: under "Words with more than one
   pronunciation" it lists `ˈɹid / ˈɹɛd`.
4. **Unknown words are reported.** Type `zzzz 42`: "Not in the dictionary: zzzz", the running
   text shows `⟨zzzz⟩`, and `42` stays as `42` (numbers are not transcribed; spell them out).
5. **The data is named.** The footer says "CMU Pronouncing Dictionary, commit 7479086
   (2025-10-24), BSD-2-Clause", with the word count and the CMU notice. After a second visit
   the panel says the dictionary "is stored on this device" and transcribing works offline.

## shavian-transliterator — Shavian Transliterator (`/tools/shavian-transliterator`)

Shavian is the phonemic alphabet U+10450–U+1047F. It is **one-way**: the letters cannot be
turned back into English spelling, and the tool says so.

1. **A known line.** Type `hello world`: the output is `𐑣𐑩𐑤𐑴 𐑢𐑻𐑤𐑛` (four letters per
   word: h-ə-l-o and w-er-l-d).
2. **A name takes the namer dot.** Type `I saw London`: the output is `𐑲 𐑕𐑷 ·𐑤𐑳𐑯𐑛𐑩𐑯` —
   note the `·` before the Shavian for London — and the panel lists London under "Names".
   A word that begins a sentence is not marked.
3. **An unknown word passes through unchanged.** Type `zzzz`: the output is `zzzz` and
   "Left as written: zzzz" appears. Nothing is guessed from the letters.
4. **Punctuation and numbers are untouched.** Type `Hello, world! 42.` — the comma, the
   exclamation mark, the full stop and `42` are exactly where you typed them.
5. **The mapping is accounted for.** Open "How this works": it states that 48 letters are
   documented, that 7 of them need a sound General American merges and are therefore never
   produced, and that the output is phonemic rather than a standard orthography. The footer
   names the dictionary commit and its BSD-2-Clause licence.

## If you see this, it is a bug

- A barcode drawn with a red error message still on screen, or an error with a barcode drawn
  anyway.
- A check digit that disagrees with the scanner, or the tool quietly "fixing" a wrong check
  digit instead of refusing it.
- algebra-calc showing `NaN`, `Infinity`, or a decimal where an exact fraction was possible.
- algebra-calc accepting `2x` as `2*x` (it should say it does not understand it) or hanging.
- IPA output where a word in the dictionary is missing, or an unknown word is spelled out
  from its letters without being listed.
- IPA or Shavian asking for the download again after it has already arrived.
- Shavian output containing English letters where a word is in the dictionary, or the namer
  dot on a sentence-initial word.
- Any of the four tools sending a request to another site. They must not.

## What the sweep says, and why the batch is not signed off

Lighthouse ran on a quiet host (41 routes × 3 runs, exit 0, load 1.60–3.60 against a 4.00
limit). Performance is **96–100** everywhere and accessibility **100**; home is 2,116 ms.

- `code-genny`: **99 performance, 1,661 ms** — within NFR-013 and marked done.
- `algebra-calc`: **2,568 ms** median LCP (97 performance). The largest element is the "What
  this covers" paragraph, which appears after hydration.
- `ipa-transcriber`: **2,653 ms** (96 performance). The largest element is the transcription
  itself, which only exists once the 0.9 MB dictionary has arrived.
- `shavian-transliterator`: **2,508 ms** (97 performance). The largest element is the
  "0 of 5000 characters" line under the box, 8 ms over the target.

NFR-013 is 2,500 ms, so those three routes are over and the batch stops here rather than
re-baselining the number. The proposed smallest fixes — fold the algebra paragraph into the
tool's "How this works" disclosure, and let the IPA and Shavian panels start empty so the
prerendered description stays the largest element — are in `docs/review/REVIEW-LOG.md`
(Session 022) for the owner to accept or reject.
