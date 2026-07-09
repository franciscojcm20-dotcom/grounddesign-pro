'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { API_BASE as BASE } from '@/lib/apiBase';

const MODULES = [
  { href: '/soil/field',        icon: '🌐', label: 'Mediciones de Campo',       norm: 'IEEE 81-2012' },
  { href: '/soil/schlumberger', icon: '📡', label: 'Resistividad Schlumberger', norm: 'IEEE 81-2012 · Cl. 8' },
  { href: '/soil/wenner',       icon: '〰', label: 'Resistividad Wenner (validación)', norm: 'IEEE 81-2012 · Cl. 8.3' },
  { href: '/soil/nlayer',       icon: '🌍', label: 'Modelo N capas',            norm: 'Wait (1954)' },
  { href: '/fault-analysis',    icon: '⚡', label: 'Motor de Análisis de Falla', norm: 'IEEE 80-2013 · Cl. 15' },
  { href: '/grid/resistance',   icon: '⬡',  label: 'Malla rectangular',        norm: 'IEEE 80-2013 · Cl. 14.2' },
  { href: '/grid/rod',          icon: '⬇', label: 'Electrodos verticales (picas)', norm: 'Dwight/Sunde (1949)' },
  { href: '/grid/strip',        icon: '─', label: 'Conductor horizontal',      norm: 'Dwight (1936)' },
  { href: '/grid/radial',       icon: '✦', label: 'Sistema radial / estrella', norm: 'Laurent-Niemann (1952)' },
  { href: '/grid/ring',         icon: '◯', label: 'Anillo perimetral',         norm: 'Sunde (1949)' },
  { href: '/grid/combined',     icon: '⊞', label: 'Malla + picas combinada (Schwarz)', norm: 'Schwarz (1954)' },
  { href: '/grid/freeform',     icon: '⬠', label: 'Malla de geometría libre',  norm: 'Sverak (polígono arbitrario)' },
  { href: '/voltages',          icon: '⚠',  label: 'Tensiones paso/contacto',   norm: 'IEEE 80-2013 · Cl. 16' },
  { href: '/gpr',               icon: '⏚', label: 'GPR — Potencial de tierra', norm: 'IEEE 80-2013 · Cl. 15' },
  { href: '/report',            icon: '📋', label: 'Entregables del Proyecto', norm: 'Vista consolidada' },
];

const MODULE_LABEL: Record<string, string> = {
  field: 'Mediciones de Campo', wenner: 'Wenner', schlumberger: 'Schlumberger', nlayer: 'N Capas',
  faultAnalysis: 'Análisis de Falla',
  grid: 'Malla', rod: 'Picas', strip: 'Horizontal', radial: 'Radial', ring: 'Anillo', combined: 'Malla+Picas',
  conductor: 'Conductor', voltages: 'Tensiones',
  gel: 'Gel Químico', gpr: 'GPR', lightning: 'Rayos (SPR)',
};

interface Project { id: string; name: string; description?: string; updated_at: string }
interface CalcResult { id: string; module: string; norm?: string; created_at: string }
interface Stats { totalProjects: number; totalCalcs: number; recentCalcs: CalcResult[]; recentProjects: Project[] }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function DashboardContent() {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem('gdp_onboarding_done')) router.replace('/onboarding');
  }, [router]);
  return null;
}

export function DashboardClient() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [loadErr,  setLoadErr]  = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/projects`, { credentials: 'include' });
      if (!res.ok) { setLoadErr(true); return; }
      const { projects } = await res.json() as { projects: Project[] };

      // Gather recent calcs from first 3 projects (lightweight)
      const recentCalcs: CalcResult[] = [];
      await Promise.all(
        projects.slice(0, 3).map(async p => {
          const r = await fetch(`${BASE}/api/v1/projects/${p.id}`, { credentials: 'include' });
          if (!r.ok) return;
          const body = await r.json() as { results: CalcResult[] };
          recentCalcs.push(...body.results.slice(0, 3));
        })
      );
      recentCalcs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const totalCalcs = recentCalcs.length;
      setStats({ totalProjects: projects.length, totalCalcs, recentCalcs: recentCalcs.slice(0, 5), recentProjects: projects.slice(0, 4) });
    } catch { setLoadErr(true); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <AuthGuard>
      <DashboardContent />
      <div style={{ padding: '28px 40px 60px', maxWidth: 1000 }}>

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            Panel de trabajo
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
            {stats
              ? `${stats.totalProjects} proyecto${stats.totalProjects !== 1 ? 's' : ''} · ${stats.totalCalcs} cálculo${stats.totalCalcs !== 1 ? 's' : ''} guardado${stats.totalCalcs !== 1 ? 's' : ''}`
              : 'Cargando actividad…'}
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'Proyectos', value: String(stats.totalProjects), icon: '📁' },
              { label: 'Cálculos guardados', value: String(stats.totalCalcs), icon: '💾' },
              { label: 'Módulos disponibles', value: String(MODULES.length), icon: '⚡' },
              { label: 'Norma principal', value: 'IEEE 80', icon: '📋' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, padding: '14px 18px', minWidth: 130 }}>
                <div style={{ fontSize: 16, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--copper)' }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: stats?.recentCalcs?.length ? '1fr 280px' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* Modules grid */}
          <div>
            <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Módulos de cálculo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {MODULES.map(m => (
                <Link key={m.href} href={m.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4,
                    padding: '12px 14px', cursor: 'pointer', transition: 'border-color .15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--copper)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 15 }}>{m.icon}</span>
                      <div style={{ fontSize: 7.5, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{m.norm}</div>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', marginTop: 7 }}>Abrir →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right column: recent activity */}
          {stats && (stats.recentCalcs.length > 0 || stats.recentProjects.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Recent calcs */}
              {stats.recentCalcs.length > 0 && (
                <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 9.5, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-mono)' }}>
                    Últimos cálculos
                  </div>
                  {stats.recentCalcs.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid var(--line)' }}>
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 600 }}>{MODULE_LABEL[c.module] ?? c.module}</div>
                        <div style={{ fontSize: 8.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{c.norm ?? 'IEEE'}</div>
                      </div>
                      <div style={{ fontSize: 8.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{timeAgo(c.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent projects */}
              {stats.recentProjects.length > 0 && (
                <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 9.5, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-mono)' }}>
                    Proyectos recientes
                  </div>
                  {stats.recentProjects.map(p => (
                    <Link key={p.id} href={`/projects/${p.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid var(--line)', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontSize: 10.5 }}>📁 {p.name}</div>
                      <div style={{ fontSize: 8.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{timeAgo(p.updated_at)}</div>
                    </Link>
                  ))}
                  <Link href="/projects" style={{ display: 'block', padding: '8px 14px', fontSize: 9.5, color: 'var(--copper)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                    Ver todos →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginTop: 28 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/projects" style={{ display: 'inline-block', padding: '7px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 10.5, color: 'var(--dim)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
              📁 Mis proyectos
            </Link>
            <Link href="/changelog" style={{ display: 'inline-block', padding: '7px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 10.5, color: 'var(--dim)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
              📋 Changelog
            </Link>
            <Link href="/pricing" style={{ display: 'inline-block', padding: '7px 14px', background: 'var(--copper-soft)', border: '1px solid var(--copper)', borderRadius: 3, fontSize: 10.5, color: 'var(--copper)', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ⬆ Mejorar plan
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
