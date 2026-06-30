'use client';
import { useState } from 'react';
import { api, type WennerResult } from '@/lib/api';
import { ExportBar } from '@/components/ui/ExportBar';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const DEFAULT_READINGS = [
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

type Row = { a: string; r: string };

export function WennerClient() {
  const [rows, setRows]     = useState<Row[]>(DEFAULT_READINGS.map(v => ({ a: String(v.a), r: String(v.r) })));
  const [result, setResult] = useState<WennerResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function updateRow(i: number, field: 'a' | 'r', val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function addRow()       { setRows(prev => [...prev, { a: '', r: '' }]); }
  function removeRow(i: number) { setRows(prev => prev.filter((_, idx) => idx !== i)); }

  async function calculate() {
    const readings = rows.map(r => ({ a: Number(r.a), r: Number(r.r) })).filter(r => r.a > 0 && r.r > 0);
    if (readings.length < 2) { setError('Se necesitan al menos 2 lecturas válidas.'); return; }
    setLoading(true); setError(null);
    try {
      setResult(await api.soil.wenner(readings));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión con la API');
    } finally { setLoading(false); }
  }

  return (
    <div style={calcLayout}>
      {/* INPUTS */}
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Resistividad — Wenner</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          ρa = 2πaR · IEEE Std 81-2012, Cl. 8.3
        </p>

        <SectionLabel>Lecturas de campo (a, R)</SectionLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr><Th>a (m)</Th><Th>R (Ω)</Th><Th></Th></tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '2px 3px' }}>
                  <input value={row.a} onChange={e => updateRow(i, 'a', e.target.value)} style={inputStyle} placeholder="0" />
                </td>
                <td style={{ padding: '2px 3px' }}>
                  <input value={row.r} onChange={e => updateRow(i, 'r', e.target.value)} style={inputStyle} placeholder="0" />
                </td>
                <td style={{ padding: '2px 3px' }}>
                  <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 12 }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow} style={{ width: '100%', background: 'none', border: '1px dashed var(--line)', color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: 6, borderRadius: 3, cursor: 'pointer', marginBottom: 20 }}>
          + Agregar lectura
        </button>

        <button onClick={calculate} disabled={loading} style={{ width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      {/* RESULTS */}
      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⚡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa las lecturas y presiona Calcular</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="ρ promedio" value={result.rhoAvg.toFixed(0)} unit="Ω·m" primary />
              <StatCard label="Lecturas" value={String(result.points.length)} unit="válidas" />
              <StatCard label="ρ1 (sup.)" value={result.twoLayer.rho1.toFixed(0)} unit="Ω·m" />
              <StatCard label="ρ2 (inf.)" value={result.twoLayer.rho2.toFixed(0)} unit="Ω·m" />
            </div>

            <CompBanner pass={true} norm="IEEE 81-2012 · Cl. 8.3"
              msg={`${result.points.length} lecturas procesadas — ρ promedio ${result.rhoAvg.toFixed(0)} Ω·m`} />

            <ExportBar module="wenner" inputs={{ nLecturas: result.points.length }} outputs={result as unknown as Record<string,unknown>} norm="IEEE 81-2012 Cl.8.3" />

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type="info">
              ρ1={result.twoLayer.rho1.toFixed(0)} Ω·m · ρ2={result.twoLayer.rho2.toFixed(0)} Ω·m — profundidad estimada de capa: h ≈ {result.twoLayer.h} m.
            </ExpertItem>
            {result.rhoAvg > 1000 && (
              <ExpertItem type="warn">
                ρ = {result.rhoAvg.toFixed(0)} Ω·m — suelo de alta resistividad. Evaluar aditivo gel o reducir malla al mínimo normativo.
              </ExpertItem>
            )}

            <div style={{ ...panelStyle, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Resistividades aparentes</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>a (m)</Th><Th>R (Ω)</Th><Th>ρa (Ω·m)</Th></tr></thead>
                <tbody>
                  {result.points.map((pt, i) => (
                    <tr key={i}>
                      <TdMono>{pt.a}</TdMono>
                      <TdMono>{pt.r}</TdMono>
                      <TdMono highlight>{pt.rhoA.toFixed(1)}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Método de Wenner">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 12 }}>ρa = 2 · π · a · R</div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> ρa = resistividad aparente (Ω·m), a = espaciamiento (m), R = resistencia medida (Ω).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Limitaciones:</strong> No diferencia capas con bajo contraste. Sensible a heterogeneidades laterales.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Wenner, F. (1916). NBS Scientific Paper 258 · IEEE Std 81-2012, Cl. 8.</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
