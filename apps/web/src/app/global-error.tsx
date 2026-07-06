'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// A diferencia de error.tsx (que no puede capturar errores del propio
// root layout), global-error.tsx reemplaza el <html>/<body> completo cuando
// falla el layout raíz — es el único límite de error que cubre ese caso.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        background: '#0f1117', color: '#e2e8f0', textAlign: 'center', padding: 40,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>⚠</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Error crítico</div>
        <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 380 }}>
          Ocurrió un problema grave al cargar la aplicación. Intenta recargar la página.
        </div>
      </body>
    </html>
  );
}
