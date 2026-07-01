'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MODULES = [
  { group: 'Suelo',  items: [
    { label: 'Wenner',       href: '/soil/wenner',       icon: '〰' },
    { label: 'Schlumberger', href: '/soil/schlumberger', icon: '📡' },
    { label: 'N Capas',      href: '/soil/nlayer',       icon: '🌍' },
  ]},
  { group: 'Malla',  items: [
    { label: 'Rectangular',  href: '/grid/resistance',   icon: '⬡' },
    { label: 'Picas (N)',    href: '/grid/rod',          icon: '⬇' },
    { label: 'Horizontal',   href: '/grid/strip',        icon: '─' },
    { label: 'Radial ★',    href: '/grid/radial',       icon: '✦' },
    { label: 'Anillo',       href: '/grid/ring',         icon: '◯' },
    { label: 'Malla+Picas',  href: '/grid/combined',     icon: '⊞' },
    { label: 'Gel Químico',  href: '/grid/gel',          icon: '🧪' },
  ]},
  { group: 'Sistema', items: [
    { label: 'Conductor',    href: '/conductor',         icon: '〰' },
    { label: 'Tensiones',    href: '/voltages',          icon: '⚠' },
    { label: 'GPR',          href: '/gpr',               icon: '⏚' },
    { label: 'Rayos (SPR)',  href: '/lightning',         icon: '⚡' },
  ]},
];

export function ModulesSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Toggle tab — sticks to right edge */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Módulos de cálculo"
        style={{
          position: 'fixed', right: open ? 180 : 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 400, background: 'var(--panel)', border: '1px solid var(--line)',
          borderRight: open ? 'none' : '1px solid var(--line)',
          borderRadius: open ? '4px 0 0 4px' : '4px 0 0 4px',
          padding: '12px 5px', cursor: 'pointer', color: 'var(--copper)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          transition: 'right .2s',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>⚡</span>
        <span style={{ fontSize: 7, color: 'var(--faint)', writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '.05em' }}>
          {open ? 'cerrar' : 'módulos'}
        </span>
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed', right: open ? 0 : -180, top: 44, bottom: 0,
        width: 180, background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        zIndex: 399, overflowY: 'auto', padding: '12px 0 40px',
        transition: 'right .2s', boxShadow: open ? '-4px 0 16px #00000033' : 'none',
      }}>
        <div style={{ padding: '4px 14px 8px', fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
          Módulos
        </div>
        {MODULES.map(g => (
          <div key={g.group} style={{ marginBottom: 10 }}>
            <div style={{ padding: '4px 14px', fontSize: 8, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {g.group}
            </div>
            {g.items.map(item => {
              const active = pathname === item.href || pathname.endsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 14px', fontSize: 11,
                    color: active ? 'var(--copper)' : 'var(--dim)',
                    background: active ? 'var(--copper-soft)' : 'transparent',
                    textDecoration: 'none',
                    borderLeft: active ? '2px solid var(--copper)' : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
