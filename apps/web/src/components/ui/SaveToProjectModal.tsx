'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Project { id: string; name: string; description?: string }

interface SaveToProjectModalProps {
  module: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  norm?: string;
  onClose: () => void;
  onSaved?: (projectId: string, projectName: string) => void;
}

export function SaveToProjectModal({ module, inputs, outputs, norm, onClose, onSaved }: SaveToProjectModalProps) {
  const toast = useToast();
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState<string>('');
  const [createMode,  setCreateMode]  = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [creating,    setCreating]    = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/projects`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar proyectos');
      const body = await res.json() as { projects: Project[] };
      setProjects(body.projects);
      if (body.projects[0]) setSelected(body.projects[0].id);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/api/v1/projects`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      const body = await res.json() as { project: Project };
      setProjects(p => [body.project, ...p]);
      setSelected(body.project.id);
      setCreateMode(false);
      setNewName(''); setNewDesc('');
      toast.success(`Proyecto "${body.project.name}" creado`);
    } catch {
      toast.error('Error al crear proyecto');
    } finally { setCreating(false); }
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/v1/projects/${selected}/results`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, inputs, outputs, norm }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error);
      const proj = projects.find(p => p.id === selected);
      toast.success(`Cálculo guardado en "${proj?.name ?? 'proyecto'}"`);
      onSaved?.(selected, proj?.name ?? '');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  }

  const INPUT: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
    border: '1px solid var(--line)', borderRadius: 3, color: 'var(--text)',
    fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', outline: 'none',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00000066' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, boxShadow: '0 20px 60px #00000055', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Guardar en proyecto</div>
            <div style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              Módulo: {module}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '18px 18px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--faint)', fontSize: 11 }}>Cargando proyectos…</div>
          ) : createMode ? (
            <>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 12 }}>Nuevo proyecto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, color: 'var(--dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>Nombre *</label>
                  <input style={INPUT} value={newName} onChange={e => setNewName(e.target.value)} placeholder="ej. Subestación Norte" autoFocus />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, color: 'var(--dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>Descripción</label>
                  <input style={INPUT} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opcional" />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setCreateMode(false)} style={{ flex: 1, background: 'none', border: '1px solid var(--line)', borderRadius: 3, color: 'var(--faint)', fontSize: 11, padding: '8px 0', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={createProject} disabled={creating || !newName.trim()} style={{ flex: 1, background: 'var(--copper)', border: 'none', borderRadius: 3, color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer', opacity: creating || !newName.trim() ? 0.6 : 1 }}>
                    {creating ? 'Creando…' : 'Crear proyecto'}
                  </button>
                </div>
              </div>
            </>
          ) : projects.length === 0 ? (
            <>
              <div style={{ textAlign: 'center', padding: '16px 0 20px', color: 'var(--faint)', fontSize: 11 }}>
                No tienes proyectos todavía.
              </div>
              <button onClick={() => setCreateMode(true)} style={{ width: '100%', background: 'var(--copper)', border: 'none', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 11, padding: '10px 0', cursor: 'pointer' }}>
                + Crear primer proyecto
              </button>
            </>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: 9.5, color: 'var(--dim)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                Selecciona un proyecto
              </label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 12 }}>
                {projects.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: selected === p.id ? 'var(--copper-soft)' : 'transparent',
                      border: 'none', borderBottom: i < projects.length - 1 ? '1px solid var(--line)' : 'none',
                      color: selected === p.id ? 'var(--copper)' : 'var(--dim)', cursor: 'pointer',
                      borderLeft: selected === p.id ? '2px solid var(--copper)' : '2px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: selected === p.id ? 700 : 400 }}>{p.name}</div>
                    {p.description && (
                      <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{p.description}</div>
                    )}
                  </button>
                ))}
              </div>

              <button onClick={() => setCreateMode(true)} style={{ display: 'block', width: '100%', background: 'none', border: '1px dashed var(--line)', borderRadius: 3, color: 'var(--faint)', fontSize: 10, padding: '7px 0', cursor: 'pointer', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
                + Crear nuevo proyecto
              </button>

              <button onClick={save} disabled={saving || !selected} style={{ width: '100%', background: 'var(--copper)', border: 'none', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 11, padding: '10px 0', cursor: 'pointer', opacity: saving || !selected ? 0.6 : 1 }}>
                {saving ? 'Guardando…' : '💾 Guardar cálculo'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
