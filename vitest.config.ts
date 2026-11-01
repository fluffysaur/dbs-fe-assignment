import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    // Mock responses take ~500 ms each; a full transfer makes several.
    testTimeout: 15_000,
    // Same results on every machine and in CI, whatever the local timezone.
    env: { TZ: 'Asia/Singapore' },
  },
})
