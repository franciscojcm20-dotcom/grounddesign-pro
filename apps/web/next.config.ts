import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// No se define un valor por defecto para NEXT_PUBLIC_API_URL aquí: si esta
// clave existe (aunque sea con un fallback fijo), Next.js la inyecta siempre
// como literal en el bundle del cliente, y `apiBase.ts` nunca podría distinguir
// "no configurado" de "configurado explícitamente" para aplicar su resolución
// dinámica por hostname (ver apps/web/src/lib/apiBase.ts).
const config: NextConfig = {
  env: {
    ...(process.env.NEXT_PUBLIC_API_URL ? { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL } : {}),
  },
};

// withSentryConfig solo instrumenta el build (source maps, etc.) — sin
// SENTRY_AUTH_TOKEN configurado, omite silenciosamente la subida de source
// maps mediante `silent: true` y el build sigue funcionando igual.
export default withSentryConfig(config, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  webpack: { treeshake: { removeDebugLogging: true } },
});
