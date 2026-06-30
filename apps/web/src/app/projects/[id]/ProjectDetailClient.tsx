'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectApi, type Project, type CalcResultRow } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { panelStyle, Th, TdMono } from '@/components/ui/CalcShared';

const MODULE_LABEL: Record<string, string> = {
  wenner: 'Wenner', schlumberger: 'Schlumberger', nlayer: 'N-capas',
  grid: 'Malla', conductor: 'Conductor', voltages: 'Tensiones', gel: 'Gel',
};

export function ProjectDetailClient({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [project, setProject]   = useState<Project | null>(null);
  const [results, setResults]   = useState<CalcResultRow[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!user) return;
    projectApi.get(id).then(d => { setProject(d.project); setResults(d.results); }).finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  if (authLoading || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faint)', fontSize: 11 }}>Cargando…</div>
  );
  if (!project) return (
    <div style={{ padding: 40, color: 'var(--danger)', fontSize: 11 }}>Proyecto no encontrado. <Link href="/projects" style={{ color: 'var(--copper)' }}>Volver</Link></div>
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/projects" style={{ fontSize: 10, color: 'var(--faint)', textDecoration: 'none' }}>← Proyectos</Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{project.name}</h1>
      {project.description && <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 20 }}>{project.description}</p>}

      <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)', marginBottom: 28 }}>
        {results.length} resultado{results.length !== 1 ? 's' : ''} guardados
      </div>

      {results.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: 'center', padding: '32px 0', color: 'var(--faint)', fontSize: 11 }}>
          No hay cálculos guardados. Ejecuta un módulo y guarda el resultado en este proyecto.
        </div>
      ) : (
        <div style={panelStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><Th>Módulo</Th><Th>Norma</Th><Th>Fecha</Th><Th>Resumen</Th></tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id}>
                  <TdMono highlight>{MODULE_LABEL[r.module] ?? r.module}</TdMono>
                  <TdMono>{r.norm ?? '—'}</TdMono>
                  <TdMono>{new Date(r.created_at).toLocaleDateString('es-CL')}</TdMono>
                  <TdMono>
                    <details style={{ cursor: 'pointer' }}>
                      <summary style={{ fontSize: 9, color: 'var(--faint)' }}>Ver JSON</summary>
                      <pre style={{ fontSize: 9, marginTop: 4, color: 'var(--dim)', maxHeight: 120, overflow: 'auto' }}>
                        {JSON.stringify(r.outputs, null, 2)}
                      </pre>
                    </details>
                  </TdMono>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
