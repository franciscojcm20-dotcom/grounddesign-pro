'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/ui/AuthGuard';

const STEPS = [
  {
    icon: '⚡',
    title: 'Bienvenido a GroundDesing Pro',
    body: 'La plataforma para el diseño profesional de sistemas de puesta a tierra conforme a IEEE 80-2013 / 81-2012.',
    cta: 'Comenzar',
  },
  {
    icon: '🔬',
    title: 'Mide la resistividad del suelo',
    body: 'Ingresa tus lecturas de campo Wenner o Schlumberger. La plataforma calcula ρa, ajusta el modelo bicapa y exporta el reporte PDF.',
    cta: 'Siguiente',
    link: '/soil/wenner',
    linkLabel: 'Ir a Wenner →',
  },
  {
    icon: '🔩',
    title: 'Diseña tu malla de puesta a tierra',
    body: 'Calcula la resistencia de malla (Sverak), dimensiona el conductor (Onderdonk), evalúa aditivo gel y optimiza la geometría.',
    cta: 'Siguiente',
    link: '/grid/resistance',
    linkLabel: 'Ir a Resistencia de Malla →',
  },
  {
    icon: '✅',
    title: 'Verifica tensiones de seguridad',
    body: 'Comprueba tensiones de contacto y paso (IEEE 80 Cl. 16), GPR y criterios de seguridad para personas de 50 y 70 kg.',
    cta: 'Siguiente',
    link: '/voltages',
    linkLabel: 'Ir a Verificación →',
  },
  {
    icon: '📄',
    title: 'Genera reportes PDF profesionales',
    body: 'Exporta el reporte de cada módulo con membrete de proyecto, normativa activa, fórmulas y resultados. Listo para firma.',
    cta: 'Ir al Panel',
    finish: true,
  },
];

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i === current ? 'var(--copper)' : 'var(--line)',
          transition: 'background .2s',
        }} />
      ))}
    </div>
  );
}

function OnboardingContent() {
  const { user } = useAuth();
  const router   = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;

  function finish() {
    localStorage.setItem('gdp_onboarding_done', '1');
    router.push('/dashboard');
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }

  return (
    <div style={{
      minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '32px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 8, padding: '40px 36px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>{current.icon}</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{current.title}</h1>
        <p style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.7, marginBottom: 28 }}>
          {current.body}
        </p>

        {'link' in current && current.link && (
          <Link href={current.link} style={{
            display: 'inline-block', marginBottom: 20,
            fontSize: 11, color: 'var(--copper)', textDecoration: 'none',
            border: '1px solid var(--copper)', borderRadius: 3, padding: '5px 14px',
          }}>
            {current.linkLabel}
          </Link>
        )}

        <button onClick={current.finish ? finish : next} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 12, padding: 12, borderRadius: 4, cursor: 'pointer',
          display: 'block',
        }}>
          {current.cta}
        </button>

        <StepDots total={STEPS.length} current={step} />

        {step < STEPS.length - 1 && (
          <button onClick={finish} style={{
            marginTop: 16, background: 'none', border: 'none',
            fontSize: 10, color: 'var(--faint)', cursor: 'pointer',
          }}>
            Omitir tutorial
          </button>
        )}

        {user && (
          <div style={{ marginTop: 20, fontSize: 10, color: 'var(--faint)' }}>
            Sesión iniciada como <strong style={{ color: 'var(--dim)' }}>{user.name}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export function OnboardingClient() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}
