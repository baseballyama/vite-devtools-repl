# repro: SvelteKit dev bypasses `DevToolsInjection.transformIndexHtml`

## TL;DR

`@vitejs/devtools` injects its dock by registering a `transformIndexHtml` hook. SvelteKit's dev server **never invokes `transformIndexHtml`** on any page — its SSR pipeline produces the complete HTML by itself and writes the response directly. The injection silently no-ops, so the dock is invisible on every SvelteKit page. `/__devtools/` still works because that route is served by `@vitejs/devtools`'s own middleware and isn't touched by SvelteKit.

## How the injection is supposed to work

`@vitejs/devtools/dist/index.js` registers `DevToolsInjection`:

```js
// node_modules/@vitejs/devtools/dist/plugins-*.js  (paraphrased)
function DevToolsInjection() {
  return {
    name: 'vite:devtools:injection',
    enforce: 'post',
    apply: (_config, env) => env.command === 'serve' && !env.isSsrBuild,
    transformIndexHtml() {
      return [{
        tag: 'script',
        attrs: {
          src: `/@fs/.../@vitejs/devtools/dist/client/inject.js`,
          type: 'module',
        },
        injectTo: 'body',
      }]
    },
  }
}
```

`transformIndexHtml` is Vite's hook for editing the served HTML — it expects Vite (or a framework integrating Vite) to call `server.transformIndexHtml(url, html, originalUrl)` while serving every page. When the consumer is plain Vite serving `index.html` off disk, this works as designed.

## Why SvelteKit bypasses it

SvelteKit installs its own connect middleware. For every app route the request path is handed off to SvelteKit's SSR runtime, not to Vite's HTML middleware:

```js
// node_modules/@sveltejs/kit/src/exports/vite/dev/index.js  ~L555
const rendered = await server.respond(request, { ...emulator stuff... })

if (rendered.status === 404) {
  serve_static_middleware.handle(req, res, () => {
    void setResponse(res, rendered)
  })
} else {
  void setResponse(res, rendered)
}
```

`server.respond(...)` is SvelteKit's runtime — it reads `src/app.html` directly, substitutes `%sveltekit.head%` / `%sveltekit.body%`, and returns the final HTML as a standard `Response`. `setResponse` writes that body to the wire. There is no `vite.transformIndexHtml` call in this path.

Running `grep -r transformIndexHtml node_modules/@sveltejs/kit/src/` confirms it: SvelteKit's source contains **zero references** to `transformIndexHtml`, in dev or anywhere else.

So the contract `DevToolsInjection` relies on — "Vite will call my `transformIndexHtml` hook before any page is served" — is simply not honored by SvelteKit. The hook is registered, the page is rendered, and the two never meet.

## Reproduce

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` in a browser.

### Expected

The Vite DevTools dock appears at the edge of the viewport.

### Actual

No dock. View source — the `<script src=".../client/inject.js">` tag is missing from `<body>`:

```bash
curl -s http://localhost:5173/ | grep -c inject
# → 0
```

For comparison, the same project's standalone UI works fine — that route is served by `@vitejs/devtools`'s middleware, which SvelteKit doesn't touch:

```bash
curl -sI http://localhost:5173/__devtools/ | head -1
# → HTTP/1.1 200 OK
```

### Why this isn't just a SvelteKit-only concern

Any meta-framework that owns its own dev SSR pipeline runs into the same issue — Nuxt, Astro, Solid Start, Qwik City all render HTML themselves rather than relying on Vite's `index.html` middleware. If they don't explicitly thread `transformIndexHtml` through their renderer, `@vitejs/devtools` (and any other plugin built on the same hook) is invisible. So fixing this is not "support SvelteKit"; it's "make injection-based plugins work in non-SPA Vite consumers."

## Stack

- `vite@8.0.14`
- `@vitejs/devtools@0.2.0` (vite 8 still declares its peerOptional as `^0.1.18` — `.npmrc` enables `legacy-peer-deps` to bypass that warning)
- `@sveltejs/kit@2.61.1`
- `@sveltejs/vite-plugin-svelte@7.1.2`
- `svelte@5.55.9`

## Fix directions

A few options ordered by how invasive they are:

1. **Document a `+layout.svelte` import as the official SvelteKit setup.** Requires fixing the sibling [`sveltekit-inject-window-ssr-crash`](../sveltekit-inject-window-ssr-crash) bug first (the obvious workaround crashes SSR). Minimal change for `@vitejs/devtools`, but pushes the integration cost onto every SvelteKit user.

2. **Expose `client/inject` as an auto-imported entry that any meta-framework can include from its head template.** SvelteKit users would add a single line to `app.html`; Nuxt / Astro users get a similarly small change. Still requires the SSR safety fix.

3. **Replace `transformIndexHtml` injection with a regular Vite virtual module + `index` injection in `transform`.** The injection script becomes an import in the user's module graph — the same bundler path SvelteKit / Nuxt / Astro already use, so they pick it up for free. Heaviest change in `@vitejs/devtools`, but it eliminates the integration gap permanently.

(3) is the only one that makes plugins like this just work across the Vite ecosystem without per-framework documentation. (1) is what would unblock SvelteKit users today.
