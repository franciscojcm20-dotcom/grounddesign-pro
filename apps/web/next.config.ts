import type { NextConfig } from 'next';

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

export default config;
