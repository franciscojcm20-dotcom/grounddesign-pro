'use client';
import { useState, useMemo } from 'react';
import {
  computeRisk,
  type RiskInput, type RiskResult,
  type StructureType, type EnvironmentType, type SoilType,
} from '@strike/lps-engine';
import { ExplanationPanel } from '@/components/ui/ExplanationPanel';
import Link from 'next/link';

// ─── Shared styles ────────────────────────────────────────────────────────────

const FIELD_STYLE: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14,
};
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700,
};
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-mono)',
  fontSize: 12, padding: '7px 10px', boxSizing: 'border-box',
};
const SELECT_STYLE: React.CSSProperties = { ...INPUT_STYLE };
const SEC_LABEL: React.CSSProperties = {
  fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--faint)',
  textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700,
  borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 14, marginTop: 20,
};

// ─── Option lists ─────────────────────────────────────────────────────────────

const STRUCTURE_TYPES: { value: StructureType; label: string }[] = [
  { value: 'residential',  label: 'Vivienda / Residencial' },
  { value: 'farm',         label: 'Agrícola / Rural' },
  { value: 'industry',     label: 'Industrial / Fábrica' },
  { value: 'commercial',   label: 'Comercial / Oficinas' },
  { value: 'public',       label: 'Público / Cultural' },
  { value: 'hospital',     label: 'Hospital / Clínica' },
  { value: 'heritage',     label: 'Patrimonio cultural' },
  { value: 'datacenter',   label: 'Data center / TI' },
  { value: 'telecom',      label: 'Telecomunicaciones' },
  { value: 'explosive',    label: 'Instalación explosiva' },
];

const ENV_TYPES: { value: EnvironmentType; label: string; cd: number }[] = [
  { value: 'hilltop',  label: 'Colina / Promontorio aislado', cd: 0.25 },
  { value: 'rural',    label: 'Rural / Campo abierto',        cd: 0.5  },
  { value: 'suburban', label: 'Urbano / Suburbano',           cd: 1.0  },
  { value: 'urban',    label: 'Centro urbano denso',          cd: 2.0  },
];

const SOIL_TYPES: { value: SoilType; label: string }[] = [
  { value: 'asphalt',      label: 'Asfalto (pa = 10⁻⁴)' },
  { value: 'concrete',     label: 'Hormigón (pa = 10⁻³)' },
  { value: 'rock',         label: 'Roca (pa = 10⁻³)' },
  { value: 'sandy',        label: 'Arena (pa = 10⁻³)' },
  { value: 'clay',         label: 'Arcilla (pa = 10⁻²)' },
  { value: 'agricultural', label: 'Suelo agrícola (pa = 10⁻²)' },
];

// ─── Default inputs ───────────────────────────────────────────────────────────

const DEFAULTS: RiskInput = {
  structure: {
    length:  30, width: 15, height: 12,
    type:    'industry',
    hasInternalWiring: true,
    metalRoof:         false,
    soilType:          'concrete',
  },
  location: {
    Ng:          3.0,
    environment: 'suburban',
  },
  existing: {
    hasLPS:    false,
    hasSPD:    false,
    hasBonding:false,
  },
  loss: {
    structureCost:  500_000,
    equipmentCost:  200_000,
  },
};

// ─── Risk result display ──────────────────────────────────────────────────────

function RiskRow({ label, R, RT, required }: { label: string; R: number; RT: number; required: boolean }) {
  const color = required ? 'var(--danger)' : 'var(--safe)';
  const bg    = required ? '#1f0a0a'       : '#0a1f0f';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: bg, borderRadius: 5, marginBottom: 4, border: `1px solid ${color}22` }}>
      <span style={{ fontSize: 10, color: 'var(--dim)', flex: 1 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', minWidth: 90, textAlign: 'right' }}>
        {R.toExponential(2)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)', minWidth: 80, textAlign: 'right' }}>
        RT = {RT.toExponential(0)}
      </span>
      <span style={{ ...{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 90, textAlign: 'right' }, color }}>
        {required ? '✗ PROTEGER' : '✓ ACEPTABLE'}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RiskClient() {
  const [inp, setInp] = useState<RiskInput>(DEFAULTS);
  const [showExpl, setShowExpl] = useState(false);

  const computed = useMemo(() => computeRisk(inp), [inp]);
  const { result: res, explanation: expl } = computed;

  function setS<K extends keyof RiskInput['structure']>(k: K, v: RiskInput['structure'][K]) {
    setInp(p => ({ ...p, structure: { ...p.structure, [k]: v } }));
  }
  function setL<K extends keyof RiskInput['location']>(k: K, v: RiskInput['location'][K]) {
    setInp(p => ({ ...p, location: { ...p.location, [k]: v } }));
  }
  function setE<K extends keyof RiskInput['existing']>(k: K, v: RiskInput['existing'][K]) {
    setInp(p => ({ ...p, existing: { ...p.existing, [k]: v } }));
  }

  const anyRequired = Object.values(res.required).some(Boolean);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ background: '#080c14', borderBottom: '1px solid var(--line)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="10" fill="#0e1420" stroke="#1a56db" strokeWidth="1.5" />
            <path d="M30 8 L18 30 H28 L26 48 L38 26 H28 Z" fill="#facc15" />
          </svg>
          <span style={{ fontWeight: 800, color: 'var(--text)', letterSpacing: '-.01em' }}>
            Strike<span style={{ color: '#1a56db' }}>Ground</span>
          </span>
        </Link>
        <span style={{ color: 'var(--line)' }}>|</span>
        <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>Evaluación de Riesgo IEC 62305-2</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 8.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)', padding: '3px 10px', border: '1px solid var(--line)', borderRadius: 4 }}>
          IEC 62305-2 · Ed. 2.0 2010-12
        </span>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', overflow: 'hidden' }}>

        {/* ── Left: inputs ─────────────────────────────────────────────────── */}
        <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '20px 18px 40px', background: 'var(--panel)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Parámetros de entrada</h2>
          <p style={{ fontSize: 10, color: 'var(--faint)', lineHeight: 1.5, marginBottom: 18 }}>
            Los resultados y la explicación técnica se actualizan en tiempo real.
          </p>

          {/* Geometry */}
          <div style={SEC_LABEL}>Geometría de la estructura</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {([['length','Largo','m'], ['width','Ancho','m'], ['height','Altura','m']] as const).map(([k, lbl, u]) => (
              <div key={k} style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{lbl} ({u})</label>
                <input style={INPUT_STYLE} type="number" min={1} step={1}
                  value={(inp.structure[k] as number)}
                  onChange={e => setS(k, parseFloat(e.target.value) || 1)} />
              </div>
            ))}
          </div>

          <div style={FIELD_STYLE}>
            <label style={LABEL_STYLE}>Tipo de estructura</label>
            <select style={SELECT_STYLE} value={inp.structure.type}
              onChange={e => setS('type', e.target.value as StructureType)}>
              {STRUCTURE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div style={FIELD_STYLE}>
            <label style={LABEL_STYLE}>Tipo de suelo (pa)</label>
            <select style={SELECT_STYLE} value={inp.structure.soilType}
              onChange={e => setS('soilType', e.target.value as SoilType)}>
              {SOIL_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {[['hasInternalWiring','Cableado interno'], ['metalRoof','Cubierta metálica']].map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 10.5, color: 'var(--dim)' }}>
                <input type="checkbox"
                  checked={inp.structure[k as keyof typeof inp.structure] as boolean}
                  onChange={e => setS(k as 'hasInternalWiring' | 'metalRoof', e.target.checked)} />
                {lbl}
              </label>
            ))}
          </div>

          {/* Location */}
          <div style={{ ...SEC_LABEL, marginTop: 24 }}>Localización</div>
          <div style={FIELD_STYLE}>
            <label style={LABEL_STYLE}>Densidad de descargas Ng (desc/km²/año)</label>
            <input style={INPUT_STYLE} type="number" min={0.1} max={20} step={0.1}
              value={inp.location.Ng}
              onChange={e => setL('Ng', parseFloat(e.target.value) || 0.1)} />
            <div style={{ fontSize: 8.5, color: 'var(--faint)' }}>Obtener de mapa isoceráunico local. Rango típico: 0.5 – 10</div>
          </div>
          <div style={FIELD_STYLE}>
            <label style={LABEL_STYLE}>Entorno (factor Cd)</label>
            <select style={SELECT_STYLE} value={inp.location.environment}
              onChange={e => setL('environment', e.target.value as EnvironmentType)}>
              {ENV_TYPES.map(o => <option key={o.value} value={o.value}>{o.label} — Cd = {o.cd}</option>)}
            </select>
          </div>

          {/* Existing protection */}
          <div style={{ ...SEC_LABEL, marginTop: 24 }}>Protección existente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--dim)', cursor: 'pointer' }}>
              <input type="checkbox" checked={inp.existing.hasLPS}
                onChange={e => setE('hasLPS', e.target.checked)} />
              SPR (sistema de protección contra rayos) instalado
            </label>
            {inp.existing.hasLPS && (
              <div style={{ ...FIELD_STYLE, marginLeft: 22 }}>
                <label style={LABEL_STYLE}>Nivel LPS</label>
                <select style={{ ...SELECT_STYLE, width: 'auto' }} value={inp.existing.lpsLevel ?? ''}
                  onChange={e => setE('lpsLevel', e.target.value as 'I'|'II'|'III'|'IV')}>
                  <option value="">— seleccionar —</option>
                  {(['I','II','III','IV'] as const).map(l => <option key={l} value={l}>LPS {l}</option>)}
                </select>
              </div>
            )}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--dim)', cursor: 'pointer' }}>
              <input type="checkbox" checked={inp.existing.hasSPD}
                onChange={e => setE('hasSPD', e.target.checked)} />
              SPD (protector contra sobretensiones) en entrada de servicios
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--dim)', cursor: 'pointer' }}>
              <input type="checkbox" checked={inp.existing.hasBonding}
                onChange={e => setE('hasBonding', e.target.checked)} />
              Equipotencialidad (bonding) instalada
            </label>
          </div>
        </aside>

        {/* ── Right: results ────────────────────────────────────────────────── */}
        <section style={{ overflowY: 'auto', padding: '20px 28px 48px', background: 'var(--bg)' }}>

          {/* Summary banner */}
          <div style={{
            background: anyRequired ? '#1f0a0a' : '#0a1f0f',
            border: `1px solid ${anyRequired ? 'var(--danger)' : 'var(--safe)'}44`,
            borderLeft: `4px solid ${anyRequired ? 'var(--danger)' : 'var(--safe)'}`,
            borderRadius: 8, padding: '14px 18px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: anyRequired ? 'var(--danger)' : 'var(--safe)', marginBottom: 4 }}>
              {anyRequired ? '✗ SE REQUIERE SISTEMA DE PROTECCIÓN CONTRA RAYOS' : '✓ RIESGO DENTRO DE LÍMITES TOLERABLES'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.6 }}>
              Nd = <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{res.Nd.toExponential(3)}</strong> eventos/año
              · Ad = <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{res.Ad.toFixed(0)} m²</strong>
              · Cd = <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{res.Cd}</strong>
              · Ng = <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{inp.location.Ng}</strong> desc/km²/año
            </div>
          </div>

          {/* Risk table */}
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Riesgo calculado vs tolerable (IEC 62305-2 Tabla 2)
          </h3>
          <RiskRow label="R1 — Pérdida de vidas humanas"        R={res.R1} RT={res.RT.R1} required={res.required.R1} />
          <RiskRow label="R2 — Pérdida de servicio público"     R={res.R2} RT={res.RT.R2} required={res.required.R2} />
          <RiskRow label="R3 — Pérdida de patrimonio cultural"  R={res.R3} RT={res.RT.R3} required={res.required.R3} />
          <RiskRow label="R4 — Pérdida de valor económico"      R={res.R4} RT={res.RT.R4} required={res.required.R4} />

          {/* Components */}
          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Componentes de riesgo (IEC 62305-2 Tabla 1)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {([
                ['RA', 'Tensión contacto/paso', res.components.RA],
                ['RB', 'Daño físico',           res.components.RB],
                ['RC', 'Sistemas internos',     res.components.RC],
                ['RM', 'LEMP',                  res.components.RM],
              ] as [string, string, number][]).map(([sym, name, val]) => (
                <div key={sym} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 3 }}>{sym}</div>
                  <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 6 }}>{name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)' }}>{val.toExponential(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation toggle */}
          <button onClick={() => setShowExpl(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: '1px solid var(--line)', borderRadius: 6,
            color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 10.5,
            padding: '9px 16px', cursor: 'pointer', transition: 'border-color .15s, color .15s',
            marginBottom: 4, width: '100%', justifyContent: 'center',
          }}>
            <span style={{ color: '#facc15', fontSize: 14 }}>⚡</span>
            {showExpl ? 'Ocultar' : 'Ver'} justificación técnica completa — Motor de Ingeniería Explicable
            <span style={{ color: 'var(--faint)' }}>{showExpl ? '▲' : '▼'}</span>
          </button>

          {showExpl && (
            <ExplanationPanel
              physical={expl.physical}
              mathematical={expl.mathematical}
              normative={expl.normative}
              engineering={expl.engineering}
            />
          )}
        </section>
      </div>
    </div>
  );
}
