'use client';
import { useState } from 'react';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  Field, calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
  const [form, setForm] = useState(DEFAULTS);
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
        <Field label="Resistividad del suelo ρ" unit="Ω·m">
          <input style={inputStyle} type="number" value={form.rhoSuelo} onChange={num('rhoSuelo')} />
        </Field>
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
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
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
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #1e2230', fontSize: 10, color: 'var(--dim)' }}>{row.label}</td>
                      <TdMono highlight={row.label.includes('total')}>{row.val.toFixed(3)}</TdMono>
                      <TdMono>{row.pct !== null ? `${row.pct.toFixed(1)}%` : '—'}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual de mejora */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>Comparación visual de resistencia</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 4 }}>Sin gel — {result.Rsin.toFixed(2)} Ω</div>
                <div style={{ height: 14, background: 'var(--danger)', borderRadius: 2, width: '100%', opacity: 0.7 }} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 4 }}>Con gel — {result.Rtotal.toFixed(2)} Ω</div>
                <div style={{ height: 14, background: 'var(--safe)', borderRadius: 2, width: `${(result.Rtotal / result.Rsin) * 100}%`, minWidth: 4 }} />
              </div>
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
