'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const COMMANDS = [
  { id: 'dashboard',    label: 'Panel de control',           icon: '⚡', href: '/dashboard',       group: 'Navegación' },
  { id: 'projects',     label: 'Proyectos',                  icon: '📁', href: '/projects',         group: 'Navegación' },
  { id: 'profile',      label: 'Mi perfil',                  icon: '👤', href: '/profile',          group: 'Navegación' },
  { id: 'settings',     label: 'Configuración',              icon: '⚙', href: '/settings',          group: 'Navegación' },
  { id: 'wenner',       label: 'Resistividad Wenner',        icon: '⚡', href: '/soil/wenner',       group: 'Módulos' },
  { id: 'schlumberger', label: 'Resistividad Schlumberger',  icon: '📡', href: '/soil/schlumberger', group: 'Módulos' },
  { id: 'nlayer',       label: 'Modelo N capas',             icon: '🌐', href: '/soil/nlayer',       group: 'Módulos' },
  { id: 'grid',         label: 'Resistencia de malla',       icon: '⬡', href: '/grid/resistance',   group: 'Módulos' },
  { id: 'conductor',    label: 'Conductor IEEE 80',          icon: '〰', href: '/conductor',         group: 'Módulos' },
  { id: 'voltages',     label: 'Tensiones paso/contacto',   icon: '⚠', href: '/voltages',           group: 'Módulos' },
  { id: 'gel',          label: 'Gel químico',                icon: '🧪', href: '/grid/gel',          group: 'Módulos' },
  { id: 'gpr',          label: 'GPR — Potencial de tierra', icon: '⚡', href: '/gpr',               group: 'Módulos' },
  { id: 'pricing',      label: 'Precios y planes',           icon: '💎', href: '/pricing',           group: 'Información' },
  { id: 'admin',        label: 'Panel de administración',    icon: '🛡', href: '/admin',             group: 'Sistema' },
];

export function CommandPalette() {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [idx,   setIdx]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  const close = useCallback(() => { setOpen(false); setQuery(''); setIdx(0); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if ((mod && e.key === 'k') || e.key === '?') {
        // Don't intercept ? when typing in an input
        if (e.key === '?' && document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.group.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  function navigate(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[idx]) { navigate(filtered[idx]!.href); }
  }

  if (!open) return null;

  // Group results
  const groups = filtered.reduce<Record<string, typeof COMMANDS>>((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh', background: '#00000066' }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: '0 24px 64px #00000077', overflow: 'hidden' }}>
        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 13, opacity: 0.5 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Buscar módulos, páginas…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-mono)' }}
          />
          <kbd style={{ fontSize: 9, color: 'var(--faint)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '2px 5px' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 11, color: 'var(--faint)' }}>
              Sin resultados para "{query}"
            </div>
          ) : Object.entries(groups).map(([group, cmds]) => (
            <div key={group}>
              <div style={{ padding: '6px 16px 2px', fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                {group}
              </div>
              {cmds.map(cmd => {
                const isActive = globalIdx++ === idx;
                return (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setIdx(globalIdx - 1)}
                    onClick={() => navigate(cmd.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? 'var(--copper-soft)' : 'transparent',
                      color: isActive ? 'var(--copper)' : 'var(--dim)',
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{cmd.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 400 }}>{cmd.label}</div>
                    </div>
                    {isActive && (
                      <kbd style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--faint)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '2px 5px', flexShrink: 0 }}>↵</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 16, fontSize: 9, color: 'var(--faint)' }}>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 2, padding: '1px 4px', fontSize: 9 }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 2, padding: '1px 4px', fontSize: 9 }}>↵</kbd> abrir</span>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 2, padding: '1px 4px', fontSize: 9 }}>⌘K</kbd> paleta</span>
        </div>
      </div>
    </div>
  );
}
