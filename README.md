# vite-devtools-repl

Minimal reproductions for upstream issues to file against [`vitejs/devtools`](https://github.com/vitejs/devtools), derived from [`baseballyama/vite-devtools-svelte#51`](https://github.com/baseballyama/vite-devtools-svelte/issues/51).

Each directory is **self-contained** — no workspace, no shared lockfile. Just `cd` in, `npm install`, `npm run dev`.

| Folder | Upstream concern |
|---|---|
| [`sveltekit-transform-index-html-bypass`](./sveltekit-transform-index-html-bypass) | SvelteKit dev never runs Vite's `transformIndexHtml`, so `DevToolsInjection` silently no-ops and the dock never appears on the page. |
| [`sveltekit-inject-window-ssr-crash`](./sveltekit-inject-window-ssr-crash) | `@vitejs/devtools/client/inject` reads `window` at top level, so the documented workaround (importing it from `+layout.svelte`) crashes SvelteKit's SSR with `ReferenceError: window is not defined`. |
| [`strict-csp-iconify`](./strict-csp-iconify) | DevTools UI fetches icons from `api.iconify.design` at runtime, blocked by any strict CSP. |
| [`vue-feature-flags-warning`](./vue-feature-flags-warning) | DevTools UI ships the Vue esm-bundler build without defining `__VUE_OPTIONS_API__` / `__VUE_PROD_DEVTOOLS__` / `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`, producing a console warning on every load. |

All repros were captured against `@vitejs/devtools@0.2.0` on macOS.
