'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { inputStyle } from '@/components/ui/CalcShared';

export function LoginClient() {
  const { login } = useAuth();
  const router = useRouter();
  const toast  = useToast();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await login(email, password);
      toast.success('Sesión iniciada correctamente');
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <form onSubmit={submit} style={{ width: 340, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '32px 28px' }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          GroundDesign Pro
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Iniciar sesión</h1>

        <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Correo electrónico</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }} placeholder="ingeniero@empresa.com" />

        <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Contraseña</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 20 }} placeholder="••••••••" />

        {error && (
          <div style={{ padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 12, padding: 11, borderRadius: 3, cursor: 'pointer',
          opacity: loading ? 0.6 : 1, marginBottom: 16,
        }}>
          {loading ? 'Ingresando…' : 'Entrar'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <Link href="/forgot-password" style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <p style={{ fontSize: 10, color: 'var(--faint)', textAlign: 'center' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: 'var(--copper)', textDecoration: 'none' }}>Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
