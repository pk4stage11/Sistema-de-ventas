import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Dos proyectos de test:
 *  - `unit`: rápidos, sin red, corren en cada `npm run test` y en CI.
 *  - `db`: pegan al proyecto Supabase Cloud de desarrollo (RLS, concurrencia).
 *    Se corren aparte con `npm run test:db` porque son más lentos y requieren
 *    credenciales; no deben bloquear la iteración normal.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'lib/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          },
        },
        test: {
          name: 'db',
          environment: 'node',
          include: ['tests/db/**/*.test.ts'],
          setupFiles: ['./tests/db/setup.ts'],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
