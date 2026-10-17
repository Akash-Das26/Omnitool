# 0002. Routing and URL state

Date: 2026-10-17 · Status: proposed (awaiting DEC-01)

## Context
~97 lazy tool routes generated from a registry. Needs: shareable tool state in the URL (`?color=`, workflow links), validated and typed; fast navigation to heavy tools.

## Decision
TanStack Router in SPA mode with `defaultPreload: 'intent'`. Routes are generated in code from the registry (one `/tools/$toolId` route plus fixed routes), not 97 route files. Cross-cutting search params (`color`, handoff run id) are typed and validated with Valibot in `validateSearch`. Tool-specific params are parsed by a schema each tool exports. Zustand is for UI state only. `nuqs` is not used.

## Consequences
Good: hover/focus preload, one URL-state mechanism, validated input (URL is untrusted). Bad: tool-specific params are validated at tool level rather than statically typed at the router level; TanStack Router is a younger, smaller ecosystem than React Router. URLs carry configuration only, never file data.
Risk: R-11. Routing is wrapped in `lib/navigation` so a swap is contained.

## Alternatives considered
React Router (mature; no built-in hover preload in SPA mode, weaker search-param typing). nuqs on top of either router (nuqs documents TanStack support as experimental and recommends the router's own search-param APIs; two mechanisms for one job).
