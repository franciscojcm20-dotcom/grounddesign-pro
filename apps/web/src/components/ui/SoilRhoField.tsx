'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSoilModel } from '@/context/SoilModelContext';
import { effectiveResistivityForDepth } from '@gdp/engines-math';
import { inputStyle } from './CalcShared';

interface SoilRhoFieldProps {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  autoFill?: boolean;
  /**
   * Profundidad de penetración real del electrodo de este módulo (profundidad
   * de enterramiento de la malla, o longitud de la pica) — cuando se entrega,
   * la ρ sugerida se pondera por profundidad real (effectiveResistivityForDepth)
   * en vez de la media geométrica ciega √(ρ1·ρ2). Opcional y retrocompatible:
   * sin este prop, el comportamiento es idéntico al anterior.
   */
  depth?: number;
}

/** Campo de resistividad de suelo que se puede llenar automáticamente desde el modelo de suelo activo (Mediciones de Campo). */
export function SoilRhoField({ value, onChange, label = 'Resistividad del suelo ρ', autoFill = true, depth }: SoilRhoFieldProps) {
  const { model } = useSoilModel();
  const appliedOnce = useRef(false);

  const suggested = model
    ? (depth !== undefined ? effectiveResistivityForDepth(model, depth) : model.rhoUniform)
    : null;

  useEffect(() => {
    if (autoFill && model && suggested !== null && !appliedOnce.current) {
      appliedOnce.current = true;
      onChange(Math.round(suggested));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--faint)' }}>Ω·m</span>
      </div>
      <input style={inputStyle} type="number" value={value} onChange={e => onChange(Number(e.target.value))} />
      {model && suggested !== null ? (
        <button
          type="button"
          onClick={() => onChange(Math.round(suggested))}
          title={`ρ1=${model.rho1.toFixed(0)} · ρ2=${model.rho2.toFixed(0)} · h≈${model.h}m${depth !== undefined ? ` · profundidad electrodo=${depth}m` : ''}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, width: '100%', marginTop: 4,
            background: 'var(--copper-soft)', border: '1px solid var(--copper-soft)', borderRadius: 3,
            padding: '3px 6px', cursor: 'pointer', fontSize: 8.5, color: 'var(--copper)', fontFamily: 'var(--font-mono)',
            textAlign: 'left',
          }}
        >
          🌐 Modelo activo ({model.source === 'schlumberger' ? 'Schlumberger' : 'Wenner'}){depth !== undefined ? ' · ajustada por profundidad' : ''}: {suggested.toFixed(0)} Ω·m
        </button>
      ) : (
        <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 4, lineHeight: 1.4 }}>
          Sin modelo de suelo activo —{' '}
          <Link href="/soil/field" style={{ color: 'var(--copper)' }}>calcúlalo en Mediciones de Campo</Link>.
        </div>
      )}
    </div>
  );
}
