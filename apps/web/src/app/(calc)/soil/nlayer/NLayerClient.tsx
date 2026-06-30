'use client';
import { useState } from 'react';
import {
  SectionLabel, StatCard, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono, Field,
} from '@/components/ui/CalcShared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface CurvePoint  { a: number; rhoA: number }
interface NLayerResult { curve: CurvePoint[]; rhos: number[]; hs: number[]; norm: string }
interface PatternPoint { t: number; ratio: number }
interface PatternResult { k: number; curve: PatternPoint[] }

const DEFAULT_RHOS = [1214, 1537, 3200, 800];
const DEFAULT_HS   = [4, 8, 15];
const DEFAULT_SPACINGS = [0.5, 1, 2, 4, 8, 16, 32, 64];

export function NLayerClient() {
  const [rhoStr, setRhoStr] = useState(DEFAULT_RHOS.join(', '));
  const [hsStr,  setHsStr]  = useState(DEFAULT_HS.join(', '));
  const [spacings, setSpacings] = useState(DEFAULT_SPACINGS.join(', '));
  const [patternK, setPatternK] = useState('10');

  const [result,  setResult]  = useState<NLayerResult | null>(null);
  const [pattern, setPattern] = useState<PatternResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function parseNums(s: string) { return s.split(',').map(v => Number(v.trim())).filter(n => !isNaN(n) && n > 0); }

  async function calculate() {
    const rhos = parseNums(rhoStr);
    const hs   = parseNums(hsStr);
    const sp   = parseNums(spacings);
    if (rhos.length < 1) { setError('Ingresa al menos 1 capa (ρ).'); return; }
    if (hs.length !== rhos.length - 1) { setError(`hs debe tener ${rhos.length - 1} valor(es) para ${rhos.length} capas.`); return; }
    setLoading(true); setError(null);
    try {
      const [nlRes, patRes] = await Promise.all([
        fetch(`${BASE}/api/v1/soil/nlayer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spacings: sp, rhos, hs }),
        }).then(r => r.json() as Promise<NLayerResult>),
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
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          Kernel recursivo de Wait (1954) · Curvas Orellana-Mooney
        </p>

        <SectionLabel>Capas del modelo</SectionLabel>
        <Field label="Resistividades ρ₁…ρN" unit="Ω·m (separadas por coma)">
          <input style={inputStyle} value={rhoStr} onChange={e => setRhoStr(e.target.value)} placeholder="ej. 1214, 1537, 800" />
        </Field>
        <Field label="Espesores h₁…h(N-1)" unit="m (separados por coma)">
          <input style={inputStyle} value={hsStr} onChange={e => setHsStr(e.target.value)} placeholder="ej. 4, 8" />
        </Field>
        <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
          N capas = N resistividades · N-1 espesores · La última capa (semi-espacio) no tiene espesor.
        </div>

        <SectionLabel>Espaciamientos a calcular</SectionLabel>
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
              {pattern && <StatCard label="Curva patrón k" value={String(pattern.k)} unit={`→ ${Number(patternK) > 0 ? 'tipo H/K' : 'tipo A/Q'}`} />}
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

            {/* Curva ρa(a) — sparkline SVG simple */}
            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Curva ρa(a) — N capas (Wait)</div>
              <SparkLine points={result.curve} />
            </div>

            {/* Curva patrón */}
            {pattern && (
              <div style={panelStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
                  Curva patrón Orellana-Mooney — k = {pattern.k}
                </div>
                <SparkLine points={pattern.curve.map(p => ({ a: p.t, rhoA: p.ratio }))} yLabel="ρa/ρ1" />
              </div>
            )}

            {/* Tabla de resultados */}
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

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Kernel de Wait (1954)">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                ρa = ρ1·[1 + 2·∫₀^∞ (T₁(u/a)/ρ1 − 1)·J₁(u)·u·du]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Kernel recursivo T:</strong> calculado desde la capa inferior hacia arriba, usando <code style={{ color: 'var(--copper)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>tanh(λ·h)</code> para cada interfaz.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Integración:</strong> 150 puntos uniformes, u ∈ [10⁻³, 200]. Para a muy grandes la precisión disminuye por bajo muestreo del integrando.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>J₁(x):</strong> Bessel de primera especie orden 1, aproximado por polinomios de Abramowitz & Stegun §9.4.1.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Wait (1954) · Orellana & Mooney (1966) · IEEE Std 81-2012</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function SparkLine({ points, yLabel = 'Ω·m' }: { points: { a: number; rhoA: number }[]; yLabel?: string }) {
  if (points.length === 0) return null;
  const W = 500, H = 120, PAD = 30;
  const xs = points.map(p => p.a);
  const ys = points.map(p => p.rhoA);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const scX = (v: number) => PAD + ((v - xMin) / (xMax - xMin || 1)) * (W - PAD * 2);
  const scY = (v: number) => H - PAD - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scX(p.a).toFixed(1)} ${scY(p.rhoA).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 130 }}>
      {/* axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#2a2f3e" strokeWidth="1" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#2a2f3e" strokeWidth="1" />
      {/* labels */}
      <text x={W / 2} y={H - 4} fill="#4b5563" fontSize="9" textAnchor="middle">a (m)</text>
      <text x={8} y={H / 2} fill="#4b5563" fontSize="9" textAnchor="middle" transform={`rotate(-90,8,${H / 2})`}>{yLabel}</text>
      {/* y ticks */}
      {[yMin, (yMin + yMax) / 2, yMax].map(v => (
        <g key={v}>
          <line x1={PAD - 4} y1={scY(v)} x2={PAD} y2={scY(v)} stroke="#2a2f3e" strokeWidth="1" />
          <text x={PAD - 6} y={scY(v) + 3} fill="#4b5563" fontSize="8" textAnchor="end">{v.toFixed(0)}</text>
        </g>
      ))}
      {/* curve */}
      <path d={path} fill="none" stroke="#E07A23" strokeWidth="2" strokeLinejoin="round" />
      {/* dots */}
      {points.map((p, i) => (
        <circle key={i} cx={scX(p.a)} cy={scY(p.rhoA)} r="3" fill="#E07A23" />
      ))}
    </svg>
  );
}
