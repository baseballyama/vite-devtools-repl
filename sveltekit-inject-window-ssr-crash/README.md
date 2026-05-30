# repro: `@vitejs/devtools/client/inject` crashes SvelteKit SSR

## Summary

`@vitejs/devtools/client/inject` reads `window` at the top level of the module:

```js
// dist/client/inject.js, last line
if (window.parent !== window) console.log("[VITE DEVTOOLS] Skipping in iframe");
```

There's no `typeof window !== 'undefined'` guard, so importing this module from any environment that evaluates modules on the server crashes immediately. This blocks the only known workaround for the [`sveltekit-transform-index-html-bypass`](../sveltekit-transform-index-html-bypass) issue, since SvelteKit users have to import this from `+layout.svelte` to get the dock — and `+layout.svelte` is evaluated during SSR.

## Reproduce

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

### Expected

The page renders. (And, post-bypass-fix, the dock appears.)

### Actual

The dev server logs an uncaught error and the page returns 500:

```
ReferenceError: window is not defined
    at file:///.../node_modules/@vitejs/devtools/dist/client/inject.js:387:1
    at ModuleJob.run (node:internal/modules/esm/module_job:...)
    at async SSRCompatModuleRunner.directRequest (.../vite/dist/node/module-runner.js:...)
```

Captured from a run in this repro on `vite@8.0.14` + `@vitejs/devtools@0.2.0`.

## Stack

- `vite@8.0.14`
- `@vitejs/devtools@0.2.0`
- `@sveltejs/kit@2.61.1`
- `svelte@5.55.9`

## Suggested fix

Either:

1. Guard the top-level `window` access — `if (typeof window === 'undefined') { /* noop */ } else { ... }` — so the module is at least a noop under SSR. This is the minimum needed for the SvelteKit workaround to be usable.
2. Split the module into a side-effect-free entry that registers itself when called and only touches `window` from inside that function. Then users can call it from an `onMount` or a `browser`-guarded import.

(1) is the smallest change and is enough to unblock the SvelteKit integration story.
