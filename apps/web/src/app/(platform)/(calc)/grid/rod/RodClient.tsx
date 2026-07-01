'use client';
import { useState } from 'react';
import { api, type RodResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner,
  calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const DEFAULTS = { rho: 110, L: 3, diamMm: 16, n: 4, spacing: 6, iFalla: 8500 };

function RodDiagram({ n, L }: { n: number; L: number }) {
  const W = 320, H = 200;
  const rodCount = Math.min(n, 8);
  const spacing = Math.min((W - 60) / Math.max(rodCount, 1), 70);
  const startX = (W - spacing * (rodCount - 1)) / 2;
  const groundY = 40;
  const rodH = Math.min(130, L * 25);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="var(--dim)" strokeWidth="1" strokeDasharray="4 3" opacity={0.4} />
      <text x={6} y={groundY - 4} fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">nivel de suelo</text>
      {Array.from({ length: rodCount }, (_, i) => {
        const x = startX + i * spacing;
        return (
          <g key={i}>
            <line x1={x} y1={groundY} x2={x} y2={groundY + rodH} stroke="var(--copper)" strokeWidth="3" strokeLinecap="round" />
            <circle cx={x} cy={groundY} r={4} fill="var(--copper)" />
            {i < rodCount - 1 && (
              <line x1={x} y1={groundY} x2={x + spacing} y2={groundY} stroke="var(--copper)" strokeWidth="1.5" opacity={0.6} />
            )}
          </g>
        );
      })}
      <text x={W / 2} y={groundY + rodH + 14} textAnchor="middle" fontSize={9} fill="var(--faint)" fontFamily="var(--font-mono)">L = {L} m</text>
      {rodCount > 1 && (
        <text x={startX + spacing / 2} y={groundY - 10} textAnchor="middle" fontSize={8} fill="var(--faint)" fontFamily="var(--font-mono)">s</text>
      )}
    </svg>
  );
}

export function RodClient() {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState<RodResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  async function calculate() {
    setLoading(true); setError('');
    try {
      const res = await api.grid.rod({
        rho: form.rho, L: form.L,
        radius: (form.diamMm / 1000) / 2,
        n: Math.round(form.n), spacing: form.spacing, iFalla: form.iFalla,
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const pass = result ? (result.compliance.rg1 || result.compliance.rg5) : null;

  return (
    <div style={calcLayout}>
      {/* ── LEFT: inputs ── */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ExportBar
          module="rod"
          inputs={{ ...form }}
          outputs={result ?? {}}
          norm="Dwight (1936) — IEEE 80-2013 Annex B.1"
        />

        <div style={panelStyle}>
          <SectionLabel>Electrodo</SectionLabel>
          <Field label="Resistividad del suelo ρ (Ω·m)">
            <input style={inputStyle} type="number" value={form.rho} onChange={set('rho')} />
          </Field>
          <Field label="Longitud de pica L (m)">
            <input style={inputStyle} type="number" value={form.L} step="0.5" onChange={set('L')} />
          </Field>
          <Field label="Diámetro de pica (mm)">
            <input style={inputStyle} type="number" value={form.diamMm} step="1" onChange={set('diamMm')} />
          </Field>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Configuración</SectionLabel>
          <Field label="Número de picas n">
            <input style={inputStyle} type="number" value={form.n} min="1" step="1" onChange={set('n')} />
          </Field>
          <Field label="Separación entre picas s (m)">
            <input style={inputStyle} type="number" value={form.spacing} step="0.5" onChange={set('spacing')} />
          </Field>
          <Field label="Corriente de falla Ig (A)">
            <input style={inputStyle} type="number" value={form.iFalla} onChange={set('iFalla')} />
          </Field>
        </div>

        <button
          onClick={calculate}
          disabled={loading}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? .6 : 1 }}
        >
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
      </aside>

      {/* ── RIGHT: results ── */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}>
          <RodDiagram n={form.n} L={form.L} />
        </div>

        {result && (
          <>
            <CompBanner
              pass={!!pass}
              label={pass ? `Rn = ${result.Rn.toFixed(3)} Ω — cumple IEEE 80` : `Rn = ${result.Rn.toFixed(3)} Ω — no cumple (> 5 Ω)`}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <StatCard label="R₁ — una pica" value={`${result.R1.toFixed(3)} Ω`} />
              <StatCard label={`Rₙ — ${Math.round(form.n)} picas`} value={`${result.Rn.toFixed(3)} Ω`} highlight />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>

            <div style={panelStyle}>
              <SectionLabel>Desglose</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Parámetro</Th><Th>Valor</Th><Th>Referencia</Th></tr></thead>
                <tbody>
                  <tr><TdMono>R₁ (Dwight)</TdMono><TdMono>{result.R1.toFixed(4)} Ω</TdMono><TdMono>Annex B.1</TdMono></tr>
                  <tr><TdMono>Rm (mutua)</TdMono><TdMono>{result.Rm.toFixed(4)} Ω</TdMono><TdMono>Sunde 1949</TdMono></tr>
                  <tr><TdMono>Rₙ total</TdMono><TdMono>{result.Rn.toFixed(4)} Ω</TdMono><TdMono>paralelo</TdMono></tr>
                  <tr><TdMono>GPR</TdMono><TdMono>{result.gpr.toFixed(0)} V</TdMono><TdMono>Rn × Ig</TdMono></tr>
                </tbody>
              </table>
            </div>

            <div style={panelStyle}>
              <SectionLabel>Verificación IEEE 80-2013</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr><Th>Criterio</Th><Th>Rn</Th><Th>Límite</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  <tr>
                    <TdMono>Subestaciones críticas</TdMono>
                    <TdMono>{result.Rn.toFixed(3)} Ω</TdMono>
                    <TdMono>≤ 1 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg1 ? 'var(--green)' : 'var(--red)' }}>
                      {result.compliance.rg1 ? '✓ OK' : '✗'}
                    </TdMono>
                  </tr>
                  <tr>
                    <TdMono>Uso general</TdMono>
                    <TdMono>{result.Rn.toFixed(3)} Ω</TdMono>
                    <TdMono>≤ 5 Ω</TdMono>
                    <TdMono style={{ color: result.compliance.rg5 ? 'var(--green)' : 'var(--red)' }}>
                      {result.compliance.rg5 ? '✓ OK' : '✗'}
                    </TdMono>
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
