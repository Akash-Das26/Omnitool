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

**Recorded decisions (Session 005, P1):** `lighthouse@13.5.0` and `chrome-launcher@1.2.2` are **Apache-2.0**, development-only, used by `scripts/lighthouse.mjs` and CI. `@lhci/cli` was removed; its transitive dependency tree carried four high advisories with no upstream fix. Neither package ships in the production bundle. `qrcode` is **MIT**, shipped in the QR sample.

## 5. Omnitool's own licence
MIT (placeholder holder "Omnitool contributors"); confirm via DEC-02.
