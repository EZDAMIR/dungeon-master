import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/types/**', 'src/vision/gestures/types.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
})
