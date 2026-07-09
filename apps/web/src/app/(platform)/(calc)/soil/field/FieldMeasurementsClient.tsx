'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type SchlumbergerResult, type WennerResult } from '@/lib/api';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ChartRho } from '@/components/ui/ChartRho';
import { SoundingComparisonChart } from '@/components/ui/Charts';
import { useSoilModel } from '@/context/SoilModelContext';
import { parseWennerReadings, parseSchlumbergerReadings } from '@/lib/parseFieldReadings';

/** Diagrama genérico de disposición de electrodos Wenner: C1-P1-P2-C2 equidistantes (a). Independiente del instrumento/telurómetro usado. */
function WennerLayoutDiagram() {
  const W = 320, H = 108;
  const y = 58, xs = [40, 120, 200, 280];
  const labels = ['C1', 'P1', 'P2', 'C2'];
  const colors = ['var(--danger)', 'var(--blue)', 'var(--blue)', 'var(--danger)'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <line x1={20} y1={y + 22} x2={W - 20} y2={y + 22} stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
      <text x={24} y={y + 34} fontSize={7} fill="var(--faint)" fontFamily="var(--font-mono)">superficie del terreno</text>
      {xs.slice(0, 3).map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={xs[i + 1]!} y2={y} stroke="var(--dim)" strokeWidth="1" />
          <text x={(x + xs[i + 1]!) / 2} y={y - 6} textAnchor="middle" fontSize={8} fill="var(--dim)" fontFamily="var(--font-mono)">a</text>
        </g>
      ))}
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 22} stroke={colors[i]} strokeWidth="2" />
          <circle cx={x} cy={y} r="4" fill={colors[i]} />
          <text x={x} y={y + 38} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={colors[i]} fontFamily="var(--font-mono)">{labels[i]}</text>
        </g>
      ))}
      <text x={W / 2} y={16} textAnchor="middle" fontSize={7.5} fill="var(--faint)" fontFamily="var(--font-mono)">
        Corriente: C1→C2 · Potencial: P1–P2 · profundidad efectiva ≈ 0.75·a
      </text>
    </svg>
  );
}

/** Diagrama genérico de disposición Schlumberger: P1-P2 fijos al centro, C1-C2 se expanden simétricamente. */
function SchlumbergerLayoutDiagram() {
  const W = 320, H = 108;
  const y = 58, cx = W / 2;
  const pHalf = 14, cHalf = 110;
  const xs = [cx - cHalf, cx - pHalf, cx + pHalf, cx + cHalf];
  const labels = ['C1', 'P1', 'P2', 'C2'];
  const colors = ['var(--danger)', 'var(--blue)', 'var(--blue)', 'var(--danger)'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <line x1={16} y1={y + 22} x2={W - 16} y2={y + 22} stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
      <text x={20} y={y + 34} fontSize={7} fill="var(--faint)" fontFamily="var(--font-mono)">superficie del terreno</text>
      <line x1={xs[0]} y1={y} x2={xs[3]} y2={y} stroke="var(--dim)" strokeWidth="1" />
      <text x={cx} y={y - 20} textAnchor="middle" fontSize={8} fill="var(--dim)" fontFamily="var(--font-mono)">L (semidistancia C–centro)</text>
      <line x1={cx} y1={y - 16} x2={xs[3]} y2={y - 16} stroke="var(--dim)" strokeWidth="0.7" />
      <text x={cx} y={y + 14} textAnchor="middle" fontSize={7.5} fill="var(--blue)" fontFamily="var(--font-mono)">l</text>
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 22} stroke={colors[i]} strokeWidth="2" />
          <circle cx={x} cy={y} r="4" fill={colors[i]} />
          <text x={x} y={y + 38} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={colors[i]} fontFamily="var(--font-mono)">{labels[i]}</text>
        </g>
      ))}
      <text x={W / 2} y={16} textAnchor="middle" fontSize={7.5} fill="var(--faint)" fontFamily="var(--font-mono)">
        P1–P2 (l) fijos · C1/C2 se separan progresivamente · profundidad efectiva ≈ L/2
      </text>
    </svg>
  );
}

const DEFAULT_SCHLUM = [
  { L:  1,   l: 0.5, r: 525.30 },
  { L:  1.5, l: 0.5, r: 199.91 },
  { L:  2,   l: 0.5, r: 108.12 },
  { L:  3,   l: 0.5, r:  47.55 },
  { L:  4,   l: 0.5, r:  27.01 },
  { L:  6,   l: 0.5, r:  12.33 },
  { L:  8,   l: 0.5, r:   7.08 },
  { L: 12,   l: 0.5, r:   3.23 },
  { L: 16,   l: 0.5, r:   1.84 },
  { L: 24,   l: 0.5, r:   0.83 },
];

const DEFAULT_WENNER = [
  { a:  1,   r: 196.99 },
  { a:  1.5, r: 133.27 },
  { a:  2,   r: 101.37 },
  { a:  3,   r:  69.34 },
  { a:  4,   r:  53.18 },
  { a:  6,   r:  36.72 },
  { a:  8,   r:  28.22 },
  { a: 12,   r:  19.36 },
  { a: 16,   r:  14.74 },
  { a: 24,   r:   9.96 },
];

type SchlumRow  = { L: string; l: string; r: string };
type WennerRow  = { a: string; r: string };

/** Panel para pegar/importar lecturas de campo (CSV/TSV/espacios) — reemplaza las filas del método al confirmar. */
function ImportPanel({ format, value, onChange, onImport, info }: {
  format: 'a,R' | 'L,l,R'; value: string; onChange: (v: string) => void; onImport: () => void; info: string | null;
}) {
  return (
    <div style={{ ...panelStyle, padding: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 6, lineHeight: 1.5 }}>
        Pega lecturas exportadas de tu teluómetro — una por línea, formato <strong style={{ color: 'var(--dim)' }}>{format}</strong> (CSV, TSV o separado por espacios; encabezados se descartan automáticamente).
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={5}
        placeholder={format === 'a,R' ? '1,196.99\n2,101.37\n4,53.18' : '1,0.5,525.30\n1.5,0.5,199.91'}
        style={{ ...inputStyle, width: '100%', fontFamily: 'var(--font-mono)', resize: 'vertical', marginBottom: 6 }}
      />
      <button onClick={onImport} disabled={!value.trim()} style={{
        width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
        fontSize: 10, padding: 7, borderRadius: 3, cursor: 'pointer', opacity: value.trim() ? 1 : 0.5,
      }}>
        Importar y reemplazar lecturas
      </button>
      {info && <div style={{ fontSize: 9, color: info.startsWith('✓') ? 'var(--safe)' : 'var(--danger)', marginTop: 6, lineHeight: 1.4 }}>{info}</div>}
    </div>
  );
}

export function FieldMeasurementsClient() {
  const soilModel = useSoilModel();

  const [useSchlum, setUseSchlum] = useState(true);
  const [useWenner, setUseWenner] = useState(true);
  const [schlumRows, setSchlumRows] = useState<SchlumRow[]>(DEFAULT_SCHLUM.map(v => ({ L: String(v.L), l: String(v.l), r: String(v.r) })));
  const [wennerRows, setWennerRows] = useState<WennerRow[]>(DEFAULT_WENNER.map(v => ({ a: String(v.a), r: String(v.r) })));
  const [loadedFromContext, setLoadedFromContext] = useState(false);
  const [importOpen, setImportOpen] = useState<'schlum' | 'wenner' | null>(null);
  const [importText, setImportText] = useState('');
  const [importInfo, setImportInfo] = useState<string | null>(null);

  const [schlumResult, setSchlumResult] = useState<SchlumbergerResult | null>(null);
  const [wennerResult, setWennerResult] = useState<WennerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Si ya existen lecturas guardadas (de una visita anterior), se cargan una vez al montar.
  useEffect(() => {
    if (loadedFromContext) return;
    if (soilModel.schlumbergerReadings.length > 0) {
      setSchlumRows(soilModel.schlumbergerReadings.map(v => ({ L: String(v.L), l: String(v.l), r: String(v.r) })));
    }
    if (soilModel.wennerReadings.length > 0) {
      setWennerRows(soilModel.wennerReadings.map(v => ({ a: String(v.a), r: String(v.r) })));
    }
    setLoadedFromContext(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soilModel.schlumbergerReadings, soilModel.wennerReadings]);

  const maxLlRatio = schlumRows.reduce((max, r) => {
    const L = Number(r.L), l = Number(r.l);
    if (!(L > 0) || !(l > 0)) return max;
    return Math.max(max, L / l);
  }, 0);

  function updateSchlum(i: number, field: 'L' | 'l' | 'r', val: string) {
    setSchlumRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }
  function updateWenner(i: number, field: 'a' | 'r', val: string) {
    setWennerRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  /** Reemplaza las filas del método activo por las lecturas pegadas (CSV/TSV/espacios) — no depende de ningún formato propietario de teluómetro. */
  function applyImport() {
    if (importOpen === 'wenner') {
      const { rows, skipped } = parseWennerReadings(importText);
      if (rows.length === 0) { setImportInfo('No se encontraron lecturas válidas (formato esperado: a,R por línea).'); return; }
      setWennerRows(rows.map(r => ({ a: String(r.a), r: String(r.r) })));
      setImportInfo(`✓ ${rows.length} lectura(s) importada(s)${skipped > 0 ? ` — ${skipped} línea(s) descartada(s) (encabezado o formato inválido)` : ''}.`);
    } else if (importOpen === 'schlum') {
      const { rows, skipped } = parseSchlumbergerReadings(importText);
      if (rows.length === 0) { setImportInfo('No se encontraron lecturas válidas (formato esperado: L,l,R por línea).'); return; }
      setSchlumRows(rows.map(r => ({ L: String(r.L), l: String(r.l), r: String(r.r) })));
      setImportInfo(`✓ ${rows.length} lectura(s) importada(s)${skipped > 0 ? ` — ${skipped} línea(s) descartada(s) (encabezado o formato inválido)` : ''}.`);
    }
    setImportText('');
  }

  async function calculate() {
    if (!useSchlum && !useWenner) { setError('Selecciona al menos un método (Schlumberger o Wenner).'); return; }

    const schlumReadings = schlumRows
      .map(r => ({ L: Number(r.L), l: Number(r.l), r: Number(r.r) }))
      .filter(r => r.L > 0 && r.l > 0 && r.r > 0);
    const wennerReadings = wennerRows
      .map(r => ({ a: Number(r.a), r: Number(r.r) }))
      .filter(r => r.a > 0 && r.r > 0);

    if (useSchlum && schlumReadings.length < 2) { setError('Se necesitan al menos 2 lecturas Schlumberger válidas.'); return; }
    if (useWenner && wennerReadings.length < 2)  { setError('Se necesitan al menos 2 lecturas Wenner válidas.'); return; }

    setLoading(true); setError(null);
    try {
      const [schlum, wenner] = await Promise.all([
        useSchlum ? api.soil.schlumberger(schlumReadings) : Promise.resolve(null),
        useWenner ? api.soil.wenner(wennerReadings) : Promise.resolve(null),
      ]);
      setSchlumResult(schlum);
      setWennerResult(wenner);
      // Guarda las lecturas crudas de los métodos usados — este es el único lugar donde se editan.
      soilModel.setReadings(useSchlum ? schlumReadings : [], useWenner ? wennerReadings : []);
      // Si ambos métodos están activos, Schlumberger es el principal y Wenner valida contra él.
      // Si solo uno está activo, ese método define el modelo directamente (ver SoilModelContext).
      if (schlum) soilModel.setFromSchlumberger(schlum.twoLayer);
      if (wenner) soilModel.setFromWenner(wenner.twoLayer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión con la API');
    } finally { setLoading(false); }
  }

  const model = soilModel.model;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Mediciones de Campo</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 10, lineHeight: 1.6 }}>
          Punto de entrada único para las lecturas de terreno. El modelo de suelo (ρ1, ρ2, h) se calcula
          automáticamente a partir de estas mediciones. No es obligatorio usar ambos métodos — elige el(los)
          que hayas medido en terreno; si usas los dos, Schlumberger define el modelo principal y Wenner lo valida.
        </p>
        <div style={{
          fontSize: 9, color: 'var(--dim)', background: 'var(--panel3)', border: '1px solid var(--line)',
          borderRadius: 4, padding: '8px 10px', marginBottom: 16, lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--text)' }}>Criterio de selección (IEEE Std 81-2012, Cl. 8 / 8.3):</strong> el método es independiente
          del instrumento de medición (telurómetro) empleado — cualquier equipo de 4 electrodos sirve para ambas configuraciones.
          Usa <strong style={{ color: 'var(--copper)' }}>Schlumberger</strong> cuando el terreno sea estratificado o de resistividad variable
          en profundidad (mueve solo C1/C2, mantiene P1–P2 fijos → mejor resolución por capa, menor perturbación por heterogeneidad lateral).
          Usa <strong style={{ color: 'var(--blue)' }}>Wenner</strong> como validación rápida en terreno razonablemente homogéneo
          (los 4 electrodos se desplazan igual, medición más simple pero más sensible a variaciones laterales).
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer',
          padding: '6px 8px', border: `1px solid ${useSchlum ? 'var(--copper)' : 'var(--line)'}`,
          borderRadius: 4, background: useSchlum ? 'var(--copper-soft)' : 'var(--bg)',
        }}>
          <input type="checkbox" checked={useSchlum} onChange={e => setUseSchlum(e.target.checked)} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: useSchlum ? 'var(--copper)' : 'var(--dim)' }}>
            Usar Schlumberger {useSchlum && useWenner ? '(principal)' : ''}
          </span>
        </label>
        {useSchlum && (
          <>
            <SectionLabel>Schlumberger (L, l, R)</SectionLabel>
            <div style={{ ...panelStyle, padding: '8px', marginBottom: 10 }}>
              <SchlumbergerLayoutDiagram />
            </div>
            <button
              onClick={() => { setImportOpen(o => o === 'schlum' ? null : 'schlum'); setImportText(''); setImportInfo(null); }}
              style={{
                width: '100%', background: importOpen === 'schlum' ? 'var(--copper-soft)' : 'var(--bg)',
                border: `1px dashed ${importOpen === 'schlum' ? 'var(--copper)' : 'var(--line)'}`,
                color: importOpen === 'schlum' ? 'var(--copper)' : 'var(--dim)',
                fontSize: 9.5, padding: 7, borderRadius: 3, cursor: 'pointer', marginBottom: 8,
              }}>
              📋 {importOpen === 'schlum' ? 'Cancelar importación' : 'Pegar/importar lecturas'}
            </button>
            {importOpen === 'schlum' && (
              <ImportPanel format="L,l,R" value={importText} onChange={setImportText} onImport={applyImport} info={importInfo} />
            )}
            {maxLlRatio > 5 && (
              <div style={{
                fontSize: 8.5, color: 'var(--warn)', background: 'var(--warn-soft)', border: '1px solid var(--warn)',
                borderRadius: 3, padding: '5px 8px', marginBottom: 8, lineHeight: 1.4,
              }}>
                ⚠ L/l &gt; 5 en algunas lecturas (máx. {maxLlRatio.toFixed(1)}). IEEE Std 81-2012 recomienda aumentar l cuando esta razón se supera, para mantener una señal de potencial medible.
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead><tr><Th>L (m)</Th><Th>l (m)</Th><Th>R (Ω)</Th><Th></Th></tr></thead>
              <tbody>
                {schlumRows.map((row, i) => (
                  <tr key={i}>
                    {(['L', 'l', 'r'] as const).map(f => (
                      <td key={f} style={{ padding: '2px 2px' }}>
                        <input value={row[f]} onChange={e => updateSchlum(i, f, e.target.value)} style={{ ...inputStyle, padding: '4px 5px' }} placeholder="0" />
                      </td>
                    ))}
                    <td><button onClick={() => setSchlumRows(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 12 }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setSchlumRows(p => [...p, { L: '', l: '0.5', r: '' }])} style={{ width: '100%', background: 'none', border: '1px dashed var(--line)', color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: 6, borderRadius: 3, cursor: 'pointer', marginBottom: 18 }}>
              + Agregar lectura Schlumberger
            </button>
          </>
        )}

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer',
          padding: '6px 8px', border: `1px solid ${useWenner ? 'var(--blue)' : 'var(--line)'}`,
          borderRadius: 4, background: useWenner ? 'var(--panel3)' : 'var(--bg)',
        }}>
          <input type="checkbox" checked={useWenner} onChange={e => setUseWenner(e.target.checked)} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: useWenner ? 'var(--blue)' : 'var(--dim)' }}>
            Usar Wenner {useSchlum && useWenner ? '(validación)' : ''}
          </span>
        </label>
        {useWenner && (
          <>
            <SectionLabel purple>Wenner (a, R)</SectionLabel>
            <div style={{ ...panelStyle, padding: '8px', marginBottom: 10 }}>
              <WennerLayoutDiagram />
            </div>
            <button
              onClick={() => { setImportOpen(o => o === 'wenner' ? null : 'wenner'); setImportText(''); setImportInfo(null); }}
              style={{
                width: '100%', background: importOpen === 'wenner' ? 'var(--panel3)' : 'var(--bg)',
                border: `1px dashed ${importOpen === 'wenner' ? 'var(--blue)' : 'var(--line)'}`,
                color: importOpen === 'wenner' ? 'var(--blue)' : 'var(--dim)',
                fontSize: 9.5, padding: 7, borderRadius: 3, cursor: 'pointer', marginBottom: 8,
              }}>
              📋 {importOpen === 'wenner' ? 'Cancelar importación' : 'Pegar/importar lecturas'}
            </button>
            {importOpen === 'wenner' && (
              <ImportPanel format="a,R" value={importText} onChange={setImportText} onImport={applyImport} info={importInfo} />
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead><tr><Th>a (m)</Th><Th>R (Ω)</Th><Th></Th></tr></thead>
              <tbody>
                {wennerRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '2px 3px' }}>
                      <input value={row.a} onChange={e => updateWenner(i, 'a', e.target.value)} style={inputStyle} placeholder="0" />
                    </td>
                    <td style={{ padding: '2px 3px' }}>
                      <input value={row.r} onChange={e => updateWenner(i, 'r', e.target.value)} style={inputStyle} placeholder="0" />
                    </td>
                    <td style={{ padding: '2px 3px' }}>
                      <button onClick={() => setWennerRows(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 12 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setWennerRows(p => [...p, { a: '', r: '' }])} style={{ width: '100%', background: 'none', border: '1px dashed var(--line)', color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: 6, borderRadius: 3, cursor: 'pointer', marginBottom: 20 }}>
              + Agregar lectura Wenner
            </button>
          </>
        )}

        <button onClick={calculate} disabled={loading || (!useSchlum && !useWenner)} style={{ width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer', opacity: (loading || (!useSchlum && !useWenner)) ? 0.6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular modelo de suelo'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!schlumResult && !wennerResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>🌐</div>
            <div style={{ color: 'var(--faint)', fontSize: 11, textAlign: 'center', maxWidth: 340 }}>
              Ingresa las lecturas del/los método(s) elegido(s) y presiona Calcular.
              {model && (
                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--copper)' }}>
                  Ya existe un modelo de suelo activo (fuente: {model.source}) — puedes seguir usándolo en los módulos de diseño mientras recalculas.
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {(() => {
              const primary = schlumResult ?? wennerResult!;
              return (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <StatCard label="ρ1 (superior)" value={primary.twoLayer.rho1.toFixed(0)} unit="Ω·m" primary />
                  <StatCard label="ρ2 (inferior)" value={primary.twoLayer.rho2.toFixed(0)} unit="Ω·m" primary />
                  <StatCard label="h (profundidad)" value={primary.twoLayer.h.toFixed(1)} unit="m" />
                  <StatCard
                    label="ρ uniforme equiv."
                    value={model ? model.rhoUniform.toFixed(0) : '—'}
                    unit="Ω·m"
                    ok
                  />
                </div>
              );
            })()}

            <CompBanner
              pass={!model?.validatedBy || model.validatedBy.deltaPct <= 15}
              norm="IEEE Std 81-2012, Cl. 8 (Schlumberger) / Cl. 8.3 (Wenner, validación)"
              msg={model?.validatedBy
                ? `Modelo de suelo activo: ρ1=${model.rho1.toFixed(0)} Ω·m, ρ2=${model.rho2.toFixed(0)} Ω·m, h≈${model.h}m — validado contra Wenner con ${model.validatedBy.deltaPct.toFixed(1)}% de diferencia`
                : `Modelo de suelo activo calculado con ${schlumResult && wennerResult ? 'ambos métodos' : schlumResult ? 'Schlumberger únicamente' : 'Wenner únicamente'}${schlumResult && !wennerResult ? ' — sin validación cruzada' : ''}`}
            />

            {schlumResult && wennerResult && (
              <div style={{ ...panelStyle, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Comparación de curvas de sondeo — escala log-log</div>
                  <div style={{ fontSize: 8, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>convención estándar VES (IEEE Std 81-2012)</div>
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
                  Ambos ejes en escala logarítmica: el espaciamiento y la resistividad varían en varios órdenes de magnitud,
                  y esta escala linealiza el comportamiento típico de la curva, facilitando comparar la forma entre métodos.
                  Si el terreno es consistente, ambas curvas deben tener una forma similar (mismo número de quiebres/capas).
                </div>
                <SoundingComparisonChart
                  series={[
                    {
                      label: 'Schlumberger (AB/2 = L/2) ★',
                      color: 'var(--chart-1)',
                      points: schlumResult.points.map(p => ({ x: p.L / 2, y: p.rhoA })),
                    },
                    {
                      label: 'Wenner (a)',
                      color: 'var(--chart-2)',
                      dashed: true,
                      points: wennerResult.points.map(p => ({ x: p.a, y: p.rhoA })),
                    },
                  ]}
                />
              </div>
            )}

            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>
                Ver curva(s) individuales con ajuste de 2 capas (ρ1/ρ2/h)
              </summary>
              {schlumResult && (
                <div style={{ ...panelStyle, marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>Schlumberger — ρa vs. semidistancia L (m){wennerResult ? ' — método principal' : ''}</div>
                  <ChartRho
                    points={schlumResult.points.map(p => ({ a: p.L, rhoA: p.rhoA }))}
                    rho1={schlumResult.twoLayer.rho1}
                    rho2={schlumResult.twoLayer.rho2}
                    h={schlumResult.twoLayer.h}
                    xLabel="L (m)"
                  />
                </div>
              )}
              {wennerResult && (
                <div style={panelStyle}>
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>Wenner — ρa vs. espaciamiento a (m){schlumResult ? ' — validación' : ''}</div>
                  <ChartRho
                    points={wennerResult.points.map(p => ({ a: p.a, rhoA: p.rhoA }))}
                    rho1={wennerResult.twoLayer.rho1}
                    rho2={wennerResult.twoLayer.rho2}
                    h={wennerResult.twoLayer.h}
                    xLabel="a (m)"
                  />
                </div>
              )}
            </details>

            <SectionLabel purple>Sistema Experto</SectionLabel>
            {(() => {
              const primary = schlumResult ?? wennerResult!;
              return (
                <ExpertItem type="info">
                  El modelo de suelo activo (ρ1={primary.twoLayer.rho1.toFixed(0)} Ω·m, ρ2={primary.twoLayer.rho2.toFixed(0)} Ω·m, h≈{primary.twoLayer.h}m)
                  queda disponible automáticamente en Resistencia de malla, Picas, Horizontal, Radial, Anillo, Malla+Picas y Gel Químico.
                </ExpertItem>
              );
            })()}
            {model?.validatedBy && (
              <ExpertItem type={model.validatedBy.deltaPct > 15 ? 'warn' : 'ok'}>
                Diferencia Schlumberger vs Wenner: {model.validatedBy.deltaPct.toFixed(1)}%.
                {model.validatedBy.deltaPct > 15
                  ? ' Revisar que ambos ensayos se hayan realizado en el mismo sitio, orientación y condiciones de humedad.'
                  : ' Concordancia adecuada entre ambos métodos de medición.'}
              </ExpertItem>
            )}
            {schlumResult && !wennerResult && (
              <ExpertItem type="warn">
                Solo se usó Schlumberger — sin validación cruzada de Wenner. Considera activar Wenner si quieres confirmar el modelo con un segundo método independiente.
              </ExpertItem>
            )}
            {wennerResult && !schlumResult && (
              <ExpertItem type="warn">
                Solo se usó Wenner — sin validación cruzada de Schlumberger. Considera activar Schlumberger, especialmente en terrenos estratificados, para mayor resolución por capa.
              </ExpertItem>
            )}

            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Resumen de lecturas</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>Método</Th><Th>Lecturas</Th><Th>ρ promedio</Th><Th>ρ1 / ρ2</Th></tr></thead>
                <tbody>
                  {schlumResult && (
                    <tr>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>Schlumberger{wennerResult ? ' ★' : ''}</td>
                      <TdMono>{schlumResult.points.length}</TdMono>
                      <TdMono highlight>{schlumResult.rhoAvg.toFixed(0)} Ω·m</TdMono>
                      <TdMono>{schlumResult.twoLayer.rho1.toFixed(0)} / {schlumResult.twoLayer.rho2.toFixed(0)}</TdMono>
                    </tr>
                  )}
                  {wennerResult && (
                    <tr>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>Wenner{schlumResult ? ' (validación)' : ''}</td>
                      <TdMono>{wennerResult.points.length}</TdMono>
                      <TdMono highlight={!schlumResult}>{wennerResult.rhoAvg.toFixed(0)} Ω·m</TdMono>
                      <TdMono>{wennerResult.twoLayer.rho1.toFixed(0)} / {wennerResult.twoLayer.rho2.toFixed(0)}</TdMono>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 10 }}>
              Ver detalle completo: <Link href="/soil/schlumberger" style={{ color: 'var(--copper)' }}>Schlumberger</Link> · <Link href="/soil/wenner" style={{ color: 'var(--blue)' }}>Wenner</Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
