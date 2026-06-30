import Link from 'next/link';

const FEATURES = [
  {
    icon: '⚙',
    title: 'Motor IEEE propio',
    desc: 'Implementación directa de IEEE 80-2013 e IEEE 81-2012. Sin wrappers, sin dependencias de terceros. Código auditable y certificable.',
  },
  {
    icon: '📄',
    title: 'Reportes PDF profesionales',
    desc: 'Cada módulo genera un reporte A4 con norma aplicada, inputs, resultados, compliance y espacio para firma del ingeniero PE.',
  },
  {
    icon: '🌐',
    title: 'Modelo N capas (Wait)',
    desc: 'Kernel recursivo de Wait para sondeos eléctricos verticales. Curvas Orellana-Mooney integradas. Modelo biestrato automático.',
  },
  {
    icon: '⬡',
    title: 'Diseño completo de malla',
    desc: 'Resistencia Sverak, dimensionamiento de conductor Onderdonk, verificación de tensiones Em/Es. Flujo completo IEEE 80-2013.',
  },
  {
    icon: '🔒',
    title: 'Proyectos y historial',
    desc: 'Organiza cálculos por proyecto. Historial de resultados con entradas y salidas en JSON. Acceso desde cualquier dispositivo.',
  },
  {
    icon: '🚀',
    title: 'Plataforma SaaS',
    desc: 'Sin instalación. Actualización continua de normas. Disponible en ES / EN. Plan Community gratuito para empezar.',
  },
];

const MODULES = [
  { label: 'Wenner',       norm: 'IEEE 81 · 8.3' },
  { label: 'Schlumberger', norm: 'IEEE 81 · 8' },
  { label: 'N capas',      norm: 'Wait 1954' },
  { label: 'Malla Sverak', norm: 'IEEE 80 · 14.2' },
  { label: 'Conductor',    norm: 'IEEE 80 · 11.3' },
  { label: 'Tensiones',    norm: 'IEEE 80 · 16' },
  { label: 'Gel químico',  norm: 'Dwight/Sunde' },
];

export default function LandingPage() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px 72px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', fontSize: 9, padding: '3px 12px',
          border: '1px solid var(--copper)', borderRadius: 20,
          color: 'var(--copper)', fontFamily: 'var(--font-mono)',
          letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 24,
        }}>
          IEEE Std 80-2013 · IEEE Std 81-2012
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: '-.02em' }}>
          Diseño profesional de<br />
          <span style={{ color: 'var(--copper)' }}>sistemas de puesta a tierra</span>
        </h1>

        <p style={{ fontSize: 14, color: 'var(--dim)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Plataforma de cálculo IEEE para ingenieros eléctricos. Motor matemático propio, 7 módulos normados, reportes PDF profesionales y gestión de proyectos.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '12px 28px', background: 'var(--copper)', color: '#fff',
            borderRadius: 3, textDecoration: 'none', fontWeight: 700, fontSize: 13,
          }}>
            Empezar gratis →
          </Link>
          <Link href="/dashboard" style={{
            padding: '12px 28px', background: 'transparent', color: 'var(--text)',
            border: '1px solid var(--line)', borderRadius: 3, textDecoration: 'none', fontSize: 13,
          }}>
            Ver demo
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
          {MODULES.map(m => (
            <span key={m.label} style={{
              fontSize: 9, padding: '3px 10px', borderRadius: 2,
              background: 'var(--panel)', border: '1px solid var(--line)',
              color: 'var(--faint)', fontFamily: 'var(--font-mono)',
            }}>
              {m.label} · {m.norm}
            </span>
          ))}
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
        background: 'var(--panel)', padding: '28px 40px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
          {[
            { val: '7',       label: 'módulos de cálculo' },
            { val: 'IEEE 80', label: '+ IEEE 81 implementados' },
            { val: 'PDF',     label: 'reporte profesional' },
            { val: '0',       label: 'dependencias externas de cálculo' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--copper)', fontFamily: 'var(--font-mono)' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section style={{ padding: '64px 40px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Por qué GroundDesing Pro
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>Todo lo que necesitas en un solo lugar</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 4, padding: '20px 20px',
            }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--panel)', borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)', padding: '56px 40px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Flujo de trabajo
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Del campo al reporte en 5 pasos</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Medir suelo',      desc: 'Ensayo Wenner o Schlumberger en campo. Ingresa lecturas a/R directamente en el módulo.' },
              { n: '02', title: 'Modelar terreno',   desc: 'Genera modelo biestrato o N capas con kernel de Wait. Identifica perfil H/K/A/Q.' },
              { n: '03', title: 'Diseñar malla',     desc: 'Calcula Rg con Sverak. Optimiza con aditivo gel. Dimensiona conductor con Onderdonk.' },
              { n: '04', title: 'Verificar seguridad', desc: 'Comprueba tensiones Em/Es vs. admisibles IEEE 80-2013. Compliance automático 50/70 kg.' },
              { n: '05', title: 'Exportar PDF',      desc: 'Reporte profesional A4 con norma, inputs, resultados, gráficas y firma del ingeniero PE.' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--copper-soft)', border: '1px solid var(--copper)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: 'var(--copper)', fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}>{s.n}</div>
                  {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 24, background: 'var(--line)', margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: 24, paddingTop: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Empieza a calcular hoy</h2>
        <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 32, lineHeight: 1.6 }}>
          Plan Community gratuito para siempre. Sin tarjeta de crédito.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '13px 32px', background: 'var(--copper)', color: '#fff',
            borderRadius: 3, textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}>
            Crear cuenta gratis
          </Link>
          <Link href="/pricing" style={{
            padding: '13px 32px', background: 'transparent', color: 'var(--dim)',
            border: '1px solid var(--line)', borderRadius: 3, textDecoration: 'none', fontSize: 13,
          }}>
            Ver planes y precios
          </Link>
        </div>
      </section>
    </div>
  );
}
