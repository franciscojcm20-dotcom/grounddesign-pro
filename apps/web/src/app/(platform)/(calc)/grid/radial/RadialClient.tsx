'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { api, type RadialResult, type RadialOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const RadialScene3D = dynamic(() => import('@/components/ui/Topology3D').then(m => m.RadialScene3D), { ssr: false });
import { ExportBar } from '@/components/ui/ExportBar';
import { SoilRhoField } from '@/components/ui/SoilRhoField';
import { GelPanel } from '@/components/ui/GelPanel';
import { ConductorPanel } from '@/components/ui/ConductorPanel';
import { DiagnosisPanel, type ComplianceCheck } from '@/components/ui/DiagnosisPanel';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { NormativeProfileSelector } from '@/components/ui/NormativeProfileSelector';
import { evaluateRgCompliance } from '@gdp/engines-math';
import type { GelParams } from '@/lib/api';

const DEFAULTS = { rho: 110, L: 20, h: 0.6, diamMm: 10, n: 8, iFalla: 8500, tFalla: 0.5 };

function StarDiagram({ n, L }: { n: number; L: number }) {
  const W = 260, H = 220, cx = W / 2, cy = H / 2;
  const radius = Math.min(cx, cy) - 20;
  const arms = Math.max(Math.min(Math.round(n), 16), 2);
  const scale = radius / Math.max(L, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      {Array.from({ length: arms }, (_, i) => {
        const angle = (i / arms) * 2 * Math.PI - Math.PI / 2;
        const x2 = cx + Math.cos(angle) * radius;
        const y2 = cy + Math.sin(angle) * radius;
        return (
          <line key={i} x1={cx} y1={cy} x2={x2} y2={y2}
            stroke="var(--copper)" strokeWidth="2.5" strokeLinecap="round" opacity={0.9} />
        );
      })}
      <circle cx={cx} cy={cy} r={5} fill="var(--copper)" />
      <text x={cx} y={cy + radius + 16} textAnchor="middle" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">
        {arms} radiales × L={L} m
      </text>
      <text x={cx + radius * 0.55} y={cy - radius * 0.55} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">L</text>
    </svg>
  );
}

export function RadialClient() {
  const faultAnalysis = useFaultAnalysis();
  const { profile } = useNormativeProfile();
  const [form, setForm] = useState(DEFAULTS);
  const [gel, setGel] = useState<GelParams | null>(null);
  const [result, setResult] = useState<RadialResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<RadialOptimizeResult | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [view3d, setView3d] = useState(false);

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  function radiusOf() { return (form.diamMm / 1000) / 2; }

  async function calculate() {
    setLoading(true); setError(''); setOptimizeResult(null);
    try {
      const res = await api.grid.radial({
        rho: form.rho, L: form.L, h: form.h,
        radius: radiusOf(),
        n: Math.round(form.n), iFalla: form.iFalla,
        ...(gel ? { gel } : {}),
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function optimize() {
    if (!result) return;
    setOptimizing(true);
    try {
      const targetRg = result.compliance.rg1 ? 1 : 5;
      const r = await api.grid.radialOptimize({
        rho: form.rho, L: form.L, h: form.h, radius: radiusOf(), n: Math.round(form.n), iFalla: form.iFalla, targetRg,
        ...(gel ? { gel } : {}),
      });
      setOptimizeResult(r);
    } catch (e) { setError((e as Error).message); }
    finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    const s = optimizeResult.suggested;
    setForm(f => ({ ...f, rho: s.rho, L: s.L, h: s.h, diamMm: Math.round(s.radius * 2000 * 10) / 10, n: s.n, iFalla: s.iFalla }));
    setOptimizeResult(null);
  }

  const complianceChecks: ComplianceCheck[] = result ? [
    { label: 'R★ ≤ 1 Ω (subestaciones críticas)', pass: result.compliance.rg1, detail: `R★ calculada = ${result.Rstar.toFixed(3)} Ω.` },
    { label: 'R★ ≤ 5 Ω (uso general)', pass: result.compliance.rg5, detail: `R★ calculada = ${result.Rstar.toFixed(3)} Ω.` },
    {
      label: `R★ ≤ ${profile.rgGeneral} Ω — ${profile.label}`,
      pass: evaluateRgCompliance(result.Rstar, profile).rgGeneral,
      detail: `${profile.standard}. ${profile.notes}`,
    },
  ] : [];
  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.rg1) {
    diagnosis.push(`R★ = ${result.Rstar.toFixed(3)} Ω supera 1 Ω: la fórmula de Niemann castiga el acoplamiento mutuo entre radiales cuando la profundidad h es comparable a L; con ${Math.round(form.n)} radiales de ${form.L} m, el beneficio marginal de cada radial adicional decrece.`);
    if (form.n < 8) diagnosis.push(`Solo hay ${Math.round(form.n)} radiales; agregar más radiales angulares reduce R★ de forma menos que proporcional debido al acoplamiento mutuo — considera también alargar cada radial.`);
  }
  if (result && result.rhoUsado !== undefined && result.rhoUsado > 500) {
    dataQuality.push(`ρ = ${result.rhoUsado.toFixed(0)} Ω·m es inusualmente alto; revisa las mediciones de campo antes de dimensionar en base a este valor.`);
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="radial" inputs={{ ...form }} outputs={(result ?? {}) as unknown as Record<string,unknown>} norm="Laurent-Niemann (1952) — IEEE 80-2013 Annex B" />

        <div style={panelStyle}>
          <SectionLabel>Conductor radial</SectionLabel>
          <NormativeProfileSelector />
          <SoilRhoField value={form.rho} onChange={v => setForm(f => ({ ...f, rho: v }))} />
          <Field label="Longitud de cada radial L (m)">
            <input style={inputStyle} type="number" value={form.L} step="5" onChange={set('L')} />
          </Field>
          <Field label="Profundidad h (m)">
            <input style={inputStyle} type="number" value={form.h} step="0.1" onChange={set('h')} />
          </Field>
          <Field label="Diámetro del conductor (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
          </Field>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Configuración estrella</SectionLabel>
          <Field label="Número de radiales n">
            <input style={inputStyle} type="number" value={form.n} min="2" step="1" onChange={set('n')} />
          </Field>
          <Field label="Separación angular">
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4 }}>
              {(360 / Math.max(form.n, 1)).toFixed(1)}° entre radiales (igual)
            </div>
          </Field>
          <FaultCurrentField onSync={v => setForm(f => ({ ...f, iFalla: v }))} />
          <Field label="Tiempo de despeje (s)">
            <input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={set('tFalla')} />
          </Field>
        </div>

        <div style={panelStyle}>
          <GelPanel rhoSuelo={form.rho} onChange={setGel} />
          <ConductorPanel iFalla={form.iFalla} tFalla={form.tFalla} onChange={(diamMm) => setForm(f => ({ ...f, diamMm: Math.round(diamMm * 10) / 10 }))} />
        </div>

        <button onClick={calculate} disabled={loading || !faultAnalysis.result}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (loading || !faultAnalysis.result) ? .6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {([['2D', false], ['3D', true]] as const).map(([label, is3d]) => (
              <button key={label} onClick={() => setView3d(is3d)} onMouseEnter={() => { if (is3d) import('@/components/ui/Topology3D'); }} style={{
                flex: 1, padding: '5px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9.5, fontWeight: 700,
                background: view3d === is3d ? 'var(--copper-soft)' : 'var(--bg)',
                border: `1px solid ${view3d === is3d ? 'var(--copper)' : 'var(--line)'}`,
                color: view3d === is3d ? 'var(--copper)' : 'var(--dim)',
              }}>{label}</button>
            ))}
          </div>
          {view3d ? (
            <RadialScene3D n={form.n} L={form.L} h={form.h} />
          ) : (
            <StarDiagram n={form.n} L={form.L} />
          )}
        </div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rstar = ${result.Rstar.toFixed(3)} Ω — ${result.compliance.rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
              norm="Laurent-Niemann (1952) — IEEE 80-2013 Annex B"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <StatCard label="R₁ (un radial)" value={`${result.R1.toFixed(3)} Ω`} />
              <StatCard label={`R★ (${Math.round(form.n)} radiales)`} value={`${result.Rstar.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>
            <div style={panelStyle}>
              <SectionLabel>Desglose</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Parámetro</Th><Th>Valor</Th><Th>Referencia</Th></tr></thead>
                <tbody>
                  <tr><TdMono>R₁ — radial solo</TdMono><TdMono>{result.R1.toFixed(4)} Ω</TdMono><TdMono>Dwight</TdMono></tr>
                  <tr><TdMono>R★ — estrella</TdMono><TdMono>{result.Rstar.toFixed(4)} Ω</TdMono><TdMono>Laurent-Niemann</TdMono></tr>
                  <tr><TdMono>Lt total</TdMono><TdMono>{result.Ltotal.toFixed(1)} m</TdMono><TdMono>n × L</TdMono></tr>
                  <tr><TdMono>GPR</TdMono><TdMono>{result.gpr.toFixed(0)} V</TdMono><TdMono>R★ × Ig</TdMono></tr>
                </tbody>
              </table>
            </div>
            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>R★</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono><TdMono>{result.Rstar.toFixed(3)} Ω</TdMono><TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--safe)' : 'var(--danger)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rstar.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg5 ? 'var(--safe)' : 'var(--danger)' }}>{result.compliance.rg5 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                </tbody>
              </table>
            </div>
            {result.rhoUsado !== undefined && (
              <div style={{ fontSize: 10, color: 'var(--faint)' }}>
                ρ usada: {result.rhoUsado.toFixed(1)} Ω·m{result.gelInfo?.activo ? ' (con gel)' : ''}
              </div>
            )}

            <ExpertItem type="info">
              GPR = R★ × Ifalla = {result.Rstar.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
              Este valor alimenta el cálculo de tensiones de paso y contacto.
            </ExpertItem>

            <DiagnosisPanel
              checks={complianceChecks}
              diagnosis={diagnosis}
              dataQuality={dataQuality}
              onOptimize={optimize}
              optimizing={optimizing}
              optimizeResult={optimizeResult}
              onApplySuggested={applySuggested}
              targetLabel={result.compliance.rg1 ? 'R★ ≤ 1 Ω' : 'R★ ≤ 5 Ω'}
              methodNote="El motor prueba, en orden de menor costo, agregar radiales, luego alargarlos, luego aumentar la profundidad — reteniendo solo cambios que reducen R★."
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Laurent-Niemann — Sistema radial / estrella">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                R₁ = (ρ/πL)·[ln(2L²/(a·h)) − 1] &nbsp;·&nbsp; R★ = (ρ/πnL)·[ln(2L²/(a·h)) − 1 + (n−1)·h/L]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> ρ = resistividad del suelo (Ω·m), L = longitud de cada radial (m),
              a = radio del conductor (m), h = profundidad de enterramiento (m), n = número de radiales con igual separación angular.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Interpretación:</strong> cada radial se comporta como un conductor horizontal individual (mismo término que Dwight), pero al converger todos en el punto central compiten por el mismo volumen de suelo — el término (n−1)·h/L de Niemann penaliza ese acoplamiento mutuo. Es el método natural cuando la geometría del sitio favorece una configuración en estrella (torres, postes, estructuras puntuales) antes que una malla rectangular.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Límites típicos:</strong> R★ ≤ 1 Ω para instalaciones críticas, ≤ 5 Ω para uso general (IEEE 80). La verificación definitiva es el cumplimiento de tensiones de paso y contacto.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Laurent, P. — Niemann, H. (1952) · IEEE Std 80-2013 Annex B</p>
            </FundBtn>
          </>
        )}
      </main>
    </div>
  );
}
