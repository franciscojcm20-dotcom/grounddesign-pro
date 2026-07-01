'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { useToast } from '@/context/ToastContext';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const PLAN_INFO = {
  community:    { label: 'Community',    color: '#93c5fd', desc: 'Gratis · 3 proyectos · PDF con marca de agua' },
  individual:   { label: 'Individual',   color: '#f59e0b', desc: 'CLP 29.900/mes · Proyectos ilimitados · PDF sin marca · Firma PE' },
  professional: { label: 'Professional', color: '#22c55e', desc: 'CLP 79.900/mes · 5 usuarios · API access · Normas IEC/RETIE' },
};

const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
  border: '1px solid var(--line)', borderRadius: 3, color: 'var(--text)',
  fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', outline: 'none',
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--line)', fontSize: 9.5, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-mono)' }}>
        {title}
      </div>
      <div style={{ padding: '20px 18px' }}>{children}</div>
    </div>
  );
}

export function ProfileClient() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const plan = (user?.plan ?? 'community') as keyof typeof PLAN_INFO;
  const pi   = PLAN_INFO[plan] ?? PLAN_INFO['community'];
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';

  // Name edit
  const [editName,   setEditName]   = useState(false);
  const [nameVal,    setNameVal]    = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);

  // Password change
  const [currPwd,  setCurrPwd]  = useState('');
  const [newPwd,   setNewPwd]   = useState('');
  const [confPwd,  setConfPwd]  = useState('');
  const [pwdSave,  setPwdSave]  = useState(false);

  // Strength
  const strength = [newPwd.length >= 8, /[A-Z]/.test(newPwd), /[0-9]/.test(newPwd), /[^A-Za-z0-9]/.test(newPwd)].filter(Boolean).length;
  const strColor = ['', 'var(--danger)', 'var(--warn)', 'var(--blue)', 'var(--safe)'][strength];

  async function saveName() {
    if (!nameVal.trim() || nameVal.trim() === user?.name) { setEditName(false); return; }
    setNameSaving(true);
    try {
      const res = await fetch(`${BASE}/api/v1/auth/me`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameVal.trim() }),
      });
      const body = await res.json() as { ok?: boolean; user?: typeof user; error?: string };
      if (!res.ok) throw new Error(body.error);
      if (body.user && setUser) setUser(body.user);
      toast.success('Nombre actualizado');
      setEditName(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setNameSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confPwd) { toast.error('Las contraseñas no coinciden'); return; }
    if (newPwd.length < 8)  { toast.error('Mínimo 8 caracteres'); return; }
    setPwdSave(true);
    try {
      const res = await fetch(`${BASE}/api/v1/auth/me`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currPwd, newPassword: newPwd }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error);
      toast.success('Contraseña actualizada');
      setCurrPwd(''); setNewPwd(''); setConfPwd('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar contraseña');
    } finally { setPwdSave(false); }
  }

  return (
    <AuthGuard>
      <div style={{ padding: '32px 40px', maxWidth: 680 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Cuenta
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Mi perfil</h1>

        {/* Avatar + plan */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '22px 20px', marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--copper-soft)', border: '2px solid var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--copper)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{user?.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 8.5, padding: '3px 10px', borderRadius: 10, fontWeight: 700, background: `${pi.color}18`, border: `1px solid ${pi.color}44`, color: pi.color, textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>
              {pi.label}
            </span>
            <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 4, maxWidth: 180 }}>{pi.desc}</div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {plan !== 'professional' && (
          <div style={{ background: 'var(--copper-soft)', border: '1px solid var(--copper)', borderRadius: 4, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>
              {plan === 'community' ? 'Mejora a Individual — PDF sin marca, proyectos ilimitados' : 'Mejora a Professional — 5 usuarios, API access, IEC/RETIE'}
            </div>
            <a href="/pricing" style={{ padding: '7px 14px', background: 'var(--copper)', color: '#fff', borderRadius: 3, textDecoration: 'none', fontWeight: 700, fontSize: 10.5, flexShrink: 0 }}>
              Ver planes →
            </a>
          </div>
        )}

        {/* Edit name */}
        <SectionCard title="Nombre">
          {editName ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...INPUT, flex: 1 }} value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(false); setNameVal(user?.name ?? ''); } }} autoFocus />
              <button onClick={saveName} disabled={nameSaving} style={{ background: 'var(--copper)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '0 16px', borderRadius: 3, cursor: 'pointer', opacity: nameSaving ? 0.6 : 1 }}>
                {nameSaving ? '…' : 'Guardar'}
              </button>
              <button onClick={() => { setEditName(false); setNameVal(user?.name ?? ''); }} style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--faint)', fontSize: 10.5, padding: '0 12px', borderRadius: 3, cursor: 'pointer' }}>
                ×
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{user?.name}</span>
              <button onClick={() => { setEditName(true); setNameVal(user?.name ?? ''); }} style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--dim)', fontSize: 10, padding: '4px 12px', borderRadius: 3, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                Editar
              </button>
            </div>
          )}
        </SectionCard>

        {/* Account details */}
        <SectionCard title="Detalles de cuenta">
          {[
            { label: 'Correo electrónico', value: user?.email },
            { label: 'Plan activo', value: pi.label },
            { label: 'ID de usuario', value: user?.id ? `${user.id.slice(0, 12)}…` : '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>{row.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{row.value ?? '—'}</span>
            </div>
          ))}
        </SectionCard>

        {/* Change password */}
        <SectionCard title="Cambiar contraseña">
          <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 9.5, color: 'var(--dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>Contraseña actual</label>
              <input type="password" style={INPUT} value={currPwd} onChange={e => setCurrPwd(e.target.value)} required autoComplete="current-password" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 9.5, color: 'var(--dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>Nueva contraseña</label>
              <input type="password" style={INPUT} value={newPwd} onChange={e => setNewPwd(e.target.value)} required autoComplete="new-password" />
              {newPwd && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ height: 3, background: 'var(--line)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${strength * 25}%`, background: strColor as string, borderRadius: 2, transition: 'width .2s' }} />
                  </div>
                  <div style={{ fontSize: 8.5, color: strColor as string, marginTop: 2 }}>
                    {['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength]}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 9.5, color: 'var(--dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>Confirmar nueva contraseña</label>
              <input type="password" style={{ ...INPUT, borderColor: confPwd && confPwd !== newPwd ? 'var(--danger)' : 'var(--line)' }} value={confPwd} onChange={e => setConfPwd(e.target.value)} required autoComplete="new-password" />
              {confPwd && confPwd !== newPwd && <div style={{ fontSize: 8.5, color: 'var(--danger)', marginTop: 3 }}>No coinciden</div>}
            </div>
            <button type="submit" disabled={pwdSave || !currPwd || !newPwd || !confPwd} style={{ background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: '9px 0', borderRadius: 3, cursor: 'pointer', opacity: pwdSave || !currPwd || !newPwd || !confPwd ? 0.5 : 1 }}>
              {pwdSave ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </form>
        </SectionCard>

        {/* Norms */}
        <SectionCard title="Normas activas en tu plan">
          {[
            { norm: 'IEEE Std 80-2013', desc: 'Diseño de sistemas de puesta a tierra' },
            { norm: 'IEEE Std 81-2012', desc: 'Medición de resistividad del suelo' },
            ...(plan === 'professional' ? [
              { norm: 'IEC 60364-5-54', desc: 'Instalaciones de baja tensión' },
              { norm: 'RETIE (Colombia)', desc: 'Reglamento técnico de instalaciones eléctricas' },
            ] : []),
          ].map(n => (
            <div key={n.norm} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--copper)', background: 'var(--copper-soft)', border: '1px solid var(--copper)', padding: '2px 8px', borderRadius: 2, flexShrink: 0 }}>{n.norm}</span>
              <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>{n.desc}</span>
            </div>
          ))}
        </SectionCard>
      </div>
    </AuthGuard>
  );
}
