'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: 'var(--bg)', textAlign: 'center', padding: 40,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 40, color: 'var(--danger)', fontWeight: 900, lineHeight: 1 }}>
        ⚠
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        Error inesperado
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim)', maxWidth: 380, lineHeight: 1.6 }}>
        Ocurrió un problema al cargar esta página. Puedes intentar de nuevo o volver al inicio.
      </div>
      {error.digest && (
        <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          Código: {error.digest}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={reset} style={{
          padding: '9px 20px', background: 'var(--copper)', color: '#fff',
          borderRadius: 3, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
        }}>
          Reintentar
        </button>
        <Link href="/" style={{
          padding: '9px 20px', background: 'transparent', color: 'var(--dim)',
          border: '1px solid var(--line)', borderRadius: 3, textDecoration: 'none', fontSize: 12,
        }}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
