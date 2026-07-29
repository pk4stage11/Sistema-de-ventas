import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Los webhooks de Meta y el drenador de la cola necesitan runtime Node
  // (verificación de firma HMAC sobre el body crudo, librerías nativas).
  // Cada ruta lo declara con `export const runtime = 'nodejs'`.
  // Nota: a partir de Next 16, el build ya no ejecuta ESLint por su cuenta
  // (se eliminó la opción `eslint.ignoreDuringBuilds`); el lint corre como
  // paso propio en CI (ver .github/workflows/ci.yml).
  turbopack: {
    // Fija la raíz explícitamente: hay un package-lock.json fuera de esta
    // carpeta (en el perfil de Windows del usuario) que Next detecta como
    // posible workspace y podría elegir mal la raíz en otro entorno.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
