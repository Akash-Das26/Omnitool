# Audit checklists

Tick per audit; copy the relevant sections into the audit entry. Evidence beats assertion: attach numbers or screenshots.

## 1. Privacy and offline (NFR-001, FR-007)
- [ ] E2E run with network blocked after first load: shell and all non-model tools work
- [ ] Network trace of every tool: zero requests except declared CDN downloads and Request Builder
- [ ] No analytics, fonts or scripts from third-party origins
- [ ] Files are not persisted without explicit user action; IndexedDB handoff cleared

## 2. Security (NFR-007)
- [ ] CSP set; no `eval`/inline script except the hashed theme bootstrap
- [ ] `pnpm audit` reviewed; no high/critical unresolved
- [ ] File parsers handle malformed input without hanging (fuzz a few samples)
- [ ] Regex tester and any user-code evaluation sandboxed with timeout
- [ ] No secrets, tokens or personal data in repo or fixtures

## 3. Accessibility (NFR-004)
- [ ] axe: zero serious/critical on home, every tool page touched this phase
- [ ] Keyboard-only walkthrough of omnibox, one tool, dialogs
- [ ] Screen-reader spot check (NVDA or VoiceOver) on one tool per tier
- [ ] Contrast AA in light and dark; focus visible; reduced motion honoured
- [ ] Touch targets >= 44 px on mobile

## 4. Performance (NFR-002/003)
- [ ] Lighthouse mobile performance >= 90 on home
- [ ] Shell JS <= 200 kB gzip; tool chunks lazy
- [ ] Heavy tools: test with 24 MP image / 100 MB file / 10-minute media; worker, progress, cancel work
- [ ] No main-thread long tasks > 200 ms during typical use

## 5. Licence and provenance (NFR-009)
- [ ] Every new dependency has a recorded licence compatible with `docs/legal/ATTRIBUTION.md` rules
- [ ] No AGPL/GPL without a recorded decision
- [ ] No copied artwork, copy, datasets or source from delphitools
- [ ] Fonts/icons/data attributions present in `THIRD-PARTY-NOTICES.md` (from P9)

## 6. Code quality (NFR-008)
- [ ] lint, typecheck, tests green in CI
- [ ] `tool-core` coverage >= 90%
- [ ] No dead code, TODOs without an owner, or commented-out blocks
- [ ] Each tool follows the module contract (registry, lazy route, tests, error boundary)

## 7. Documentation sync
- [ ] `features.md` matches reality (spot check 5 rows)
- [ ] `todo.md` ticks match merged work
- [ ] `REVIEW-LOG.md` has an entry per session since the last audit
- [ ] SRS requirements touched have verification
- [ ] ADRs exist for decisions that changed `plan.md`

## 8. Browser matrix (NFR-006)
- [ ] Chrome, Edge, Firefox, Safari desktop; iOS Safari; Android Chrome
- [ ] Gaps recorded per tool in the support matrix
