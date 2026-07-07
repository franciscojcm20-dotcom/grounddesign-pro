import Link from 'next/link';

export const metadata = { title: 'Changelog — GroundDesign Pro' };

const RELEASES = [
  {
    version: 'v0.30',
    date: '2026-07-07',
    tag: 'estabilidad',
    items: [
      'Servidores de desarrollo estabilizados: watch acotado a código fuente propio (evita reinicios en loop)',
      'Logs de Postgres y de health checks silenciados/limpiados',
      'Build de producción y suite completa (152 tests) verificados en verde',
    ],
  },
  {
    version: 'v0.29',
    date: '2026-07-07',
    tag: 'fase 30',
    items: [
      'Clasificación automática de curvas patrón de Orellana & Mooney (Homogéneo, Ascendente/Descendente, H/K/Q/A y combinaciones de 4 capas) desde las lecturas de campo',
      'Repositorio navegable de curvas patrón con descripción e implicancia de diseño de cada familia',
      'Diagrama de estratificación rediseñado: estratos legibles con profundidad acumulada por interfaz',
      'Motor de Análisis de Falla: modelado de tramos de línea aérea/cable en serie (Z1/Z0 por km) hasta el punto de falla',
    ],
  },
  {
    version: 'v0.28',
    date: '2026-07-06',
    tag: 'fase 29',
    items: [
      'Portada oficial de informes PDF bloqueada por el sistema, con índice profesional paginado',
      'Previsualización del informe en el navegador con selección de capítulos antes de descargar/imprimir',
      'Identificación del proyectista (título, licencia, empresa, logo) persistida en la cuenta y aplicada a la portada',
    ],
  },
  {
    version: 'v0.27',
    date: '2026-07-06',
    tag: 'fase 28',
    items: [
      'País y perfil normativo asociados a la cuenta, con la norma internacional IEEE 80/81 como referencia por defecto',
      'Declaración de condiciones de relajación normativa (ej. RIC N°06 Cl. 6.2.1/6.2.2) por proyecto',
      'Corrección del perfil normativo de Chile con los criterios reales del RIC N°06 (antes usaba valores genéricos)',
    ],
  },
  {
    version: 'v0.26',
    date: '2026-07-06',
    tag: 'fase 27',
    items: [
      'Sistema de migraciones de base de datos versionadas (reemplaza el schema.sql aplicado una sola vez)',
      'Tracking de errores en producción con Sentry (backend y frontend, opcional sin DSN)',
      'Validación de esquema (zod) en todos los endpoints de cálculo de la API',
    ],
  },
  {
    version: 'v0.25',
    date: '2026-07-05',
    tag: 'fase 26',
    items: [
      'Pipeline de despliegue a AWS (App Runner + RDS + ECR) con entrega continua vía OIDC',
      'Suite de integración de API (auth, proyectos, admin, billing) corriendo en CI',
      'Suite de tests de frontend con Vitest + Testing Library',
      'Corrección de nombre de producto (GroundDesing → GroundDesign) en todo el repositorio',
    ],
  },
  {
    version: 'v0.24',
    date: '2026-07-05',
    tag: 'fase 25',
    items: [
      'Motor de Análisis de Falla: determinación y justificación de la corriente de diseño (Ig)',
      'Motor de cortocircuito por componentes simétricas para modelar Ig sin estudio previo',
      'Motor de optimización adaptativo (bandit) para sugerir ajustes de diseño',
      'Exportación DXF y módulo de cubicación y valorización económica (CLP)',
    ],
  },
  {
    version: 'v0.23',
    date: '2026-06-30',
    tag: 'fase 24',
    items: [
      '5 nuevas topologías de electrodo de puesta a tierra (radial, anillo, combinada malla+picas, entre otras)',
    ],
  },
  {
    version: 'v0.22',
    date: '2026-06-30',
    tag: 'fase 26',
    items: [
      'Módulo Protección contra Rayos (SPR) — IEC 62305-2/3 y NFPA 780',
      'Método de esfera rodante interactivo con 4 niveles LPS (r = 20/30/45/60 m)',
      'Evaluación de riesgo: Ad, Nd, NT, eficiencia requerida E',
      'Diagrama SVG de alzado con zona de protección y esfera rodante',
      'Cálculo de conductores descendentes mínimos per NFPA 780 §4.7',
      'Adapter lightning en API de reportes PDF',
    ],
  },
  {
    version: 'v0.21',
    date: '2026-06-30',
    tag: 'fase 24-25',
    items: [
      'PDF engine v2: página de portada con tabla de cumplimiento resumen',
      'Filas alternadas en tablas de inputs/results, borders y accents',
      'Edición de nombre inline en perfil sin recargar página',
      'Formulario cambio de contraseña con medidor de fortaleza',
      'PUT /api/v1/auth/me: actualiza nombre y contraseña con validación bcrypt',
    ],
  },
  {
    version: 'v0.18',
    date: '2026-06-30',
    tag: 'fase 19',
    items: [
      'Módulo N capas: editor de capas en tabla interactiva (agregar/quitar filas)',
      'Diagrama de sección transversal en tiempo real (opacidad proporcional a ρ)',
      'Toggle texto ↔ tabla para entrada de capas',
      'Integración ChartRho en curva N capas y curva patrón Orellana-Mooney',
    ],
  },
  {
    version: 'v0.17',
    date: '2026-06-29',
    tag: 'fase 17',
    items: [
      'Paleta de comandos ⌘K con búsqueda fuzzy y 14 accesos rápidos',
      'ClientProviders: consolidación de providers en un solo wrapper',
      'Flujo de restablecimiento de contraseña (forgot-password / reset-password)',
      'Medidor de fortaleza de contraseña en 4 niveles',
      'Link "¿Olvidaste tu contraseña?" en pantalla de login',
      'Botón ⌘K en Topbar; acceso a Configuración desde menú de usuario',
    ],
  },
  {
    version: 'v0.16',
    date: '2026-06-28',
    tag: 'fase 16',
    items: [
      'GridDiagram SVG: diagrama top-view de malla con conductores y varillas',
      'Panel de resistencia de malla: barras de progreso Rg vs 1 Ω / 5 Ω',
      'Páginas legales: Términos de Uso y Política de Privacidad',
      'Links a /terms y /privacy en footer de marketing',
    ],
  },
  {
    version: 'v0.15',
    date: '2026-06-27',
    tag: 'fase 15',
    items: [
      'Panel de administración (/admin): usuarios, proyectos, calcs, distribución por plan',
      'Route /api/v1/admin/stats con guard de email @grounddesign.pro',
      'Rate-limiting global: 100 req/min con @fastify/rate-limit',
      'MiniBar: componente visual de barras de progreso para el panel admin',
    ],
  },
  {
    version: 'v0.14',
    date: '2026-06-26',
    tag: 'fase 14',
    items: [
      'Onboarding de 5 pasos con StepDots y redirección automática al primer login',
      'Breadcrumb dinámico en layout de plataforma',
      'DashboardContent: detecta primer acceso vía localStorage y lanza onboarding',
    ],
  },
  {
    version: 'v0.13',
    date: '2026-06-25',
    tag: 'fase 13',
    items: [
      'Gráfico de barras real vs admisible en módulo Tensiones (paso / contacto)',
      'GelSensitivity: curva R vs r₂ con punto de operación destacado (Dwight/Sunde)',
      'Barras comparativas mejoradas en módulo Gel Químico',
    ],
  },
  {
    version: 'v0.12',
    date: '2026-06-24',
    tag: 'fase 12',
    items: [
      'I18nContext: soporte ES/EN con persistencia en localStorage',
      'Hook useI18n() con 20+ claves de traducción',
      'Página de Configuración con preferencias de idioma, norma y notificaciones',
    ],
  },
  {
    version: 'v0.11',
    date: '2026-06-23',
    tag: 'fase 11',
    items: [
      'ChartRho: componente SVG reutilizable ρa vs espaciamiento',
      'Gráfico integrado en Wenner y Schlumberger',
      'Pantalla Forgot Password con flujo enum-safe',
      'StatsBar en lista de proyectos',
      'Búsqueda y filtrado de proyectos (mostrado con >3 proyectos)',
    ],
  },
  {
    version: 'v0.10',
    date: '2026-06-22',
    tag: 'fase 10',
    items: [
      'Módulo GPR (Ground Potential Rise): Thevenin + resistencia total',
      'Panel de Control (/dashboard): accesos rápidos, proyectos recientes',
      'Toast system con 3 variantes (success / warn / error)',
    ],
  },
  {
    version: 'v0.9',
    date: '2026-06-21',
    tag: 'fase 9',
    items: [
      'ExportBar: descarga JSON / CSV desde cualquier módulo de cálculo',
      'AuthGuard: redirección al login si no hay sesión activa',
      'Topbar con menú de usuario, badge de plan y logout',
    ],
  },
  {
    version: 'v0.8',
    date: '2026-06-20',
    tag: 'fase 8',
    items: [
      'Módulo Gel Químico (LICA-ERICO): resistencia con compuesto de bajo ρ',
      'Módulo Tensiones (IEEE 80 §16): paso, toque, mano-pie, mano-mano',
      'Tabla de cumplimiento con semáforo PASS/FAIL',
    ],
  },
  {
    version: 'v0.7',
    date: '2026-06-19',
    tag: 'fase 7',
    items: [
      'Resistencia de malla IEEE 80 §14 (Schwarz / Thapar-Gerez)',
      'Conductor IEEE 80 §11: sección mínima por corriente de falla y Kf',
      'Módulo N capas: kernel recursivo de Wait con curvas Orellana-Mooney',
    ],
  },
  {
    version: 'v0.6',
    date: '2026-06-18',
    tag: 'fase 6',
    items: [
      'Módulo Schlumberger: interpretación ρa por mínimos cuadrados',
      'Engines extraídos como paquete puro @grounddesign/engines-math',
      'Suite de tests unitarios con casos de referencia IEEE Std 81-2012',
    ],
  },
  {
    version: 'v0.5',
    date: '2026-06-17',
    tag: 'fase 5',
    items: [
      'Autenticación JWT + cookie httpOnly (Fastify + @fastify/jwt)',
      'Registro, login y logout con bcrypt (12 rondas)',
      'AuthContext en Next.js 15 App Router',
      'Rutas protegidas con middleware de autenticación',
    ],
  },
  {
    version: 'v0.4',
    date: '2026-06-16',
    tag: 'fase 4',
    items: [
      'Módulo Wenner (IEEE Std 81-2012): interpretación 2 capas por mínimos cuadrados',
      'SparkLine SVG inline en NLayer',
      'API REST Fastify v5: /api/v1/soil/wenner, /schlumberger, /nlayer, /pattern',
    ],
  },
  {
    version: 'v0.3',
    date: '2026-06-15',
    tag: 'fase 3',
    items: [
      'Monorepo pnpm workspaces: packages/* + apps/*',
      'Base de datos PostgreSQL con schema SQL inicial (users, projects, calculations)',
      'API Fastify v5 con TypeScript via --experimental-strip-types',
    ],
  },
  {
    version: 'v0.2',
    date: '2026-06-14',
    tag: 'fase 2',
    items: [
      'Landing page marketing con hero, features, CTA',
      'Página de precios con 3 planes (Community / Individual / Professional)',
      'Next.js 15 App Router con route groups (marketing) / (platform)',
    ],
  },
  {
    version: 'v0.1',
    date: '2026-06-13',
    tag: 'fase 1',
    items: [
      'Prototipo inicial index.html — concepto GroundDesign Pro',
      'Definición de arquitectura: monorepo, Next.js 15, Fastify v5, PostgreSQL',
      'Sistema de diseño: paleta oscura, tokens CSS, tipografía monoespaciada',
    ],
  },
];

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'fase 19': { bg: 'var(--safe-soft)', color: 'var(--safe)' },
  'fase 17': { bg: 'var(--warn-soft)', color: 'var(--warn)' },
  'fase 16': { bg: 'var(--warn-soft)', color: 'var(--warn)' },
  'fase 15': { bg: 'var(--safe-soft)', color: 'var(--safe)' },
  'fase 14': { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  'fase 13': { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  'fase 12': { bg: 'var(--safe-soft)', color: 'var(--safe)' },
  'fase 11': { bg: 'var(--warn-soft)', color: 'var(--warn)' },
};

export default function ChangelogPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'var(--font-mono)' }}>
      {/* Header */}
      <Link href="/" style={{ fontSize: 10, color: 'var(--copper)', textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}>
        ← Inicio
      </Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: '-.02em' }}>
        Changelog
      </h1>
      <p style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 48, lineHeight: 1.7 }}>
        Historial completo de versiones de <strong style={{ color: 'var(--text)' }}>GroundDesign Pro</strong>. Cada versión corresponde a una fase de desarrollo con funcionalidades verificadas.
      </p>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 82, top: 0, bottom: 0, width: 1, background: 'var(--line)' }} />

        {RELEASES.map((rel, i) => {
          const tc = TAG_COLORS[rel.tag] ?? { bg: '#1a1a1a', color: 'var(--faint)' };
          return (
            <div key={rel.version} style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
              {/* Left column: version + date */}
              <div style={{ width: 70, flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--copper)' : 'var(--text)', marginBottom: 3 }}>
                  {rel.version}
                </div>
                <div style={{ fontSize: 8.5, color: 'var(--faint)' }}>{rel.date}</div>
              </div>

              {/* Dot */}
              <div style={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                <div style={{
                  width: i === 0 ? 10 : 7, height: i === 0 ? 10 : 7,
                  borderRadius: '50%', marginTop: i === 0 ? 0 : 1.5,
                  background: i === 0 ? 'var(--copper)' : 'var(--line)',
                  border: i === 0 ? '2px solid var(--copper)' : '2px solid var(--panel)',
                  boxShadow: i === 0 ? '0 0 8px var(--copper)' : 'none',
                }} />
              </div>

              {/* Right column: content */}
              <div style={{ flex: 1, paddingTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 8.5, padding: '2px 8px', borderRadius: 10, background: tc.bg, color: tc.color, border: `1px solid ${tc.color}33` }}>
                    {rel.tag}
                  </span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rel.items.map((item, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--copper)', flexShrink: 0, marginTop: 1 }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 9, color: 'var(--faint)', textAlign: 'center' }}>
        GroundDesign Pro · IEEE 80 / 81 · Actualizado {RELEASES[0]!.date}
      </div>
    </main>
  );
}
