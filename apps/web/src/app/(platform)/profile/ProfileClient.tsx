'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { inputStyle } from '@/components/ui/CalcShared';

const PLAN_INFO = {
  community:    { label: 'Community',    color: '#93c5fd', desc: 'Gratis · 3 proyectos · PDF con marca de agua' },
  individual:   { label: 'Individual',   color: '#f59e0b', desc: 'CLP 29.900/mes · Proyectos ilimitados · PDF sin marca de agua · Firma PE' },
  professional: { label: 'Professional', color: '#22c55e', desc: 'CLP 79.900/mes · 5 usuarios · API access · Normas IEC/RETIE' },
};

export function ProfileClient() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const plan = (user?.plan ?? 'community') as keyof typeof PLAN_INFO;
  const pi   = PLAN_INFO[plan] ?? PLAN_INFO['community'];
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';

  function copyEmail() {
    if (!user?.email) return;
    navigator.clipboard.writeText(user.email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <AuthGuard>
      <div style={{ padding: '32px 40px', maxWidth: 680 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Cuenta
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 28 }}>Mi perfil</h1>

        {/* Avatar + info */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
          padding: '24px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--copper-soft)', border: '2px solid var(--copper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'var(--copper)', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {user?.email}
              <button onClick={copyEmail} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 9, color: copied ? 'var(--safe)' : 'var(--faint)', padding: 0,
              }}>
                {copied ? '✓ copiado' : 'copiar'}
              </button>
            </div>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
          }}>
            <span style={{
              fontSize: 9, padding: '3px 10px', borderRadius: 10, fontWeight: 700,
              background: `${pi.color}18`, border: `1px solid ${pi.color}44`,
              color: pi.color, textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              {pi.label}
            </span>
            <div style={{ fontSize: 9.5, color: 'var(--faint)', textAlign: 'right', maxWidth: 180, lineHeight: 1.5 }}>
              {pi.desc}
            </div>
          </div>
        </div>

        {/* Plan upgrade card (only community/individual) */}
        {plan !== 'professional' && (
          <div style={{
            background: 'var(--copper-soft)', border: '1px solid var(--copper)',
            borderRadius: 6, padding: '16px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {plan === 'community' ? 'Mejora a Individual' : 'Mejora a Professional'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                {plan === 'community'
                  ? 'PDF sin marca de agua, proyectos ilimitados y firma PE desde CLP 29.900/mes.'
                  : 'API access, normas IEC/RETIE y equipo de 5 usuarios desde CLP 79.900/mes.'}
              </div>
            </div>
            <a href="/pricing" style={{
              padding: '8px 18px', background: 'var(--copper)', color: '#fff',
              borderRadius: 3, textDecoration: 'none', fontWeight: 700, fontSize: 11,
              flexShrink: 0,
            }}>
              Ver planes →
            </a>
          </div>
        )}

        {/* Account details */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-mono)' }}>
            Detalles de cuenta
          </div>
          {[
            { label: 'Nombre', value: user?.name },
            { label: 'Correo', value: user?.email },
            { label: 'Plan',   value: pi.label },
            { label: 'ID de usuario', value: user?.id ? `${user.id.slice(0, 8)}…` : '—' },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', padding: '11px 18px', borderBottom: '1px solid var(--line)',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>{row.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{row.value ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* Normas activas */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-mono)' }}>
            Normas activas en tu plan
          </div>
          {[
            { norm: 'IEEE Std 80-2013', desc: 'Diseño de sistemas de puesta a tierra' },
            { norm: 'IEEE Std 81-2012', desc: 'Medición de resistividad del suelo' },
            ...(plan === 'professional' ? [
              { norm: 'IEC 60364-5-54', desc: 'Instalaciones de baja tensión' },
              { norm: 'RETIE (Colombia)', desc: 'Reglamento técnico de instalaciones eléctricas' },
            ] : []),
          ].map(n => (
            <div key={n.norm} style={{
              display: 'flex', padding: '10px 18px', borderBottom: '1px solid var(--line)',
              alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--copper)', background: 'var(--copper-soft)', border: '1px solid var(--copper)', padding: '2px 8px', borderRadius: 2, flexShrink: 0 }}>
                {n.norm}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>{n.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
