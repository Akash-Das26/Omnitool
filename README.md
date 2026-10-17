# Omnitool

A local-only toolkit of small browser tools for digital creatives and developers: colour, images, PDF, audio and video, typography, dev utilities and calculators. No accounts, no tracking, no server. Files never leave your browser.

Repository: https://github.com/Akash-Das26/Omnitool

**Status:** Phase 1 foundations implemented (shell, registry, PWA, three sample tools); awaiting Audit A1, owner-written tool descriptions and brand assets. See `plan.md`.

Omnitool is an independent re-implementation inspired by [delphitools](https://delphi.tools/) (Zero-Clause BSD). It shares the product idea and feature scope but uses its own code, design and copy. See `docs/legal/ATTRIBUTION.md`.

## Where things are

| Path | Purpose |
|------|---------|
| `plan.md` | Master plan: decisions, architecture, phases, risks |
| `todo.md` | Working task list by phase |
| `features.md` | Every feature of the original and Omnitool's completion status |
| `AGENTS.md` / `CLAUDE.md` | Rules for AI coding agents |
| `docs/srs/` | Software Requirements Specification |
| `docs/development/` | Setup, conventions, how to add a tool |
| `docs/implementation/` | Technical design and per-phase notes |
| `docs/review/` | Session log: what was done after each session |
| `docs/audit/` | Audit log and checklists; updated after each audit |
| `docs/design/` | Design brief, `DESIGN.md` tokens, Stitch prompts |
| `docs/tooling/` | Toolchain and AI-tool decisions |
| `docs/legal/` | Attribution and licence notes |
| `docs/prompts/` | Planning prompt, **ignition prompt**, session prompts |
| `docs/adr/` | Architecture decision records |
| `apps/web/` | The web app (Vite + React) |
| `packages/` | `tools-registry`, `tool-core`, `ui`, `config` |
| `tests/e2e/` | Playwright tests |

## Getting started

```bash
corepack enable
pnpm install
pnpm dev          # start the web app
pnpm test         # unit tests
pnpm lint && pnpm typecheck
pnpm features:progress
```

## Starting implementation

Open `docs/prompts/02-IGNITION-PROMPT.md` and give it to your coding agent.
