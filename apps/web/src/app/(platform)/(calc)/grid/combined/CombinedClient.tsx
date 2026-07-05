'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { api, type CombinedResult, type CombinedOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';

const CombinedScene3D = dynamic(() => import('@/components/ui/Topology3D').then(m => m.CombinedScene3D), { ssr: false });
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

const DEFAULTS = {
  rho: 110, largo: 40, ancho: 30, profundidad: 0.6,
  nConductoresL: 7, nConductoresW: 5,
  nRods: 12, rodLength: 3, rodDiamMm: 16, rodSpacing: 6,
  iFalla: 8500, tFalla: 0.5,
};

function CombinedDiagram({ largo, ancho, nL, nW, nRods }: { largo: number; ancho: number; nL: number; nW: number; nRods: number }) {
  const W = 320, H = 200, PAD = 20;
  const scale = Math.min((W - PAD * 2) / Math.max(largo, 1), (H - PAD * 2) / Math.max(ancho, 1));
  const gW = largo * scale, gH = ancho * scale;
  const ox = (W - gW) / 2, oy = (H - gH) / 2;

  const hLines = Array.from({ length: Math.max(nW, 2) }, (_, i) => {
    const y = oy + (i / (Math.max(nW, 2) - 1)) * gH;
    return <line key={`h${i}`} x1={ox} y1={y} x2={ox + gW} y2={y} stroke="var(--copper)" strokeWidth="1.5" opacity={0.8} />;
  });
  const vLines = Array.from({ length: Math.max(nL, 2) }, (_, i) => {
    const x = ox + (i / (Math.max(nL, 2) - 1)) * gW;
    return <line key={`v${i}`} x1={x} y1={oy} x2={x} y2={oy + gH} stroke="var(--copper)" strokeWidth="1.5" opacity={0.8} />;
  });
  const rodCount = Math.min(nRods, 16);
  const rods = Array.from({ length: rodCount }, (_, i) => {
    const fx = (i % 4) / 3, fy = Math.floor(i / 4) / Math.max(Math.ceil(rodCount / 4) - 1, 1);
    const x = ox + fx * gW, y = oy + fy * gH;
    return (
      <g key={`r${i}`}>
        <line x1={x} y1={y} x2={x} y2={y + 10} stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" />
        <circle cx={x} cy={y} r={3} fill="var(--blue)" />
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      {hLines}{vLines}{rods}
      <circle cx={16} cy={16} r={4} fill="var(--copper)" />
      <text x={24} y={20} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">malla</text>
      <circle cx={16} cy={30} r={3} fill="var(--blue)" />
      <text x={24} y={34} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">pica</text>
    </svg>
  );
}

export function CombinedClient() {
  const faultAnalysis = useFaultAnalysis();
  const { profile } = useNormativeProfile();
  const [form, setForm] = usePersistedState('gdp-form-combined', DEFAULTS);
  const [gel, setGel] = useState<GelParams | null>(null);
  const [result, setResult] = useState<CombinedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<CombinedOptimizeResult | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [view3d, setView3d] = useState(false);

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  const area    = form.largo * form.ancho;
  const condLen = form.nConductoresL * form.ancho + form.nConductoresW * form.largo;
  const condRod = form.nRods * form.rodLength;
  const Ltotal  = condLen + condRod;
  function rodRadiusOf() { return (form.rodDiamMm / 1000) / 2; }

  async function calculate() {
    setLoading(true); setError(''); setOptimizeResult(null);
    try {
      const res = await api.grid.combined({
        rho: form.rho, area, Ltotal, depth: form.profundidad,
        nRods: Math.round(form.nRods), rodLength: form.rodLength,
        rodRadius: rodRadiusOf(), rodSpacing: form.rodSpacing,
        iFalla: form.iFalla,
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
      const r = await api.grid.combinedOptimize({
        rho: form.rho, area, Ltotal, depth: form.profundidad,
        nRods: Math.round(form.nRods), rodLength: form.rodLength,
        rodRadius: rodRadiusOf(), rodSpacing: form.rodSpacing,
        iFalla: form.iFalla, targetRg,
        ...(gel ? { gel } : {}),
      });
      setOptimizeResult(r);
    } catch (e) { setError((e as Error).message); }
    finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    const s = optimizeResult.suggested;
    const areaScale = area > 0 ? Math.sqrt(s.area / area) : 1;
    setForm(f => ({
      ...f, rho: s.rho, profundidad: s.depth,
      largo: Math.round(f.largo * areaScale * 10) / 10,
      ancho: Math.round(f.ancho * areaScale * 10) / 10,
      nRods: s.nRods, rodLength: s.rodLength,
      rodDiamMm: Math.round(s.rodRadius * 2000 * 10) / 10,
      rodSpacing: s.rodSpacing, iFalla: s.iFalla,
    }));
    setOptimizeResult(null);
  }

  const complianceChecks: ComplianceCheck[] = result ? [
    { label: 'Rc ≤ 1 Ω (subestaciones críticas)', pass: result.compliance.rg1, detail: `Rc calculada = ${result.Rc.toFixed(3)} Ω (mejora ${result.mejora.toFixed(1)}% vs malla sola).` },
    { label: 'Rc ≤ 5 Ω (uso general)', pass: result.compliance.rg5, detail: `Rc calculada = ${result.Rc.toFixed(3)} Ω.` },
    {
      label: `Rc ≤ ${profile.rgGeneral} Ω — ${profile.label}`,
      pass: evaluateRgCompliance(result.Rc, profile).rgGeneral,
      detail: `${profile.standard}. ${profile.notes}`,
    },
  ] : [];
  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.rg1) {
    diagnosis.push(`Rc = ${result.Rc.toFixed(3)} Ω supera 1 Ω: Rc combina Rg (malla, ${result.Rg.toFixed(3)} Ω) y Rr (picas, ${result.Rr.toFixed(3)} Ω) según Schwarz; ambas resistencias siguen siendo altas para la ρ del sitio.`);
    if (form.nRods < 8) diagnosis.push(`Solo hay ${Math.round(form.nRods)} picas adicionales; aumentar su número y longitud reduce Rr sin requerir más área de malla.`);
  }
  if (result && result.rhoUsado !== undefined && result.rhoUsado > 500) {
    dataQuality.push(`ρ = ${result.rhoUsado.toFixed(0)} Ω·m es inusualmente alto; revisa las mediciones de campo antes de dimensionar en base a este valor.`);
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="combined" inputs={{ ...form, area, Ltotal }} outputs={(result ?? {}) as unknown as Record<string,unknown>} norm="Schwarz (1954) — IEEE 80-2013 §14.5" />

        <div style={panelStyle}>
          <SectionLabel>Malla rectangular</SectionLabel>
          <NormativeProfileSelector />
          <Field label="Largo (m)"><input style={inputStyle} type="number" value={form.largo} step="5" onChange={set('largo')} /></Field>
          <Field label="Ancho (m)"><input style={inputStyle} type="number" value={form.ancho} step="5" onChange={set('ancho')} /></Field>
          <Field label="Profundidad (m)"><input style={inputStyle} type="number" value={form.profundidad} step="0.1" onChange={set('profundidad')} /></Field>
          <Field label="Conductores en largo n₁"><input style={inputStyle} type="number" value={form.nConductoresL} min="2" step="1" onChange={set('nConductoresL')} /></Field>
          <Field label="Conductores en ancho n₂"><input style={inputStyle} type="number" value={form.nConductoresW} min="2" step="1" onChange={set('nConductoresW')} /></Field>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Picas adicionales</SectionLabel>
          <Field label="Número de picas"><input style={inputStyle} type="number" value={form.nRods} min="0" step="1" onChange={set('nRods')} /></Field>
          <Field label="Longitud de pica (m)"><input style={inputStyle} type="number" value={form.rodLength} step="0.5" onChange={set('rodLength')} /></Field>
          <Field label="Diámetro de pica (mm)"><input style={inputStyle} type="number" value={form.rodDiamMm} step="2" onChange={set('rodDiamMm')} /></Field>
          <Field label="Separación entre picas (m)"><input style={inputStyle} type="number" value={form.rodSpacing} step="1" onChange={set('rodSpacing')} /></Field>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Sistema eléctrico</SectionLabel>
          <SoilRhoField value={form.rho} onChange={v => setForm(f => ({ ...f, rho: v }))} />
          <FaultCurrentField onSync={v => setForm(f => ({ ...f, iFalla: v }))} />
          <Field label="Tiempo de despeje (s)"><input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={set('tFalla')} /></Field>
        </div>

        <div style={panelStyle}>
          <GelPanel rhoSuelo={form.rho} onChange={setGel} />
          <ConductorPanel iFalla={form.iFalla} tFalla={form.tFalla} onChange={(diamMm) => setForm(f => ({ ...f, rodDiamMm: Math.round(diamMm * 10) / 10 }))} />
        </div>

        <button onClick={calculate} disabled={loading || !faultAnalysis.result}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (loading || !faultAnalysis.result) ? .6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular (Schwarz)'}
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
            <CombinedScene3D
              largo={form.largo} ancho={form.ancho} nL={form.nConductoresL} nW={form.nConductoresW}
              profundidad={form.profundidad} nRods={form.nRods} rodLength={form.rodLength}
            />
          ) : (
            <CombinedDiagram largo={form.largo} ancho={form.ancho} nL={form.nConductoresL} nW={form.nConductoresW} nRods={form.nRods} />
          )}
        </div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rc = ${result.Rc.toFixed(3)} Ω — mejora ${result.mejora.toFixed(1)}% vs malla sola`}
              norm="Schwarz (1954) — IEEE 80-2013 §14.5"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              <StatCard label="Rg — malla sola (Sverak)" value={`${result.Rg.toFixed(3)} Ω`} />
              <StatCard label="Rr — picas (Dwight)" value={`${result.Rr.toFixed(3)} Ω`} />
              <StatCard label="Rc — combinada (Schwarz)" value={`${result.Rc.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>
            <div style={panelStyle}>
              <SectionLabel>Desglose Schwarz</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Parámetro</Th><Th>Valor</Th><Th>Método</Th></tr></thead>
                <tbody>
                  <tr><TdMono>Rg (malla)</TdMono><TdMono>{result.Rg.toFixed(4)} Ω</TdMono><TdMono>Sverak §14.2</TdMono></tr>
                  <tr><TdMono>Rr (picas)</TdMono><TdMono>{result.Rr.toFixed(4)} Ω</TdMono><TdMono>Dwight + Sunde</TdMono></tr>
                  <tr><TdMono>Rmr (acoplamiento)</TdMono><TdMono>{result.Rmr.toFixed(4)} Ω</TdMono><TdMono>Schwarz §14.5</TdMono></tr>
                  <tr><TdMono>Rc (combinada)</TdMono><TdMono>{result.Rc.toFixed(4)} Ω</TdMono><TdMono>Schwarz §14.5</TdMono></tr>
                  <tr><TdMono>Mejora vs malla</TdMono><TdMono>{result.mejora.toFixed(1)} %</TdMono><TdMono>—</TdMono></tr>
                </tbody>
              </table>
            </div>
            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>Rc</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono><TdMono>{result.Rc.toFixed(3)} Ω</TdMono><TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--safe)' : 'var(--danger)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rc.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
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
              GPR = Rc × Ifalla = {result.Rc.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
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
              targetLabel={result.compliance.rg1 ? 'Rc ≤ 1 Ω' : 'Rc ≤ 5 Ω'}
              methodNote="El motor prueba, en orden de menor costo, agregar picas, luego alargarlas, luego ampliar la longitud total y el área de la malla — reteniendo solo cambios que reducen Rc. Al aplicar la sugerencia, largo y ancho se escalan proporcionalmente para alcanzar la nueva área."
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Schwarz — Malla combinada con picas">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                Rc = (Rg·Rr − Rmr²) / (Rg + Rr − 2·Rmr)
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> Rg = resistencia de la malla sola (Sverak, Ω), Rr = resistencia de las picas en paralelo (Dwight + Sunde, Ω),
              Rmr = resistencia mutua entre la malla y las picas (Ω) — cuantifica cuánto comparten zona de disipación.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Interpretación:</strong> Schwarz (1954) combina dos electrodos que actúan en paralelo pero no son independientes — las picas están dentro o junto a la huella de la malla, así que parte de su efecto se superpone (Rmr). Por eso Rc no es simplemente Rg y Rr en paralelo ideal: el término Rmr² en el numerador corrige por ese solape. Es el método correcto cuando se agregan picas a una malla existente para reforzarla, en vez de dimensionar cada electrodo por separado.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Límites típicos:</strong> Rc ≤ 1 Ω para instalaciones críticas, ≤ 5 Ω para uso general (IEEE 80). La verificación definitiva es el cumplimiento de tensiones de paso y contacto.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Schwarz, S.J. (1954) — Analytical Expressions for the Resistance of Grounding Systems · IEEE Std 80-2013 §14.5</p>
            </FundBtn>
          </>
        )}
      </main>
    </div>
  );
}
