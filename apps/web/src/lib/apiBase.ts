/**
 * Base URL del API, resuelta con el mismo hostname que la página actual.
 *
 * Si el frontend se sirve en 127.0.0.1:3000 pero el API se llama por defecto
 * en localhost:3001 (u otra combinación mixta), el navegador los trata como
 * sitios distintos (localhost ≠ 127.0.0.1), y la cookie de sesión
 * (SameSite=Lax) deja de reenviarse en las peticiones fetch entre sitios
 * distintos — el login "funciona" pero toda llamada autenticada posterior
 * (auth/me, proyectos, guardar cálculo) responde 401. Al igualar el hostname
 * dinámicamente, frontend y API quedan siempre en el mismo sitio.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://127.0.0.1:3001');
