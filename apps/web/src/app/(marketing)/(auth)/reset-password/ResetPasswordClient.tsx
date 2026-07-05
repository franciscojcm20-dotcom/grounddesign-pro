'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { API_BASE as BASE } from '@/lib/apiBase';

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const toast        = useToast();

  const token = searchParams.get('token') ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [strength,  setStrength]  = useState(0);

  useEffect(() => {
    let s = 0;
    if (password.length >= 8)                  s++;
    if (/[A-Z]/.test(password))               s++;
    if (/[0-9]/.test(password))               s++;
    if (/[^A-Za-z0-9]/.test(password))        s++;
    setStrength(s);
  }, [password]);

  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength];
  const strengthColor = ['', 'var(--danger)', 'var(--warn)', 'var(--blue)', 'var(--safe)'][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (password.length < 8)  { toast.error('Mínimo 8 caracteres'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Error al restablecer contraseña');
      setDone(true);
      toast.success('Contraseña actualizada correctamente');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'var(--bg)', border: '1px solid var(--line)',
    borderRadius: 3, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontSize: 11, padding: '8px 10px', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '36px 32px' }}>
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

        {!token ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Enlace inválido</div>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 20 }}>
              Este enlace de restablecimiento no es válido. Solicita uno nuevo.
            </p>
            <Link href="/forgot-password" style={{ fontSize: 11, color: 'var(--copper)', textDecoration: 'none' }}>
              ← Solicitar nuevo enlace
            </Link>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Contraseña actualizada</div>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 20 }}>
              Redirigiendo al inicio de sesión…
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Nueva contraseña</h1>
            <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 24, lineHeight: 1.5 }}>
              Elige una contraseña segura para tu cuenta.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>Nueva contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="Mínimo 8 caracteres" />
                {password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${strength * 25}%`, background: strengthColor as string, transition: 'width .2s, background .2s' }} />
                    </div>
                    <div style={{ fontSize: 8.5, color: strengthColor as string, marginTop: 3 }}>{strengthLabel}</div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>Confirmar contraseña</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? 'var(--danger)' : 'var(--line)',
                }} placeholder="Repite la contraseña" />
                {confirm && confirm !== password && (
                  <div style={{ fontSize: 8.5, color: 'var(--danger)', marginTop: 3 }}>Las contraseñas no coinciden</div>
                )}
              </div>

              <button type="submit" disabled={loading || !password || !confirm} style={{
                width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
                fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer',
                opacity: loading || !password || !confirm ? 0.6 : 1,
              }}>
                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>

            <div style={{ marginTop: 18, textAlign: 'center', fontSize: 10, color: 'var(--faint)' }}>
              <Link href="/login" style={{ color: 'var(--copper)', textDecoration: 'none' }}>← Volver al inicio de sesión</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
