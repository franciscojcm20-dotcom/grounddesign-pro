import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: 'var(--bg)', textAlign: 'center', padding: 40,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 56, color: 'var(--copper)', fontWeight: 900, lineHeight: 1 }}>
        404
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        Página no encontrada
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim)', maxWidth: 340, lineHeight: 1.6 }}>
        La ruta solicitada no existe. Verifica la URL o regresa al inicio.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <Link href="/" style={{
          padding: '9px 20px', background: 'var(--copper)', color: '#fff',
          borderRadius: 3, textDecoration: 'none', fontWeight: 700, fontSize: 12,
        }}>
          Ir al inicio
        </Link>
        <Link href="/dashboard" style={{
          padding: '9px 20px', background: 'transparent', color: 'var(--dim)',
          border: '1px solid var(--line)', borderRadius: 3, textDecoration: 'none', fontSize: 12,
        }}>
          Ir a la app
        </Link>
      </div>
      <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', marginTop: 16 }}>
        GroundDesing Pro · IEEE 80/81
      </div>
    </div>
  );
}
