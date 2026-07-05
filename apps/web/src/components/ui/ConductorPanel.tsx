'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, type ConductorResult, type ConductorEntry } from '@/lib/api';
import { SectionLabel, ExpertItem, Th, TdMono } from './CalcShared';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { applyMinConductorSection } from '@gdp/engines-math';

function mm2ToDiamMm(mm2: number): number {
  return Math.sqrt((4 * mm2) / Math.PI);
}

/** Panel embebible de dimensionamiento de conductor IEEE 80 (Onderdonk) — disponible dentro de cada diseño de malla. */
export function ConductorPanel({ iFalla, tFalla, onChange }: {
  iFalla: number; tFalla: number; onChange: (diamMm: number, calibre: string) => void;
}) {
  const { profile } = useNormativeProfile();
  const [tempAmbiente, setTempAmbiente] = useState(40);
  const [tempMaxFusion, setTempMaxFusion] = useState(450);
  const [result, setResult] = useState<ConductorResult | null>(null);
  const [bumpedByNorm, setBumpedByNorm] = useState(false);
  const [table, setTable] = useState<ConductorEntry[]>([]);
  const [manual, setManual] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const calculate = useCallback(async (calibreSeleccionado?: string) => {
    if (iFalla <= 0 || tFalla <= 0) return;
    setLoading(true);
    try {
      const [rawRes, tbl] = await Promise.all([
        api.conductor.size({ iFalla, tFalla, tempAmbiente, tempMaxFusion, calibreSeleccionado }),
        table.length ? Promise.resolve({ table }) : api.conductor.table(),
      ]);
      // El mínimo normativo de sección (mecánico/corrosión) es independiente del
      // dimensionamiento térmico de Onderdonk — solo se aplica cuando el usuario
      // no fijó manualmente un calibre (respeta su elección explícita).
      const res = calibreSeleccionado ? rawRes : applyMinConductorSection(rawRes, profile.minConductorMm2);
      setBumpedByNorm(!calibreSeleccionado && res.seleccionado.calibre !== rawRes.seleccionado.calibre);
      setResult(res);
      if (!table.length) setTable(tbl.table);
      onChange(mm2ToDiamMm(res.seleccionado.mm2), res.seleccionado.calibre);
    } catch { /* si falla, se mantiene el último resultado */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iFalla, tFalla, tempAmbiente, tempMaxFusion, profile.minConductorMm2]);

  useEffect(() => { calculate(manual || undefined); }, [iFalla, tFalla]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ marginBottom: 14 }}>
      <SectionLabel>Conductor IEEE 80 (Onderdonk)</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>T° ambiente (°C)</div>
          <input type="number" value={tempAmbiente} onChange={e => setTempAmbiente(Number(e.target.value))}
            onBlur={() => calculate(manual || undefined)}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 6px', borderRadius: 3 }} />
        </div>
        <div>
          <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>T° fusión (°C)</div>
          <input type="number" value={tempMaxFusion} onChange={e => setTempMaxFusion(Number(e.target.value))}
            onBlur={() => calculate(manual || undefined)}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 6px', borderRadius: 3 }} />
        </div>
      </div>

      {loading && <div style={{ fontSize: 9, color: 'var(--faint)' }}>Calculando calibre…</div>}

      {result && (
        <div style={{ background: 'var(--panel3)', border: '1px solid var(--line)', borderRadius: 4, padding: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginBottom: 6 }}>
            <span style={{ color: 'var(--faint)' }}>Área mínima requerida</span>
            <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{result.areaMm2.toFixed(1)} mm²</span>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 2 }}>Calibre (sugerido: {result.sugerido.calibre})</div>
            <select
              value={result.seleccionado.calibre}
              onChange={e => { setManual(e.target.value); calculate(e.target.value); }}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--copper)', fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, padding: '5px 6px', borderRadius: 3 }}
            >
              {table.map(c => <option key={c.calibre} value={c.calibre}>{c.calibre} ({c.mm2} mm²){c.mm2 < result.areaMm2 ? ' — subdimensionado' : ''}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 9, color: result.margen >= 0 ? 'var(--safe)' : 'var(--danger)', marginBottom: 6 }}>
            Margen: {result.margen.toFixed(1)}% {result.margen >= 0 ? '✓ suficiente' : '✗ insuficiente'}
          </div>

          {result.calibreSubdimensionado && (
            <ExpertItem type="warn">
              Calibre rechazado: {result.calibreSubdimensionado.calibre} ({result.calibreSubdimensionado.mm2} mm²) es inferior al mínimo de {result.areaMm2.toFixed(1)} mm². Se usa {result.sugerido.calibre}.
            </ExpertItem>
          )}

          {bumpedByNorm && profile.minConductorMm2 && (
            <ExpertItem type="info">
              Calibre ajustado a {result.seleccionado.calibre} ({result.seleccionado.mm2} mm²) — el resultado térmico de Onderdonk exigía menos, pero {profile.label} fija una sección mínima de {profile.minConductorMm2} mm² para el conductor de puesta a tierra.
            </ExpertItem>
          )}

          <button
            type="button" onClick={() => setExpanded(v => !v)}
            style={{ fontSize: 8.5, color: 'var(--copper)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
          >
            {expanded ? '▴ ocultar tabla de calibres' : '▾ ver tabla completa de calibres'}
          </button>

          {expanded && table.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
              <thead><tr><Th>Calibre</Th><Th>Área (mm²)</Th><Th>Estado</Th></tr></thead>
              <tbody>
                {table.map(row => {
                  const isSel = row.calibre === result.seleccionado.calibre;
                  const isSuggest = row.calibre === result.sugerido.calibre;
                  const tooSmall = row.mm2 < result.areaMm2;
                  return (
                    <tr key={row.calibre} style={{ background: isSel ? 'var(--copper-soft)' : 'transparent' }}>
                      <TdMono highlight={isSel}>{row.calibre}</TdMono>
                      <TdMono>{row.mm2}</TdMono>
                      <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--line)', fontSize: 8.5 }}>
                        {tooSmall
                          ? <span style={{ color: 'var(--danger)' }}>✗ subdim.</span>
                          : isSuggest
                            ? <span style={{ color: 'var(--safe)' }}>✓ mínimo</span>
                            : <span style={{ color: 'var(--faint)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
