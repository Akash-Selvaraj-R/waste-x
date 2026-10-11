import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': root.replace(/\\$/, '') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
