import Link from 'next/link';

const PLANS = [
  {
    name: 'Community',
    price: 'Gratis',
    period: 'para siempre',
    color: '#3b82f6',
    cta: 'Crear cuenta',
    href: '/register',
    features: [
      '7 módulos de cálculo completos',
      'Motor IEEE 80/81 completo',
      'Exportar PDF (marca de agua)',
      '3 proyectos activos',
      'Historial de 10 cálculos',
      'Soporte por comunidad',
    ],
  },
  {
    name: 'Individual',
    price: 'CLP 29.900',
    period: '/mes',
    color: '#E07A23',
    cta: 'Empezar prueba 14 días',
    href: '/register?plan=individual',
    highlight: true,
    features: [
      'Todo lo de Community',
      'PDF profesional sin marca de agua',
      'Proyectos ilimitados',
      'Historial completo',
      'Firma PE en reportes',
      'Soporte por email',
      'Acceso anticipado a nuevas normas',
    ],
  },
  {
    name: 'Professional',
    price: 'CLP 79.900',
    period: '/mes',
    color: '#10b981',
    cta: 'Contactar ventas',
    href: '/register?plan=professional',
    features: [
      'Todo lo de Individual',
      'Hasta 5 usuarios (equipo)',
      'API access (REST)',
      'Normas IEC 60364 / RETIE',
      'Modelos de terreno avanzados',
      'Soporte prioritario',
      'Onboarding dedicado',
      'Factura electrónica',
    ],
  },
];

const COMPARE = [
  { feature: 'Módulos IEEE 80/81',       community: true,  individual: true,  pro: true },
  { feature: 'PDF sin marca de agua',    community: false, individual: true,  pro: true },
  { feature: 'Proyectos',                community: '3',   individual: '∞',   pro: '∞' },
  { feature: 'Historial de cálculos',    community: '10',  individual: '∞',   pro: '∞' },
  { feature: 'Firma PE en reportes',     community: false, individual: true,  pro: true },
  { feature: 'Acceso API',               community: false, individual: false, pro: true },
  { feature: 'Normas IEC / RETIE',       community: false, individual: false, pro: true },
  { feature: 'Usuarios del equipo',      community: '1',   individual: '1',   pro: '5' },
  { feature: 'Soporte',                  community: 'Comunidad', individual: 'Email', pro: 'Prioritario' },
];

function Check({ ok }: { ok: boolean | string }) {
  if (typeof ok === 'string') return <span style={{ fontSize: 11, color: 'var(--dim)' }}>{ok}</span>;
  return ok
    ? <span style={{ color: '#10b981', fontSize: 14 }}>✓</span>
    : <span style={{ color: 'var(--line)', fontSize: 14 }}>—</span>;
}

export default function PricingPage() {
  return (
    <div style={{ padding: '64px 40px', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          Planes y precios
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14, letterSpacing: '-.01em' }}>
          Elige el plan para tu equipo
        </h1>
        <p style={{ fontSize: 13, color: 'var(--dim)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
          Todos los planes incluyen el motor IEEE completo. Mejora cuando necesites más capacidad, proyectos o funciones de equipo.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 64 }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            background: 'var(--panel)',
            border: `1px solid ${plan.highlight ? plan.color : 'var(--line)'}`,
            borderRadius: 6, padding: '28px 24px',
            position: 'relative',
            boxShadow: plan.highlight ? `0 0 0 1px ${plan.color}22` : 'none',
          }}>
            {plan.highlight && (
              <div style={{
                position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                background: plan.color, color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '3px 12px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
              }}>
                Más popular
              </div>
            )}

            <div style={{ fontSize: 10, fontWeight: 700, color: plan.color, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              {plan.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{plan.price}</span>
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>{plan.period}</span>
            </div>

            <div style={{ margin: '20px 0', borderTop: '1px solid var(--line)' }} />

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--dim)', alignItems: 'flex-start' }}>
                  <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link href={plan.href} style={{
              display: 'block', textAlign: 'center', padding: '10px',
              background: plan.highlight ? plan.color : 'transparent',
              color: plan.highlight ? '#fff' : 'var(--dim)',
              border: `1px solid ${plan.highlight ? plan.color : 'var(--line)'}`,
              borderRadius: 3, textDecoration: 'none', fontWeight: 700, fontSize: 12,
            }}>
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div>
        <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
          Comparativa completa
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'var(--dim)' }}>Función</th>
                {['Community', 'Individual', 'Professional'].map(p => (
                  <th key={p} style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 700, color: 'var(--text)', width: 130 }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={row.feature} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--panel)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--dim)' }}>{row.feature}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}><Check ok={row.community} /></td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}><Check ok={row.individual} /></td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}><Check ok={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ note */}
      <div style={{ marginTop: 56, padding: '24px', background: 'var(--panel)', borderRadius: 4, border: '1px solid var(--line)', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
          ¿Tienes preguntas sobre facturación o necesitas un plan a medida para tu empresa?
        </div>
        <a href="mailto:soporte@grounddesing.pro" style={{ fontSize: 11, color: 'var(--copper)', fontFamily: 'var(--font-mono)' }}>
          soporte@grounddesing.pro →
        </a>
      </div>

    </div>
  );
}
