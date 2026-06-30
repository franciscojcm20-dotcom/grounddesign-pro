'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function ForgotPasswordClient() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Error al enviar el correo');
      }
      setSent(true);
      toast.success('Correo de recuperación enviado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 6, padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <svg width={20} height={20} viewBox="0 0 22 22" fill="none">
            <path d="M11 2L11 12" stroke="#E07A23" strokeWidth="1.8"/>
            <path d="M5 12L17 12" stroke="#E07A23" strokeWidth="2.2"/>
            <path d="M7 15.5L15 15.5" stroke="#E07A23" strokeWidth="1.4" opacity=".7"/>
            <path d="M9 19L13 19" stroke="#E07A23" strokeWidth="1" opacity=".45"/>
            <circle cx="11" cy="2" r="1.5" fill="#E07A23"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em' }}>
            GroundDesing<span style={{ color: 'var(--copper)' }}>Pro</span>
          </span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📧</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Correo enviado</div>
            <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6, marginBottom: 24 }}>
              Si existe una cuenta asociada a <strong style={{ color: 'var(--text)' }}>{email}</strong>,
              recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>
            <Link href="/login" style={{
              display: 'block', textAlign: 'center',
              fontSize: 11, color: 'var(--copper)', textDecoration: 'none',
            }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Recuperar contraseña</h1>
            <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 24, lineHeight: 1.5 }}>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ingeniero@empresa.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg)', border: '1px solid var(--line)',
                    borderRadius: 3, color: 'var(--text)', fontFamily: 'var(--font-mono)',
                    fontSize: 11, padding: '8px 10px', outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: '100%', background: 'var(--copper)', border: 'none',
                  color: '#fff', fontWeight: 700, fontSize: 11,
                  padding: 10, borderRadius: 3, cursor: 'pointer',
                  opacity: loading || !email ? 0.6 : 1,
                }}
              >
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 10, color: 'var(--faint)' }}>
              <Link href="/login" style={{ color: 'var(--copper)', textDecoration: 'none' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
