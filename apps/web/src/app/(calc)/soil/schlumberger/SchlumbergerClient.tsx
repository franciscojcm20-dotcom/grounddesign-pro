'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface SchlumPoint { L: number; l: number; r: number; rhoA: number }
interface SchlumResult { points: SchlumPoint[]; rhoAvg: number; norm: string }

const DEFAULT_READINGS = [
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

type Row = { L: string; l: string; r: string };

export function SchlumbergerClient() {
  const [rows, setRows]     = useState<Row[]>(DEFAULT_READINGS.map(v => ({ L: String(v.L), l: String(v.l), r: String(v.r) })));
  const [result, setResult] = useState<SchlumResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function update(i: number, field: 'L' | 'l' | 'r', val: string) {
    setRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function calculate() {
    const readings = rows
      .map(r => ({ L: Number(r.L), l: Number(r.l), r: Number(r.r) }))
      .filter(r => r.L > 0 && r.l > 0 && r.r > 0);
    if (readings.length < 2) { setError('Se necesitan al menos 2 lecturas válidas.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/soil/schlumberger`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setResult(await res.json() as SchlumResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  const wennerRhoAvg = result ? result.rhoAvg : null;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Resistividad — Schlumberger</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          ρa = π·(L²−l²)/(2l)·R · IEEE Std 81-2012, Cl. 8
        </p>

        <SectionLabel>Lecturas de campo (L, l, R)</SectionLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead><tr><Th>L (m)</Th><Th>l (m)</Th><Th>R (Ω)</Th><Th></Th></tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {(['L', 'l', 'r'] as const).map(f => (
                  <td key={f} style={{ padding: '2px 2px' }}>
                    <input value={row[f]} onChange={e => update(i, f, e.target.value)} style={{ ...inputStyle, padding: '4px 5px' }} placeholder="0" />
                  </td>
                ))}
                <td><button onClick={() => setRows(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 12 }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setRows(p => [...p, { L: '', l: '0.5', r: '' }])} style={{ width: '100%', background: 'none', border: '1px dashed var(--line)', color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: 6, borderRadius: 3, cursor: 'pointer', marginBottom: 20 }}>
          + Agregar lectura
        </button>

        <button onClick={calculate} disabled={loading} style={{ width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>📡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa las lecturas y presiona Calcular</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="ρ promedio" value={result.rhoAvg.toFixed(0)} unit="Ω·m" primary />
              <StatCard label="Lecturas" value={String(result.points.length)} unit="válidas" />
              <StatCard label="L máximo" value={String(Math.max(...result.points.map(p => p.L)))} unit="m" />
            </div>

            <CompBanner pass={true} norm={result.norm}
              msg={`${result.points.length} lecturas Schlumberger procesadas — ρ promedio ${result.rhoAvg.toFixed(0)} Ω·m`} />

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type="info">
              Schlumberger es más preciso que Wenner para detectar capas profundas porque mantiene l fijo y varía L, reduciendo el efecto de heterogeneidades laterales.
            </ExpertItem>
            {wennerRhoAvg !== null && Math.abs(wennerRhoAvg - result.rhoAvg) / result.rhoAvg > 0.1 && (
              <ExpertItem type="warn">
                ρ Schlumberger ({result.rhoAvg.toFixed(0)} Ω·m) difiere &gt;10% respecto a Wenner. Verificar que las lecturas correspondan al mismo sitio y orientación.
              </ExpertItem>
            )}

            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Resistividades aparentes</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>L (m)</Th><Th>l (m)</Th><Th>R (Ω)</Th><Th>ρa (Ω·m)</Th></tr></thead>
                <tbody>
                  {result.points.map((pt, i) => (
                    <tr key={i}>
                      <TdMono>{pt.L}</TdMono>
                      <TdMono>{pt.l}</TdMono>
                      <TdMono>{pt.r}</TdMono>
                      <TdMono highlight>{pt.rhoA.toFixed(1)}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Método de Schlumberger">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>ρa = π · (L² − l²) / (2l) · R</div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> L = semidistancia entre electrodos de corriente (m), l = semidistancia entre electrodos de potencial (m, fijo), R = resistencia medida (Ω).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Ventaja sobre Wenner:</strong> al mantener l fijo la medición es menos sensible a variaciones laterales. Preferido para SEV (Sondeo Eléctrico Vertical).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Aproximación L≫l:</strong> cuando L≫l, (L²−l²) ≈ L² y la fórmula se simplifica a π·L²/(2l)·R.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Telford et al. (1990) · IEEE Std 81-2012, Cl. 8</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
