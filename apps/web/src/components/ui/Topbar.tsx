'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const PLAN_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  community:    { bg: '#0d1220', border: '#3b82f633', text: '#93c5fd' },
  individual:   { bg: '#1a1508', border: '#f59e0b33', text: 'var(--warn)' },
  professional: { bg: '#1e2a1e', border: '#22c55e44', text: 'var(--safe)' },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const plan = user?.plan ?? 'community';
  const pc = PLAN_COLOR[plan] ?? PLAN_COLOR['community']!;
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', height: 44,
      padding: '0 16px', borderBottom: '1px solid var(--line)',
      background: 'linear-gradient(180deg,#141820,#0f1117)',
      gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
        <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <path d="M11 2L11 12" stroke="#E07A23" strokeWidth="1.8"/>
          <path d="M5 12L17 12" stroke="#E07A23" strokeWidth="2.2"/>
          <path d="M7 15.5L15 15.5" stroke="#E07A23" strokeWidth="1.4" opacity=".7"/>
          <path d="M9 19L13 19" stroke="#E07A23" strokeWidth="1" opacity=".45"/>
          <circle cx="11" cy="2" r="1.5" fill="#E07A23"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em' }}>
          GroundDesing<span style={{ color: 'var(--copper)' }}>Pro</span>
        </span>
      </Link>

      <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }} />

      <Link href="/projects" style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none' }}>
        Proyectos
      </Link>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <span style={{
              fontSize: 8.5, padding: '2px 7px', borderRadius: 10,
              background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text,
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>{plan}</span>
            <div title={user.name} style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--copper-soft)', border: '1px solid var(--copper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--copper)',
            }}>{initials}</div>
            <button onClick={handleLogout} style={{
              background: 'none', border: '1px solid var(--line)', borderRadius: 3,
              color: 'var(--faint)', fontSize: 9.5, padding: '3px 8px', cursor: 'pointer',
            }}>Salir</button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 10, color: 'var(--dim)', textDecoration: 'none' }}>Ingresar</Link>
            <Link href="/register" style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 3,
              background: 'var(--copper)', color: '#fff', textDecoration: 'none', fontWeight: 700,
            }}>Crear cuenta</Link>
          </>
        )}
      </div>
    </header>
  );
}
