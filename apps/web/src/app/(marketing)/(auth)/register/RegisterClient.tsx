'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { inputStyle } from '@/components/ui/CalcShared';

const PLANS = [
  { id: 'community',    label: 'Community',     desc: 'Gratis · 3 proyectos · IEEE 80/81' },
  { id: 'individual',   label: 'Individual',     desc: 'CLP 29.900/mes · 20 proyectos · PDF' },
  { id: 'professional', label: 'Professional',   desc: 'CLP 79.900/mes · Ilimitado · DXF + API' },
] as const;

export function RegisterClient() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan]         = useState<'community' | 'individual' | 'professional'>('community');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true); setError(null);
    try {
      await register(email, name, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cuenta');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <form onSubmit={submit} style={{ width: 380, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '32px 28px' }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          GroundDesing Pro
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Crear cuenta</h1>

        <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Nombre completo</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }} placeholder="Ing. Juan Pérez" />

        <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Correo electrónico</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }} placeholder="ingeniero@empresa.com" />

        <label style={{ display: 'block', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Contraseña (mín. 8 caracteres)</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 20 }} placeholder="••••••••" />

        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>Plan</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {PLANS.map(p => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)} style={{
              background: plan === p.id ? 'var(--copper-soft)' : 'var(--bg)',
              border: `1px solid ${plan === p.id ? 'var(--copper)' : 'var(--line)'}`,
              borderRadius: 3, padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: plan === p.id ? 'var(--copper)' : 'var(--text)' }}>{p.label}</div>
              <div style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>{p.desc}</div>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 12, padding: 11, borderRadius: 3, cursor: 'pointer',
          opacity: loading ? 0.6 : 1, marginBottom: 16,
        }}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p style={{ fontSize: 10, color: 'var(--faint)', textAlign: 'center' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={{ color: 'var(--copper)', textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
