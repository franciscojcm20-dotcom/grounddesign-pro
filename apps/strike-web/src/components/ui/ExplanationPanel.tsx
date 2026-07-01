'use client';
import { useState } from 'react';
import type {
  PhysicalFoundation, MathFoundation,
  NormativeFoundation, EngineeringFoundation,
} from '@strike/lps-engine';

type Tab = 'physical' | 'mathematical' | 'normative' | 'engineering';

interface ExplanationPanelProps {
  physical:     PhysicalFoundation;
  mathematical: MathFoundation;
  normative:    NormativeFoundation;
  engineering:  EngineeringFoundation;
  /** Optional: highlight a specific tab on open */
  defaultTab?: Tab;
}

const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
  { id: 'physical',     label: 'Físico',      icon: '⚡', color: '#facc15' },
  { id: 'mathematical', label: 'Matemático',  icon: '∑',  color: '#60a5fa' },
  { id: 'normative',    label: 'Normativo',   icon: '📋', color: '#34d399' },
  { id: 'engineering',  label: 'Ingenieril',  icon: '🔧', color: '#f97316' },
];

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8,
  overflow: 'hidden', marginTop: 20,
};

const CHIP: React.CSSProperties = {
  display: 'inline-block', fontSize: 9, fontFamily: 'var(--font-mono)',
  padding: '2px 8px', borderRadius: 3, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.05em',
};

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, color = 'var(--dim)' }: { items: string[]; color?: string }) {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color, lineHeight: 1.5 }}>
          <span style={{ color: 'var(--faint)', flexShrink: 0 }}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PhysicalTab({ data }: { data: PhysicalFoundation }) {
  return (
    <div>
      <SectionBlock title="Fenómeno físico">
        <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.7 }}>{data.phenomenon}</p>
      </SectionBlock>
      <SectionBlock title="Origen del modelo">
        <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>{data.origin}</p>
      </SectionBlock>
      <SectionBlock title="Comportamiento esperado">
        <p style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>{data.expectedBehavior}</p>
      </SectionBlock>
      <SectionBlock title="Efectos electromagnéticos asociados">
        <BulletList items={data.electromagneticEffects} color="var(--dim)" />
      </SectionBlock>
      <SectionBlock title="Hipótesis del modelo">
        <BulletList items={data.hypotheses} color="var(--dim)" />
      </SectionBlock>
      <div style={{ background: '#1f1500', border: '1px solid #f59e0b44', borderRadius: 6, padding: '12px 14px' }}>
        <div style={{ fontSize: 8.5, color: '#f59e0b', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>⚠ Limitaciones del modelo</div>
        <BulletList items={data.modelLimitations} color="#f59e0b99" />
      </div>
    </div>
  );
}

function MathTab({ data }: { data: MathFoundation }) {
  return (
    <div>
      <SectionBlock title="Fórmula principal">
        <div style={{ background: 'var(--bg)', border: '1px solid #1a56db44', borderRadius: 6, padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#60a5fa', textAlign: 'center', letterSpacing: '.02em' }}>
          {data.formula}
        </div>
      </SectionBlock>

      <SectionBlock title="Variables">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.variables.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#60a5fa', minWidth: 40, flexShrink: 0 }}>{v.symbol}</span>
              <span style={{ fontSize: 10.5, color: 'var(--dim)', flex: 1 }}>{v.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', fontWeight: 700 }}>{v.value} <span style={{ color: 'var(--faint)', fontWeight: 400 }}>{v.unit}</span></span>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Desarrollo paso a paso">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.stepByStep.map((step) => (
            <div key={step.index} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ background: '#1a56db', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {step.index}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 4 }}>{step.description}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#60a5fa', marginBottom: 3 }}>{step.expression}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', fontWeight: 700 }}>{step.partialResult}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <div style={{ background: '#0a1530', border: '1px solid #1a56db44', borderRadius: 6, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 8.5, color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Resultado final</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', fontWeight: 700, lineHeight: 1.6 }}>{data.finalResult}</div>
      </div>

      <SectionBlock title="Análisis dimensional">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--line)' }}>
          {data.dimensionalAnalysis}
        </div>
      </SectionBlock>

      {data.sensitivityAnalysis && data.sensitivityAnalysis.length > 0 && (
        <SectionBlock title="Análisis de sensibilidad">
          {data.sensitivityAnalysis.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--line)', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#60a5fa', minWidth: 60 }}>{s.variable}</span>
              <span style={{ ...CHIP, background: '#1a56db22', color: '#60a5fa', border: '1px solid #1a56db44' }}>{s.change}</span>
              <span style={{ fontSize: 10.5, color: 'var(--dim)', flex: 1 }}>{s.impact}</span>
            </div>
          ))}
        </SectionBlock>
      )}
    </div>
  );
}

function NormativeTab({ data }: { data: NormativeFoundation }) {
  return (
    <div>
      {/* Standard badge */}
      <div style={{ background: 'var(--bg)', border: '1px solid #34d39944', borderRadius: 8, padding: '16px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', letterSpacing: '.01em', marginBottom: 2 }}>{data.standard}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{data.edition}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{data.chapter}</div>
            {data.table    && <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 2 }}><span style={{ color: '#34d399' }}>Tabla:</span> {data.table}</div>}
            {data.equation && <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 2 }}><span style={{ color: '#34d399' }}>Ecuación:</span> {data.equation}</div>}
            {data.figure   && <div style={{ fontSize: 10, color: 'var(--dim)' }}><span style={{ color: '#34d399' }}>Figura:</span> {data.figure}</div>}
          </div>
        </div>
      </div>

      <SectionBlock title="Condiciones de aplicación">
        <BulletList items={data.applicabilityConditions} color="var(--dim)" />
      </SectionBlock>

      <div style={{ background: '#0a1f0f', border: '1px solid #22c55e44', borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 8.5, color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Limitaciones de la norma</div>
        <BulletList items={data.standardLimitations} color="#34d39999" />
      </div>

      {data.hierarchyNote && (
        <div style={{ background: '#1f1000', border: '1px solid #f97316', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ fontSize: 8.5, color: '#f97316', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>⚖ Jerarquía normativa</div>
          <p style={{ fontSize: 10.5, color: '#f9731699', lineHeight: 1.6 }}>{data.hierarchyNote}</p>
        </div>
      )}
    </div>
  );
}

function EngineeringTab({ data }: { data: EngineeringFoundation }) {
  return (
    <div>
      <SectionBlock title="Solución seleccionada">
        <div style={{ background: 'var(--bg)', border: '1px solid #f9731644', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{data.selectedSolution}</div>
          <p style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.6 }}>{data.whySelected}</p>
        </div>
      </SectionBlock>

      <SectionBlock title="Alternativas descartadas">
        {data.discardedAlternatives.map((a, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 3 }}>✗ {a.name}</div>
            <div style={{ fontSize: 10, color: 'var(--faint)', lineHeight: 1.5 }}>{a.reason}</div>
          </div>
        ))}
      </SectionBlock>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--safe)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontWeight: 700 }}>✓ Ventajas</div>
          <BulletList items={data.advantages} color="var(--dim)" />
        </div>
        <div>
          <div style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontWeight: 700 }}>✗ Desventajas</div>
          <BulletList items={data.disadvantages} color="var(--dim)" />
        </div>
      </div>

      <SectionBlock title="Datos de ingeniería">
        {[
          ['Nivel de seguridad',  data.safetyLevel],
          ['Redundancia',         data.redundancy],
          ['Constructabilidad',   data.constructability],
          ['Mantenimiento',       data.maintenanceImpact],
          ['Vida útil esperada',  data.expectedLifespan],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, color: 'var(--faint)', minWidth: 120, flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.5 }}>{v}</span>
          </div>
        ))}
      </SectionBlock>
    </div>
  );
}

export function ExplanationPanel({ physical, mathematical, normative, engineering, defaultTab = 'physical' }: ExplanationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div style={PANEL_STYLE}>
      {/* Header */}
      <div style={{ padding: '10px 18px 0', borderBottom: '1px solid var(--line)', background: '#0a0f1a' }}>
        <div style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
          Motor de Ingeniería Explicable — 4 Pilares
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                background: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? tab.color : 'var(--faint)',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 400,
                transition: 'color .15s, border-color .15s',
                display: 'flex', gap: 6, alignItems: 'center',
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 24px', maxHeight: 480, overflowY: 'auto' }}>
        {activeTab === 'physical'     && <PhysicalTab     data={physical} />}
        {activeTab === 'mathematical' && <MathTab         data={mathematical} />}
        {activeTab === 'normative'    && <NormativeTab    data={normative} />}
        {activeTab === 'engineering'  && <EngineeringTab  data={engineering} />}
      </div>
    </div>
  );
}
