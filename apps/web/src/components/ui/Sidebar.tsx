'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/context/I18nContext';

export function Sidebar() {
  const path = usePathname();
  const { t } = useI18n();

  const NAV = [
    {
      group: t('groupSoilMeasurement'),
      items: [
        { href: '/soil/field',        label: t('moduleFieldMeasurements') },
        { href: '/soil/schlumberger', label: t('moduleSchlumberger') },
        { href: '/soil/wenner',       label: t('moduleWenner') },
        { href: '/soil/nlayer',       label: t('moduleNLayer') },
      ],
    },
    {
      group: t('groupFaultAnalysis'),
      items: [
        { href: '/fault-analysis', label: t('moduleFaultAnalysis') },
      ],
    },
    {
      group: t('groupGridDesign'),
      items: [
        { href: '/grid/resistance', label: t('moduleGridRectangular') },
        { href: '/grid/rod',        label: t('moduleGridRod') },
        { href: '/grid/strip',      label: t('moduleGridStrip') },
        { href: '/grid/radial',     label: t('moduleGridRadial') },
        { href: '/grid/ring',       label: t('moduleGridRing') },
        // Malla + picas combinada (Schwarz) al final — "(Schwarz)" en el nombre
        // (ver moduleGridCombined en I18nContext) para identificarla fácilmente.
        { href: '/grid/combined',   label: t('moduleGridCombined') },
      ],
    },
    {
      group: t('groupVerification'),
      items: [
        { href: '/voltages', label: t('moduleVoltages') },
        { href: '/gpr',      label: t('moduleGpr') },
        { href: '/report',   label: t('moduleReport') },
      ],
    },
  ];

  return (
    <nav style={{
      width: 236, flexShrink: 0,
      borderRight: '1px solid var(--line)',
      background: 'var(--panel)',
      overflowY: 'auto',
      padding: '16px 0 40px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Project info */}
      <div style={{ padding: '0 14px 16px', borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>S/E Cerro Navia 110 kV</div>
        <div style={{ fontSize: 9, color: 'var(--faint)' }}>Distribuidora Andes · CL</div>
        <Link href="/projects" style={{
          display: 'inline-block', marginTop: 8, fontSize: 8.5,
          color: 'var(--copper)', fontFamily: 'var(--font-mono)', textDecoration: 'none',
        }}>
          {t('viewProjects')}
        </Link>
      </div>

      {NAV.map(section => (
        <div key={section.group} style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 8.5, color: 'var(--faint)',
            textTransform: 'uppercase', letterSpacing: '.08em',
            padding: '0 14px', marginBottom: 4,
          }}>
            {section.group}
          </div>
          {section.items.map(item => {
            const active = path === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'block', padding: '7px 14px', fontSize: 11,
                color: active ? 'var(--copper)' : 'var(--dim)',
                background: active ? 'var(--copper-soft)' : 'transparent',
                borderLeft: `2px solid ${active ? 'var(--copper)' : 'transparent'}`,
                textDecoration: 'none',
              }}>
                <span style={{ marginRight: 6, fontSize: 9, opacity: 0.5 }}>●</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div style={{ padding: '0 0 8px' }}>
        <Link href="/settings" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', fontSize: 11,
          color: path === '/settings' ? 'var(--copper)' : 'var(--faint)',
          background: path === '/settings' ? 'var(--copper-soft)' : 'transparent',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 11 }}>⚙</span> {t('settings')}
        </Link>
        <Link href="/admin" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', fontSize: 11,
          color: path === '/admin' ? 'var(--copper)' : 'var(--faint)',
          background: path === '/admin' ? 'var(--copper-soft)' : 'transparent',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 11 }}>🛡</span> {t('adminWord')}
        </Link>
      </div>

      <div style={{ marginTop: 'auto', padding: '14px', borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 6 }}>{t('norm')}</div>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          IEEE Std 80-2013<br />IEEE Std 81-2012
        </div>
      </div>
    </nav>
  );
}
