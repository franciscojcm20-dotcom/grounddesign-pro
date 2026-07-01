'use client';
import { useState } from 'react';
import { api, type RingResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const DEFAULTS = { rho: 110, largo: 30, ancho: 20, h: 0.6, diamMm: 10, iFalla: 8500 };

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
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState<RingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  const perimeter = 2 * (form.largo + form.ancho);

  async function calculate() {
    setLoading(true); setError('');
    try {
      const res = await api.grid.ring({
        rho: form.rho, perimeter, h: form.h,
        radius: (form.diamMm / 1000) / 2, iFalla: form.iFalla,
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="ring" inputs={{ ...form, perimeter }} outputs={result ?? {}} norm="Sunde (1949) — IEEE 80-2013 §14.3" />

        <div style={panelStyle}>
          <SectionLabel>Suelo y conductor</SectionLabel>
          <Field label="Resistividad del suelo ρ (Ω·m)">
            <input style={inputStyle} type="number" value={form.rho} onChange={set('rho')} />
          </Field>
          <Field label="Profundidad h (m)">
            <input style={inputStyle} type="number" value={form.h} step="0.1" onChange={set('h')} />
          </Field>
          <Field label="Diámetro del conductor (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
          </Field>
          <Field label="Corriente de falla Ig (A)">
            <input style={inputStyle} type="number" value={form.iFalla} onChange={set('iFalla')} />
          </Field>
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

        <button onClick={calculate} disabled={loading}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}><RingDiagram largo={form.largo} ancho={form.ancho} /></div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rring = ${result.Rring.toFixed(3)} Ω — ${result.compliance.rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
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
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--green)' : 'var(--red)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rring.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
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
