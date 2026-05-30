<script lang="ts">
  // The documented workaround for the transformIndexHtml bypass:
  // import the inject script from the SvelteKit module graph.
  // No `browser` guard — the issue is that this module touches
  // `window` at top level and crashes SSR before any guard can
  // help, unless the user happens to know to add one.
  import '@vitejs/devtools/client/inject'

  let { children } = $props()
</script>

{@render children()}
