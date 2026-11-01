# Accessibility: what is automated, what is not, and the manual script

## 1. What a green automated result actually proves

Two automated checks run on every route in both themes:

- **axe** through Playwright (`tests/e2e/a11y.spec.ts`): zero serious or critical violations, per theme, on Chromium and Firefox.
- **Lighthouse accessibility**, which is axe again with a weighted score: 100 on every route in the 2026-11-01 sweep.

A score of **100 means "no failing automated rule"**, nothing more. Automated checks are useful precisely because they are deterministic, and limited precisely because they cannot use the page:

**Covered by automation:** accessible names on controls, labels associated with inputs, `alt` text, invalid ARIA attributes and roles, duplicate ids, heading order (as a warning), contrast of computed text and border colours, link text that is not empty, landmark presence, form field grouping in simple cases, and target-size rules where axe can measure them.

**Not covered, at all:**

- Whether the screen reader's output is *understandable*: reading order through the shell's grid, a live region that announces "3 results" instead of "3 results 3 results", a table announced as a table of nothing.
- Focus after a route change or after a dialog closes: axe never moves focus.
- Keyboard-only completion of a real task, including scroll containers, the ProseMirror surface, the virtualised character grid and the file picker.
- Live-region timing and politeness in practice (`role="alert"` firing before the user has finished typing, or progress that interrupts itself).
- Text at 200% zoom / 320 px reflow with a real layout engine and a real font size override, and Windows High Contrast / forced-colours modes.
- Speech input, switch access, screen magnification and touch on a real device.
- Anything behind an error state, an empty state or a modal that a test does not open.

**This repository therefore does not claim WCAG 2.2 conformance, at any level.** It claims that the automated checks pass and that the manual script below has not been run. `docs/audit/AUDIT-LOG.md` keeps F-014 and F-018 open for exactly this reason.

## 2. Manual screen-reader script — five representative routes

Run this with a human at the keyboard. Record one row per route in section 4. **Status: NOT RUN.** Do not mark a route passed without a session.

### Setup

- **macOS / VoiceOver:** System Settings → Accessibility → VoiceOver, or `Cmd+F5`. Set the VoiceOver modifier to `Caps Lock` (default) or `Control+Option` (VO). Speech rate slow enough to follow. Use `VO+U` for the rotor: landmarks, headings, links, form controls.
- **Windows / NVDA:** install NVDA, `Ctrl+Alt+N` to start, `Insert+Q` to quit without saving. `Insert+F7` for the elements list (links, headings, landmarks, form fields). `Insert+Space` toggles browse/focus mode on a control.
- Turn off the monitor's own speech and any "read anything on screen" utility, so the screen reader is the only source.
- Start each route from a fresh tab at 1280×720, then repeat the parts marked **ZOOM** at 200% browser zoom.
- Test both themes (`theme-toggle.tsx`): the light/dark switch must not change what is announced.

### Route 1 — `/` (home index and omnibox)

1. Load the page, stop, and let the screen reader finish. Expect: a page title that names the site, then a banner landmark, then a main landmark.
2. Rotor → landmarks. Expect: banner, navigation (the rail), main, contentinfo. No unnamed landmark, no duplicate "navigation" beyond what exists.
3. Rotor → headings. Expect one `h1`, then section headings in order, no skipped level.
4. Tab from the top. Expect: skip link (if present) first, then header controls, then the rail, then the search field, then the tool rows. Focus must be visible at every stop.
5. Type two characters in the search field, then read the result count. Expect: a polite announcement of how many tools match — once, not once per keystroke.
6. `Cmd/Ctrl+K`, type `qr`, press `Down Down Enter`. Expect: focus lands in the tool page's main content or on its `h1` — not back at the top of the document — and the route is announced.
7. **ZOOM:** at 200%, the rail and rows must reflow without horizontal scrolling (`window.scrollX` stays 0).

### Route 2 — `/tools/text-editor/` (rich editing surface)

1. Land on the page. Expect the `h1`, then the description, then the toolbar — and the toolbar controls' names must be words ("Bold", "Bullet list"), not "button" nineteen times.
2. Tab through the toolbar. Expect every button reachable and visible-focused, and the editor surface after them, announced as a multi-line text field with a name.
3. Type a sentence, select a word with `Shift+Arrow`, apply Bold. Expect: the change is announced (or at least not silent), and the text remains readable in order.
4. Paste a paragraph of formatted text from another application. Expect: the sanitiser's result is announced as ordinary paragraphs; **nothing** is announced as an image or a link the reader did not write.
5. Press Enter twice, then create a bullet list and a task item; tick the checkbox from the keyboard (`Space`). Expect: state announced as checked/unchecked.
6. Open Save draft, then Restore, then Clear. Expect: each outcome named, and focus returned to a sensible control afterwards.
7. **ZOOM:** at 200% the editing surface keeps a visible caret and does not scroll horizontally.

### Route 3 — `/tools/doc-converter/` (file intake, worker, progress)

1. Tab to the file input and open it from the keyboard. Expect: the control is announced as a file chooser with the accepted types in words.
2. Choose a DOCX and follow the progress region. Expect: percentage changes announced politely, not on every frame, and a completion message that names the output.
3. Choose a file that is not a DOCX. Expect: the refusal is announced as an alert and focus stays usable — no silent failure.
4. With the output present, reach Copy and Download from the keyboard and use them. Expect: a "(copied)" confirmation that is announced, and a download that starts without trapping focus.
5. Reload the page. Expect: no stale progress left announced.

### Route 4 — `/tools/glyph-browser/` (listbox grid and search)

1. Reach the character grid. Expect it announced as a list box with a position ("item 41 of 294,579" or the block count), and the selected cell announced with its code point name.
2. Arrow through the grid. Expect: focus follows, the announcement names the character, its code point and its block, and no full-page re-read.
3. `Home`, `End`, `Page Up`, `Page Down`. Expect: no timeout, no "busy" announcement stuck.
4. Search: type a word, then wait. Expect: an honest result count, and the list of results reachable by `Down` from the field.
5. **ZOOM:** at 200% the grid remains operable and the selection is still visible.

### Route 5 — `/tools/ipa-transcriber/` (one-time download, cancel, output)

1. First load with an empty cache: expect the one-time download notice announced once, with its size, before anything else in the main region.
2. Start a transcription and follow the progress. Expect: a progress element announced with a value, then the result.
3. Cancel mid-download from the keyboard. Expect: cancellation announced, and a retry path that is reachable.
4. Enter text with an unknown word. Expect: the unknown word is listed and announced as unknown, not skipped silently.
5. Repeat the transcription. Expect: the dictionary is not downloaded twice and nothing is announced about a download on the second run.

### Universal checks on every route

- Keys: `Tab`/`Shift+Tab` reach everything; no keyboard trap except inside a modal, which must close on `Esc` and restore focus.
- `Esc` on the omnibox and on any dialog returns focus to the control that opened it.
- Reduced motion: with `prefers-reduced-motion: reduce`, no animation plays and nothing depends on one.
- Forced colours: Windows High Contrast keeps every control visible and the focus ring present.
- Nothing is announced twice for one action; nothing important is announced not at all.

## 3. Recording template

| Route | Reader / OS | Landmarks | Headings | Keyboard flow | Live regions | Forms and errors | Zoom / reflow | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | | | | | | | | NOT RUN | |
| `/tools/text-editor/` | | | | | | | | NOT RUN | |
| `/tools/doc-converter/` | | | | | | | | NOT RUN | |
| `/tools/glyph-browser/` | | | | | | | | NOT RUN | |
| `/tools/ipa-transcriber/` | | | | | | | | NOT RUN | |

A route is recorded **PASS** only with the reader and OS named and the notes filled in; otherwise it stays NOT RUN. Findings go to `docs/audit/AUDIT-LOG.md` as new F-numbers, not into this file.
