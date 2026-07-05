'use client';
import type { CSSProperties, ReactNode } from 'react';

// ── Layouts ───────────────────────────────────────────────────────────────────

export const calcLayout: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '320px 1fr',
  height: '100%',
};

export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  padding: '6px 8px',
  borderRadius: 3,
  outline: 'none',
};

export const panelStyle: CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 4,
  padding: '12px 14px',
  marginBottom: 14,
};

// ── Componentes compartidos ───────────────────────────────────────────────────

export function SectionLabel({ children, purple }: { children: ReactNode; purple?: boolean }) {
  return (
    <div style={{
      fontSize: 9, color: purple ? 'var(--purple)' : 'var(--copper)',
      textTransform: 'uppercase', letterSpacing: '.1em',
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--line)', display: 'inline-block' }} />
    </div>
  );
}

export function Field({ label, unit = '', children }: { label: string; unit?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
        <span>{label}</span>
        {unit && <span style={{ color: 'var(--faint)' }}>{unit}</span>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, unit = '', primary, ok, highlight }: {
  label: string; value: string; unit?: string; primary?: boolean; ok?: boolean; highlight?: boolean;
}) {
  primary = primary || highlight;
  const borderColor = primary
    ? 'var(--copper)'
    : ok === true ? 'var(--safe)' : ok === false ? 'var(--danger)' : 'var(--line)';
  const bg = primary
    ? 'linear-gradient(160deg,var(--copper-mid),var(--panel))'
    : ok === true ? 'var(--safe-soft)' : ok === false ? 'var(--danger-soft)' : 'var(--panel)';
  const valColor = primary
    ? 'var(--copper)'
    : ok === true ? 'var(--safe)' : ok === false ? 'var(--danger)' : 'var(--text)';
  return (
    <div style={{ flex: 1, minWidth: 120, borderRadius: 4, padding: '11px 13px', border: `1px solid ${borderColor}`, background: bg }}>
      <div style={{ fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: valColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
        {value}<span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 400, marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

export function CompBanner({ pass, msg, label, norm }: { pass?: boolean; msg?: string; label?: string; norm: string }) {
  pass = pass ?? true;
  msg = msg ?? label ?? '';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px',
      background: pass ? 'var(--safe-soft)' : 'var(--danger-soft)',
      border: `1px solid ${pass ? 'var(--safe)' : 'var(--danger)'}`,
      borderRadius: 4, marginBottom: 16, fontSize: 11,
      color: pass ? 'var(--safe)' : 'var(--danger)',
    }}>
      <span style={{ fontWeight: 700 }}>{pass ? '✓' : '✗'}</span>
      <span>{msg}</span>
      <span style={{
        marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 2,
        background: 'var(--panel3)', color: 'var(--dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
      }}>{norm}</span>
    </div>
  );
}

export function ExpertItem({ children, type }: { children: ReactNode; type: 'info' | 'warn' | 'ok' | 'danger' }) {
  const c = type === 'warn'   ? { bg: 'var(--warn-soft)',   border: 'var(--warn-soft)',   dot: 'var(--warn)' }
    :       type === 'ok'     ? { bg: 'var(--safe-soft)',   border: 'var(--safe-soft)',   dot: 'var(--safe)' }
    :       type === 'danger' ? { bg: 'var(--danger-soft)', border: 'var(--danger-soft)', dot: 'var(--danger)' }
    :                           { bg: 'var(--blue-soft)',   border: 'var(--blue-soft)',   dot: 'var(--blue)' };
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
      borderRadius: 3, marginBottom: 6, background: c.bg,
      border: `1px solid ${c.border}`, fontSize: 10, color: 'var(--dim)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 3 }} />
      <span>{children}</span>
    </div>
  );
}

export function FundBtn({ show, onToggle, label, children }: {
  show: boolean; onToggle: () => void; label: string; children: ReactNode;
}) {
  return (
    <>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        background: 'var(--panel)', border: '1px solid var(--copper-soft)',
        color: 'var(--copper)', fontFamily: 'var(--font-mono)',
        fontSize: 10, padding: '8px 12px', borderRadius: 3, cursor: 'pointer', marginBottom: 12,
      }}>
        § Ver Fundamento Técnico — {label}
        <span style={{ marginLeft: 'auto' }}>{show ? '▴' : '▾'}</span>
      </button>
      {show && (
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--line)',
          borderRadius: 4, padding: '14px 16px', fontSize: 10.5,
          color: 'var(--dim)', lineHeight: 1.7, marginBottom: 14,
        }}>
          {children}
        </div>
      )}
    </>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th style={{
      textAlign: 'left', color: 'var(--faint)', textTransform: 'uppercase',
      letterSpacing: '.05em', fontSize: 8.5, padding: '4px 8px',
      borderBottom: '1px solid var(--line)',
    }}>{children}</th>
  );
}

export function TdMono({ children, highlight, style }: { children: ReactNode; highlight?: boolean; style?: CSSProperties }) {
  return (
    <td style={{
      padding: '5px 8px', borderBottom: '1px solid var(--line)',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: highlight ? 'var(--copper)' : 'var(--dim)',
      fontWeight: highlight ? 700 : 400,
      ...style,
    }}>{children}</td>
  );
}
