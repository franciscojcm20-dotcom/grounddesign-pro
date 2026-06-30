'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { projectApi, type Project } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';

const MODULE_LABEL: Record<string, string> = {
  wenner: 'Wenner', schlumberger: 'Schlumberger', nlayer: 'N-capas',
  grid: 'Malla', conductor: 'Conductor', voltages: 'Tensiones', gel: 'Gel', gpr: 'GPR',
};

function StatsBar({ projects }: { projects: Project[] }) {
  const total      = projects.length;
  const calcCount  = projects.reduce((acc, p) => acc + ((p as Project & { calc_count?: number }).calc_count ?? 0), 0);
  const recentDays = projects.filter(p => {
    const d = new Date(p.updated_at);
    return (Date.now() - d.getTime()) < 1000 * 60 * 60 * 24 * 7;
  }).length;

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
      {[
        { label: 'Proyectos', value: total, unit: 'total' },
        { label: 'Cálculos', value: calcCount, unit: 'guardados' },
        { label: 'Activos', value: recentDays, unit: 'últimos 7 días' },
      ].map(s => (
        <div key={s.label} style={{
          background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4,
          padding: '10px 16px', minWidth: 110,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--copper)', fontFamily: 'var(--font-mono)' }}>
            {s.value}
          </div>
          <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 2 }}>
            {s.label} <span style={{ color: 'var(--dim)' }}>{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectsClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast  = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!user) return;
    projectApi.list().then(d => setProjects(d.projects)).catch(() => setProjects([])).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true); setError(null);
    try {
      const d = await projectApi.create(newName.trim());
      setProjects(p => [d.project, ...p]);
      setNewName('');
      toast.success(`Proyecto "${d.project.name}" creado`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear proyecto';
      setError(msg);
      toast.error(msg);
    } finally { setCreating(false); }
  }

  async function deleteProject(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" y todos sus cálculos?`)) return;
    try {
      await projectApi.delete(id);
      setProjects(p => p.filter(pr => pr.id !== id));
      toast.info(`Proyecto "${name}" eliminado`);
    } catch {
      toast.error('No se pudo eliminar el proyecto');
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faint)', fontSize: 11 }}>
        Cargando proyectos…
      </div>
    );
  }

  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div style={{ padding: '28px 40px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Proyectos</h1>
        <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          {user?.name} · {user?.plan}
        </span>
      </div>

      <StatsBar projects={projects} />

      {/* Create + search row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <form onSubmit={createProject} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre del nuevo proyecto…"
            style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', borderRadius: 3, outline: 'none' }}
          />
          <button type="submit" disabled={creating || !newName.trim()} style={{
            background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
            fontSize: 11, padding: '8px 16px', borderRadius: 3, cursor: 'pointer', opacity: creating ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}>
            + Nuevo
          </button>
        </form>
        {projects.length > 3 && (
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            style={{ width: 160, background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', borderRadius: 3, outline: 'none' }}
          />
        )}
      </div>
      {error && <div style={{ marginBottom: 12, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--faint)', fontSize: 11 }}>
          {search ? 'No hay proyectos que coincidan con la búsqueda.' : 'No tienes proyectos aún. Crea uno para guardar tus cálculos.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px', gap: 12, padding: '4px 16px', fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            <span>Proyecto</span><span>Actualizado</span><span>Cálculos</span><span></span>
          </div>

          {filtered.map(p => {
            const calcCount = (p as Project & { calc_count?: number }).calc_count ?? 0;
            return (
              <div key={p.id} style={{
                background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4,
                display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px',
                alignItems: 'center', gap: 12, padding: '12px 16px',
                transition: 'border-color .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--copper)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
              >
                <div>
                  <Link href={`/projects/${p.id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                    {p.name}
                  </Link>
                  {p.description && <div style={{ fontSize: 9.5, color: 'var(--dim)', marginTop: 2 }}>{p.description}</div>}
                </div>
                <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(p.updated_at).toLocaleDateString('es-CL')}
                </div>
                <div style={{ fontSize: 10, color: calcCount > 0 ? 'var(--copper)' : 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                  {calcCount > 0 ? `${calcCount} cálculo${calcCount !== 1 ? 's' : ''}` : '—'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href={`/projects/${p.id}`} style={{
                    fontSize: 9.5, color: 'var(--copper)', textDecoration: 'none',
                    border: '1px solid var(--copper)', borderRadius: 3, padding: '3px 8px',
                  }}>
                    Ver
                  </Link>
                  <button onClick={() => deleteProject(p.id, p.name)} style={{
                    background: 'none', border: '1px solid var(--line)', borderRadius: 3,
                    color: 'var(--faint)', fontSize: 9.5, padding: '3px 8px', cursor: 'pointer',
                  }}>
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
