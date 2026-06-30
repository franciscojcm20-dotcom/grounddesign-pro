'use client';
import { useState } from 'react';
import {
  SectionLabel, StatCard, ExpertItem, FundBtn,
  calcLayout, inputStyle, panelStyle, Th, TdMono, Field,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface GprResult {
  GPR: number;
  Ib: number; Ib50: number; Ib70: number;
  Etouch: number; Estep: number; EtouchMax: number;
  compliance: {
    gprUnder5kV: { pass: boolean; limit: string; norm: string };
    touchSafe:   { pass: boolean; limit: string; norm: string };
  };
  inputs: Record<string, number>;
  norm: string;
}

/* ── GPR vs Rg curve (simulated range) ─────────────────── */
function GprCurve({ Ig, Sf, Rg }: { Ig: number; Sf: number; Rg: number }) {
  const W = 360, H = 140, PL = 42, PR = 12, PT = 10, PB = 28;
  const steps = 20;
  const rMax  = Rg * 2.5;
  const rMin  = Rg * 0.1;
  const gprMax = Ig * Sf * rMax;

  const xFor = (r: number) => PL + ((r - rMin) / (rMax - rMin)) * (W - PL - PR);
  const yFor = (g: number) => PT + H - PB - (g / gprMax) * (H - PT - PB);

  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const r = rMin + (i / steps) * (rMax - rMin);
    return { r, gpr: Ig * Sf * r };
  });
  const poly = pts.map(p => `${xFor(p.r).toFixed(1)},${yFor(p.gpr).toFixed(1)}`).join(' ');
  const area = `${xFor(rMin)},${yFor(0)} ` + poly + ` ${xFor(rMax)},${yFor(0)}`;
  const cx = xFor(Rg);
  const cy = yFor(Ig * Sf * Rg);

  const yTicks = [0, gprMax * 0.25, gprMax * 0.5, gprMax * 0.75, gprMax];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      {/* Grid */}
      {yTicks.map(v => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--line)" strokeWidth="0.5" />
            <text x={PL - 4} y={y + 3} fontSize="7" fill="var(--faint)" textAnchor="end" fontFamily="var(--font-mono)">
              {(v / 1000).toFixed(1)}k
            </text>
          </g>
        );
      })}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="var(--line)" strokeWidth="0.7" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--line)" strokeWidth="0.7" />

      {/* 5kV safety limit */}
      {gprMax > 5000 && (
        <line x1={PL} y1={yFor(5000)} x2={W - PR} y2={yFor(5000)}
          stroke="var(--danger)" strokeWidth="1" strokeDasharray="4,3" />
      )}

      {/* Area + curve */}
      <polygon points={area} fill="var(--copper)" fillOpacity="0.07" />
      <polyline points={poly} fill="none" stroke="var(--copper)" strokeWidth="1.5" />

      {/* Operating point */}
      <line x1={cx} y1={PT} x2={cx} y2={H - PB} stroke="var(--copper)" strokeWidth="0.8" strokeDasharray="3,2" strokeOpacity="0.5" />
      <circle cx={cx} cy={cy} r="4.5" fill="var(--copper)" />
      <text x={cx + 7} y={cy - 4} fontSize="7.5" fill="var(--copper)" fontFamily="var(--font-mono)">
        {(Ig * Sf * Rg / 1000).toFixed(1)} kV
      </text>

      {/* Axis labels */}
      <text x={(PL + W - PR) / 2} y={H - 2} fontSize="7" fill="var(--faint)" textAnchor="middle" fontFamily="var(--font-mono)">
        Rg (Ω)
      </text>
      <text x={8} y={H / 2} fontSize="7" fill="var(--faint)" textAnchor="middle" fontFamily="var(--font-mono)"
        transform={`rotate(-90, 8, ${H / 2})`}>GPR (V)</text>
    </svg>
  );
}

function CompRow({ label, pass, value, limit, norm }: { label: string; pass: boolean; value: string; limit: string; norm: string }) {
  return (
    <tr>
      <TdMono>{label}</TdMono>
      <TdMono highlight>{value}</TdMono>
      <TdMono>{limit}</TdMono>
      <td style={{ padding: '7px 10px', fontSize: 9 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 8.5, fontWeight: 700,
          background: pass ? '#14321422' : '#32141422',
          color: pass ? 'var(--safe)' : 'var(--danger)',
          border: `1px solid ${pass ? 'var(--safe)' : 'var(--danger)'}44`,
        }}>{pass ? 'CUMPLE' : 'EXCEDE'}</span>
      </td>
      <td style={{ padding: '7px 10px', fontSize: 8.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{norm}</td>
    </tr>
  );
}

export function GprClient() {
  const [Ig,    setIg]    = useState('5000');
  const [Rg,    setRg]    = useState('0.8');
  const [Sf,    setSf]    = useState('0.6');
  const [ts,    setTs]    = useState('0.5');
  const [bodyW, setBodyW] = useState('70');
  const [Cs,    setCs]    = useState('0.74');
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
          Ig: +Ig, Rg: +Rg, Zf: +Rg, Sf: +Sf,
          ts: +ts, bodyW: +bodyW, Cs: +Cs, rhoS: +rhoS,
        }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error);
      setResult(await res.json() as GprResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  const allPass = result && Object.values(result.compliance).every(c => c.pass);

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>GPR — Potencial de tierra</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          Ground Potential Rise · IEEE 80-2013 Cl. 15-16
        </p>

        <SectionLabel>Sistema de falla</SectionLabel>
        <Field label="Corriente de falla Ig" unit="A">
          <input style={inputStyle} type="number" value={Ig} onChange={e => setIg(e.target.value)} />
        </Field>
        <Field label="Resistencia de malla Rg" unit="Ω">
          <input style={inputStyle} type="number" value={Rg} onChange={e => setRg(e.target.value)} step="0.01" />
        </Field>
        <Field label="Factor de división Sf" unit="0–1">
          <input style={inputStyle} type="number" value={Sf} onChange={e => setSf(e.target.value)} step="0.01" min="0" max="1" />
        </Field>
        <Field label="Duración de falla ts" unit="s">
          <input style={inputStyle} type="number" value={ts} onChange={e => setTs(e.target.value)} step="0.01" />
        </Field>

        <SectionLabel>Cuerpo humano</SectionLabel>
        <Field label="Peso corporal" unit="kg">
          <select style={inputStyle} value={bodyW} onChange={e => setBodyW(e.target.value)}>
            <option value="50">50 kg (norma conservadora)</option>
            <option value="70">70 kg (estándar IEEE)</option>
          </select>
        </Field>

        <SectionLabel>Capa superficial</SectionLabel>
        <Field label="Factor de reducción Cs" unit="">
          <input style={inputStyle} type="number" value={Cs} onChange={e => setCs(e.target.value)} step="0.01" />
        </Field>
        <Field label="Resistividad ρs" unit="Ω·m">
          <input style={inputStyle} type="number" value={rhoS} onChange={e => setRhoS(e.target.value)} />
        </Field>

        <button onClick={calculate} disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer',
          opacity: loading ? 0.6 : 1, marginTop: 8,
        }}>
          {loading ? 'Calculando…' : 'Calcular GPR'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⏚</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa los parámetros del sistema y presiona Calcular</div>
          </div>
        ) : (
          <>
            {/* Summary banner */}
            <div style={{
              padding: '10px 16px', marginBottom: 16, borderRadius: 4,
              background: allPass ? '#0a1f0a' : '#1f0a0a',
              border: `1px solid ${allPass ? 'var(--safe)' : 'var(--danger)'}44`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>{allPass ? '✓' : '⚠'}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: allPass ? 'var(--safe)' : 'var(--danger)' }}>
                  {allPass ? 'Sistema seguro según IEEE 80-2013' : 'Se requiere rediseño del sistema'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                  GPR = {result.GPR.toFixed(0)} V · {result.norm}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="GPR"         value={(result.GPR / 1000).toFixed(2)} unit="kV"  primary />
              <StatCard label="Etouch adm." value={result.Etouch.toFixed(0)}       unit="V" />
              <StatCard label="Estep adm."  value={result.Estep.toFixed(0)}        unit="V" />
              <StatCard label="Ib"          value={(result.Ib * 1000).toFixed(1)}  unit="mA" />
            </div>

            <SectionLabel purple>Sistema Experto</SectionLabel>
            {result.GPR > 5000 ? (
              <ExpertItem type="danger">
                GPR = {(result.GPR / 1000).toFixed(1)} kV excede el límite de 5 kV (IEEE 80 Cl. 1). Requiere reducir Rg mediante malla más densa o electrodos adicionales.
              </ExpertItem>
            ) : result.GPR > 2500 ? (
              <ExpertItem type="warn">
                GPR entre 2.5 kV y 5 kV — zona amarilla. Verificar tensiones de paso y toque con detalle (IEEE 80 §16).
              </ExpertItem>
            ) : (
              <ExpertItem type="ok">
                GPR = {(result.GPR / 1000).toFixed(2)} kV — dentro del rango seguro. Sistema clasificado como de bajo riesgo de GPR.
              </ExpertItem>
            )}
            {!result.compliance.touchSafe.pass && (
              <ExpertItem type="danger">
                Tensión de toque estimada ({result.EtouchMax.toFixed(0)} V) excede la admisible ({result.Etouch.toFixed(0)} V). Agregar malla de equipotencialización o capa de grava adicional.
              </ExpertItem>
            )}

            {/* GPR vs Rg curve */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                GPR vs Rg — punto de operación actual resaltado
              </div>
              <GprCurve Ig={+Ig} Sf={+Sf} Rg={+Rg} />
              {+Ig * +Sf * +Rg > 5000 && (
                <div style={{ fontSize: 9, color: 'var(--danger)', marginTop: 6 }}>
                  — — línea roja: límite de 5 kV (IEEE 80-2013 Cl. 1)
                </div>
              )}
            </div>

            {/* Compliance table */}
            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Tabla de cumplimiento IEEE 80</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><Th>Criterio</Th><Th>Calculado</Th><Th>Límite</Th><Th>Estado</Th><Th>Norma</Th></tr>
                </thead>
                <tbody>
                  <CompRow label="GPR" pass={result.compliance.gprUnder5kV.pass}
                    value={`${result.GPR.toFixed(0)} V`} limit={result.compliance.gprUnder5kV.limit} norm={result.compliance.gprUnder5kV.norm} />
                  <CompRow label="Etouch máx." pass={result.compliance.touchSafe.pass}
                    value={`${result.EtouchMax.toFixed(0)} V`} limit={result.compliance.touchSafe.limit} norm={result.compliance.touchSafe.norm} />
                </tbody>
              </table>
            </div>

            {/* Currents table */}
            <div style={{ ...panelStyle, marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Corrientes de fibrillación ventricular</div>
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
              inputs={{ Ig: +Ig, Rg: +Rg, Sf: +Sf, ts: +ts, bodyW: +bodyW, Cs: +Cs, rhoS: +rhoS }}
              outputs={{ GPR: result.GPR, Etouch: result.Etouch, Estep: result.Estep, Ib: result.Ib }}
              norm={result.norm}
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="IEEE 80-2013 — GPR y tensiones admisibles">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                GPR = Sf · Ig · Rg
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Factor de división Sf:</strong> fracción de la corriente de falla que fluye por la malla — el resto retorna por conductores aéreos. IEEE 80 §15.9.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Ib (Dalziel-Lee):</strong> 0.116/√ts (50 kg) y 0.157/√ts (70 kg). Corriente que produce fibrillación ventricular en el 99.5% de la población.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Etouch adm. = (1000 + 1.5·Cs·ρs)·Ib</strong> · Resistencia total mano-pie con capa superficial.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013 Cl. 15-16 · Dalziel & Lee (1968)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
