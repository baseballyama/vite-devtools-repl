# repro: DevTools UI ships the Vue esm-bundler build without feature-flag defines

## Summary

The DevTools UI is built with Vue 3 and shipped as the esm-bundler entry, which expects the consumer to define `__VUE_OPTIONS_API__`, `__VUE_PROD_DEVTOOLS__`, and `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` as compile-time globals. Because `@vitejs/devtools` is consumed pre-built, those defines are never applied, and Vue prints a warning on every page load:

```
Feature flags __VUE_OPTIONS_API__, __VUE_PROD_DEVTOOLS__, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__ are not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.
```

It's noise rather than a functional bug, but it shows up in every console for every user of the dock.

## Reproduce

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` with the browser console open. The warning appears as soon as the dock script (`@vitejs/devtools/client/inject`) is evaluated.

## Stack

- `vite@8.0.14`
- `@vitejs/devtools@0.2.0`

## Suggested fix

In the package that builds the DevTools UI bundle, set the feature flags during the build instead of leaving them undefined. With Vite this is `define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' }`, or equivalently, switch the entry to the prebuilt `vue.runtime.global.prod.js` if the dock doesn't need the options API path.

That keeps the silence inside the package and avoids forcing every downstream user to set defines in their own Vite config for a dependency they didn't ask for.
