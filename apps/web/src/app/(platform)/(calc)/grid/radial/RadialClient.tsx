'use client';
import { useState } from 'react';
import { api, type RadialResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const DEFAULTS = { rho: 110, L: 20, h: 0.6, diamMm: 10, n: 8, iFalla: 8500 };

function StarDiagram({ n, L }: { n: number; L: number }) {
  const W = 260, H = 220, cx = W / 2, cy = H / 2;
  const radius = Math.min(cx, cy) - 20;
  const arms = Math.max(Math.min(Math.round(n), 16), 2);
  const scale = radius / Math.max(L, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      {Array.from({ length: arms }, (_, i) => {
        const angle = (i / arms) * 2 * Math.PI - Math.PI / 2;
        const x2 = cx + Math.cos(angle) * radius;
        const y2 = cy + Math.sin(angle) * radius;
        return (
          <line key={i} x1={cx} y1={cy} x2={x2} y2={y2}
            stroke="var(--copper)" strokeWidth="2.5" strokeLinecap="round" opacity={0.9} />
        );
      })}
      <circle cx={cx} cy={cy} r={5} fill="var(--copper)" />
      <text x={cx} y={cy + radius + 16} textAnchor="middle" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">
        {arms} radiales × L={L} m
      </text>
      <text x={cx + radius * 0.55} y={cy - radius * 0.55} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">L</text>
    </svg>
  );
}

export function RadialClient() {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState<RadialResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  async function calculate() {
    setLoading(true); setError('');
    try {
      const res = await api.grid.radial({
        rho: form.rho, L: form.L, h: form.h,
        radius: (form.diamMm / 1000) / 2,
        n: Math.round(form.n), iFalla: form.iFalla,
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar module="radial" inputs={{ ...form }} outputs={result ?? {}} norm="Laurent-Niemann (1952) — IEEE 80-2013 Annex B" />

        <div style={panelStyle}>
          <SectionLabel>Conductor radial</SectionLabel>
          <Field label="Resistividad del suelo ρ (Ω·m)">
            <input style={inputStyle} type="number" value={form.rho} onChange={set('rho')} />
          </Field>
          <Field label="Longitud de cada radial L (m)">
            <input style={inputStyle} type="number" value={form.L} step="5" onChange={set('L')} />
          </Field>
          <Field label="Profundidad h (m)">
            <input style={inputStyle} type="number" value={form.h} step="0.1" onChange={set('h')} />
          </Field>
          <Field label="Diámetro del conductor (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
          </Field>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Configuración estrella</SectionLabel>
          <Field label="Número de radiales n">
            <input style={inputStyle} type="number" value={form.n} min="2" step="1" onChange={set('n')} />
          </Field>
          <Field label="Separación angular">
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4 }}>
              {(360 / Math.max(form.n, 1)).toFixed(1)}° entre radiales (igual)
            </div>
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
        <div style={panelStyle}><StarDiagram n={form.n} L={form.L} /></div>

        {result && (
          <>
            <CompBanner
              pass={result.compliance.rg1 || result.compliance.rg5}
              label={`Rstar = ${result.Rstar.toFixed(3)} Ω — ${result.compliance.rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <StatCard label="R₁ (un radial)" value={`${result.R1.toFixed(3)} Ω`} />
              <StatCard label={`R★ (${Math.round(form.n)} radiales)`} value={`${result.Rstar.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>
            <div style={panelStyle}>
              <SectionLabel>Desglose</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Parámetro</Th><Th>Valor</Th><Th>Referencia</Th></tr></thead>
                <tbody>
                  <tr><TdMono>R₁ — radial solo</TdMono><TdMono>{result.R1.toFixed(4)} Ω</TdMono><TdMono>Dwight</TdMono></tr>
                  <tr><TdMono>R★ — estrella</TdMono><TdMono>{result.Rstar.toFixed(4)} Ω</TdMono><TdMono>Laurent-Niemann</TdMono></tr>
                  <tr><TdMono>Lt total</TdMono><TdMono>{result.Ltotal.toFixed(1)} m</TdMono><TdMono>n × L</TdMono></tr>
                  <tr><TdMono>GPR</TdMono><TdMono>{result.gpr.toFixed(0)} V</TdMono><TdMono>R★ × Ig</TdMono></tr>
                </tbody>
              </table>
            </div>
            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>R★</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono><TdMono>{result.Rstar.toFixed(3)} Ω</TdMono><TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--green)' : 'var(--red)' }}>{result.compliance.rg1 ? '✓ OK' : '✗'}</TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono><TdMono>{result.Rstar.toFixed(3)} Ω</TdMono><TdMono>≤ 5 Ω</TdMono>
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
