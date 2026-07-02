'use client';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--panel2)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: '4px 10px',
        cursor: 'pointer',
        color: 'var(--dim)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        transition: 'background .15s, color .15s',
        userSelect: 'none',
      }}
    >
      {/* Track */}
      <span style={{
        position: 'relative',
        display: 'inline-block',
        width: 28,
        height: 14,
        background: isDark ? 'var(--panel3)' : 'var(--copper)',
        borderRadius: 7,
        border: '1px solid var(--line)',
        transition: 'background .2s',
        flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute',
          top: 1,
          left: isDark ? 1 : 13,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isDark ? 'var(--faint)' : '#fff',
          transition: 'left .2s',
        }} />
      </span>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{isDark ? '🌙' : '☀️'}</span>
    </button>
  );
}
