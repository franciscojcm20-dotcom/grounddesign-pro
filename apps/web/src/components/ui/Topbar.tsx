'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ThemeToggle } from './ThemeToggle';

const PLAN_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  community:    { bg: 'var(--blue-soft)',   border: 'var(--blue-soft)',   text: 'var(--blue)' },
  individual:   { bg: 'var(--warn-soft)',   border: 'var(--warn-soft)',   text: 'var(--warn)' },
  professional: { bg: 'var(--safe-soft)',   border: 'var(--safe-soft)',   text: 'var(--safe)' },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const toast    = useToast();
  const [open, setOpen]         = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);

  const plan = user?.plan ?? 'community';
  const pc   = PLAN_COLOR[plan] ?? PLAN_COLOR['community']!;
  const initials = user
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { setOpen(false); setMenuOpen(false); }, [pathname]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast.info('Sesión cerrada');
    router.push('/');
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', height: 44,
      padding: '0 16px', borderBottom: '1px solid var(--line)',
      background: 'var(--panel)',
      gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 200,
    }}>
      {/* Logo */}
      <Link href={user ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
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

      {/* Desktop nav */}
      <div className="topbar-nav" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
        <div style={{ width: 1, height: 20, background: 'var(--line)', marginRight: 8 }} />
        {user && (
          <>
            <NavLink href="/dashboard" label="Panel" current={pathname} />
            <NavLink href="/projects"  label="Proyectos" current={pathname} />
          </>
        )}
        {!user && (
          <NavLink href="/pricing" label="Precios" current={pathname} />
        )}
      </div>

      {/* Spacer */}
      <div style={{ marginLeft: 'auto' }} />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Command palette trigger */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid var(--line)', borderRadius: 3,
          color: 'var(--faint)', fontSize: 10, padding: '4px 10px', cursor: 'pointer',
        }}
        title="Paleta de comandos (⌘K)"
      >
        <span style={{ fontFamily: 'var(--font-mono)' }}>⌘K</span>
      </button>

      {/* Auth area */}
      {user ? (
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'none', border: '1px solid var(--line)',
              borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--copper-soft)', border: '1px solid var(--copper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: 'var(--copper)', flexShrink: 0,
            }}>{initials}</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name.split(' ')[0]}
            </span>
            <span style={{
              fontSize: 8.5, padding: '1px 6px', borderRadius: 8,
              background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text,
              textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0,
            }}>{plan}</span>
            <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 4, minWidth: 200, padding: '6px 0',
              boxShadow: 'var(--shadow)', zIndex: 300,
            }}>
              {/* User info header */}
              <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{user.name}</div>
                <div style={{ fontSize: 9.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{user.email}</div>
              </div>

              <DropItem href="/profile"   icon="👤" label="Mi perfil" />
              <DropItem href="/projects"  icon="📁" label="Proyectos" />
              <DropItem href="/settings"  icon="⚙" label="Configuración" />
              <DropItem href="/pricing"   icon="⬆" label="Mejorar plan" />

              <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0' }} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', background: 'none', border: 'none',
                  padding: '7px 14px', cursor: 'pointer', textAlign: 'left',
                  fontSize: 11, color: 'var(--danger)',
                }}
              >
                <span style={{ fontSize: 13 }}>→</span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" style={{ fontSize: 10, color: 'var(--dim)', textDecoration: 'none' }}>Ingresar</Link>
          <Link href="/register" style={{
            fontSize: 10, padding: '5px 12px', borderRadius: 3,
            background: 'var(--copper)', color: '#fff', textDecoration: 'none', fontWeight: 700,
          }}>Crear cuenta</Link>
        </div>
      )}

      {/* Mobile hamburger (only in (platform) layout — shown via CSS) */}
      <button
        className="hamburger"
        onClick={() => setMenuOpen(m => !m)}
        style={{
          display: 'none', background: 'none', border: 'none',
          color: 'var(--dim)', cursor: 'pointer', padding: 4, marginLeft: 4,
        }}
        aria-label="Menú"
      >
        <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
          {menuOpen
            ? <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            : <><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>
          }
        </svg>
      </button>
    </header>
  );
}

function NavLink({ href, label, current }: { href: string; label: string; current: string }) {
  const active = current === href || current.startsWith(href + '/');
  return (
    <Link href={href} style={{
      fontSize: 10.5, padding: '4px 8px', borderRadius: 3,
      color: active ? 'var(--copper)' : 'var(--faint)',
      background: active ? 'var(--copper-soft)' : 'transparent',
      textDecoration: 'none',
    }}>
      {label}
    </Link>
  );
}

function DropItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 14px', fontSize: 11, color: 'var(--dim)',
      textDecoration: 'none',
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </Link>
  );
}
