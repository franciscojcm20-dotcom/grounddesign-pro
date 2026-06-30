import Link from 'next/link';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Marketing nav */}
      <nav style={{
        height: 52, borderBottom: '1px solid var(--line)',
        background: 'var(--panel)', display: 'flex', alignItems: 'center',
        padding: '0 40px', gap: 32, flexShrink: 0,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ color: 'var(--copper)', fontWeight: 900, fontSize: 14, letterSpacing: '-.02em' }}>⏚</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>GroundDesing<span style={{ color: 'var(--copper)' }}>Pro</span></span>
        </Link>
        <div style={{ flex: 1 }} />
        <Link href="/pricing" style={{ fontSize: 11, color: 'var(--dim)', textDecoration: 'none' }}>Precios</Link>
        <Link href="/login" style={{ fontSize: 11, color: 'var(--dim)', textDecoration: 'none' }}>Ingresar</Link>
        <Link href="/register" style={{
          fontSize: 11, fontWeight: 700, padding: '6px 16px',
          background: 'var(--copper)', color: '#fff', borderRadius: 3, textDecoration: 'none',
        }}>
          Crear cuenta
        </Link>
      </nav>

      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--line)', padding: '24px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--panel)',
      }}>
        <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          © 2026 GroundDesing Pro · Motor IEEE propio · Sin dependencias externas
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/pricing" style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none' }}>Precios</Link>
          <Link href="/login"   style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none' }}>Acceso</Link>
          <Link href="/dashboard" style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none' }}>App</Link>
        </div>
      </footer>
    </div>
  );
}
