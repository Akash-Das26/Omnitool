# Audit log — updated after each audit

Audits happen at each phase gate (A1..A9) using `CHECKLISTS.md`. Findings have an ID, severity (Must / Should / Info), status and owner. An audit passes when all **Must** items are closed.

## Findings table (running)
| ID | Audit | Severity | Finding | Status | Owner |
|----|-------|----------|---------|--------|-------|
| F-002 | A0 | Must (before P5) | Original uses MuPDF (AGPL-3.0). Using it would impose AGPL on Omnitool | Open: plan avoids it (pdf-lib + pdfjs-dist) | agent |
| F-003 | A0 | Must (P1) | Original artwork, mascot and copy are excluded from its licence and must not be reused | Open: own identity required (PF-24) | human |
| F-004 | A0 | Should | No versions pinned; remembered versions may be stale | Open: P1-01 | agent |
| F-005 | A0 | Should | Licence holder, hosting and router are placeholders | Open: DEC-02/03 | human |
| F-006 | A0 | Should | Some data is CC BY / CC BY-SA or GPL-at-runtime (LUTs, EFF list, pandoc.wasm). Needs per-tool decision | Open: P2/P4 | human+agent |
| F-007 | A0 | Info | Scope is large (97 tools + 2 editors); editors comparable to all other tools combined | Open: phase plan | human |
| F-008 | A0.1 | Must (P1) | Cloudflare Pages caps files at 25 MiB (20,000 files free). Decision log claimed unlimited bandwidth only; large WASM/ML cannot live in the bundle | Open: CI size check P1-11b | agent |
| F-009 | A0.1 | Must (P1) | `vite-plugin-pwa` does not precache files over 2 MiB by default; claim that it precaches WASM was wrong | Open: policy in D-14, task P1-11 | agent |
| F-010 | A0.1 | Should (P1) | COOP/COEP can break cross-origin model/WASM fetches; only needed for SharedArrayBuffer | Open: off by default, ADR if needed | agent |
| F-011 | A0.1 | Info | nuqs + TanStack Router duplicates URL-state handling; nuqs marks its TanStack adapter experimental | Closed: nuqs rejected | agent |

## Audit entry template
```
### Audit AN — YYYY-MM-DD — <phase> gate — <auditor>
**Scope / commit:**
**Checklists run:** (sections of CHECKLISTS.md)
**Results:** (pass/fail counts; Lighthouse; bundle sizes; axe)
**New findings:** (IDs above)
**Closed findings:**
**Verdict:** PASS / PASS WITH CONDITIONS / FAIL
**Conditions / next actions:**
```

---

### Audit A0 — 2026-10-17 — Planning baseline — Claude
**Scope:** `delphitools-main.zip` metadata and docs; this repository's planning artefacts. No code to audit.
**Checklists run:** Licence (section 5), Documentation sync (section 7).
**Results:** Licences and exclusions read from the original LICENSE and ACKNOWLEDGEMENTS; plan reflects them. Seven findings recorded above.
**Limits of this audit:** based on documents and the tool registry, not on reading every tool's source, and not a legal review.
**Verdict:** PASS WITH CONDITIONS: Must items F-002 and F-003 must be closed at the stated phases.
**Conditions / next actions:** resolve DEC-01..04; re-verify tooling at ignition.

### Audit A0.1 — 2026-10-17 — Decision-log review — Claude
**Scope:** the two decision logs and review notes supplied by the project owner, compared with `plan.md` v1.
**Checklists run:** none from `CHECKLISTS.md` (no code); claim verification against official docs.
**Results:** 4 claims corrected (shadcn "zero runtime footprint", PWA plugin precaching WASM, Pages "unlimited", "server component flexibility"); 1 proposal rejected (nuqs); 1 addition made (Valibot); ID clashes resolved.
**Limits:** web sources only; nothing installed or built; `vite-plugin-pwa` vs the latest Vite major not verified.
**Verdict:** PASS WITH CONDITIONS: F-008 and F-009 must be closed in P1.
**Conditions / next actions:** implement CI budget checks in P1; re-verify tooling at ignition.

