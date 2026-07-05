'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';

interface FaultCurrentFieldProps {
  /** Se invoca cada vez que cambia la corriente de diseño oficial, para sincronizarla al formulario del módulo. */
  onSync: (Ig: number) => void;
  label?: string;
}

/**
 * Campo de corriente de diseño (Ig) — de solo lectura, bloqueado.
 *
 * Ig es el parámetro maestro del proyecto, determinado y validado por el
 * Motor de Análisis de Falla (regla fundamental: ningún módulo de diseño
 * puede definir su propia corriente de falla). Este componente reemplaza el
 * antiguo campo numérico editable de "corriente de falla" en cada módulo.
 */
export function FaultCurrentField({ onSync, label = 'Corriente de diseño Ig' }: FaultCurrentFieldProps) {
  const { result } = useFaultAnalysis();
  const lastSynced = useRef<number | null>(null);

  useEffect(() => {
    if (result && lastSynced.current !== result.Ig) {
      lastSynced.current = result.Ig;
      onSync(result.Ig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.Ig]);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--faint)' }}>A</span>
      </div>
      {result ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'var(--bg)', border: '1px solid var(--copper-soft)', borderRadius: 3,
          padding: '7px 9px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--copper)', fontWeight: 700 }}>
            {result.Ig.toFixed(0)} A
          </span>
          <Link href="/fault-analysis" style={{ fontSize: 8.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            🔒 editar
          </Link>
        </div>
      ) : (
        <div style={{
          fontSize: 8.5, color: 'var(--danger)', background: 'var(--danger-soft)',
          border: '1px solid var(--danger)', borderRadius: 3, padding: '7px 9px', lineHeight: 1.5,
        }}>
          ⚠ Debes ejecutar primero el{' '}
          <Link href="/fault-analysis" style={{ color: 'var(--danger)', fontWeight: 700 }}>Motor de Análisis de Falla</Link>{' '}
          para obtener la corriente de diseño oficial del proyecto.
        </div>
      )}
    </div>
  );
}
