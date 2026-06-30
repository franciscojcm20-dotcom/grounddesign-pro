'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { projectApi, type Project } from '@/lib/auth';

const MODULE_LABEL: Record<string, string> = {
  wenner: 'Wenner', schlumberger: 'Schlumberger', nlayer: 'N-capas',
  grid: 'Malla', conductor: 'Conductor', voltages: 'Tensiones', gel: 'Gel',
};

export function ProjectsClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState('');
  const [error, setError]       = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally { setCreating(false); }
  }

  async function deleteProject(id: string) {
    if (!confirm('¿Eliminar este proyecto y todos sus cálculos?')) return;
    await projectApi.delete(id);
    setProjects(p => p.filter(pr => pr.id !== id));
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faint)', fontSize: 11 }}>
        Cargando…
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Proyectos</h1>
        <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          {user?.name} · {user?.plan}
        </span>
      </div>

      {/* Nueva proyecto */}
      <form onSubmit={createProject} style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <input
          value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Nombre del proyecto…"
          style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', borderRadius: 3, outline: 'none' }}
        />
        <button type="submit" disabled={creating || !newName.trim()} style={{
          background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
          fontSize: 11, padding: '8px 16px', borderRadius: 3, cursor: 'pointer', opacity: creating ? 0.6 : 1,
        }}>
          + Nuevo
        </button>
      </form>
      {error && <div style={{ marginBottom: 16, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}

      {/* Lista */}
      {projects.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--faint)', fontSize: 11 }}>
          No tienes proyectos aún. Crea uno para guardar tus cálculos.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Link href={`/projects/${p.id}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                  {p.name}
                </Link>
                {p.description && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{p.description}</div>}
                <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Actualizado {new Date(p.updated_at).toLocaleDateString('es-CL')}
                </div>
              </div>
              <button onClick={() => deleteProject(p.id)} style={{
                background: 'none', border: '1px solid var(--line)', borderRadius: 3,
                color: 'var(--faint)', fontSize: 10, padding: '4px 10px', cursor: 'pointer',
              }}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
