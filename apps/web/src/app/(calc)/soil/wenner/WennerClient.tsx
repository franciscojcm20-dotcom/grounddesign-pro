'use client';
import { useState } from 'react';
import { api, type WennerResult } from '@/lib/api';

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

type Reading = { a: string; r: string };

export function WennerClient() {
  const [rows, setRows]   = useState<Reading[]>(DEFAULT_READINGS.map(v => ({ a: String(v.a), r: String(v.r) })));
  const [result, setResult] = useState<WennerResult | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function updateRow(i: number, field: 'a' | 'r', val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function addRow() {
    setRows(prev => [...prev, { a: '', r: '' }]);
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  async function calculate() {
    const readings = rows
      .map(r => ({ a: Number(r.a), r: Number(r.r) }))
      .filter(r => r.a > 0 && r.r > 0);

    if (readings.length < 2) {
      setError('Se necesitan al menos 2 lecturas válidas.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.soil.wenner(readings);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión con la API');
    } finally {
      setLoading(false);
    }
  }

  const hasResult = result !== null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>

      {/* ── INPUTS ── */}
      <aside style={{
        borderRight: '1px solid var(--line)', overflowY: 'auto',
        background: 'var(--panel)', padding: '18px 16px 40px',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Resistividad — Wenner</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          ρa = 2πaR · IEEE Std 81-2012, Cl. 8.3
        </p>

        <SectionLabel>Lecturas de campo (a, R)</SectionLabel>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr>
              {['a (m)', 'R (Ω)', ''].map(h => (
                <th key={h} style={{
                  fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase',
                  letterSpacing: '.05em', padding: '3px 4px', borderBottom: '1px solid var(--line)',
                  textAlign: 'left',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '2px 3px' }}>
                  <input value={row.a} onChange={e => updateRow(i, 'a', e.target.value)}
                    style={inputStyle} placeholder="0" />
                </td>
                <td style={{ padding: '2px 3px' }}>
                  <input value={row.r} onChange={e => updateRow(i, 'r', e.target.value)}
                    style={inputStyle} placeholder="0" />
                </td>
                <td style={{ padding: '2px 3px' }}>
                  <button onClick={() => removeRow(i)} style={{
                    background: 'none', border: 'none', color: 'var(--faint)',
                    cursor: 'pointer', fontSize: 12, padding: '2px 4px',
                  }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addRow} style={{
          width: '100%', background: 'none', border: '1px dashed var(--line)',
          color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10,
          padding: 6, borderRadius: 3, cursor: 'pointer', marginBottom: 20,
        }}>+ Agregar lectura</button>

        <button onClick={calculate} disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none',
          color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 700,
          fontSize: 11, padding: '10px', borderRadius: 3, cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>

        {error && (
          <div style={{
            marginTop: 12, padding: '8px 10px', background: '#1a0d0d',
            border: '1px solid #ef444444', borderRadius: 3,
            fontSize: 10, color: 'var(--danger)',
          }}>{error}</div>
        )}
      </aside>

      {/* ── RESULTS ── */}
      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!hasResult ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
          }}>
            <div style={{ fontSize: 32 }}>⚡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>
              Ingresa las lecturas y presiona Calcular
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="ρ promedio" value={result.rhoAvg.toFixed(0)} unit="Ω·m" primary />
              <StatCard label="Lecturas válidas" value={String(result.points.length)} unit={`/ ${result.points.length}`} />
              <StatCard label="ρ1 (capa sup.)" value={result.twoLayer.rho1.toFixed(0)} unit="Ω·m" />
              <StatCard label="ρ2 (capa inf.)" value={result.twoLayer.rho2.toFixed(0)} unit="Ω·m" />
            </div>

            {/* Compliance */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px',
              background: '#0d1a0d', border: '1px solid #22c55e44', borderRadius: 4, marginBottom: 16,
              fontSize: 11, color: '#86efac',
            }}>
              <span style={{ fontWeight: 700 }}>✓</span>
              <span>{result.points.length} lecturas válidas procesadas.</span>
              <span style={{
                marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 2,
                background: '#ffffff0a', color: 'var(--dim)', fontFamily: 'var(--font-mono)',
              }}>{result.norm}</span>
            </div>

            {/* Expert suggestions */}
            <div style={{ marginBottom: 16 }}>
              <SectionLabel purple>Sistema Experto</SectionLabel>
              <ExpertItem type="info">
                La variación entre ρ1={result.twoLayer.rho1.toFixed(0)} Ω·m y
                ρ2={result.twoLayer.rho2.toFixed(0)} Ω·m sugiere suelo con estratificación.
                Profundidad estimada de capa: h ≈ {result.twoLayer.h} m.
              </ExpertItem>
              {result.rhoAvg > 1000 && (
                <ExpertItem type="warn">
                  ρ promedio = {result.rhoAvg.toFixed(0)} Ω·m — suelo de alta resistividad (tipo D/E).
                  Evaluar aditivo gel químico o reducir malla al mínimo normativo.
                </ExpertItem>
              )}
            </div>

            {/* Results table */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 4, padding: '12px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
                Resistividades aparentes calculadas
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>{['a (m)', 'R (Ω)', 'ρa (Ω·m)'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', color: 'var(--faint)', textTransform: 'uppercase',
                      letterSpacing: '.05em', fontSize: 8.5, padding: '4px 8px',
                      borderBottom: '1px solid var(--line)',
                    }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {result.points.map((pt, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{pt.a}</td>
                      <td style={tdStyle}>{pt.r}</td>
                      <td style={{ ...tdStyle, color: 'var(--copper)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {pt.rhoA.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fundamento técnico */}
            <button onClick={() => setShowFund(f => !f)} style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'var(--panel)', border: '1px solid var(--copper-soft)',
              color: 'var(--copper)', fontFamily: 'var(--font-mono)',
              fontSize: 10, padding: '8px 12px', borderRadius: 3, cursor: 'pointer',
              marginBottom: 12,
            }}>
              § Ver Fundamento Técnico — Método de Wenner
              <span style={{ marginLeft: 'auto' }}>{showFund ? '▴' : '▾'}</span>
            </button>

            {showFund && (
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--line)',
                borderRadius: 4, padding: '14px 16px', fontSize: 10.5,
                color: 'var(--dim)', lineHeight: 1.7,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 12 }}>
                  ρa = 2 · π · a · R
                </div>
                <p><strong style={{ color: 'var(--text)' }}>Interpretación física:</strong> Cuatro electrodos
                colineales equiespaciados a distancia a. Los exteriores inyectan corriente;
                los interiores miden diferencia de potencial. El volumen muestreado es ∝ a.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Variables:</strong>{' '}
                ρa = resistividad aparente (Ω·m), a = espaciamiento (m), R = resistencia medida (Ω).</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Limitaciones:</strong>{' '}
                No diferencia capas con bajo contraste de resistividad. Sensible a heterogeneidades laterales.</p>
                <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>
                  Wenner, F. (1916). NBS Scientific Paper 258 · IEEE Std 81-2012, Cl. 8.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionLabel({ children, purple }: { children: React.ReactNode; purple?: boolean }) {
  return (
    <div style={{
      fontSize: 9, color: purple ? 'var(--purple)' : 'var(--copper)',
      textTransform: 'uppercase', letterSpacing: '.1em',
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--line)', display: 'inline-block' }} />
    </div>
  );
}

function StatCard({ label, value, unit, primary }: {
  label: string; value: string; unit: string; primary?: boolean;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 110, borderRadius: 4, padding: '11px 13px',
      border: primary ? '1px solid var(--copper)' : '1px solid var(--line)',
      background: primary ? 'linear-gradient(160deg,#1e1508,var(--panel))' : 'var(--panel)',
    }}>
      <div style={{ fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: primary ? 'var(--copper)' : 'var(--text)', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 400, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

function ExpertItem({ children, type }: { children: React.ReactNode; type: 'info' | 'warn' }) {
  const colors = type === 'warn'
    ? { bg: '#1a1508', border: '#f59e0b33', dot: 'var(--warn)' }
    : { bg: '#0d1220', border: '#3b82f633', dot: 'var(--blue)' };
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
      borderRadius: 3, marginBottom: 5, background: colors.bg,
      border: `1px solid ${colors.border}`, fontSize: 10, color: 'var(--dim)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: colors.dot,
        flexShrink: 0, marginTop: 3,
      }} />
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11,
  padding: '4px 6px', borderRadius: 2, outline: 'none',
};

const tdStyle: React.CSSProperties = {
  color: 'var(--dim)', padding: '5px 8px', borderBottom: '1px solid #1e2230',
  fontFamily: 'var(--font-mono)',
};
