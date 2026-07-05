'use client';
import { useState } from 'react';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono, Field,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import { API_BASE as BASE } from '@/lib/apiBase';

interface GprResult {
  GPR: number; Ib: number; Ib50: number; Ib70: number;
  Etouch: number; Estep: number; EtouchMax: number;
  compliance: {
    gprUnder5kV: { pass: boolean; limit: string; norm: string };
    touchSafe:   { pass: boolean; limit: string; norm: string };
  };
  norm: string;
}

/* ── GPR vs Rg sensitivity curve ──────────────────────────── */
function GprCurve({ Ig, Sf, Rg }: { Ig: number; Sf: number; Rg: number }) {
  const W = 360, H = 150, PL = 46, PR = 12, PT = 10, PB = 28;
  const rMin = Rg * 0.1, rMax = Rg * 2.5;
  const gprMax = Ig * Sf * rMax;
  const steps = 24;

  const xFor = (r: number) => PL + ((r - rMin) / (rMax - rMin)) * (W - PL - PR);
  const yFor = (g: number) => PT + (H - PT - PB) * (1 - g / gprMax);

  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const r = rMin + (i / steps) * (rMax - rMin);
    return { r, g: Ig * Sf * r };
  });
  const poly = pts.map(p => `${xFor(p.r).toFixed(1)},${yFor(p.g).toFixed(1)}`).join(' ');
  const area = `${xFor(rMin)},${yFor(0)} ${poly} ${xFor(rMax)},${yFor(0)}`;
  const cx = xFor(Rg), cy = yFor(Ig * Sf * Rg);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => f * gprMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      {yTicks.map(v => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--line)" strokeWidth="0.5" />
            <text x={PL - 4} y={y + 3} fontSize="7" fill="var(--faint)" textAnchor="end" fontFamily="var(--font-mono)">
              {(v / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="var(--line)" strokeWidth="0.7" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--line)" strokeWidth="0.7" />

      {/* 5 kV safety limit */}
      {gprMax > 5000 && (
        <line x1={PL} y1={yFor(5000)} x2={W - PR} y2={yFor(5000)}
          stroke="var(--danger)" strokeWidth="1" strokeDasharray="4,3" />
      )}

      <polygon points={area} fill="var(--copper)" fillOpacity="0.07" />
      <polyline points={poly} fill="none" stroke="var(--copper)" strokeWidth="1.5" />
      <line x1={cx} y1={PT} x2={cx} y2={H - PB} stroke="var(--copper)" strokeWidth="0.8" strokeDasharray="3,2" strokeOpacity="0.5" />
      <circle cx={cx} cy={cy} r="4.5" fill="var(--copper)" />
      <text x={cx + 7} y={cy - 4} fontSize="8" fill="var(--copper)" fontFamily="var(--font-mono)">
        {(Ig * Sf * Rg / 1000).toFixed(2)} kV
      </text>
      <text x={(PL + W - PR) / 2} y={H - 2} fontSize="7" fill="var(--faint)" textAnchor="middle" fontFamily="var(--font-mono)">Rg (Ω)</text>
      <text x={9} y={H / 2} fontSize="7" fill="var(--faint)" textAnchor="middle" fontFamily="var(--font-mono)" transform={`rotate(-90, 9, ${H / 2})`}>GPR (V)</text>
    </svg>
  );
}

export function GprClient() {
  const faultAnalysis = useFaultAnalysis();
  const [Ig,    setIg]    = useState('10000');
  const [Rg,    setRg]    = useState('0.8');
  // Sf ya viene incluido en Ig (Motor de Análisis de Falla entrega la corriente de diseño
  // final = If·Sf·Df) — se fija en 1 para no aplicar el factor de división dos veces.
  const Sf = '1';
  const [ts,    setTs]    = useState('0.5');
  const [bodyW, setBodyW] = useState<50 | 70>(70);
  const [Cs,    setCs]    = useState('0.75');
  const [rhoS,  setRhoS]  = useState('3000');

  const [result,   setResult]   = useState<GprResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [showFund, setShowFund] = useState(false);

  async function calculate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/gpr`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Ig: Number(Ig), Rg: Number(Rg), Zf: Number(Rg),
          Sf: Number(Sf), ts: Number(ts), bodyW,
          Cs: Number(Cs), rhoS: Number(rhoS),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error((d as { error: string }).error ?? 'Error'); }
      setResult(await res.json() as GprResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  const allPass = result ? Object.values(result.compliance).every(c => c.pass) : false;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Potencial de tierra — GPR</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          IEEE Std 80-2013 · Cl. 15-16 · Ground Potential Rise
        </p>

        <SectionLabel>Sistema de falla</SectionLabel>
        <FaultCurrentField onSync={v => setIg(String(Math.round(v)))} label="Corriente de diseño Ig" />
        <Field label="Resistencia de malla Rg" unit="Ω">
          <input style={inputStyle} type="number" value={Rg} onChange={e => setRg(e.target.value)} step="0.01" />
        </Field>
        <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: -6, marginBottom: 10, lineHeight: 1.5 }}>
          El factor de división Sf ya está incluido en Ig (determinado por el Motor de Análisis de Falla) — no se aplica nuevamente aquí.
        </div>
        <Field label="Duración de falla ts" unit="s">
          <input style={inputStyle} type="number" value={ts} onChange={e => setTs(e.target.value)} step="0.01" />
        </Field>

        <SectionLabel>Capa superficial</SectionLabel>
        <Field label="Factor de reducción Cs" unit="">
          <input style={inputStyle} type="number" value={Cs} onChange={e => setCs(e.target.value)} step="0.01" min="0" max="1" />
        </Field>
        <Field label="Resistividad ρs" unit="Ω·m">
          <input style={inputStyle} type="number" value={rhoS} onChange={e => setRhoS(e.target.value)} />
        </Field>

        <SectionLabel>Criterio de seguridad</SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([50, 70] as const).map(w => (
            <button key={w} type="button" onClick={() => setBodyW(w)} style={{
              flex: 1, padding: '7px 0', background: bodyW === w ? 'var(--copper-soft)' : 'var(--bg)',
              border: `1px solid ${bodyW === w ? 'var(--copper)' : 'var(--line)'}`,
              borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 700,
              color: bodyW === w ? 'var(--copper)' : 'var(--dim)',
            }}>{w} kg</button>
          ))}
        </div>

        <button onClick={calculate} disabled={loading || !faultAnalysis.result} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3,
          cursor: 'pointer', opacity: (loading || !faultAnalysis.result) ? 0.6 : 1,
        }}>
          {loading ? 'Calculando…' : 'Calcular GPR'}
        </button>
        {error && (
          <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⏚</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa los parámetros y presiona Calcular</div>
          </div>
        ) : (
          <>
            <CompBanner pass={allPass} norm={result.norm} />

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="GPR" value={(result.GPR / 1000).toFixed(2)} unit="kV" primary />
              <StatCard label="Etoque máx." value={result.EtouchMax.toFixed(0)} unit="V" />
              <StatCard label="Etoque adm." value={result.Etouch.toFixed(0)} unit="V" />
              <StatCard label="Epaso adm." value={result.Estep.toFixed(0)} unit="V" />
            </div>

            {/* GPR vs Rg curve */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                GPR vs Rg — sensibilidad al diseño de malla
              </div>
              <GprCurve Ig={+Ig} Sf={+Sf} Rg={+Rg} />
              {+Ig * +Sf * +Rg > 5000 && (
                <div style={{ fontSize: 9, color: 'var(--danger)', marginTop: 4 }}>
                  — — límite de 5 kV (IEEE 80-2013 Cl. 1)
                </div>
              )}
            </div>

            <SectionLabel>Cumplimiento IEEE 80-2013</SectionLabel>
            {Object.entries(result.compliance).map(([key, c]) => (
              <ExpertItem key={key} type={c.pass ? 'ok' : 'danger'}>
                <strong>{key === 'gprUnder5kV' ? 'GPR' : 'Tensión de toque'}</strong> {c.pass ? 'cumple' : 'NO cumple'} — {c.limit} · {c.norm}
              </ExpertItem>
            ))}

            {/* Currents table */}
            <div style={{ ...panelStyle, marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Corrientes de fibrillación (Dalziel-Lee)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>Peso</Th><Th>Ib (mA)</Th><Th>Etouch adm. (V)</Th><Th>Estep adm. (V)</Th></tr></thead>
                <tbody>
                  {[
                    { w: '50 kg', ib: result.Ib50, et: (1000 + 1.5 * +Cs * +rhoS) * result.Ib50, es: (1000 + 6 * +Cs * +rhoS) * result.Ib50 },
                    { w: '70 kg', ib: result.Ib70, et: (1000 + 1.5 * +Cs * +rhoS) * result.Ib70, es: (1000 + 6 * +Cs * +rhoS) * result.Ib70 },
                  ].map(row => (
                    <tr key={row.w}>
                      <TdMono>{row.w}</TdMono>
                      <TdMono highlight>{(row.ib * 1000).toFixed(1)}</TdMono>
                      <TdMono>{row.et.toFixed(0)}</TdMono>
                      <TdMono>{row.es.toFixed(0)}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ExportBar
              module="gpr"
              inputs={{ Ig: Number(Ig), Rg: Number(Rg), Sf: Number(Sf), ts: Number(ts), bodyW, Cs: Number(Cs), rhoS: Number(rhoS) }}
              outputs={{ GPR: result.GPR, Etouch: result.Etouch, Estep: result.Estep, Ib: result.Ib }}
              norm={result.norm}
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Fundamentos IEEE 80-2013">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                GPR = Ig · Rg
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Ig:</strong> corriente de diseño oficial del proyecto, determinada por el Motor de Análisis de Falla (Ig = If · Sf · Df) — el factor de división Sf y el factor de decremento Df ya están incluidos, por lo que aquí no se aplican nuevamente.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Ib (Dalziel-Lee):</strong> 0.116/√ts (50 kg) y 0.157/√ts (70 kg) — IEEE 80-2013 Ec. 29-30.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Etouch = (1000 + 1.5·Cs·ρs)·Ib</strong> — IEEE 80-2013 Ec. 32.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Estep = (1000 + 6·Cs·ρs)·Ib</strong> — IEEE 80-2013 Ec. 33.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013 Cl. 15-16 · Dalziel & Lee (1968)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
