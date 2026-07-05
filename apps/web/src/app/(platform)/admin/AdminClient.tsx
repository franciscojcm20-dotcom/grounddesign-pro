'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { API_BASE as BASE } from '@/lib/apiBase';

interface AdminStats {
  summary: { users: number; projects: number; calcs: number };
  planDistribution: { plan: string; count: number }[];
  recentUsers: { id: string; email: string; name: string; plan: string; created_at: string }[];
  moduleUsage: { module: string; count: number }[];
}

const PLAN_COLOR: Record<string, string> = {
  community:    'var(--blue)',
  individual:   'var(--warn)',
  professional: 'var(--safe)',
};

const MODULE_ICONS: Record<string, string> = {
  wenner: '⚡', schlumberger: '📡', nlayer: '🌐',
  grid: '⬡', conductor: '〰', voltages: '⚠', gel: '🧪', gpr: '⚡',
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.max(4, (value / max) * 100)}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

function AdminContent() {
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/v1/admin/stats`, { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json() as { error: string }).error);
        return r.json() as Promise<AdminStats>;
      })
      .then(setStats)
      .catch(e => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faint)', fontSize: 11 }}>
      Cargando estadísticas…
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, fontSize: 11, color: 'var(--danger)' }}>
      {error === 'Acceso denegado' ? '⛔ Solo administradores pueden acceder a esta página.' : error}
    </div>
  );

  if (!stats) return null;

  const totalPlan = stats.planDistribution.reduce((a, b) => a + b.count, 0) || 1;
  const maxCalc   = Math.max(...stats.moduleUsage.map(m => m.count), 1);

  return (
    <div style={{ padding: '28px 40px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Admin</h1>
        <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>Panel de administración</span>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Usuarios', value: stats.summary.users, icon: '👥' },
          { label: 'Proyectos', value: stats.summary.projects, icon: '📁' },
          { label: 'Cálculos', value: stats.summary.calcs, icon: '⚡' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 6, padding: '16px 20px', minWidth: 140, flex: 1,
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--copper)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>{s.label} totales</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Plan distribution */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 14 }}>Distribución de planes</div>
          {stats.planDistribution.map(p => (
            <div key={p.plan} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: PLAN_COLOR[p.plan] ?? 'var(--dim)', textTransform: 'capitalize' }}>{p.plan}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>
                  {p.count} ({((p.count / totalPlan) * 100).toFixed(0)}%)
                </span>
              </div>
              <MiniBar value={p.count} max={totalPlan} color={PLAN_COLOR[p.plan] ?? 'var(--line)'} />
            </div>
          ))}
          {stats.planDistribution.length === 0 && (
            <div style={{ fontSize: 10, color: 'var(--faint)' }}>Sin datos</div>
          )}
        </div>

        {/* Module usage */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 14 }}>Uso por módulo</div>
          {stats.moduleUsage.length === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--faint)' }}>Sin cálculos guardados aún</div>
          ) : stats.moduleUsage.map(m => (
            <div key={m.module} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--dim)' }}>
                  {MODULE_ICONS[m.module] ?? '📐'} {m.module}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--copper)' }}>{m.count}</span>
              </div>
              <MiniBar value={m.count} max={maxCalc} color="var(--copper)" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent users */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '16px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 14 }}>Últimos registros</div>
        {stats.recentUsers.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--faint)' }}>Sin usuarios registrados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Email', 'Plan', 'Registro'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: 8.5, color: 'var(--faint)',
                    textTransform: 'uppercase', letterSpacing: '.06em',
                    padding: '4px 10px', borderBottom: '1px solid var(--line)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{u.name}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{
                      fontSize: 8.5, padding: '2px 7px', borderRadius: 8,
                      color: PLAN_COLOR[u.plan] ?? 'var(--dim)',
                      border: `1px solid ${PLAN_COLOR[u.plan] ?? 'var(--line)'}33`,
                      background: `${PLAN_COLOR[u.plan] ?? 'var(--line)'}11`,
                      textTransform: 'capitalize',
                    }}>{u.plan}</span>
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(u.created_at).toLocaleDateString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function AdminClient() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}
