'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard:     'Panel',
  projects:      'Proyectos',
  profile:       'Perfil',
  settings:      'Configuración',
  pricing:       'Precios',
  soil:          'Suelo',
  wenner:        'Wenner',
  schlumberger:  'Schlumberger',
  nlayer:        'N-capas',
  grid:          'Malla',
  resistance:    'Resistencia de malla',
  gel:           'Gel químico',
  conductor:     'Conductor',
  voltages:      'Tensiones',
  gpr:           'GPR',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs: { label: string; href: string }[] = [];
  let accum = '';
  for (const seg of segments) {
    accum += `/${seg}`;
    crumbs.push({ label: SEGMENT_LABELS[seg] ?? seg, href: accum });
  }

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '6px 24px', borderBottom: '1px solid var(--line)',
      background: 'var(--panel)', flexShrink: 0,
      fontSize: 9.5, color: 'var(--faint)',
    }}>
      {crumbs.map((c, i) => (
        <span key={c.href} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} style={{ color: 'var(--faint)', textDecoration: 'none' }}>
              {c.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--dim)' }}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
