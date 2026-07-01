import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      {/* Logo / wordmark */}
      <div style={{ marginBottom: 32 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ marginBottom: 12 }}>
          <rect width="56" height="56" rx="12" fill="#0e1420" stroke="#1a56db" strokeWidth="1.5" />
          {/* Lightning bolt */}
          <path d="M30 8 L18 30 H28 L26 48 L38 26 H28 Z" fill="#facc15" />
          {/* Ground symbol */}
          <line x1="20" y1="50" x2="36" y2="50" stroke="#1a56db" strokeWidth="2" />
          <line x1="22" y1="53" x2="34" y2="53" stroke="#1a56db" strokeWidth="2" />
          <line x1="25" y1="56" x2="31" y2="56" stroke="#1a56db" strokeWidth="2" />
        </svg>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#e8edf5' }}>
          Strike<span style={{ color: '#1a56db' }}>Ground</span>
          <span style={{ color: '#facc15', fontSize: 18, fontWeight: 400, marginLeft: 4 }}>Design</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 6 }}>
          Motor de Ingeniería Explicable · IEC 62305 · NFPA 780
        </div>
      </div>

      {/* Tagline */}
      <h1 style={{ fontSize: 18, fontWeight: 700, maxWidth: 540, lineHeight: 1.5, marginBottom: 12 }}>
        La primera plataforma mundial de LPS donde <em style={{ color: '#facc15', fontStyle: 'normal' }}>ningún resultado se entrega sin justificación técnica</em>
      </h1>
      <p style={{ fontSize: 12, color: 'var(--dim)', maxWidth: 460, lineHeight: 1.7, marginBottom: 32 }}>
        Cuatro pilares obligatorios en cada cálculo: físico, matemático, normativo e ingenieril. Trazabilidad completa desde el dato de entrada hasta el resultado final.
      </p>

      {/* Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 480, marginBottom: 36, width: '100%' }}>
        {[
          { icon: '⚡', label: 'Físico',      desc: 'Fenómeno, hipótesis, limitaciones del modelo' },
          { icon: '∑',  label: 'Matemático',  desc: 'Fórmulas, pasos, análisis dimensional' },
          { icon: '📋', label: 'Normativo',   desc: 'IEC 62305, NFPA 780, cláusula, tabla, edición' },
          { icon: '🔧', label: 'Ingenieril',  desc: 'Alternativas descartadas, ventajas, vida útil' },
        ].map(p => (
          <div key={p.label} style={{
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8,
            padding: '14px 16px', textAlign: 'left',
          }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{p.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/risk" style={{
          padding: '11px 28px', background: '#1a56db', color: '#fff',
          borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: '.02em',
          transition: 'background .15s',
        }}>
          Evaluar riesgo IEC 62305-2 →
        </Link>
        <Link href="/lps" style={{
          padding: '11px 28px', background: 'none', color: 'var(--dim)',
          border: '1px solid var(--line)', borderRadius: 6, fontWeight: 600, fontSize: 12,
        }}>
          Diseño LPS (próximamente)
        </Link>
      </div>

      <div style={{ marginTop: 48, fontSize: 9.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
        Phase 1 · Motor IEC 62305-2 + Esfera rodante · Strike Ground Design v0.1
      </div>
    </main>
  );
}
