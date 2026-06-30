import Link from 'next/link';

const CARDS = [
  {
    href: '/soil/wenner',
    label: 'Resistividad Wenner',
    norm: 'IEEE 81-2012 · Cl. 8.3',
    desc: 'Cuatro electrodos colineales equidistantes. Calcula ρa = 2πaR, estima modelo biestrato ρ1/ρ2/h.',
    icon: '⚡',
    status: 'active',
  },
  {
    href: '/soil/schlumberger',
    label: 'Resistividad Schlumberger',
    norm: 'IEEE 81-2012 · Cl. 8',
    desc: 'Electrodos exteriores variables, interior fijo. Fórmula exacta Telford: ρa = π(L²−l²)/(2l)·R.',
    icon: '📡',
    status: 'active',
  },
  {
    href: '/soil/nlayer',
    label: 'Modelo N capas',
    norm: 'Wait (1954) · Orellana-Mooney',
    desc: 'Kernel recursivo de Wait para N capas. Curva ρa(a) con gráfica integrada. Sondeo eléctrico vertical.',
    icon: '🌐',
    status: 'active',
  },
  {
    href: '/grid/resistance',
    label: 'Resistencia de malla',
    norm: 'IEEE 80-2013 · Cl. 14.2',
    desc: 'Ecuación de Sverak. Comprobación Rg ≤ 1 Ω. Incluye varillas verticales y GPR.',
    icon: '⬡',
    status: 'active',
  },
  {
    href: '/conductor',
    label: 'Conductor IEEE 80',
    norm: 'IEEE 80-2013 · Cl. 11.3',
    desc: 'Onderdonk: área mínima por corriente y tiempo de despeje. Selección automática de calibre AWG/MCM.',
    icon: '〰',
    status: 'active',
  },
  {
    href: '/voltages',
    label: 'Tensiones paso / contacto',
    norm: 'IEEE 80-2013 · Cl. 16',
    desc: 'Em y Es reales vs. admisibles. Factor Cs de capa superficial. Compliance automático 50/70 kg.',
    icon: '⚠',
    status: 'active',
  },
  {
    href: '/grid/gel',
    label: 'Aditivo gel químico',
    norm: 'Dwight / Sunde',
    desc: 'Modelo cilindros concéntricos. Calcula ρ efectiva de la funda de gel y mejora porcentual de Rg.',
    icon: '🧪',
    status: 'active',
  },
];

const STEPS = [
  { n: '01', title: 'Medir suelo', desc: 'Ensayo Wenner o Schlumberger en campo. Ingresa lecturas a/R.' },
  { n: '02', title: 'Modelar terreno', desc: 'Genera modelo biestrato o N capas con kernel de Wait.' },
  { n: '03', title: 'Diseñar malla', desc: 'Calcula Rg con Sverak. Dimensiona conductor con Onderdonk.' },
  { n: '04', title: 'Verificar seguridad', desc: 'Comprueba tensiones Em/Es vs. admisibles IEEE 80-2013.' },
  { n: '05', title: 'Exportar PDF', desc: 'Reporte profesional con norma, inputs, resultados y firma PE.' },
];

export default function HomePage() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Software de diseño profesional
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>
          Módulos de cálculo
        </h1>
        <p style={{ fontSize: 11, color: 'var(--dim)', maxWidth: 560, lineHeight: 1.6 }}>
          Motor IEEE propio sin dependencias externas. Cada módulo exporta PDF profesional con norma, inputs, resultados y compliance.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['IEEE Std 80-2013', 'IEEE Std 81-2012', 'Wait (1954)', 'Sverak', 'Onderdonk', 'Dwight/Sunde'].map(n => (
            <span key={n} style={{ fontSize: 8.5, padding: '2px 8px', borderRadius: 2, background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{n}</span>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10, marginBottom: 48 }}>
        {CARDS.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'var(--panel)',
              border: '1px solid var(--copper)',
              borderRadius: 4, padding: '16px 18px',
              height: '100%', boxSizing: 'border-box',
              transition: 'border-color .15s',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--copper)', letterSpacing: '.07em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>{card.norm}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{card.label}</div>
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.6 }}>{card.desc}</div>
              <div style={{ marginTop: 12, fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)' }}>Abrir módulo →</div>
            </div>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 32 }}>
        <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>
          Flujo de trabajo
        </div>
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, flex: '1 1 160px', minWidth: 140 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--copper-soft)', border: '1px solid var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--copper)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{s.n}</div>
                {i < STEPS.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 20, background: 'var(--line)', margin: '4px 0' }} />}
              </div>
              <div style={{ paddingBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
