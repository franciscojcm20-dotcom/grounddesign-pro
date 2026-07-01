'use client';
import { useState } from 'react';
import { api, type StripResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const DEFAULTS = { rho: 110, L: 50, h: 0.6, diamMm: 10, iFalla: 8500 };

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
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState<StripResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  async function calculate() {
    setLoading(true); setError('');
    try {
      const res = await api.grid.strip({
        rho: form.rho, L: form.L, h: form.h,
        radius: (form.diamMm / 1000) / 2, iFalla: form.iFalla,
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="strip" inputs={{ ...form }} outputs={result ?? {}} norm="Dwight (1936) — IEEE 80-2013 Annex B.3" />

        <div style={panelStyle}>
          <SectionLabel>Conductor</SectionLabel>
          <Field label="Resistividad del suelo ρ (Ω·m)">
            <input style={inputStyle} type="number" value={form.rho} onChange={set('rho')} />
          </Field>
          <Field label="Longitud total L (m)">
            <input style={inputStyle} type="number" value={form.L} step="5" onChange={set('L')} />
          </Field>
          <Field label="Profundidad de enterramiento h (m)">
            <input style={inputStyle} type="number" value={form.h} step="0.1" onChange={set('h')} />
          </Field>
          <Field label="Diámetro del conductor (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
          </Field>
          <Field label="Corriente de falla Ig (A)">
            <input style={inputStyle} type="number" value={form.iFalla} onChange={set('iFalla')} />
          </Field>
        </div>

        <button onClick={calculate} disabled={loading}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}><StripDiagram L={form.L} h={form.h} /></div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rh = ${result.Rh.toFixed(3)} Ω — ${result.compliance.rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
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
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--green)' : 'var(--red)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rh.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
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
