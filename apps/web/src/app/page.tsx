import Link from 'next/link';

const CARDS = [
  { href: '/soil/wenner', label: 'Resistividad Wenner', norm: 'IEEE 81-2012 Cl.8.3',
    desc: 'Cuatro electrodos colineales. Calcula ρa y estima modelo de 2 capas.', status: 'active' },
  { href: '/soil/schlumberger', label: 'Resistividad Schlumberger', norm: 'IEEE 81-2012 Cl.8',
    desc: 'Electrodos exteriores variables. Forma exacta Telford.', status: 'active' },
  { href: '/grid/resistance', label: 'Resistencia de malla', norm: 'IEEE 80-2013 Cl.14.2',
    desc: 'Ecuación de Sverak. Verifica Rg ≤ 1 Ω.', status: 'active' },
  { href: '/conductor', label: 'Conductor IEEE 80', norm: 'IEEE 80-2013 Cl.11.3',
    desc: 'Onderdonk. Selección de calibre con margen de seguridad.', status: 'active' },
  { href: '/voltages', label: 'Tensiones paso/contacto', norm: 'IEEE 80-2013 Cl.16',
    desc: 'Em, Es reales vs admisibles. Compliance automático.', status: 'active' },
  { href: '/grid/gel', label: 'Aditivo gel químico', norm: 'Dwight / Sunde',
    desc: 'Modelo cilindros concéntricos. Mejora de ρ efectiva.', status: 'active' },
];

export default function HomePage() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        Módulos de cálculo
      </h1>
      <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 32 }}>
        Norma activa: <span style={{ color: 'var(--copper)', fontFamily: 'var(--font-mono)' }}>
          IEEE Std 80-2013 + IEEE Std 81-2012
        </span>
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12,
      }}>
        {CARDS.map(card => (
          <div key={card.href} style={{
            background: 'var(--panel)', border: `1px solid ${card.status === 'active' ? 'var(--copper)' : 'var(--line)'}`,
            borderRadius: 'var(--radius)', padding: '16px 18px',
            opacity: card.status === 'soon' ? 0.6 : 1,
            position: 'relative',
          }}>
            {card.status === 'active' ? (
              <Link href={card.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <CardContent {...card} />
              </Link>
            ) : (
              <div>
                <CardContent {...card} />
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  fontSize: 8, color: 'var(--faint)', border: '1px solid var(--line)',
                  borderRadius: 2, padding: '1px 5px', letterSpacing: '.05em',
                }}>PRÓXIMO</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardContent({ label, norm, desc }: { label: string; norm: string; desc: string }) {
  return (
    <>
      <div style={{
        fontSize: 9, color: 'var(--copper)', letterSpacing: '.07em',
        textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-mono)',
      }}>{norm}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.55 }}>{desc}</div>
    </>
  );
}
