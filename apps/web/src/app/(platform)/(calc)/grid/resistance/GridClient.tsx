'use client';
import { useState, type ReactElement } from 'react';
import dynamic from 'next/dynamic';
import { api, type GridResult, type MallaOptimizeResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem,
  FundBtn, calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { SoilRhoField } from '@/components/ui/SoilRhoField';
import { GelPanel } from '@/components/ui/GelPanel';
import { ConductorPanel } from '@/components/ui/ConductorPanel';
import { DiagnosisPanel, type ComplianceCheck } from '@/components/ui/DiagnosisPanel';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import type { GelParams } from '@/lib/api';

const GridScene3D = dynamic(() => import('@/components/ui/Topology3D').then(m => m.GridScene3D), { ssr: false });

const DEFAULTS = {
  largo: 40, ancho: 30, profundidad: 0.6,
  nConductoresL: 7, nConductoresW: 5,
  nVarillas: 12, longVarilla: 3,
  rho: 110, iFalla: 8500, tFalla: 0.5,
};

/* ─── Grid diagram SVG ─────────────────────────────────────────────── */
function GridDiagram({ largo, ancho, nL, nW, nVarillas }: {
  largo: number; ancho: number; nL: number; nW: number; nVarillas: number;
}) {
  const W = 320, H = 200, PAD = 20;
  const scale = Math.min((W - PAD * 2) / largo, (H - PAD * 2) / ancho);
  const gW = largo * scale, gH = ancho * scale;
  const ox = (W - gW) / 2, oy = (H - gH) / 2;

  // Horizontal conductors (nW rows)
  const hLines = Array.from({ length: Math.max(nW, 2) }, (_, i) => {
    const y = oy + (i / (Math.max(nW, 2) - 1)) * gH;
    return <line key={`h${i}`} x1={ox} y1={y} x2={ox + gW} y2={y} stroke="var(--copper)" strokeWidth="1.5" opacity="0.9" />;
  });

  // Vertical conductors (nL rows)
  const vLines = Array.from({ length: Math.max(nL, 2) }, (_, i) => {
    const x = ox + (i / (Math.max(nL, 2) - 1)) * gW;
    return <line key={`v${i}`} x1={x} y1={oy} x2={x} y2={oy + gH} stroke="var(--copper)" strokeWidth="1.5" opacity="0.9" />;
  });

  // Ground rods (placed at intersections, evenly distributed)
  const rodCount = Math.min(nVarillas, 20);
  const rods: ReactElement[] = [];
  const corners = [
    [ox, oy], [ox + gW, oy], [ox, oy + gH], [ox + gW, oy + gH],
  ];
  const perimeter = 2 * (gW + gH);
  for (let i = 0; i < rodCount; i++) {
    let x: number, y: number;
    if (i < 4) {
      [x, y] = corners[i]!;
    } else {
      // Distribuye las picas restantes uniformemente a lo largo del perímetro.
      const dist = (perimeter * (i - 4)) / Math.max(rodCount - 4, 1);
      if (dist < gW)            { x = ox + dist;               y = oy; }
      else if (dist < gW + gH)  { x = ox + gW;                 y = oy + (dist - gW); }
      else if (dist < 2*gW+gH)  { x = ox + gW - (dist - gW - gH); y = oy + gH; }
      else                      { x = ox;                      y = oy + gH - (dist - 2*gW - gH); }
    }
    rods.push(
      <g key={`r${i}`}>
        <line x1={x} y1={y} x2={x} y2={y + 8} stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" />
        <circle cx={x} cy={y} r="2.5" fill="var(--blue)" />
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: H, display: 'block' }}>
      {/* Ground fill */}
      <rect x={ox} y={oy} width={gW} height={gH} fill="var(--copper)" fillOpacity="0.04" rx="1" />
      {/* Grid lines */}
      {hLines}{vLines}
      {/* Rods */}
      {rods}
      {/* Border */}
      <rect x={ox} y={oy} width={gW} height={gH} fill="none" stroke="var(--copper)" strokeWidth="2" rx="1" />
      {/* Dimensions */}
      <text x={ox + gW / 2} y={oy - 5} fill="var(--faint)" fontSize="8" textAnchor="middle">{largo} m</text>
      <text x={ox - 5} y={oy + gH / 2} fill="var(--faint)" fontSize="8" textAnchor="middle"
        transform={`rotate(-90, ${ox - 5}, ${oy + gH / 2})`}>{ancho} m</text>
      {/* Legend */}
      <line x1={W - 60} y1={H - 16} x2={W - 50} y2={H - 16} stroke="var(--copper)" strokeWidth="2" />
      <text x={W - 47} y={H - 13} fill="var(--faint)" fontSize="7">conductor</text>
      <circle cx={W - 55} cy={H - 6} r="2.5" fill="var(--blue)" />
      <text x={W - 50} y={H - 3} fill="var(--faint)" fontSize="7">varilla</text>
    </svg>
  );
}

export function GridClient() {
  const faultAnalysis = useFaultAnalysis();
  const [form, setForm] = useState(DEFAULTS);
  const [gel, setGel] = useState<GelParams | null>(null);
  const [conductor, setConductor] = useState<{ diamMm: number; calibre: string } | null>(null);
  const [result, setResult] = useState<GridResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [view3d, setView3d] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<MallaOptimizeResult | null>(null);

  function set(k: string, v: number) { setForm(f => ({ ...f, [k]: v })); }
  function num(k: keyof typeof DEFAULTS) { return (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value)); }

  async function calculate() {
    setLoading(true); setError(null); setOptimizeResult(null);
    try {
      setResult(await api.grid.resistance({ ...form, ...(gel ? { gel } : {}) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  async function optimize() {
    if (!result) return;
    setOptimizing(true);
    try {
      const targetRg = result.compliance.rg1ohm.pass ? 1 : (result.compliance.rg5ohm.pass ? 1 : 5);
      const r = await api.grid.resistanceOptimize({ ...form, ...(gel ? { gel } : {}), targetRg });
      setOptimizeResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setOptimizing(false); }
  }

  function applySuggested() {
    if (!optimizeResult) return;
    setForm(f => ({ ...f, ...optimizeResult.suggested }));
    setOptimizeResult(null);
  }

  const complianceChecks: ComplianceCheck[] = result ? [
    {
      label: 'Rg ≤ 1 Ω (alta tensión)',
      pass: result.compliance.rg1ohm.pass,
      detail: `Rg calculada = ${result.Rg.toFixed(3)} Ω, límite típico para subestaciones AT según IEEE Std 80-2013.`,
    },
    {
      label: 'Rg ≤ 5 Ω (media tensión)',
      pass: result.compliance.rg5ohm.pass,
      detail: `Rg calculada = ${result.Rg.toFixed(3)} Ω, límite habitual para instalaciones de distribución MT.`,
    },
  ] : [];

  const diagnosis: string[] = [];
  const dataQuality: string[] = [];
  if (result && !result.compliance.rg1ohm.pass) {
    diagnosis.push(`La resistencia de puesta a tierra Rg = ${result.Rg.toFixed(3)} Ω supera el límite de 1 Ω porque la relación entre la resistividad efectiva del suelo (ρ = ${result.rhoUsado} Ω·m) y la longitud total de conductor enterrado (Lt = ${result.Ltotal} m) no es suficientemente favorable: Rg = ρ · [1/Lt + término de área].`);
    if (result.rhoUsado > 200) diagnosis.push(`La resistividad usada (${result.rhoUsado} Ω·m) es alta; es el factor que más penaliza Rg — revisar si corresponde aplicar el aditivo gel o si el modelo de suelo (Schlumberger/Wenner) refleja correctamente el terreno.`);
    if (result.area < 400) diagnosis.push(`El área de la malla (${result.area} m²) es reducida frente a la resistividad del sitio; ampliar la huella de la malla reduce el término de área en la ecuación de Sverak.`);
    if (form.nVarillas < 8) diagnosis.push(`Solo hay ${form.nVarillas} varillas configuradas; agregar varillas perimetrales aumenta Lt sin requerir más superficie de terreno.`);
  }
  if (result) {
    if (result.rhoUsado > 500) dataQuality.push(`ρ = ${result.rhoUsado} Ω·m es inusualmente alto. Verifica en Mediciones de Campo que las lecturas Schlumberger/Wenner no tengan errores de escala (unidades, distancia entre electrodos) antes de dimensionar en base a este valor.`);
    if (form.iFalla > 40000) dataQuality.push(`La corriente de falla ingresada (${form.iFalla} A) es muy alta para la mayoría de instalaciones de distribución; confirma que el valor proviene del estudio de cortocircuito correcto (nivel de tensión/barra) y no de una unidad distinta (kA vs A).`);
    if (form.tFalla < 0.1 || form.tFalla > 3) dataQuality.push(`El tiempo de despeje de falla (${form.tFalla} s) está fuera del rango habitual (0.1–3 s); revisa la coordinación de protecciones utilizada como dato de entrada.`);
  }

  return (
    <div style={calcLayout}>
      {/* INPUTS */}
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Resistencia de malla</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
          Ecuación de Sverak · IEEE Std 80-2013, Cl. 14.2
        </p>

        {/* Live grid diagram */}
        <div style={{ ...panelStyle, marginBottom: 16, padding: '10px 8px' }}>
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
            <GridScene3D
              largo={form.largo} ancho={form.ancho}
              nL={form.nConductoresL} nW={form.nConductoresW}
              profundidad={form.profundidad} nVarillas={form.nVarillas} longVarilla={form.longVarilla}
            />
          ) : (
            <GridDiagram
              largo={form.largo} ancho={form.ancho}
              nL={form.nConductoresL} nW={form.nConductoresW}
              nVarillas={form.nVarillas}
            />
          )}
        </div>

        <SectionLabel>Geometría de la malla</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Largo" unit="m"><input style={inputStyle} type="number" value={form.largo} onChange={num('largo')} /></Field>
          <Field label="Ancho" unit="m"><input style={inputStyle} type="number" value={form.ancho} onChange={num('ancho')} /></Field>
          <Field label="Profundidad" unit="m"><input style={inputStyle} type="number" step="0.1" value={form.profundidad} onChange={num('profundidad')} /></Field>
          <Field label="N° cond. largo" unit=""><input style={inputStyle} type="number" value={form.nConductoresL} onChange={num('nConductoresL')} /></Field>
          <Field label="N° cond. ancho" unit=""><input style={inputStyle} type="number" value={form.nConductoresW} onChange={num('nConductoresW')} /></Field>
          <Field label="N° varillas" unit=""><input style={inputStyle} type="number" value={form.nVarillas} onChange={num('nVarillas')} /></Field>
          <Field label="Long. varilla" unit="m"><input style={inputStyle} type="number" value={form.longVarilla} onChange={num('longVarilla')} /></Field>
        </div>

        <SectionLabel>Suelo y falla</SectionLabel>
        <SoilRhoField value={form.rho} onChange={v => set('rho', v)} />
        <FaultCurrentField onSync={v => set('iFalla', v)} />
        <Field label="Tiempo de despeje" unit="s"><input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={num('tFalla')} /></Field>

        <GelPanel rhoSuelo={form.rho} onChange={setGel} />
        <ConductorPanel iFalla={form.iFalla} tFalla={form.tFalla} onChange={(diamMm, calibre) => setConductor({ diamMm, calibre })} />

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
            <div style={{ fontSize: 32 }}>⬡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa la geometría y presiona Calcular</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="Rg" value={result.Rg.toFixed(3)} unit="Ω" primary />
              <StatCard label="GPR" value={(result.gpr / 1000).toFixed(2)} unit="kV" />
              <StatCard label="Rg ≤ 1 Ω" value={result.compliance.rg1ohm.pass ? 'CUMPLE' : 'NO CUMPLE'}
                unit="" ok={result.compliance.rg1ohm.pass} />
              <StatCard label="Rg ≤ 5 Ω" value={result.compliance.rg5ohm.pass ? 'CUMPLE' : 'NO CUMPLE'}
                unit="" ok={result.compliance.rg5ohm.pass} />
            </div>

            {/* Rg target bar */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>Rg vs. límites normativos</div>
              {[{ limit: 1, label: '1 Ω (AT)' }, { limit: 5, label: '5 Ω (MT)' }].map(({ limit, label }) => {
                const pct = Math.min((result.Rg / limit) * 100, 120);
                const pass = result.Rg <= limit;
                return (
                  <div key={limit} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 9.5, color: 'var(--dim)' }}>{label}</span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: pass ? 'var(--safe)' : 'var(--danger)' }}>
                        {result.Rg.toFixed(3)} / {limit} Ω
                      </span>
                    </div>
                    <div style={{ height: 10, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pass ? 'var(--safe)' : 'var(--danger)', opacity: 0.75, transition: 'width .3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <CompBanner
              pass={result.compliance.rg1ohm.pass}
              norm={result.norm}
              msg={result.compliance.rg1ohm.pass
                ? `Rg = ${result.Rg.toFixed(3)} Ω cumple el límite de 1 Ω`
                : `Rg = ${result.Rg.toFixed(3)} Ω supera el límite de 1 Ω — revisar geometría o ρ efectiva`}
            />
            <ExportBar module="grid" inputs={{ ...form, ...(conductor ? { calibreConductor: conductor.calibre } : {}) } as unknown as Record<string,unknown>} outputs={result as unknown as Record<string,unknown>} norm={result.norm} />

            <ExpertItem type="info">
              GPR = Rg × Ifalla = {result.Rg.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
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
              targetLabel={result.compliance.rg1ohm.pass ? 'Rg ≤ 1 Ω' : 'Rg ≤ 5 Ω'}
              methodNote="El motor de optimización prueba, en orden de menor costo constructivo, agregar varillas, luego conductores, luego ampliar la huella de la malla — reteniendo solo los cambios que efectivamente reducen Rg — hasta alcanzar el límite objetivo o topar límites físicos razonables del predio."
            />

            {/* Desglose */}
            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Desglose de cálculo</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Área de malla', `${result.area} m²`],
                    ['Long. conductor horizontal', `${result.condL} m`],
                    ['Long. varillas', `${result.condRods} m`],
                    ['Longitud total Lt', `${result.Ltotal} m`],
                    ['ρ usada en cálculo', `${result.rhoUsado} Ω·m${result.gelInfo?.activo ? ' (con gel)' : ''}`],
                    ['GPR', `${result.gpr.toFixed(0)} V`],
                    ...(conductor ? [['Conductor seleccionado', conductor.calibre]] : []),
                  ].map(([k, v]) => (
                    <tr key={k as string}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>{k}</td>
                      <TdMono highlight>{v}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Sverak — Resistencia de malla">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                Rg = ρ · [1/Lt + (1/√(20A)) · (1 + 1/(1 + h·√(20/A)))]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> ρ = resistividad del suelo (Ω·m),
              Lt = longitud total de conductor (m), A = área de la malla (m²), h = profundidad de enterramiento (m).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Límites típicos:</strong> Rg ≤ 1 Ω para subestaciones de alta tensión (IEEE 80). El criterio de 1 Ω no es normativo absoluto — la verificación definitiva es el cumplimiento de tensiones de paso y contacto.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013, Cl. 14.2, Ec. 52 (Sverak, 1979)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
