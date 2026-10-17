# 0001. Stack and package manager

Date: 2026-10-17 · Status: proposed (awaiting DEC-01)

## Context
Need a static, offline-capable SPA with ~97 isolated tools, shadcn/ui as the component base, and a monorepo separating pure logic from UI.

## Decision
pnpm workspaces; Vite + React 19 + TypeScript strict; Tailwind v4; shadcn/ui; TanStack Router (ADR 0002); Biome; Vitest/Playwright. Full table in `plan.md` section 2 (decision log v2).

## Consequences
Good: strict deps, fast builds, testable logic, code ownership of UI. Bad: differs from the original's Ember stack, so nothing ports directly (intended: fresh implementation). Risk: tool versions move; mitigated by pinning at ignition.

## Alternatives considered
npm (simpler, looser), bun (fast, less proven in monorepo CI), Next.js (server features unused), Ember (original stack, incompatible with shadcn).
