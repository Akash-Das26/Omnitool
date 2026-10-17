# AGENTS.md — rules for AI coding agents working on Omnitool

You are helping build Omnitool. A human reviews every session. Follow these rules exactly.

## Before you do anything
1. Read, in order: `plan.md`, `todo.md`, `features.md`, then the doc relevant to your task (`docs/srs/SRS.md`, `docs/development/DEVELOPMENT.md`, `docs/implementation/IMPLEMENTATION.md`, `docs/design/DESIGN.md`).
2. Work only on the **current phase** in `todo.md`. Do not start a later phase.
3. If a task needs a decision listed under "Decisions needed" and it is unticked, stop and ask.

## Hard constraints
- **Local-only:** no backend, no analytics, no telemetry, no runtime network calls except user-initiated ones (Request Builder) and declared model/WASM fetches from the CDN list in `docs/implementation/IMPLEMENTATION.md`.
- **No copying** artwork, UI copy, curated datasets or code from `delphitools` beyond ideas and public behaviour. Read `docs/legal/ATTRIBUTION.md`.
- A read-only copy of the original may sit next to this repo (e.g. `../delphitools-main`). Use it only to check what a feature does. Never copy source, text, data or images from it, and never use its art as a reference.
- **Do not generate art.** Use the plain wordmark placeholder and Lucide icons; list needed brand assets in the review log. Art comes from the owner via `docs/design/ART-PROMPTS.md`.
- **Check licences** before adding a dependency (permissive preferred; no AGPL/GPL without a recorded decision).
- **Do not invent versions or APIs.** Pin versions from `pnpm view`; read library docs for the pinned version.
- Pure logic goes in `packages/tool-core` with tests written first. React code stays thin.
- British English in UI copy. Kebab-case tool IDs. No emoji in UI.
- Accessibility is not optional: labels, keyboard, focus-visible, reduced motion, contrast.
- Do not use real secrets or user data in tests or fixtures.

## Session protocol
Start: state the phase, the tasks you will do, and the files you expect to touch.
During: small commits (Conventional Commits). Never add AI-attribution, co-author or generator trailers to commit messages. Run `pnpm lint && pnpm typecheck && pnpm test` before declaring anything done.
End (mandatory):
1. Update `features.md` statuses and `todo.md` ticks.
2. Append an entry to `docs/review/REVIEW-LOG.md` (template inside) including what is **not** done or uncertain.
3. If a phase gate is reached, say so and request an audit; do not self-approve.
4. Report honestly: failing tests, skipped work and assumptions go in the log, not under the rug.

## Commands
`pnpm dev` · `pnpm build` · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm features:progress`
