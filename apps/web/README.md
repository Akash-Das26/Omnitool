# @omnitool/web

Vite + React shell and tool UIs, implemented in Phase 1.

```
src/
  app/        router and route metadata
  shell/      header, rail, footer, omnibox mount, update prompt
  pages/      home index, privacy, acknowledgements, 404, tool error
  tools/<id>/ one lazy module per tool (index.tsx default export)
  components/ FileIntake, tool frame, glyphs, shadcn primitives
  lib/        navigation, search params, download, workers, PWA, stores
  styles/     Tailwind entry and token/font imports
public/       theme bootstrap, _headers, _redirects, brand placeholder notes
```

Build with `pnpm --filter @omnitool/web build`; the postbuild script writes
per-route HTML. Preview with `pnpm preview`.
