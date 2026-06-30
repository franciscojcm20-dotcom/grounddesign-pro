'use client';
import { useState } from 'react';
import { api, type GridResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem,
  FundBtn, calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

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
  const rods: JSX.Element[] = [];
  const corners = [
    [ox, oy], [ox + gW, oy], [ox, oy + gH], [ox + gW, oy + gH],
  ];
  for (let i = 0; i < rodCount; i++) {
    let x: number, y: number;
    if (i < 4) {
      [x, y] = corners[i]!;
    } else {
      const perimX = ox + Math.random() * gW;
      const perimY = oy + Math.random() * gH;
      x = perimX; y = perimY;
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
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState<GridResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function set(k: string, v: number) { setForm(f => ({ ...f, [k]: v })); }
  function num(k: keyof typeof DEFAULTS) { return (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value)); }

  async function calculate() {
    setLoading(true); setError(null);
    try {
      setResult(await api.grid.resistance(form));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
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
          <GridDiagram
            largo={form.largo} ancho={form.ancho}
            nL={form.nConductoresL} nW={form.nConductoresW}
            nVarillas={form.nVarillas}
          />
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
        <Field label="Resistividad ρ" unit="Ω·m"><input style={inputStyle} type="number" value={form.rho} onChange={num('rho')} /></Field>
        <Field label="Corriente de falla" unit="A"><input style={inputStyle} type="number" value={form.iFalla} onChange={num('iFalla')} /></Field>
        <Field label="Tiempo de despeje" unit="s"><input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={num('tFalla')} /></Field>

        <button onClick={calculate} disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none',
          color: '#fff', fontWeight: 700, fontSize: 11, padding: 10,
          borderRadius: 3, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4,
        }}>{loading ? 'Calculando…' : 'Calcular'}</button>
        {error && <div style={{ marginTop: 10, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444433', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
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
            <ExportBar module="grid" inputs={form as unknown as Record<string,unknown>} outputs={result as unknown as Record<string,unknown>} norm={result.norm} />

            {!result.compliance.rg1ohm.pass && (
              <ExpertItem type="warn">
                Con ρ = {result.rhoUsado} Ω·m y la geometría actual, Rg = {result.Rg.toFixed(3)} Ω.
                Para reducir Rg: aumentar área de la malla, agregar más conductores o varillas,
                o aplicar aditivo gel para reducir ρ efectiva.
              </ExpertItem>
            )}
            <ExpertItem type="info">
              GPR = Rg × Ifalla = {result.Rg.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
              Este valor alimenta el cálculo de tensiones de paso y contacto.
            </ExpertItem>

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
                    ['ρ usada en cálculo', `${result.rhoUsado} Ω·m`],
                    ['GPR', `${result.gpr.toFixed(0)} V`],
                  ].map(([k, v]) => (
                    <tr key={k as string}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #1e2230', fontSize: 10, color: 'var(--dim)' }}>{k}</td>
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
