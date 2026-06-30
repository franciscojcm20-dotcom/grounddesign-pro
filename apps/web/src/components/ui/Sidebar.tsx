'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MODULES = [
  {
    label: 'Medición de suelo',
    items: [
      { href: '/soil/wenner',       label: 'Resistividad — Wenner' },
      { href: '/soil/schlumberger', label: 'Resistividad — Schlumberger' },
      { href: '/soil/nlayer',       label: 'Curvas N capas' },
    ],
  },
  {
    label: 'Diseño de malla',
    items: [
      { href: '/grid/resistance', label: 'Resistencia de malla' },
      { href: '/grid/gel',        label: 'Aditivo gel químico' },
      { href: '/conductor',       label: 'Conductor IEEE 80' },
    ],
  },
  {
    label: 'Verificación',
    items: [
      { href: '/voltages', label: 'Tensiones paso/contacto' },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{
      width: 210, flexShrink: 0, borderRight: '1px solid var(--line)',
      background: 'var(--panel)', display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700 }}>S/E Cerro Navia 110 kV</div>
        <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 2 }}>Distribuidora Andes · CL</div>
      </div>

      {MODULES.map(group => (
        <div key={group.label} style={{ padding: '10px 0' }}>
          <div style={{
            fontSize: 8.5, color: 'var(--faint)', letterSpacing: '.1em',
            textTransform: 'uppercase', padding: '0 12px 6px',
          }}>{group.label}</div>

          {group.items.map(item => {
            const active = path === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', fontSize: 10, textDecoration: 'none',
                color: active ? 'var(--copper)' : 'var(--dim)',
                borderLeft: `2px solid ${active ? 'var(--copper)' : 'transparent'}`,
                background: active ? 'var(--copper-soft)' : 'transparent',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: active ? 'var(--copper)' : 'var(--line)',
                }} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
