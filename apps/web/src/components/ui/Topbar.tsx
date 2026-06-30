export function Topbar() {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', height: 44,
      padding: '0 16px', borderBottom: '1px solid var(--line)',
      background: 'linear-gradient(180deg,#141820,#0f1117)',
      gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <path d="M11 2L11 12" stroke="#E07A23" strokeWidth="1.8"/>
          <path d="M5 12L17 12" stroke="#E07A23" strokeWidth="2.2"/>
          <path d="M7 15.5L15 15.5" stroke="#E07A23" strokeWidth="1.4" opacity=".7"/>
          <path d="M9 19L13 19" stroke="#E07A23" strokeWidth="1" opacity=".45"/>
          <circle cx="11" cy="2" r="1.5" fill="#E07A23"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em' }}>
          GroundDesign<span style={{ color: 'var(--copper)' }}>Pro</span>
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }} />

      {/* Breadcrumb placeholder */}
      <span style={{ fontSize: 10, color: 'var(--faint)' }}>
        Proyecto demo · IEEE Std 80-2013
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 8.5, padding: '2px 7px', borderRadius: 10,
          background: '#1e2a1e', border: '1px solid #22c55e44', color: 'var(--safe)',
        }}>PROFESSIONAL</span>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--copper-soft)', border: '1px solid var(--copper)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'var(--copper)',
        }}>CR</div>
      </div>
    </header>
  );
}
