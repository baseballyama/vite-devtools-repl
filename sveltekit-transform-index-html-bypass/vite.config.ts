import { sveltekit } from '@sveltejs/kit/vite'
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [DevTools(), sveltekit()],
})
