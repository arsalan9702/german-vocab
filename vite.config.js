import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  base: './',
  plugins: [svelte()],
  // Safari otherwise caches index.html by guesswork and keeps running an old build on the phone.
  server: { headers: { 'Cache-Control': 'no-store' } },
  preview: { headers: { 'Cache-Control': 'no-store' } },
})