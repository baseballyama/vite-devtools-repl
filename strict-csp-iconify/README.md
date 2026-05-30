# repro: DevTools dock fetches `api.iconify.design` icons at runtime

## Summary

The DevTools dock UI uses an `IconifyIcon` component that fetches SVGs from `https://api.iconify.design` at runtime. Any app that ships a strict CSP must add `api.iconify.design` to `connect-src`, even though it is purely an internal implementation detail of DevTools.

This makes the dock unusable in apps with locked-down CSP without weakening the policy specifically for a dev tool.

> The original issue ([baseballyama/vite-devtools-svelte#51](https://github.com/baseballyama/vite-devtools-svelte/issues/51)) also reported a CSP violation for `unocss.dev/logo.svg`. Searching the bundled output of `@vitejs/devtools@0.2.0` (`grep -roh 'unocss\.dev[^"\']*' dist/`) returns nothing, so that one appears to have been removed since the report (`0.1.24`). This repro covers only the iconify case.

## Reproduce

### Path A — static evidence (no UI interaction needed)

The fetch URL is hardcoded in the shipped `dist/iconify-*.js`:

```bash
npm install
grep -roh 'iconify\.design[^"\\]*' node_modules/@vitejs/devtools/dist/ | head -1
# → iconify.design/${collection}/${icon}.svg?color=currentColor&width=100%
```

Source of the fetch (paraphrased from the same file):

```js
fetch(`https://api.iconify.design/${collection}/${icon}.svg?color=currentColor&width=100%`)
  .then(e => e.text())
```

So any time the dock renders a non-builtin / non-`data:` icon — which is every panel icon — a runtime cross-origin request fires.

### Path B — observe the CSP violation in a browser

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` with browser DevTools open, then **authorize** the dock when the terminal prints the permission prompt (open the printed `Manual Auth URL`). Once authorized, the dock loads its panel list and the iconify fetches begin.

The page carries this CSP via `<meta http-equiv>`:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
connect-src 'self' ws://localhost:* http://localhost:*;
img-src 'self' data:;
font-src 'self' data:
```

`api.iconify.design` is intentionally not in `connect-src`. The console will report:

```
Refused to connect to 'https://api.iconify.design/...' because it violates the Content Security Policy directive "connect-src ..."
```

(Without authorization, the dock stops at an "Unauthorized" button and never renders panel icons, so the violation does not fire. The static evidence in Path A is what actually proves the bug.)

## Stack

- `vite@8.0.14`
- `@vitejs/devtools@0.2.0`

## Suggested fix direction

Bundle the icon set the dock uses (via `@iconify-json/*` consumed at build time) so the icons are part of the dock's asset graph. No runtime third-party request, no CSP exception needed.

If runtime fetching is required for some extensibility reason, document the necessary CSP origins so users can pre-approve them in their own policy.
