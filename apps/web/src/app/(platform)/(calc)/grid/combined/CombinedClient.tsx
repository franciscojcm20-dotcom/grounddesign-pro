'use client';
import { useState } from 'react';
import { api, type CombinedResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const DEFAULTS = {
  rho: 110, largo: 40, ancho: 30, profundidad: 0.6,
  nConductoresL: 7, nConductoresW: 5,
  nRods: 12, rodLength: 3, rodDiamMm: 16, rodSpacing: 6,
  iFalla: 8500,
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
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState<CombinedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  const area    = form.largo * form.ancho;
  const condLen = form.nConductoresL * form.ancho + form.nConductoresW * form.largo;
  const condRod = form.nRods * form.rodLength;
  const Ltotal  = condLen + condRod;

  async function calculate() {
    setLoading(true); setError('');
    try {
      const res = await api.grid.combined({
        rho: form.rho, area, Ltotal, depth: form.profundidad,
        nRods: Math.round(form.nRods), rodLength: form.rodLength,
        rodRadius: (form.rodDiamMm / 1000) / 2, rodSpacing: form.rodSpacing,
        iFalla: form.iFalla,
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="combined" inputs={{ ...form, area, Ltotal }} outputs={result ?? {}} norm="Schwarz (1954) — IEEE 80-2013 §14.5" />

        <div style={panelStyle}>
          <SectionLabel>Malla rectangular</SectionLabel>
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
          <Field label="Resistividad ρ (Ω·m)"><input style={inputStyle} type="number" value={form.rho} onChange={set('rho')} /></Field>
          <Field label="Corriente de falla Ig (A)"><input style={inputStyle} type="number" value={form.iFalla} onChange={set('iFalla')} /></Field>
        </div>

        <button onClick={calculate} disabled={loading}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular (Schwarz)'}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}>
          <CombinedDiagram largo={form.largo} ancho={form.ancho} nL={form.nConductoresL} nW={form.nConductoresW} nRods={form.nRods} />
        </div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rc = ${result.Rc.toFixed(3)} Ω — mejora ${result.mejora.toFixed(1)}% vs malla sola`}
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
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--green)' : 'var(--red)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rc.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg5 ? 'var(--green)' : 'var(--red)' }}>{result.compliance.rg5 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
