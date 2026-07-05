'use client';
import { useState, useEffect, useCallback } from 'react';
import { SectionLabel, StatCard, ExpertItem, Th, TdMono } from './CalcShared';
import type { GelParams } from '@/lib/api';
import { API_BASE as BASE } from '@/lib/apiBase';

const DEFAULTS: Omit<GelParams, 'activo'> = {
  rhoGel: 0.3, radioVarilla: 0.0079, radioConGel: 0.075, longVarillaGel: 3,
};

interface GelResult {
  Rsin: number; Rfunda: number; Rsuelo: number; Rtotal: number;
  rhoEff: number; mejoraPct: number; rhoSuelo: number; norm: string;
}

function GelCrossSection({ radioVarilla, radioConGel, longVarilla }: {
  radioVarilla: number; radioConGel: number; longVarilla: number;
}) {
  const W = 320, H = 130;
  const cx = 80, cy = H / 2;
  const scale = Math.min(55 / radioConGel, 900);
  const rOuter = Math.max(radioConGel * scale, 24);
  const rInner = Math.max(radioVarilla * scale, 3);
  const px = 210, py1 = 26, py2 = H - 16;
  const scaleV = (py2 - py1) / Math.max(longVarilla, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <text x={cx} y={14} textAnchor="middle" fontSize={7.5} fill="var(--faint)" fontFamily="var(--font-mono)">Corte transversal</text>
      <circle cx={cx} cy={cy} r={rOuter} fill="var(--safe-soft)" stroke="var(--safe)" strokeWidth="1.2" strokeDasharray="4 2" />
      <circle cx={cx} cy={cy} r={rInner} fill="var(--copper)" stroke="var(--bg)" strokeWidth="1" />
      <text x={cx + rOuter / 2} y={cy - 4} textAnchor="middle" fontSize={6.5} fill="var(--safe)">r₂={radioConGel.toFixed(3)}m</text>
      <text x={cx + rInner + 4} y={cy + 16} fontSize={6.5} fill="var(--copper)">r₁={radioVarilla.toFixed(4)}m</text>

      <text x={px + 20} y={14} textAnchor="middle" fontSize={7.5} fill="var(--faint)" fontFamily="var(--font-mono)">Perfil vertical</text>
      <line x1={px} y1={py1 - 6} x2={px + 55} y2={py1 - 6} stroke="var(--dim)" strokeWidth="1" strokeDasharray="3 2" opacity={0.6} />
      <rect x={px + 16} y={py1} width={8} height={longVarilla * scaleV} fill="var(--safe-soft)" stroke="var(--safe)" strokeWidth="1" strokeDasharray="3 2" />
      <rect x={px + 18.5} y={py1} width={3} height={longVarilla * scaleV} fill="var(--copper)" />
      <text x={px + 32} y={py1 + longVarilla * scaleV / 2} fontSize={6.5} fill="var(--faint)">L={longVarilla}m</text>
    </svg>
  );
}

/** Panel embebible de aditivo gel químico — disponible dentro de cada diseño de malla. */
export function GelPanel({ rhoSuelo, onChange }: { rhoSuelo: number; onChange: (gel: GelParams | null) => void }) {
  const [activo, setActivo] = useState(false);
  const [params, setParams] = useState(DEFAULTS);
  const [result, setResult] = useState<GelResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchPreview = useCallback(async (p: typeof DEFAULTS, rho: number) => {
    try {
      const res = await fetch(`${BASE}/api/v1/grid/gel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, rhoSuelo: rho }),
      });
      if (res.ok) setResult(await res.json() as GelResult);
    } catch { /* silencioso — el toggle sigue funcionando aunque falle la vista previa */ }
  }, []);

  useEffect(() => {
    if (activo && rhoSuelo > 0) fetchPreview(params, rhoSuelo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, params, rhoSuelo]);

  function toggle() {
    const next = !activo;
    setActivo(next);
    onChange(next ? { ...params, activo: true } : null);
  }

  function update(k: keyof typeof DEFAULTS, v: number) {
    const next = { ...params, [k]: v };
    setParams(next);
    if (activo) onChange({ ...next, activo: true });
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <SectionLabel purple>Mejora — aditivo gel químico</SectionLabel>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--dim)', marginBottom: activo ? 8 : 0, cursor: 'pointer' }}>
        <input type="checkbox" checked={activo} onChange={toggle} style={{ accentColor: 'var(--copper)' }} />
        Aplicar funda de gel químico (Dwight/Sunde) a este diseño
      </label>
      {activo && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--panel3)', border: '1px solid var(--line)', borderRadius: 4, padding: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>ρgel (Ω·m)</div>
              <input type="number" step="0.1" value={params.rhoGel} onChange={e => update('rhoGel', Number(e.target.value))}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 6px', borderRadius: 3 }} />
            </div>
            <div>
              <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>Radio con gel (m)</div>
              <input type="number" step="0.005" value={params.radioConGel} onChange={e => update('radioConGel', Number(e.target.value))}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 6px', borderRadius: 3 }} />
            </div>
            <div>
              <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>Radio varilla (m)</div>
              <input type="number" step="0.001" value={params.radioVarilla} onChange={e => update('radioVarilla', Number(e.target.value))}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 6px', borderRadius: 3 }} />
            </div>
            <div>
              <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>Long. tratada (m)</div>
              <input type="number" step="0.5" value={params.longVarillaGel} onChange={e => update('longVarillaGel', Number(e.target.value))}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 6px', borderRadius: 3 }} />
            </div>
          </div>

          {result && (
            <div style={{ background: 'var(--panel3)', border: '1px solid var(--line)', borderRadius: 4, padding: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <StatCard label="R sin gel" value={result.Rsin.toFixed(2)} unit="Ω" />
                <StatCard label="R con gel" value={result.Rtotal.toFixed(2)} unit="Ω" primary />
                <StatCard label="Mejora" value={result.mejoraPct.toFixed(1)} unit="%" ok={result.mejoraPct > 0} />
              </div>

              {result.mejoraPct < 20 && (
                <ExpertItem type="warn">
                  Mejora menor al 20%. Considerar aumentar el radio de la funda o reducir ρgel — relación radioConGel/radioVarilla = {(params.radioConGel / params.radioVarilla).toFixed(0)}× (típico efectivo: 5×–20×).
                </ExpertItem>
              )}

              <button
                type="button" onClick={() => setExpanded(v => !v)}
                style={{ fontSize: 8.5, color: 'var(--copper)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
              >
                {expanded ? '▴ ocultar detalle del electrodo' : '▾ ver diagrama y desglose completo'}
              </button>

              {expanded && (
                <>
                  <GelCrossSection radioVarilla={params.radioVarilla} radioConGel={params.radioConGel} longVarilla={params.longVarillaGel} />
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
                    <thead><tr><Th>Componente</Th><Th>Valor (Ω)</Th><Th>%</Th></tr></thead>
                    <tbody>
                      {[
                        { label: 'R funda de gel', val: result.Rfunda, pct: result.Rfunda / result.Rtotal * 100 },
                        { label: 'R suelo exterior', val: result.Rsuelo, pct: result.Rsuelo / result.Rtotal * 100 },
                        { label: 'R total con gel', val: result.Rtotal, pct: 100 },
                      ].map(row => (
                        <tr key={row.label}>
                          <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--line)', fontSize: 9, color: 'var(--dim)' }}>{row.label}</td>
                          <TdMono highlight={row.label.includes('total')}>{row.val.toFixed(3)}</TdMono>
                          <TdMono>{row.pct.toFixed(1)}%</TdMono>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
