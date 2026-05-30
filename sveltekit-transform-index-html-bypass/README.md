# repro: SvelteKit dev bypasses `DevToolsInjection.transformIndexHtml`

## Summary

`DevTools()` from `@vitejs/devtools` ships an internal `DevToolsInjection` plugin that uses Vite's `transformIndexHtml` hook to inject `<script src=".../client/inject.js">` into the page so the dock can render.

SvelteKit's dev server renders pages through its own SSR pipeline and **does not invoke `transformIndexHtml` for app routes**, so the injection silently no-ops. The dock never appears on any SvelteKit page even when `DevTools()` is registered correctly.

The standalone UI at `/__devtools/` works because that route is served by `DevTools()`'s own middleware and isn't routed through SvelteKit.

## Reproduce

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` in a browser.

### Expected

The Vite DevTools dock appears at the edge of the viewport.

### Actual

The page renders without the dock. View source: the `<script src="/@fs/.../@vitejs/devtools/dist/client/inject.js" type="module">` tag is missing from `<body>`.

```bash
# Confirm via curl — no "inject" string in the HTML
curl -s http://localhost:5173/ | grep -c inject
# → 0
```

For comparison, the standalone UI is reachable:

```bash
curl -sI http://localhost:5173/__devtools/ | head -1
# → HTTP/1.1 200 OK
```

## Stack

- `vite@8.0.14`
- `@vitejs/devtools@0.2.0` (vite 8 still declares its peerOptional as `^0.1.18` — `.npmrc` enables `legacy-peer-deps` to bypass that warning)
- `@sveltejs/kit@2.61.1`
- `@sveltejs/vite-plugin-svelte@7.1.2`
- `svelte@5.55.9`

## Suggested fix direction

`DevToolsInjection` could detect a SvelteKit setup and either:

- emit a virtual module that SvelteKit's bundler picks up, or
- expose the injection as an `auto`-imported entry that SvelteKit's `app.html` template can `%sveltekit.head%` into.

Documenting `import '@vitejs/devtools/client/inject'` as the official SvelteKit setup is also viable but requires fixing the SSR crash documented in the sibling [`sveltekit-inject-window-ssr-crash`](../sveltekit-inject-window-ssr-crash) repro first.
