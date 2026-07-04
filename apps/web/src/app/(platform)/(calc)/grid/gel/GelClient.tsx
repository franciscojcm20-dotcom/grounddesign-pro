'use client';
import { useState } from 'react';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  Field, calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { SoilRhoField } from '@/components/ui/SoilRhoField';
import { API_BASE as BASE } from '@/lib/apiBase';
import { usePersistedState } from '@/lib/usePersistedState';

function GelSensitivity({ result, rhoGel, radioVarilla, longVarilla, currentR2 }: {
  result: GelResult; rhoGel: number; radioVarilla: number; longVarilla: number; currentR2: number;
}) {
  const L   = longVarilla, r1 = radioVarilla;
  const rhoS = result.rhoSuelo;
  const steps = 20;
  const r2Max = Math.max(currentR2 * 2.5, 0.3);
  const pts: { r2: number; R: number }[] = [];
  for (let i = 1; i <= steps; i++) {
    const r2 = r1 * 1.5 + (r2Max - r1 * 1.5) * (i / steps);
    const Rf = (rhoGel / (2 * Math.PI * L)) * Math.log(r2 / r1);
    const Rs = (rhoS  / (2 * Math.PI * L)) * (Math.log((8 * L) / (2 * r2)) - 1);
    pts.push({ r2: +r2.toFixed(3), R: +(Rf + Rs).toFixed(3) });
  }

  const W = 460, H = 140, PL = 44, PR = 12, PT = 8, PB = 28;
  const CW = W - PL - PR, CH = H - PT - PB;
  const xs  = pts.map(p => p.r2), ys = pts.map(p => p.R);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys) * 0.9, yMax = Math.max(...ys) * 1.08;
  const scX = (v: number) => PL + ((v - xMin) / (xMax - xMin || 1)) * CW;
  const scY = (v: number) => PT + CH - ((v - yMin) / (yMax - yMin || 1)) * CH;
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scX(p.r2).toFixed(1)} ${scY(p.R).toFixed(1)}`).join(' ');
  const cx = scX(currentR2), cy = scY(result.Rtotal);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="var(--faint)" strokeWidth="1" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--faint)" strokeWidth="1" />
      {[yMin, (yMin + yMax) / 2, yMax].map(v => (
        <g key={v}>
          <line x1={PL} y1={scY(v)} x2={W - PR} y2={scY(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2,3" />
          <text x={PL - 4} y={scY(v) + 3.5} fill="var(--faint)" fontSize="7.5" textAnchor="end">{v.toFixed(1)}</text>
        </g>
      ))}
      {pts.filter((_, i) => i % 5 === 0).map(p => (
        <text key={p.r2} x={scX(p.r2)} y={H - PB + 11} fill="var(--faint)" fontSize="7.5" textAnchor="middle">{p.r2}</text>
      ))}
      <text x={W / 2} y={H - 1} fill="var(--faint)" fontSize="8" textAnchor="middle">radio gel r₂ (m)</text>
      <text x={9} y={PT + CH / 2} fill="var(--faint)" fontSize="8" textAnchor="middle" transform={`rotate(-90, 9, ${PT + CH / 2})`}>R (Ω)</text>
      <path d={pathD} fill="none" stroke="var(--safe)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r="4" fill="var(--copper)" stroke="var(--bg)" strokeWidth="1.5" />
      <text x={cx + 6} y={cy - 4} fill="var(--copper)" fontSize="7.5">{result.Rtotal.toFixed(2)} Ω</text>
    </svg>
  );
}

function GelCrossSection({ radioVarilla, radioConGel, longVarilla }: {
  radioVarilla: number; radioConGel: number; longVarilla: number;
}) {
  const W = 460, H = 150;
  const cx = 110, cy = H / 2;
  const scale = Math.min(70 / radioConGel, 900);
  const rOuter = Math.max(radioConGel * scale, 30);
  const rInner = Math.max(radioVarilla * scale, 4);

  const px = 300, py1 = 30, py2 = H - 20;
  const scaleV = (py2 - py1) / Math.max(longVarilla, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <text x={cx} y={16} textAnchor="middle" fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">Corte transversal</text>
      <circle cx={cx} cy={cy} r={rOuter} fill="var(--safe-soft)" stroke="var(--safe)" strokeWidth="1.2" strokeDasharray="4 2" />
      <circle cx={cx} cy={cy} r={rInner} fill="var(--copper)" stroke="var(--bg)" strokeWidth="1" />
      <line x1={cx} y1={cy} x2={cx + rOuter} y2={cy} stroke="var(--faint)" strokeWidth="0.7" strokeDasharray="2 2" />
      <text x={cx + rOuter / 2} y={cy - 5} textAnchor="middle" fontSize={7} fill="var(--safe)">r₂={radioConGel.toFixed(3)}m</text>
      <line x1={cx} y1={cy} x2={cx + rInner} y2={cy + 12} stroke="var(--faint)" strokeWidth="0.7" strokeDasharray="2 2" />
      <text x={cx + rInner + 4} y={cy + 20} fontSize={7} fill="var(--copper)">r₁={radioVarilla.toFixed(4)}m</text>

      <text x={px + 25} y={16} textAnchor="middle" fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">Perfil vertical</text>
      <line x1={px} y1={py1 - 8} x2={px + 60} y2={py1 - 8} stroke="var(--dim)" strokeWidth="1" strokeDasharray="3 2" opacity={0.6} />
      <text x={px + 62} y={py1 - 5} fontSize={7} fill="var(--faint)">nivel de suelo</text>
      <rect x={px + 20} y={py1} width={10} height={longVarilla * scaleV} fill="var(--safe-soft)" stroke="var(--safe)" strokeWidth="1" strokeDasharray="3 2" />
      <rect x={px + 23} y={py1} width={4} height={longVarilla * scaleV} fill="var(--copper)" />
      <text x={px + 40} y={py1 + longVarilla * scaleV / 2} fontSize={7} fill="var(--faint)">L={longVarilla}m</text>
    </svg>
  );
}

interface GelResult {
  Rsin: number; Rfunda: number; Rsuelo: number; Rtotal: number;
  rhoEff: number; mejoraPct: number; rhoSuelo: number;
  norm: string;
}

const DEFAULTS = {
  rhoSuelo:     110,
  rhoGel:       0.3,
  radioVarilla: 0.0079,
  radioConGel:  0.075,
  longVarillaGel: 3,
};

export function GelClient() {
  const [form, setForm] = usePersistedState('gdp-form-gel', DEFAULTS);
  const [result, setResult] = useState<GelResult | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function set(k: string, v: number) { setForm(f => ({ ...f, [k]: v })); }
  function num(k: keyof typeof DEFAULTS) {
    return (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));
  }

  async function calculate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/grid/gel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setResult(await res.json() as GelResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Gel químico — Dwight/Sunde</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          Modelo de cilindros concéntricos · Mejora de resistividad efectiva
        </p>

        <SectionLabel>Suelo y varilla</SectionLabel>
        <SoilRhoField value={form.rhoSuelo} onChange={v => set('rhoSuelo', v)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Radio varilla" unit="m">
            <input style={inputStyle} type="number" step="0.001" value={form.radioVarilla} onChange={num('radioVarilla')} />
          </Field>
          <Field label="Long. varilla" unit="m">
            <input style={inputStyle} type="number" value={form.longVarillaGel} onChange={num('longVarillaGel')} />
          </Field>
        </div>

        <SectionLabel>Funda de gel</SectionLabel>
        <Field label="Resistividad del gel ρgel" unit="Ω·m">
          <input style={inputStyle} type="number" step="0.1" value={form.rhoGel} onChange={num('rhoGel')} />
        </Field>
        <Field label="Radio con gel (funda)" unit="m">
          <input style={inputStyle} type="number" step="0.005" value={form.radioConGel} onChange={num('radioConGel')} />
        </Field>
        <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
          Radio con gel típico: 0.05–0.15 m · ρgel típico: 0.1–1 Ω·m
        </div>

        <button onClick={calculate} disabled={loading} style={{ width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>🧪</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa los parámetros y presiona Calcular</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="R sin gel" value={result.Rsin.toFixed(2)} unit="Ω" />
              <StatCard label="R con gel" value={result.Rtotal.toFixed(2)} unit="Ω" primary />
              <StatCard label="Mejora" value={result.mejoraPct.toFixed(1)} unit="%" ok={result.mejoraPct > 0} />
              <StatCard label="ρ efectiva" value={result.rhoEff.toFixed(1)} unit="Ω·m" ok={result.rhoEff < result.rhoSuelo} />
            </div>

            <CompBanner pass={result.mejoraPct > 0} norm={result.norm}
              msg={`Reducción de ${result.mejoraPct.toFixed(1)}% — de ${result.Rsin.toFixed(2)} Ω a ${result.Rtotal.toFixed(2)} Ω`} />
            <ExportBar module="gel" inputs={form as unknown as Record<string,unknown>} outputs={result as unknown as Record<string,unknown>} norm={result.norm} />

            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Diseño del electrodo (2D)</div>
              <GelCrossSection radioVarilla={form.radioVarilla} radioConGel={form.radioConGel} longVarilla={form.longVarillaGel} />
            </div>

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type="info">
              ρ efectiva = {result.rhoEff.toFixed(1)} Ω·m (vs ρ suelo = {result.rhoSuelo} Ω·m). Esta ρ efectiva puede usarse como entrada en el módulo de Resistencia de Malla para evaluar el impacto global del gel.
            </ExpertItem>
            {result.mejoraPct < 20 && (
              <ExpertItem type="warn">
                Mejora menor al 20%. Considerar aumentar el radio de la funda de gel o reducir ρgel. La relación radioConGel/radioVarilla = {(form.radioConGel / form.radioVarilla).toFixed(0)}× — valores típicos efectivos: 5×–20×.
              </ExpertItem>
            )}

            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Desglose de resistencias</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>Componente</Th><Th>Valor (Ω)</Th><Th>% del total</Th></tr></thead>
                <tbody>
                  {[
                    { label: 'R funda de gel (Rfunda)', val: result.Rfunda, pct: result.Rfunda / result.Rtotal * 100 },
                    { label: 'R suelo exterior (Rsuelo)', val: result.Rsuelo, pct: result.Rsuelo / result.Rtotal * 100 },
                    { label: 'R total con gel', val: result.Rtotal, pct: 100 },
                    { label: 'R sin gel (referencia)', val: result.Rsin, pct: null },
                  ].map(row => (
                    <tr key={row.label}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>{row.label}</td>
                      <TdMono highlight={row.label.includes('total')}>{row.val.toFixed(3)}</TdMono>
                      <TdMono>{row.pct !== null ? `${row.pct.toFixed(1)}%` : '—'}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual de mejora + sensitivity chart */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>Comparación de resistencia</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--faint)' }}>Sin gel</span>
                  <span style={{ fontSize: 9, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{result.Rsin.toFixed(2)} Ω</span>
                </div>
                <div style={{ height: 12, background: 'var(--danger)', borderRadius: 2, width: '100%', opacity: 0.6 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--faint)' }}>Con gel</span>
                  <span style={{ fontSize: 9, color: 'var(--safe)', fontFamily: 'var(--font-mono)' }}>{result.Rtotal.toFixed(2)} Ω</span>
                </div>
                <div style={{ height: 12, background: 'var(--safe)', borderRadius: 2, width: `${Math.max(5, (result.Rtotal / result.Rsin) * 100)}%` }} />
              </div>

              {/* Sensitivity: R vs r2 */}
              <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>Sensibilidad: R total vs radio de gel (m)</div>
              <GelSensitivity result={result} rhoGel={form.rhoGel} radioVarilla={form.radioVarilla} longVarilla={form.longVarillaGel} currentR2={form.radioConGel} />
            </div>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Dwight / Sunde — Cilindros concéntricos">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 8, fontSize: 11 }}>
                Rfunda = (ρgel / 2πL) · ln(r₂/r₁)
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                Rsuelo = (ρ / 2πL) · (ln(8L/2r₂) − 1)
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> r₁ = radio de la varilla, r₂ = radio de la funda de gel, L = longitud de la varilla, ρgel = resistividad del gel (Ω·m).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>ρ efectiva:</strong> resistividad equivalente de un cilindro homogéneo de radio r₁ con la misma resistencia total. Sirve como input para el módulo de malla.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Dwight (1936) · Sunde (1968) · IEEE Std 80-2013</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
