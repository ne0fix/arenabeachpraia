import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    // Imports pesados (SDK do Mercado Pago, etc.) podem levar mais que o padrão
    // de 5s no primeiro carregamento, sobretudo no build da Vercel. Evita falsos
    // negativos por timeout que bloqueariam o deploy.
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/__tests__/security/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/app/api/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
})
