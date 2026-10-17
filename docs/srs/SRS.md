# Software Requirements Specification — Omnitool

Version 0.1 · 2026-10-17 · Status: draft for human approval
Structure follows IEEE 830 / ISO 29148 in spirit.

## 1. Introduction

### 1.1 Purpose
Define what Omnitool must do and the qualities it must have, so implementation, testing and audits have a shared reference.

### 1.2 Scope
Omnitool is a static web application offering ~97 small tools and two larger editors that run entirely client-side. It has no backend, no user accounts and no data collection. Feature scope mirrors the original delphitools as catalogued in `features.md`; implementation, visuals and copy are original.

### 1.3 Definitions
- **Tool**: a self-contained feature reachable at `/tools/<id>`.
- **Tier**: T1 pure logic, T2 canvas/PDF/moderate, T3 heavy (WASM, ML, media, editor).
- **Handoff**: passing a result from one tool to another without manual download/upload.
- **Workflow**: an ordered chain of up to three tools with handoff between steps.
- **Atlas**: a single-page overview of one colour, image, audio or video file.

### 1.4 References
`plan.md`, `features.md`, `docs/design/DESIGN-BRIEF.md`, `docs/legal/ATTRIBUTION.md`, WCAG 2.2.

## 2. Overall description

### 2.1 Product perspective
Standalone static site. Optional hosting on any static host with custom response headers. No external service is required at runtime except optional first-use downloads of large models/WASM from a declared CDN allow-list.

### 2.2 Users
Designers, illustrators, video editors, front-end developers, students; mixed technical skill; desktop primary, mobile supported.

### 2.3 Constraints
Browser-only APIs; memory limits (esp. iOS Safari); no server processing; licence compatibility of dependencies; no reuse of the original's artwork or copy.

### 2.4 Assumptions
Modern evergreen browsers (latest two versions of Chrome, Edge, Firefox, Safari incl. iOS Safari). Users accept a one-time download for ML/WASM features. (Proposed; confirm.)

## 3. Functional requirements

Priority: **M** must, **S** should, **C** could.

### 3.1 Platform
| ID | Requirement | Pri | Phase |
|----|-------------|-----|-------|
| FR-001 | Provide an app shell with header, category navigation and content area, responsive from 320 px | M | P1 |
| FR-002 | Provide a single typed registry that drives navigation, home grid, search and routing | M | P1 |
| FR-003 | Each tool is available at `/tools/<id>` and is code-split | M | P1 |
| FR-004 | Provide a command/search palette (Cmd/Ctrl+K) searching tool names, categories and accepted file types | M | P1 |
| FR-005 | Provide light and dark themes, following system by default, user override persisted, no flash on load | M | P1 |
| FR-006 | Provide 404 and privacy pages | M | P1 |
| FR-007 | After first load the app and all non-model tools work offline | M | P1 |
| FR-008 | Each route has a prerendered title/description for SEO and sharing | S | P1 |
| FR-009 | Provide consistent file intake (picker, drag and drop, paste) and download behaviour | M | P1 |
| FR-010 | Colour tools read a global colour-notation preference and accept `?color=` | M | P3 |
| FR-011 | A tool can send its output to any tool whose `accepts` matches | S | P7 |
| FR-012 | Users can build a workflow of up to three compatible tools and share it as a link | S | P7 |
| FR-013 | Provide atlas pages for colour, image, audio and video | S | P7 |
| FR-014 | Editors provide undo/redo with at least 100 steps | M | P8 |
| FR-015 | A tool\'s shareable configuration is encoded in validated URL search params; URLs never contain file data; invalid params fall back to defaults | S | P1 |
| FR-016 | Navigating toward a tool (hover/focus) preloads its code | S | P1 |

### 3.2 Tools (generic, apply to every tool)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-100 | Each tool achieves the outcome described in its `features.md` row without requiring an account or network | M |
| FR-101 | Inputs are validated; errors state what failed and how to fix it | M |
| FR-102 | Work on large inputs runs in a Web Worker with progress and cancel | M (T2/T3) |
| FR-103 | Outputs can be copied or downloaded with a sensible filename | M |
| FR-104 | Tool state that is cheap to lose is not persisted; user files are never persisted without explicit action | M |
| FR-105 | Unsupported browser features are detected and explained, not left to fail | M |

### 3.3 Editors (image editor, PDF editor)
Specific editor requirements are written at P8 start in `docs/srs/editors.md` (layers, masks, text, crop, filters for images; annotate, redact, forms, sign, page operations for PDF).

## 4. Non-functional requirements

| ID | Category | Requirement | Verification |
|----|----------|-------------|--------------|
| NFR-001 | Privacy | Zero analytics or third-party requests during normal use; only declared CDN fetches for models/WASM, each user-visible | Network trace in E2E; audit |
| NFR-002 | Performance | Home: Lighthouse performance ≥ 90 on mobile profile; shell JS ≤ 200 kB gzip excluding tools | CI budget |
| NFR-003 | Performance | Tool code loads only when opened; no tool bundle in the shell | Bundle analysis |
| NFR-004 | Accessibility | WCAG 2.2 AA; full keyboard operation; screen-reader labels; reduced-motion respected | axe in CI + manual audit |
| NFR-005 | Reliability | No tool crashes the app; an error boundary isolates each tool | Unit/E2E |
| NFR-006 | Compatibility | Latest two versions of Chrome, Edge, Firefox, Safari (desktop and iOS); gaps documented per tool | Support matrix |
| NFR-007 | Security | Strict CSP; no `eval`; user files parsed defensively; dependencies audited; no secrets in repo | Audit |
| NFR-008 | Maintainability | TypeScript strict; tool-core coverage ≥ 90% lines; registry-driven; ADRs for major choices | CI |
| NFR-009 | Licensing | Every dependency and asset has a recorded compatible licence; no copied artwork or copy | Audit |
| NFR-010 | Internationalisation | UI copy in en-GB; strings centralised to allow translation later | Review |
| NFR-011 | Portability | Output is static files deployable to any static host; no file over 20 MiB in the build; <= 20,000 files | CI check |
| NFR-012 | Offline budget | Precached assets (shell + all tool chunks) within a budget set at P1 and re-checked each phase; each precached file < 2 MiB | CI check |

## 5. External interfaces
- **User interface:** per `docs/design/DESIGN-BRIEF.md` and `DESIGN.md`.
- **Browser APIs:** Canvas, Web Workers, IndexedDB, File System Access (progressive), WebCodecs, Web Audio, MediaRecorder, getDisplayMedia, Clipboard, Service Worker.
- **Network:** CDN allow-list for models/WASM defined in `docs/implementation/IMPLEMENTATION.md`; user-initiated fetch in Request Builder only.

## 6. Data requirements
Preferences (theme, colour notation) in `localStorage`. Workflow handoff files in IndexedDB, cleared on completion or by the user. No server-side data.

## 7. Verification matrix
Each FR/NFR maps to: unit test (tool-core), component test, Playwright E2E, axe scan, bundle budget, or audit checklist item in `docs/audit/CHECKLISTS.md`. A requirement is not "done" until its verification exists.

## 8. Open items
Editor-level requirements (P8); browser support floor confirmation; CDN allow-list; offline size budget for ML/WASM.
