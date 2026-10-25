# Attribution and licence notes

Not legal advice. Re-check before release.

## 1. Relationship to delphitools
Omnitool takes the **idea and feature scope** of delphitools (https://delphi.tools/, by Ruby Morgan Voigt / "delphi", https://github.com/1612elphi). The reference archive was supplied by the project owner and is used for analysis only.

- The delphitools code and data written for it are under the **Zero-Clause BSD** licence, which permits copying, modification and distribution without conditions. Omnitool nevertheless **does not copy its source**: it is a fresh implementation, and credits the original out of courtesy.
- The delphitools LICENSE lists exclusions that remain under their own terms: vendored shadcn-ember files (MIT), Phosphor icon paths (MIT), imagetracerjs (Unlicense), jSquash builds, **MuPDF (AGPL-3.0)**, MediaInfoLib, fonts (SIL OFL), flags (MIT), CMU-derived dictionary (BSD-2), EFF wordlist (CC BY 3.0), **film LUTs (CC BY-SA 4.0)**.
- **Artwork is not covered and is not reusable:** hero art, stickers, tiles, onboarding art and the mascot/mark belong to their artists. Omnitool must create its own identity.

## 2. What Omnitool must not reuse
Artwork, mascot, name/branding, UI copy and tool descriptions, curated datasets of unclear provenance (palettes, LUTs), source files. Ideas, feature lists and public behaviour are fine.

## 3. Art provenance
Omnitool's identity assets (logo, icons, social image, empty-state illustrations) may be made by hand or with an image generator. Practical rules, whichever route is used:
- Never use the original's art as a reference or starting point.
- Reverse-image-search each final asset to catch accidental resemblance to an existing brand.
- Record tool, prompt, date and edits in `docs/legal/ART-PROVENANCE.md`.
- Purely machine-generated images may have weak or no copyright protection in some jurisdictions; hand edits or redrawing the final mark improves the position. Not legal advice.
- Check the image tool's terms for commercial use before shipping an asset.

## 4. Dependency licence rules
- Allowed by default: MIT, ISC, BSD-2/3, Apache-2.0, Unlicense, 0BSD, OFL (fonts).
- Needs a recorded decision: MPL-2.0 (file-level copyleft), CC BY / CC BY-SA (attribution / share-alike), anything fetched at runtime.
- Avoid unless knowingly accepted: **AGPL-3.0** (network-use copyleft would apply to the whole app), GPL-2.0/3.0.
- Maintain a `THIRD-PARTY-NOTICES.md` generated at release (P9).

**Recorded decisions (Session 004, P1):** `@axe-core/playwright` and `axe-core` are **MPL-2.0**, used as development-only dependencies for accessibility testing. They are not modified and are not shipped in the production bundle. Accepted on that basis (see `docs/review/REVIEW-LOG.md`, Session 004).

**Recorded decisions (Session 020, P2):** the owner approved three tool-only libraries on 2026-10-23. All are permissive, all are pinned exactly, and each is imported only by its own tool's lazy chunk (checked by `scripts/check-build-budget.mjs`, which fails if a tool library's marker reaches the shell):

| Package | Version | Licence | Used by | Source of the facts |
|---|---|---|---|---|
| `markdown-it` | 15.0.3 | MIT | `markdown-writer` | `pnpm view markdown-it@15.0.3 version license`; the project's own token-to-React renderer sits on top, and its HTML output is never used |
| `fontkit` | 2.0.4 | MIT | `font-explorer` | `pnpm view fontkit@2.0.4`; parsing runs in a worker. Types from `@types/fontkit@2.0.9` (MIT, development only) |
| `@unicode/unicode-16.0.0` | 2.0.8 | MIT | `glyph-browser` (build-time data, not shipped as a module) | `pnpm view @unicode/unicode-16.0.0@2.0.8`; generated from the Unicode 16.0 Character Database. The Unicode Character Database itself is distributed under the Unicode Licence v3; the block index Omnitool writes carries the UCD version and this notice in the tool footer |

**Test fixture:** `tests/fixtures/schibsted-grotesk-latin-wght-normal.woff2` is the Schibsted Grotesk variable font (SIL Open Font License 1.1), copied unmodified from `@fontsource-variable/schibsted-grotesk@5.3.0`, which the app already ships for its own UI. Its licence text sits beside it as `tests/fixtures/OFL-Schibsted-Grotesk.txt`. It is used only by the font-explorer E2E test; fonts supplied by users are never saved or uploaded.

**Committed data set (Session 022, Batch 6): the CMU Pronouncing Dictionary.** Used by `ipa-transcriber` and (for phonemes only) `shavian-transliterator`. Provenance and licence, all read from the upstream source, not from a mirror:

| Fact | Value | Where it came from |
|---|---|---|
| Source | `https://github.com/cmusphinx/cmudict` | the repository's own remote, cloned read-only into `data/pronunciation/cmudict.dict` |
| Version | commit `74790861f652b15e4ac49015a90074ad62a27690`, committed 2025-10-24 | `git log -1 --format=%H %cI` in that clone, recorded in `apps/web/public/pron/manifest.json` and shown in the tool footer |
| Licence | BSD-2-Clause, Copyright (C) 1993-2015 Carnegie Mellon University | `data/pronunciation/LICENSE`, copied verbatim from the same commit |
| Size | 135,351 headword lines → 126,052 headwords and 9,114 additional pronunciation variants | `scripts/generate-pronunciation-data.mjs`, reported in the manifest |
| Shipped form | seven same-origin JSON chunks, 0.9 MB gzip in total, at most 158 kB gzip each | measured with `gzip -9` on the built files |
| Transcribed by Omnitool | the ARPAbet → IPA mapping in `packages/tool-core/src/ipa` | written for this project from the ARPAbet symbol set published with the dictionary; no dictionary text or table is copied from delphitools |

No other data set is committed for these tools. The Shavian alphabet mapping is written from the Unicode Character Database (character names and code points in the block U+10450–U+1047F), which the project already reads through the MIT-licensed `@unicode/unicode-16.0.0` package at build time.

Transitive licences of those three, checked with `pnpm licenses list` (2026-10-23): `mdurl` MIT, `argparse` PSF-2.0, `entities` BSD-2-Clause, `uc.micro` MIT, `linkify-it` MIT, `punycode.js` MIT, `dfa` MIT, `clone` MIT, `brotli` MIT, `restructure` MIT, `@swc/helpers` Apache-2.0, `tiny-inflate` MIT, `unicode-trie` MIT, `fast-deep-equal` MIT, `unicode-properties` MIT. `@unicode/unicode-16.0.0` has no dependencies. No GPL, AGPL, SSPL or share-alike package is in the tree. One deprecated transitive is present (`glob@11.1.0`, MIT) and nothing depends on its deprecated behaviour.

**Recorded decisions (Session 005, P1):** `lighthouse@13.5.0` and `chrome-launcher@1.2.2` are **Apache-2.0**, development-only, used by `scripts/lighthouse.mjs` and CI. `@lhci/cli` was removed; its transitive dependency tree carried four high advisories with no upstream fix. Neither package ships in the production bundle. `qrcode` is **MIT**, shipped in the QR sample.

## 5. Omnitool's own licence
MIT (placeholder holder "Omnitool contributors"); confirm via DEC-02.
