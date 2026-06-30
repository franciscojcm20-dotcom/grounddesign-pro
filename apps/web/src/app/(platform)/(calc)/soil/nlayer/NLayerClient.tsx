'use client';
import { useState, useMemo } from 'react';
import {
  SectionLabel, StatCard, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono, Field,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { ChartRho }  from '@/components/ui/ChartRho';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface CurvePoint   { a: number; rhoA: number }
interface NLayerResult { curve: CurvePoint[]; rhos: number[]; hs: number[]; norm: string }
interface PatternPoint { t: number; ratio: number }
interface PatternResult { k: number; curve: PatternPoint[] }

const DEFAULT_LAYERS = [
  { rho: 1214, h: 4    },
  { rho: 1537, h: 8    },
  { rho: 3200, h: 15   },
  { rho:  800, h: null },
];
const DEFAULT_SPACINGS = [0.5, 1, 2, 4, 8, 16, 32, 64];

/* ── Layer cross-section diagram ──────────────────────────────────── */
function LayerDiagram({ rhos, hs }: { rhos: number[]; hs: (number | null)[] }) {
  const W = 280, PAD = 8;
  const totalH = hs.reduce<number>((s, h) => s + (h ?? 0), 0) || 40;
  const displayH = Math.min(totalH + 20, 150);
  const SCALE = (displayH - PAD * 2) / (totalH + 20);
  const rhoMax = Math.max(...rhos);

  let y = PAD;
  return (
    <svg viewBox={`0 0 ${W} ${displayH}`} style={{ width: '100%', height: displayH, display: 'block' }}>
      {rhos.map((rho, i) => {
        const h = hs[i] ?? 20;
        const barH = h * SCALE;
        const opacity = 0.15 + 0.6 * (rho / rhoMax);
        const el = (
          <g key={i}>
            <rect x={PAD} y={y} width={W - PAD * 2} height={barH}
              fill="var(--copper)" fillOpacity={opacity} rx="1" />
            <text x={W / 2} y={y + barH / 2 + 3.5} fill="var(--text)" fontSize="8.5" textAnchor="middle" fontFamily="var(--font-mono)">
              ρ{i + 1} = {rho} Ω·m {hs[i] !== null ? `· h${i + 1} = ${hs[i]} m` : '(semi-espacio)'}
            </text>
            {i < rhos.length - 1 && (
              <line x1={PAD} y1={y + barH} x2={W - PAD} y2={y + barH}
                stroke="var(--line)" strokeWidth="1" strokeDasharray="4,3" />
            )}
          </g>
        );
        y += barH;
        return el;
      })}
      {/* Surface label */}
      <text x={PAD + 4} y={PAD - 2} fill="var(--faint)" fontSize="7">Superficie</text>
    </svg>
  );
}

export function NLayerClient() {
  const [layers,    setLayers]    = useState(DEFAULT_LAYERS);
  const [tableMode, setTableMode] = useState(true);
  const [spacings,  setSpacings]  = useState(DEFAULT_SPACINGS.join(', '));
  const [patternK,  setPatternK]  = useState('10');

  const [result,   setResult]   = useState<NLayerResult | null>(null);
  const [pattern,  setPattern]  = useState<PatternResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [showFund, setShowFund] = useState(false);

  function parseNums(s: string) { return s.split(',').map(v => Number(v.trim())).filter(n => !isNaN(n) && n > 0); }

  function updateLayer(i: number, field: 'rho' | 'h', val: string) {
    setLayers(prev => prev.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'h' && idx === prev.length - 1 ? null : Number(val) || null } : l
    ));
  }
  function addLayer() {
    setLayers(prev => {
      const updated = prev.map((l, i) => i === prev.length - 1 ? { ...l, h: 5 } : l);
      return [...updated, { rho: 500, h: null }];
    });
  }
  function removeLayer(i: number) {
    if (layers.length <= 2) return;
    setLayers(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.map((l, idx) => idx === next.length - 1 ? { ...l, h: null } : l);
    });
  }

  const { rhos, hs } = useMemo(() => ({
    rhos: layers.map(l => l.rho),
    hs:   layers.slice(0, -1).map(l => l.h ?? 5),
  }), [layers]);

  async function calculate() {
    const sp = parseNums(spacings);
    if (rhos.length < 1) { setError('Ingresa al menos 1 capa.'); return; }
    setLoading(true); setError(null);
    try {
      const [nlRes, patRes] = await Promise.all([
        fetch(`${BASE}/api/v1/soil/nlayer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spacings: sp, rhos, hs }),
        }).then(async r => { if (!r.ok) throw new Error((await r.json() as {error:string}).error); return r.json() as Promise<NLayerResult>; }),
        fetch(`${BASE}/api/v1/soil/pattern?k=${patternK}&pts=60`)
          .then(r => r.json() as Promise<PatternResult>),
      ]);
      setResult(nlRes);
      setPattern(patRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  const rhoMin = result ? Math.min(...result.curve.map(p => p.rhoA)) : 0;
  const rhoMax = result ? Math.max(...result.curve.map(p => p.rhoA)) : 0;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Modelo N capas</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
          Kernel recursivo de Wait (1954) · Curvas Orellana-Mooney
        </p>

        {/* Live layer diagram */}
        <div style={{ ...panelStyle, marginBottom: 14, padding: '8px' }}>
          <LayerDiagram rhos={rhos} hs={[...layers.slice(0, -1).map(l => l.h), null]} />
        </div>

        <SectionLabel>
          Capas del modelo
          <button onClick={() => setTableMode(m => !m)} style={{
            marginLeft: 8, fontSize: 8.5, color: 'var(--copper)', background: 'none',
            border: '1px solid var(--copper)', borderRadius: 2, padding: '1px 6px', cursor: 'pointer',
          }}>
            {tableMode ? 'texto' : 'tabla'}
          </button>
        </SectionLabel>

        {tableMode ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
              <thead><tr><Th>#</Th><Th>ρ (Ω·m)</Th><Th>h (m)</Th><Th></Th></tr></thead>
              <tbody>
                {layers.map((l, i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 4px', fontSize: 9.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                    <td style={{ padding: '2px 3px' }}>
                      <input value={l.rho} onChange={e => updateLayer(i, 'rho', e.target.value)}
                        style={{ ...inputStyle, padding: '4px 5px' }} type="number" />
                    </td>
                    <td style={{ padding: '2px 3px' }}>
                      {i < layers.length - 1 ? (
                        <input value={l.h ?? ''} onChange={e => updateLayer(i, 'h', e.target.value)}
                          style={{ ...inputStyle, padding: '4px 5px' }} type="number" />
                      ) : (
                        <span style={{ fontSize: 9, color: 'var(--faint)', padding: '0 4px' }}>∞</span>
                      )}
                    </td>
                    <td style={{ padding: '2px 3px' }}>
                      <button onClick={() => removeLayer(i)} disabled={layers.length <= 2}
                        style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 12, opacity: layers.length <= 2 ? 0.3 : 1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addLayer} style={{ width: '100%', background: 'none', border: '1px dashed var(--line)', color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: 5, borderRadius: 3, cursor: 'pointer', marginBottom: 16 }}>
              + Agregar capa
            </button>
          </>
        ) : (
          <>
            <Field label="Resistividades ρ₁…ρN" unit="Ω·m (separadas por coma)">
              <input style={inputStyle} value={rhos.join(', ')} onChange={e => {
                const vals = parseNums(e.target.value);
                setLayers(vals.map((r, i) => ({ rho: r, h: i < vals.length - 1 ? (layers[i]?.h ?? 5) : null })));
              }} placeholder="ej. 1214, 1537, 800" />
            </Field>
            <Field label="Espesores h₁…h(N-1)" unit="m (separados por coma)">
              <input style={inputStyle} value={hs.join(', ')} onChange={e => {
                const vals = parseNums(e.target.value);
                setLayers(prev => prev.map((l, i) => ({ ...l, h: i < prev.length - 1 ? (vals[i] ?? 5) : null })));
              }} placeholder="ej. 4, 8" />
            </Field>
          </>
        )}

        <SectionLabel>Espaciamientos</SectionLabel>
        <Field label="Valores de a" unit="m (separados por coma)">
          <input style={inputStyle} value={spacings} onChange={e => setSpacings(e.target.value)} />
        </Field>

        <SectionLabel>Curva patrón Orellana-Mooney</SectionLabel>
        <Field label="Ratio k = ρ2/ρ1" unit="">
          <input style={inputStyle} type="number" value={patternK} onChange={e => setPatternK(e.target.value)} />
        </Field>

        <button onClick={calculate} disabled={loading} style={{ width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>🌍</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Configura el modelo y presiona Calcular</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="Capas" value={String(result.rhos.length)} unit="capas" primary />
              <StatCard label="ρa mín." value={rhoMin.toFixed(0)} unit="Ω·m" />
              <StatCard label="ρa máx." value={rhoMax.toFixed(0)} unit="Ω·m" />
              {pattern && <StatCard label="Curva k" value={String(pattern.k)} unit="Orellana" />}
            </div>

            <SectionLabel purple>Sistema Experto</SectionLabel>
            {result.rhos[0] !== undefined && result.rhos[result.rhos.length - 1] !== undefined &&
              result.rhos[0] > (result.rhos[result.rhos.length - 1] ?? 0) ? (
              <ExpertItem type="warn">
                Perfil tipo H o Q: la capa profunda es más conductiva que la superficial. La malla enterrada estará en una zona de menor resistividad — favorable para reducir Rg.
              </ExpertItem>
            ) : (
              <ExpertItem type="info">
                Perfil tipo K o A: la resistividad aumenta en profundidad. Diseñar la malla dentro de la capa superior (h={result.hs[0] ?? '—'} m).
              </ExpertItem>
            )}

            {/* Main curve */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Curva ρa(a) — N capas (Wait)</div>
              <ChartRho points={result.curve} height={180} />
            </div>

            {/* Pattern curve */}
            {pattern && (
              <div style={{ ...panelStyle, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Curva patrón Orellana-Mooney — k = {pattern.k}</div>
                <ChartRho
                  points={pattern.curve.map(p => ({ a: p.t, rhoA: p.ratio }))}
                  yLabel="ρa/ρ1" xLabel="t = a/h₁" height={160}
                />
              </div>
            )}

            {/* Table */}
            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Tabla ρa por espaciamiento</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>a (m)</Th><Th>ρa calculada (Ω·m)</Th></tr></thead>
                <tbody>
                  {result.curve.map((pt, i) => (
                    <tr key={i}><TdMono>{pt.a}</TdMono><TdMono highlight>{pt.rhoA.toFixed(1)}</TdMono></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ExportBar
              module="nlayer"
              inputs={{ rhos: result.rhos, hs: result.hs, spacings: parseNums(spacings) }}
              outputs={{ curve: result.curve }}
              norm={result.norm}
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Kernel de Wait (1954)">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                ρa = ρ1·[1 + 2·∫₀^∞ (T₁(u/a)/ρ1 − 1)·J₁(u)·u·du]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Kernel recursivo T:</strong> calculado desde la capa inferior hacia arriba, usando <code style={{ color: 'var(--copper)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>tanh(λ·h)</code> para cada interfaz.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>J₁(x):</strong> Bessel de primera especie orden 1, aproximado por polinomios de Abramowitz & Stegun §9.4.1.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Wait (1954) · Orellana & Mooney (1966) · IEEE Std 81-2012</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
