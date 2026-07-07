'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/context/I18nContext';

export function ModulesSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  const MODULES = [
    { group: t('groupSoilMeasurement'), items: [
      { label: t('moduleFieldMeasurements'), href: '/soil/field',        icon: '🌐' },
      { label: 'Schlumberger',               href: '/soil/schlumberger', icon: '📡' },
      { label: 'Wenner',                     href: '/soil/wenner',       icon: '〰' },
      { label: t('moduleNLayer'),            href: '/soil/nlayer',       icon: '🌍' },
    ]},
    { group: t('groupFaultAnalysis'), items: [
      { label: t('moduleFaultAnalysis'), href: '/fault-analysis', icon: '⚡' },
    ]},
    { group: t('groupGridDesign'), items: [
      { label: t('moduleGridRectangular'), href: '/grid/resistance',   icon: '⬡' },
      { label: t('moduleGridRod'),         href: '/grid/rod',          icon: '⬇' },
      { label: t('moduleGridStrip'),       href: '/grid/strip',        icon: '─' },
      { label: t('moduleGridRadial'),      href: '/grid/radial',       icon: '✦' },
      { label: t('moduleGridRing'),        href: '/grid/ring',         icon: '◯' },
      // Malla + picas combinada (Schwarz) al final — "(Schwarz)" en el nombre
      // (ver moduleGridCombined en I18nContext) para identificarla fácilmente.
      { label: t('moduleGridCombined'),    href: '/grid/combined',     icon: '⊞' },
    ]},
    { group: t('groupVerification'), items: [
      { label: t('moduleVoltages'), href: '/voltages', icon: '⚠' },
      { label: 'GPR',                href: '/gpr',      icon: '⏚' },
      { label: t('moduleReport'),    href: '/report',   icon: '📋' },
    ]},
  ];

  return (
    <>
      {/* Toggle tab — sticks to right edge */}
      <button
        onClick={() => setOpen(o => !o)}
        title={t('calcModulesTooltip')}
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
          {open ? t('closeWord') : t('modulesWord')}
        </span>
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed', right: open ? 0 : -180, top: 44, bottom: 0,
        width: 180, background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        zIndex: 399, overflowY: 'auto', padding: '12px 0 40px',
        transition: 'right .2s', boxShadow: open ? 'var(--shadow)' : 'none',
      }}>
        <div style={{ padding: '4px 14px 8px', fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
          {t('calcModulesTitle')}
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
