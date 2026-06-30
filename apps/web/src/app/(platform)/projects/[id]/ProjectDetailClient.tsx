'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { projectApi, type Project, type CalcResultRow } from '@/lib/auth';
import { AuthGuard } from '@/components/ui/AuthGuard';

const MODULE_LABELS: Record<string, string> = {
  wenner:       'Resistividad Wenner',
  schlumberger: 'Resistividad Schlumberger',
  nlayer:       'Modelo N capas',
  grid:         'Resistencia de malla',
  conductor:    'Conductor IEEE 80',
  voltages:     'Tensiones paso/contacto',
  gel:          'Aditivo gel químico',
};

export function ProjectDetailClient({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<CalcResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    projectApi.get(id)
      .then(d => { setProject(d.project); setResults(d.results ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--faint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      Cargando proyecto…
    </div>
  );

  if (error || !project) return (
    <div style={{ padding: 40 }}>
      <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>
        {error ?? 'Proyecto no encontrado'}
      </div>
      <Link href="/projects" style={{ fontSize: 11, color: 'var(--copper)', textDecoration: 'none' }}>
        ← Volver a proyectos
      </Link>
    </div>
  );

  return (
    <AuthGuard>
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/projects" style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
            ← Proyectos
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{project.name}</h1>
          {project.description && (
            <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>{project.description}</p>
          )}
          <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
            Creado: {new Date(project.created_at).toLocaleDateString('es-CL')} ·{' '}
            Actualizado: {new Date(project.updated_at).toLocaleDateString('es-CL')}
          </div>
        </div>

        <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>
          Historial de cálculos ({results.length})
        </div>

        {results.length === 0 ? (
          <div style={{ padding: '32px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, textAlign: 'center', color: 'var(--faint)', fontSize: 11 }}>
            Aún no hay cálculos guardados en este proyecto.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(r => (
              <details key={r.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4 }}>
                <summary style={{
                  padding: '12px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 12, listStyle: 'none',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--copper)', background: 'var(--copper-soft)', border: '1px solid var(--copper)', padding: '2px 8px', borderRadius: 2 }}>
                    {r.module}
                  </span>
                  <span>{MODULE_LABELS[r.module] ?? r.module}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(r.created_at).toLocaleString('es-CL')}
                  </span>
                  {r.norm && (
                    <span style={{ fontSize: 9, color: 'var(--faint)' }}>{r.norm}</span>
                  )}
                </summary>
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 6 }}>Entradas</div>
                      <pre style={{ fontSize: 9, color: 'var(--dim)', background: 'var(--bg)', padding: 10, borderRadius: 3, overflow: 'auto', margin: 0, lineHeight: 1.6 }}>
                        {JSON.stringify(r.inputs, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 6 }}>Resultados</div>
                      <pre style={{ fontSize: 9, color: 'var(--copper)', background: 'var(--bg)', padding: 10, borderRadius: 3, overflow: 'auto', margin: 0, lineHeight: 1.6 }}>
                        {JSON.stringify(r.outputs, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
