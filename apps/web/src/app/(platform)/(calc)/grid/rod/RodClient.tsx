'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { api, type RodResult, type RodOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const Scene3D = dynamic(() => import('@/components/ui/Scene3D').then(m => m.Scene3D), { ssr: false });
const Scene3DHint = dynamic(() => import('@/components/ui/Scene3D').then(m => m.Scene3DHint), { ssr: false });
const Rod3D = dynamic(() => import('@/components/ui/Topology3D').then(m => m.Rod3D), { ssr: false });
import { ExportBar } from '@/components/ui/ExportBar';
import { SoilRhoField } from '@/components/ui/SoilRhoField';
import { GelPanel } from '@/components/ui/GelPanel';
import { ConductorPanel } from '@/components/ui/ConductorPanel';
import { DiagnosisPanel, type ComplianceCheck } from '@/components/ui/DiagnosisPanel';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import type { GelParams } from '@/lib/api';

const DEFAULTS = { rho: 110, L: 3, diamMm: 16, n: 4, spacing: 6, iFalla: 8500, tFalla: 0.5 };

function RodDiagram({ n, L }: { n: number; L: number }) {
  const W = 320, H = 200;
  const rodCount = Math.min(n, 8);
  const spacing = Math.min((W - 60) / Math.max(rodCount, 1), 70);
  const startX = (W - spacing * (rodCount - 1)) / 2;
  const groundY = 40;
  const rodH = Math.min(130, L * 25);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="var(--dim)" strokeWidth="1" strokeDasharray="4 3" opacity={0.4} />
      <text x={6} y={groundY - 4} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">nivel de suelo</text>
      {Array.from({ length: rodCount }, (_, i) => {
        const x = startX + i * spacing;
        return (
          <g key={i}>
            <line x1={x} y1={groundY} x2={x} y2={groundY + rodH} stroke="var(--copper)" strokeWidth="3" strokeLinecap="round" />
            <circle cx={x} cy={groundY} r={4} fill="var(--copper)" />
            {i < rodCount - 1 && (
              <line x1={x} y1={groundY} x2={x + spacing} y2={groundY} stroke="var(--copper)" strokeWidth="1.5" opacity={0.6} />
            )}
          </g>
        );
      })}
      <text x={W / 2} y={groundY + rodH + 14} textAnchor="middle" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">L = {L} m</text>
      {rodCount > 1 && (
        <text x={startX + spacing / 2} y={groundY - 10} textAnchor="middle" fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">s</text>
      )}
    </svg>
  );
}

export function RodClient() {
  const faultAnalysis = useFaultAnalysis();
  const [form, setForm] = useState(DEFAULTS);
  const [gel, setGel] = useState<GelParams | null>(null);
  const [result, setResult] = useState<RodResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<RodOptimizeResult | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [view3d, setView3d] = useState(false);

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  function radiusOf() { return (form.diamMm / 1000) / 2; }

  async function calculate() {
    setLoading(true); setError(''); setOptimizeResult(null);
    try {
      const res = await api.grid.rod({
        rho: form.rho, L: form.L,
        radius: radiusOf(),
        n: Math.round(form.n), spacing: form.spacing, iFalla: form.iFalla,
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
      const r = await api.grid.rodOptimize({
        rho: form.rho, L: form.L, radius: radiusOf(), n: Math.round(form.n),
        spacing: form.spacing, iFalla: form.iFalla, targetRg,
        ...(gel ? { gel } : {}),
      });
      setOptimizeResult(r);
    } catch (e) { setError((e as Error).message); }
    finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    const s = optimizeResult.suggested;
    setForm(f => ({ ...f, rho: s.rho, L: s.L, diamMm: Math.round(s.radius * 2000 * 10) / 10, n: s.n, spacing: s.spacing, iFalla: s.iFalla }));
    setOptimizeResult(null);
  }

  const pass = result ? (result.compliance.rg1 || result.compliance.rg5) : null;

  const complianceChecks: ComplianceCheck[] = result ? [
    { label: 'Rn ≤ 1 Ω (subestaciones críticas)', pass: result.compliance.rg1, detail: `Rn calculada = ${result.Rn.toFixed(3)} Ω.` },
    { label: 'Rn ≤ 5 Ω (uso general)', pass: result.compliance.rg5, detail: `Rn calculada = ${result.Rn.toFixed(3)} Ω.` },
  ] : [];
  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.rg1) {
    diagnosis.push(`Rn = ${result.Rn.toFixed(3)} Ω supera 1 Ω porque la resistencia mutua entre picas (Rm = ${result.Rm.toFixed(3)} Ω) no se reduce lo suficiente con la separación actual (${form.spacing} m); Rn = (R1 + (n-1)·Rm) / n.`);
    if (form.spacing < 2 * form.L) diagnosis.push(`La separación entre picas (${form.spacing} m) es menor a 2×L (${(2 * form.L).toFixed(1)} m); a menor separación, mayor acoplamiento mutuo y menor beneficio de agregar picas adicionales.`);
    if (form.n < 6) diagnosis.push(`Solo hay ${Math.round(form.n)} picas configuradas; agregar picas en paralelo reduce Rn de forma aproximadamente proporcional a 1/n para separaciones adecuadas.`);
  }
  if (result && result.rhoUsado !== undefined && result.rhoUsado > 500) {
    dataQuality.push(`ρ = ${result.rhoUsado.toFixed(0)} Ω·m es inusualmente alto; revisa las mediciones de campo antes de dimensionar en base a este valor.`);
  }

  return (
    <div style={calcLayout}>
      {/* ── LEFT: inputs ── */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar
          module="rod"
          inputs={{ ...form }}
          outputs={(result ?? {}) as unknown as Record<string,unknown>}
          norm="Dwight (1936) — IEEE 80-2013 Annex B.1"
        />

        <div style={panelStyle}>
          <SectionLabel>Electrodo</SectionLabel>
          <SoilRhoField value={form.rho} onChange={v => setForm(f => ({ ...f, rho: v }))} />
          <Field label="Longitud de pica L (m)">
            <input style={inputStyle} type="number" value={form.L} step="0.5" onChange={set('L')} />
          </Field>
          <Field label="Diámetro de pica (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
          </Field>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Configuración</SectionLabel>
          <Field label="Número de picas n">
            <input style={inputStyle} type="number" value={form.n} min="1" step="1" onChange={set('n')} />
          </Field>
          <Field label="Separación entre picas s (m)">
            <input style={inputStyle} type="number" value={form.spacing} step="0.5" onChange={set('spacing')} />
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

        <button
          onClick={calculate}
          disabled={loading || !faultAnalysis.result}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (loading || !faultAnalysis.result) ? .6 : 1 }}
        >
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      </aside>

      {/* ── RIGHT: results ── */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {([['2D', false], ['3D', true]] as const).map(([label, is3d]) => (
              <button key={label} onClick={() => setView3d(is3d)} style={{
                flex: 1, padding: '5px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9.5, fontWeight: 700,
                background: view3d === is3d ? 'var(--copper-soft)' : 'var(--bg)',
                border: `1px solid ${view3d === is3d ? 'var(--copper)' : 'var(--line)'}`,
                color: view3d === is3d ? 'var(--copper)' : 'var(--dim)',
              }}>{label}</button>
            ))}
          </div>
          {view3d ? (
            <>
              <Scene3D size={Math.max(form.n * form.spacing, form.L * 3)}>
                <Rod3D n={form.n} L={form.L} spacing={form.spacing} />
              </Scene3D>
              <Scene3DHint />
            </>
          ) : (
            <RodDiagram n={form.n} L={form.L} />
          )}
        </div>

        {result && (
          <>
            <CompBanner
              pass={!!pass}
              label={pass ? `Rn = ${result.Rn.toFixed(3)} Ω — cumple IEEE 80` : `Rn = ${result.Rn.toFixed(3)} Ω — no cumple (> 5 Ω)`}
              norm="Dwight/Sunde (1949) — IEEE 80-2013"
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <StatCard label="R₁ — una pica" value={`${result.R1.toFixed(3)} Ω`} />
              <StatCard label={`Rₙ — ${Math.round(form.n)} picas`} value={`${result.Rn.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>

            <div style={panelStyle}>
              <SectionLabel>Desglose</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Parámetro</Th><Th>Valor</Th><Th>Referencia</Th></tr></thead>
                <tbody>
                  <tr><TdMono>R₁ (Dwight)</TdMono><TdMono>{result.R1.toFixed(4)} Ω</TdMono><TdMono>Annex B.1</TdMono></tr>
                  <tr><TdMono>Rm (mutua)</TdMono><TdMono>{result.Rm.toFixed(4)} Ω</TdMono><TdMono>Sunde 1949</TdMono></tr>
                  <tr><TdMono>Rₙ total</TdMono><TdMono>{result.Rn.toFixed(4)} Ω</TdMono><TdMono>paralelo</TdMono></tr>
                  <tr><TdMono>GPR</TdMono><TdMono>{result.gpr.toFixed(0)} V</TdMono><TdMono>Rn × Ig</TdMono></tr>
                  {result.rhoUsado !== undefined && (
                    <tr><TdMono>ρ usada</TdMono><TdMono>{result.rhoUsado.toFixed(1)} Ω·m{result.gelInfo?.activo ? ' (con gel)' : ''}</TdMono><TdMono>—</TdMono></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>Rn</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono>
                    <TdMono>{result.Rn.toFixed(3)} Ω</TdMono>
                    <TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--safe)' : 'var(--danger)' }}>
                      {result.compliance.rg1 ? '✓ OK' : '✗'}
                    </TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono>
                    <TdMono>{result.Rn.toFixed(3)} Ω</TdMono>
                    <TdMono>≤ 5 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg5 ? 'var(--safe)' : 'var(--danger)' }}>
                      {result.compliance.rg5 ? '✓ OK' : '✗'}
                    </TdMono>
                  </tr>
                </tbody>
              </table>
            </div>

            <ExpertItem type="info">
              GPR = Rn × Ifalla = {result.Rn.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
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
              targetLabel={result.compliance.rg1 ? 'Rn ≤ 1 Ω' : 'Rn ≤ 5 Ω'}
              methodNote="El motor prueba, en orden de menor costo, agregar picas, luego alargarlas, luego aumentar la separación entre ellas (reduce el acoplamiento mutuo Rm) — reteniendo solo cambios que efectivamente reducen Rn."
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Dwight / Sunde — Electrodos verticales en paralelo">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                R₁ = (ρ/2πL)·(ln(8L/d) − 1) &nbsp;·&nbsp; Rm = (ρ/2πL)·(ln(2L/s) − 1) &nbsp;·&nbsp; Rₙ = (R₁ + (n−1)·Rm) / n
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> ρ = resistividad del suelo (Ω·m), L = longitud de la pica (m),
              d = diámetro de la pica (m), s = separación entre picas (m), n = número de picas en paralelo.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Interpretación:</strong> R₁ es la resistencia de una sola pica (Dwight, 1936). Rm es la resistencia mutua entre dos picas adyacentes (Sunde, 1949) — cuantifica cuánto se solapan sus zonas de disipación de corriente. Rₙ combina ambas: agregar picas reduce Rn, pero el beneficio decrece si la separación s es pequeña frente a L, porque Rm crece y limita el efecto de paralelo ideal (que sería R₁/n).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Límites típicos:</strong> Rn ≤ 1 Ω para instalaciones críticas, ≤ 5 Ω para uso general (IEEE 80). Al igual que en malla, la verificación definitiva es el cumplimiento de tensiones de paso y contacto.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Dwight, H.B. (1936) — Calculation of Resistances to Ground · Sunde, E.D. (1949) — Earth Conduction Effects in Transmission Systems · IEEE Std 80-2013 Annex B.1</p>
            </FundBtn>
          </>
        )}
      </main>
    </div>
  );
}
