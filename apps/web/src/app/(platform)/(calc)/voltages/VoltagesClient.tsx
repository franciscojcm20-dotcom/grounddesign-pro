'use client';
import { useState } from 'react';
import { api, type VoltagesRealResult, type VoltagesOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem,
  FundBtn, calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { BarCompareChart } from '@/components/ui/Charts';
import { DiagnosisPanel, type ComplianceCheck } from '@/components/ui/DiagnosisPanel';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { NormativeProfileSelector } from '@/components/ui/NormativeProfileSelector';
import { usePersistedState } from '@/lib/usePersistedState';

// Defaults: malla 40×30 m, conductor 4/0 AWG (d equivalente), ρ=110, ρs=2500
const DEFAULTS = {
  rho: 110, Ig: 8500, D: 6.25, d: 0.01165, h: 0.6, n: 6, Ltotal: 446,
  rhoSuperficial: 2500, hSuperficial: 0.10, tFalla: 0.5, peso: 70 as 50 | 70,
};

export function VoltagesClient() {
  const faultAnalysis = useFaultAnalysis();
  const { profile } = useNormativeProfile();
  const [form, setForm] = usePersistedState('gdp-form-voltages', DEFAULTS);
  const [result, setResult] = useState<VoltagesRealResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<VoltagesOptimizeResult | null>(null);

  function set<K extends keyof typeof DEFAULTS>(k: K, v: typeof DEFAULTS[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function num(k: keyof typeof DEFAULTS) {
    return (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  }

  async function calculate() {
    setLoading(true); setError(null); setOptimizeResult(null);
    try {
      setResult(await api.voltages.real(form));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  async function optimize() {
    if (!result) return;
    setOptimizing(true);
    try {
      setOptimizeResult(await api.voltages.optimize(form));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    setForm(f => ({ ...f, ...optimizeResult.suggested }));
    setOptimizeResult(null);
  }

  const allPass = result
    ? result.compliance.touch.pass && result.compliance.step.pass
    : null;

  const complianceChecks: ComplianceCheck[] = result ? [
    { label: 'Tensión de contacto (touch)', pass: result.compliance.touch.pass, detail: `Em = ${result.compliance.touch.real_V.toFixed(0)} V vs admisible ${result.eTouchAdm_V.toFixed(0)} V.` },
    { label: 'Tensión de paso (step)', pass: result.compliance.step.pass, detail: `Es = ${result.compliance.step.real_V.toFixed(0)} V vs admisible ${result.eStepAdm_V.toFixed(0)} V.` },
    ...(profile.touchVoltageMaxV ? [{
      label: `Ucontacto ≤ ${profile.touchVoltageMaxV} V — ${profile.label}`,
      pass: result.compliance.touch.real_V <= profile.touchVoltageMaxV,
      detail: `${profile.standard}. Em calculada = ${result.compliance.touch.real_V.toFixed(0)} V. A diferencia del criterio IEEE (admisible variable según Cs/t), esta norma fija un límite directo de tensión de contacto. ${profile.notes}`,
    }] : []),
  ] : [];
  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.touch.pass) {
    diagnosis.push(`Em = ${result.compliance.touch.real_V.toFixed(0)} V supera el admisible de ${result.eTouchAdm_V.toFixed(0)} V: Em = ρ·Ki·Ig·Km/Lt; con Lt = ${form.Ltotal} m la resistividad efectiva sigue transfiriendo demasiado potencial al conductor.`);
    if (form.hSuperficial < 0.1) diagnosis.push(`La capa superficial de grava (${form.hSuperficial} m, ${form.rhoSuperficial} Ω·m) es delgada o de baja resistividad; una capa más gruesa o de mayor ρs sube directamente el límite admisible al reducir el factor Cs.`);
  }
  if (result && !result.compliance.step.pass) {
    diagnosis.push(`Es = ${result.compliance.step.real_V.toFixed(0)} V supera el admisible de ${result.eStepAdm_V.toFixed(0)} V — el factor Ks depende de D y h; aumentar el espaciado de conductores o la profundidad reduce Ks.`);
  }
  if (form.rhoSuperficial < 1500) dataQuality.push(`ρ superficial = ${form.rhoSuperficial} Ω·m es bajo para una capa de grava típica (1500–5000 Ω·m); confirma que corresponde al material realmente especificado para la capa superficial, no al suelo natural.`);
  if (form.tFalla < 0.1 || form.tFalla > 3) dataQuality.push(`El tiempo de despeje de falla (${form.tFalla} s) está fuera del rango habitual (0.1–3 s); revisa la coordinación de protecciones utilizada como dato de entrada.`);

  return (
    <div style={calcLayout}>
      {/* INPUTS */}
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Tensiones paso / contacto</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          IEEE Std 80-2013, Cl. 16.5 (Sverak simplificado)
        </p>

        <NormativeProfileSelector />

        <SectionLabel>Parámetros de la malla</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="ρ suelo" unit="Ω·m"><input style={inputStyle} type="number" value={form.rho} onChange={num('rho')} /></Field>
          <FaultCurrentField onSync={v => set('Ig', v)} />
          <Field label="D (espaciado)" unit="m"><input style={inputStyle} type="number" step="0.5" value={form.D} onChange={num('D')} /></Field>
          <Field label="d (diámetro cond.)" unit="m"><input style={inputStyle} type="number" step="0.001" value={form.d} onChange={num('d')} /></Field>
          <Field label="h (profundidad)" unit="m"><input style={inputStyle} type="number" step="0.1" value={form.h} onChange={num('h')} /></Field>
          <Field label="n (conductores equiv.)" unit=""><input style={inputStyle} type="number" value={form.n} onChange={num('n')} /></Field>
          <Field label="Ltotal" unit="m"><input style={inputStyle} type="number" value={form.Ltotal} onChange={num('Ltotal')} /></Field>
        </div>

        <SectionLabel>Capa superficial</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="ρ capa superficial" unit="Ω·m"><input style={inputStyle} type="number" value={form.rhoSuperficial} onChange={num('rhoSuperficial')} /></Field>
          <Field label="Espesor hs" unit="m"><input style={inputStyle} type="number" step="0.01" value={form.hSuperficial} onChange={num('hSuperficial')} /></Field>
        </div>

        <SectionLabel>Criterio de persona</SectionLabel>
        <Field label="Tiempo de despeje" unit="s">
          <input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={num('tFalla')} />
        </Field>
        <Field label="Peso de persona" unit="kg">
          <div style={{ display: 'flex', gap: 8 }}>
            {([50, 70] as const).map(p => (
              <button key={p} onClick={() => set('peso', p)} style={{
                flex: 1, padding: '6px', borderRadius: 3, cursor: 'pointer',
                background: form.peso === p ? 'var(--copper-soft)' : 'var(--bg)',
                border: `1px solid ${form.peso === p ? 'var(--copper)' : 'var(--line)'}`,
                color: form.peso === p ? 'var(--copper)' : 'var(--dim)', fontSize: 11, fontWeight: 700,
              }}>{p} kg</button>
            ))}
          </div>
        </Field>

        <button onClick={calculate} disabled={loading || !faultAnalysis.result} style={{
          width: '100%', background: 'var(--copper)', border: 'none',
          color: '#fff', fontWeight: 700, fontSize: 11, padding: 10,
          borderRadius: 3, cursor: 'pointer', opacity: (loading || !faultAnalysis.result) ? 0.6 : 1, marginTop: 4,
        }}>{loading ? 'Calculando…' : 'Calcular'}</button>
        {error && <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      {/* RESULTS */}
      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⚠</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa los parámetros y presiona Calcular</div>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="Em (contacto real)" value={result.compliance.touch.real_V.toFixed(0)} unit="V" primary />
              <StatCard label="Es (paso real)" value={result.compliance.step.real_V.toFixed(0)} unit="V" primary />
              <StatCard label="Etouch adm." value={result.eTouchAdm_V.toFixed(0)} unit="V" ok={result.compliance.touch.pass} />
              <StatCard label="Estep adm." value={result.eStepAdm_V.toFixed(0)} unit="V" ok={result.compliance.step.pass} />
            </div>

            <CompBanner
              pass={allPass ?? false}
              norm={result.norm}
              msg={allPass
                ? 'Tensiones de contacto y paso dentro de límites admisibles'
                : [
                    !result.compliance.touch.pass ? `Em=${result.compliance.touch.real_V}V > Etouch_adm=${result.eTouchAdm_V}V` : '',
                    !result.compliance.step.pass  ? `Es=${result.compliance.step.real_V}V > Estep_adm=${result.eStepAdm_V}V` : '',
                  ].filter(Boolean).join(' · ')
              }
            />
            <ExportBar module="voltages" inputs={form as unknown as Record<string,unknown>} outputs={result as unknown as Record<string,unknown>} norm={result.norm} />

            {/* Voltage bar chart */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4 }}>Comparación real vs admisible (V)</div>
              <BarCompareChart
                data={[
                  { tipo: 'Contacto', Real: Math.round(result.compliance.touch.real_V), Admisible: Math.round(result.compliance.touch.adm_V) },
                  { tipo: 'Paso',     Real: Math.round(result.compliance.step.real_V),  Admisible: Math.round(result.compliance.step.adm_V)  },
                ]}
                xKey="tipo"
                bars={[
                  { key: 'Real',      label: 'Real (V)',      color: result.compliance.touch.pass && result.compliance.step.pass ? 'var(--safe)' : 'var(--danger)' },
                  { key: 'Admisible', label: 'Admisible (V)', color: 'var(--chart-2)' },
                ]}
                formatter={(v) => `${v} V`}
                height={180}
              />
            </div>

            {/* Tabla de compliance */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Resumen de cumplimiento — IEEE 80-2013 Cl. 16</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><Th>Criterio</Th><Th>Valor real (V)</Th><Th>Admisible (V)</Th><Th>Estado</Th></tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: 'Tensión de contacto (touch)',
                      real: result.compliance.touch.real_V,
                      adm:  result.compliance.touch.adm_V,
                      pass: result.compliance.touch.pass,
                    },
                    {
                      label: 'Tensión de paso (step)',
                      real: result.compliance.step.real_V,
                      adm:  result.compliance.step.adm_V,
                      pass: result.compliance.step.pass,
                    },
                  ].map(row => (
                    <tr key={row.label}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>{row.label}</td>
                      <TdMono highlight>{row.real.toFixed(1)}</TdMono>
                      <TdMono>{row.adm.toFixed(1)}</TdMono>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', fontSize: 10 }}>
                        {row.pass
                          ? <span style={{ color: 'var(--safe)' }}>✓ CUMPLE</span>
                          : <span style={{ color: 'var(--danger)' }}>✗ NO CUMPLE</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Factores intermedios */}
            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Factores de cálculo</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Factor Cs (capa superficial)', result.Cs.toFixed(4)],
                    ['Km (factor de malla)', result.mesh.Km.toFixed(4)],
                    ['Ki (factor irregularidad)', result.mesh.Ki.toFixed(4)],
                    ['Kh', result.mesh.Kh.toFixed(4)],
                    ['Ks (factor de paso)', result.step.Ks.toFixed(4)],
                  ].map(([k, v]) => (
                    <tr key={k as string}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>{k}</td>
                      <TdMono>{v}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ExpertItem type="info">
              Cs = {result.Cs.toFixed(3)} — factor de reducción por capa superficial de ρs={form.rhoSuperficial} Ω·m y hs={form.hSuperficial} m.
              Un Cs menor reduce las tensiones admisibles.
            </ExpertItem>

            <DiagnosisPanel
              checks={complianceChecks}
              diagnosis={diagnosis}
              dataQuality={dataQuality}
              onOptimize={optimize}
              optimizing={optimizing}
              optimizeResult={optimizeResult ? {
                achieved: optimizeResult.achieved,
                steps: optimizeResult.steps,
                initialRg: optimizeResult.initialRatio,
                finalRg: optimizeResult.finalRatio,
              } : null}
              onApplySuggested={applySuggested}
              targetLabel="Em ≤ admisible y Es ≤ admisible"
              metricUnit="× admisible"
              buttonLabel="Optimizar tensiones de paso/contacto"
              methodNote="El motor prueba, en orden de menor costo, mejorar la capa superficial (ρs, hs — sube el límite admisible), luego aumentar la longitud total de conductor, luego la geometría (D, h) — reteniendo solo cambios que reducen la peor razón entre valor real y admisible de ambos criterios (contacto y paso) simultáneamente."
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Tensiones de seguridad IEEE 80 Cl. 16">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 8, fontSize: 11 }}>
                Em = ρ · Ki · Ig · Km / Lt
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                Etouch_adm = (1000 + 1.5·Cs·ρs) · 0.157 / √t
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Km:</strong> factor que considera la geometría de la malla, profundidad y diámetro del conductor.</p>
              <p style={{ marginTop: 6 }}><strong style={{ color: 'var(--text)' }}>Ki:</strong> factor de irregularidad = 0.644 + 0.148·n.</p>
              <p style={{ marginTop: 6 }}><strong style={{ color: 'var(--text)' }}>Cs:</strong> factor de reducción por capa superficial (grava), Ec. 27 de IEEE 80.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013, Cl. 16.4–16.5 · Dalziel (1956, 1968) · Sverak (1979)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
