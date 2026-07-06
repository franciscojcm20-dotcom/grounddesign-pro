'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { api, type StripResult, type StripOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const StripScene3D = dynamic(() => import('@/components/ui/Topology3D').then(m => m.StripScene3D), { ssr: false });
import { ExportBar } from '@/components/ui/ExportBar';
import { SoilRhoField } from '@/components/ui/SoilRhoField';
import { GelPanel } from '@/components/ui/GelPanel';
import { ConductorPanel } from '@/components/ui/ConductorPanel';
import { DiagnosisPanel, type ComplianceCheck } from '@/components/ui/DiagnosisPanel';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { NormativeProfileSelector } from '@/components/ui/NormativeProfileSelector';
import { evaluateRgCompliance, effectiveRgGeneral } from '@gdp/engines-math';
import { usePersistedState } from '@/lib/usePersistedState';
import type { GelParams } from '@/lib/api';

const DEFAULTS = { rho: 110, L: 50, h: 0.6, diamMm: 10, iFalla: 8500, tFalla: 0.5 };

function StripDiagram({ L, h }: { L: number; h: number }) {
  const W = 320, H = 160;
  const groundY = 50;
  const conductorY = groundY + Math.min(h * 60, 80);
  const x1 = 30, x2 = W - 30;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      <rect x={0} y={groundY} width={W} height={H - groundY} fill="var(--panel)" opacity={0.4} rx={2} />
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="var(--dim)" strokeWidth="1" strokeDasharray="4 3" opacity={0.5} />
      <text x={6} y={groundY - 4} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">nivel de suelo</text>
      <line x1={x1} y1={conductorY} x2={x2} y2={conductorY} stroke="var(--copper)" strokeWidth="4" strokeLinecap="round" />
      <circle cx={x1} cy={conductorY} r={4} fill="var(--copper)" />
      <circle cx={x2} cy={conductorY} r={4} fill="var(--copper)" />
      <line x1={W / 2} y1={groundY} x2={W / 2} y2={conductorY - 2} stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 2" />
      <text x={W / 2 + 4} y={(groundY + conductorY) / 2} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">h={h}m</text>
      <text x={(x1 + x2) / 2} y={conductorY + 16} textAnchor="middle" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">L = {L} m</text>
    </svg>
  );
}

export function StripClient() {
  const faultAnalysis = useFaultAnalysis();
  const { profile, relaxedConditionsMet } = useNormativeProfile();
  const [form, setForm] = usePersistedState('gdp-form-strip', DEFAULTS);
  const [gel, setGel] = useState<GelParams | null>(null);
  const [result, setResult] = useState<StripResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<StripOptimizeResult | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [view3d, setView3d] = useState(false);

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  function radiusOf() { return (form.diamMm / 1000) / 2; }

  async function calculate() {
    setLoading(true); setError(''); setOptimizeResult(null);
    try {
      const res = await api.grid.strip({
        rho: form.rho, L: form.L, h: form.h,
        radius: radiusOf(), iFalla: form.iFalla,
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
      const r = await api.grid.stripOptimize({
        rho: form.rho, L: form.L, h: form.h, radius: radiusOf(), iFalla: form.iFalla, targetRg,
        ...(gel ? { gel } : {}),
      });
      setOptimizeResult(r);
    } catch (e) { setError((e as Error).message); }
    finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    const s = optimizeResult.suggested;
    setForm(f => ({ ...f, rho: s.rho, L: s.L, h: s.h, diamMm: Math.round(s.radius * 2000 * 10) / 10, iFalla: s.iFalla }));
    setOptimizeResult(null);
  }

  const complianceChecks: ComplianceCheck[] = result ? [
    { label: 'Rh ≤ 1 Ω (subestaciones críticas)', pass: result.compliance.rg1, detail: `Rh calculada = ${result.Rh.toFixed(3)} Ω.` },
    { label: 'Rh ≤ 5 Ω (uso general)', pass: result.compliance.rg5, detail: `Rh calculada = ${result.Rh.toFixed(3)} Ω.` },
    {
      label: `Rh ≤ ${effectiveRgGeneral(profile, relaxedConditionsMet)} Ω — ${profile.label}${relaxedConditionsMet && profile.rgRelaxed !== undefined ? ' (relajado, declarado por el usuario)' : ''}`,
      pass: evaluateRgCompliance(result.Rh, profile, relaxedConditionsMet).rgGeneral,
      detail: `${profile.standard}. ${profile.notes}`,
    },
  ] : [];
  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.rg1) {
    diagnosis.push(`Rh = ${result.Rh.toFixed(3)} Ω supera 1 Ω: R = (ρ/πL)·[ln(2L²/(a·h)) − 1]; con L = ${form.L} m el término 1/L domina y penaliza fuertemente conductores cortos.`);
    if (form.L < 60) diagnosis.push(`La longitud actual (${form.L} m) es reducida; el conductor horizontal necesita más longitud que una malla para lograr la misma Rh debido a la ausencia de efecto de área.`);
  }
  if (result && result.rhoUsado !== undefined && result.rhoUsado > 500) {
    dataQuality.push(`ρ = ${result.rhoUsado.toFixed(0)} Ω·m es inusualmente alto; revisa las mediciones de campo antes de dimensionar en base a este valor.`);
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="strip" inputs={{ ...form }} outputs={(result ?? {}) as unknown as Record<string,unknown>} norm="Dwight (1936) — IEEE 80-2013 Annex B.3" />

        <div style={panelStyle}>
          <SectionLabel>Conductor</SectionLabel>
          <NormativeProfileSelector />
          <SoilRhoField value={form.rho} onChange={v => setForm(f => ({ ...f, rho: v }))} />
          <Field label="Longitud total L (m)">
            <input style={inputStyle} type="number" value={form.L} step="5" onChange={set('L')} />
          </Field>
          <Field label="Profundidad de enterramiento h (m)">
            <input style={inputStyle} type="number" value={form.h} step="0.1" onChange={set('h')} />
          </Field>
          <Field label="Diámetro del conductor (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
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
            <StripScene3D L={form.L} h={form.h} />
          ) : (
            <StripDiagram L={form.L} h={form.h} />
          )}
        </div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rh = ${result.Rh.toFixed(3)} Ω — ${result.compliance.rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
              norm="Dwight (1936) — IEEE 80-2013 Annex B.3"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              <StatCard label="Resistencia Rh" value={`${result.Rh.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>
            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>Rh</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono><TdMono>{result.Rh.toFixed(3)} Ω</TdMono><TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--safe)' : 'var(--danger)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rh.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
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
              GPR = Rh × Ifalla = {result.Rh.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
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
              targetLabel={result.compliance.rg1 ? 'Rh ≤ 1 Ω' : 'Rh ≤ 5 Ω'}
              methodNote="El motor prueba, en orden de menor costo, ampliar la longitud del conductor, luego la profundidad de enterramiento, luego la sección — reteniendo solo cambios que reducen Rh."
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Dwight — Conductor horizontal enterrado">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                Rh = (ρ/πL) · [ln(2L²/(a·h)) − 1]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> ρ = resistividad del suelo (Ω·m), L = longitud total del conductor (m),
              a = radio del conductor (m), h = profundidad de enterramiento (m).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Interpretación:</strong> a diferencia de la malla (Sverak), que se beneficia del área que encierra, un conductor horizontal recto solo dispersa corriente a lo largo de su longitud — por eso Rh depende casi enteramente de L, y necesita tramos mucho más largos que una malla equivalente para alcanzar la misma resistencia. Es el método adecuado para alimentadores, líneas de contrapeso o cuando el terreno disponible no permite una huella de malla.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Límites típicos:</strong> Rh ≤ 1 Ω para instalaciones críticas, ≤ 5 Ω para uso general (IEEE 80). La verificación definitiva es el cumplimiento de tensiones de paso y contacto.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Dwight, H.B. (1936) — Calculation of Resistances to Ground · IEEE Std 80-2013 Annex B.3</p>
            </FundBtn>
          </>
        )}
      </main>
    </div>
  );
}
