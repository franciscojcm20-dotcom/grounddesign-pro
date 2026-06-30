'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/ui/AuthGuard';

const MODULES = [
  { href: '/soil/wenner',       icon: '⚡', label: 'Resistividad Wenner',       norm: 'IEEE 81-2012 · Cl. 8.3' },
  { href: '/soil/schlumberger', icon: '📡', label: 'Resistividad Schlumberger', norm: 'IEEE 81-2012 · Cl. 8' },
  { href: '/soil/nlayer',       icon: '🌐', label: 'Modelo N capas',            norm: 'Wait (1954)' },
  { href: '/grid/resistance',   icon: '⬡',  label: 'Resistencia de malla',      norm: 'IEEE 80-2013 · Cl. 14.2' },
  { href: '/conductor',         icon: '〰', label: 'Conductor IEEE 80',         norm: 'IEEE 80-2013 · Cl. 11.3' },
  { href: '/voltages',          icon: '⚠',  label: 'Tensiones paso/contacto',   norm: 'IEEE 80-2013 · Cl. 16' },
  { href: '/grid/gel',          icon: '🧪', label: 'Aditivo gel químico',       norm: 'Dwight / Sunde' },
  { href: '/gpr',               icon: '⚡', label: 'GPR — Potencial de tierra', norm: 'IEEE 80-2013 · Cl. 15' },
];

function DashboardContent() {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem('gdp_onboarding_done')) {
      router.replace('/onboarding');
    }
  }, [router]);
  return null;
}

export function DashboardClient() {
  return (
    <AuthGuard>
    <DashboardContent />
    <div style={{ padding: '32px 40px', maxWidth: 960 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Panel de trabajo
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Módulos disponibles</h1>
        <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
          Selecciona un módulo para iniciar el cálculo. Los resultados se guardan automáticamente en el proyecto activo.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 40 }}>
        {MODULES.map(m => (
          <Link key={m.href} href={m.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4,
              padding: '14px 16px', cursor: 'pointer',
              transition: 'border-color .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--copper)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <div style={{ fontSize: 8, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{m.norm}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>Abrir →</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
        <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Acceso rápido
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/projects" style={{
            display: 'inline-block', padding: '8px 16px', background: 'var(--panel)',
            border: '1px solid var(--line)', borderRadius: 3, fontSize: 11, color: 'var(--dim)',
            textDecoration: 'none', fontFamily: 'var(--font-mono)',
          }}>
            📁 Mis proyectos
          </Link>
          <Link href="/pricing" style={{
            display: 'inline-block', padding: '8px 16px', background: 'var(--copper-soft)',
            border: '1px solid var(--copper)', borderRadius: 3, fontSize: 11, color: 'var(--copper)',
            textDecoration: 'none', fontFamily: 'var(--font-mono)',
          }}>
            ⬆ Mejorar plan
          </Link>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
