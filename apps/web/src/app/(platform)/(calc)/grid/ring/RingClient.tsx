'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { api, type RingResult, type RingOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const RingScene3D = dynamic(() => import('@/components/ui/Topology3D').then(m => m.RingScene3D), { ssr: false });
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
import { usePersistedState } from '@/lib/usePersistedState';
import type { GelParams } from '@/lib/api';

const DEFAULTS = { rho: 110, largo: 30, ancho: 20, h: 0.6, diamMm: 10, iFalla: 8500, tFalla: 0.5 };

function RingDiagram({ largo, ancho }: { largo: number; ancho: number }) {
  const W = 300, H = 200, pad = 30;
  const scale = Math.min((W - pad * 2) / Math.max(largo, 1), (H - pad * 2) / Math.max(ancho, 1));
  const gW = largo * scale, gH = ancho * scale;
  const ox = (W - gW) / 2, oy = (H - gH) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      <rect x={ox} y={oy} width={gW} height={gH} rx={4}
        fill="none" stroke="var(--copper)" strokeWidth="3" strokeLinejoin="round" />
      <circle cx={ox} cy={oy} r={4} fill="var(--copper)" />
      <circle cx={ox + gW} cy={oy} r={4} fill="var(--copper)" />
      <circle cx={ox} cy={oy + gH} r={4} fill="var(--copper)" />
      <circle cx={ox + gW} cy={oy + gH} r={4} fill="var(--copper)" />
      <text x={W / 2} y={oy - 8} textAnchor="middle" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">{largo} m</text>
      <text x={ox - 6} y={oy + gH / 2} textAnchor="end" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">{ancho} m</text>
      <text x={W / 2} y={oy + gH / 2 + 4} textAnchor="middle" fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">
        P = {(2 * (largo + ancho)).toFixed(1)} m
      </text>
    </svg>
  );
}

export function RingClient() {
  const faultAnalysis = useFaultAnalysis();
  const { profile } = useNormativeProfile();
  const [form, setForm] = usePersistedState('gdp-form-ring', DEFAULTS);
  const [gel, setGel] = useState<GelParams | null>(null);
  const [result, setResult] = useState<RingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<RingOptimizeResult | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [view3d, setView3d] = useState(false);

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  const perimeter = 2 * (form.largo + form.ancho);
  function radiusOf() { return (form.diamMm / 1000) / 2; }

  async function calculate() {
    setLoading(true); setError(''); setOptimizeResult(null);
    try {
      const res = await api.grid.ring({
        rho: form.rho, perimeter, h: form.h,
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
      const r = await api.grid.ringOptimize({
        rho: form.rho, perimeter, h: form.h, radius: radiusOf(), iFalla: form.iFalla, targetRg,
        ...(gel ? { gel } : {}),
      });
      setOptimizeResult(r);
    } catch (e) { setError((e as Error).message); }
    finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    const s = optimizeResult.suggested;
    const scale = perimeter > 0 ? s.perimeter / perimeter : 1;
    setForm(f => ({
      ...f, rho: s.rho, h: s.h,
      diamMm: Math.round(s.radius * 2000 * 10) / 10,
      largo: Math.round(f.largo * scale * 10) / 10,
      ancho: Math.round(f.ancho * scale * 10) / 10,
      iFalla: s.iFalla,
    }));
    setOptimizeResult(null);
  }

  const complianceChecks: ComplianceCheck[] = result ? [
    { label: 'Rring ≤ 1 Ω (subestaciones críticas)', pass: result.compliance.rg1, detail: `Rring calculada = ${result.Rring.toFixed(3)} Ω.` },
    { label: 'Rring ≤ 5 Ω (uso general)', pass: result.compliance.rg5, detail: `Rring calculada = ${result.Rring.toFixed(3)} Ω.` },
    {
      label: `Rring ≤ ${profile.rgGeneral} Ω — ${profile.label}`,
      pass: evaluateRgCompliance(result.Rring, profile).rgGeneral,
      detail: `${profile.standard}. ${profile.notes}`,
    },
  ] : [];
  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.rg1) {
    diagnosis.push(`Rring = ${result.Rring.toFixed(3)} Ω supera 1 Ω: R = (ρ/2π²r)·[ln(8r/a) + ln(2r/h) − 2]; con perímetro actual de ${perimeter.toFixed(1)} m, el radio equivalente r = ${result.rEq.toFixed(2)} m aún es insuficiente frente a ρ.`);
    if (perimeter < 150) diagnosis.push(`El perímetro actual (${perimeter.toFixed(1)} m) es reducido; ampliar la huella del anillo aumenta directamente el radio equivalente r y reduce Rring.`);
  }
  if (result && result.rhoUsado !== undefined && result.rhoUsado > 500) {
    dataQuality.push(`ρ = ${result.rhoUsado.toFixed(0)} Ω·m es inusualmente alto; revisa las mediciones de campo antes de dimensionar en base a este valor.`);
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="ring" inputs={{ ...form, perimeter }} outputs={(result ?? {}) as unknown as Record<string,unknown>} norm="Sunde (1949) — IEEE 80-2013 §14.3" />

        <div style={panelStyle}>
          <SectionLabel>Suelo y conductor</SectionLabel>
          <NormativeProfileSelector />
          <SoilRhoField value={form.rho} onChange={v => setForm(f => ({ ...f, rho: v }))} />
          <Field label="Profundidad h (m)">
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

        <div style={panelStyle}>
          <SectionLabel>Geometría del anillo</SectionLabel>
          <Field label="Largo (m)">
            <input style={inputStyle} type="number" value={form.largo} step="5" onChange={set('largo')} />
          </Field>
          <Field label="Ancho (m)">
            <input style={inputStyle} type="number" value={form.ancho} step="5" onChange={set('ancho')} />
          </Field>
          <Field label="Perímetro calculado">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--copper)', padding: '6px 10px' }}>
              P = {perimeter.toFixed(1)} m
            </div>
          </Field>
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
            <RingScene3D largo={form.largo} ancho={form.ancho} h={form.h} />
          ) : (
            <RingDiagram largo={form.largo} ancho={form.ancho} />
          )}
        </div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rring = ${result.Rring.toFixed(3)} Ω — ${result.compliance.rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
              norm="Sunde (1949) — IEEE 80-2013 §14.3"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <StatCard label="Radio equiv. r" value={`${result.rEq.toFixed(2)} m`} />
              <StatCard label="Resistencia Rring" value={`${result.Rring.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>
            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>Rring</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono><TdMono>{result.Rring.toFixed(3)} Ω</TdMono><TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--safe)' : 'var(--danger)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rring.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
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
              GPR = Rring × Ifalla = {result.Rring.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
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
              targetLabel={result.compliance.rg1 ? 'Rring ≤ 1 Ω' : 'Rring ≤ 5 Ω'}
              methodNote="El motor prueba, en orden de menor costo, ampliar el perímetro del anillo, luego la profundidad, luego la sección del conductor — reteniendo solo cambios que reducen Rring. Al aplicar la sugerencia, largo y ancho se escalan proporcionalmente para alcanzar el nuevo perímetro."
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Sunde — Anillo perimetral (conductor circular equivalente)">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                r = P/2π &nbsp;·&nbsp; Rring = (ρ/2π²r) · [ln(8r/a) + ln(2r/h) − 2]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> P = perímetro del anillo (m), r = radio de un círculo equivalente de igual perímetro (m),
              ρ = resistividad del suelo (Ω·m), a = radio del conductor (m), h = profundidad de enterramiento (m).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Interpretación:</strong> el anillo (perimetral, sin conductores internos) se modela como un lazo circular de radio equivalente r — geometría clásica de Sunde para toroides conductores enterrados. Es apropiado para proteger el perímetro de una instalación (cercos, patios de subestación) sin necesidad de una malla interior completa, cuando el área encerrada no requiere puntos de conexión intermedios.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Límites típicos:</strong> Rring ≤ 1 Ω para instalaciones críticas, ≤ 5 Ω para uso general (IEEE 80). La verificación definitiva es el cumplimiento de tensiones de paso y contacto.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Sunde, E.D. (1949) — Earth Conduction Effects in Transmission Systems · IEEE Std 80-2013 §14.3</p>
            </FundBtn>
          </>
        )}
      </main>
    </div>
  );
}
