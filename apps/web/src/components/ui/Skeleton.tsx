'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 14, radius = 3, style }: SkeletonProps) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--panel) 25%, var(--panel2) 50%, var(--panel) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, padding: '14px 16px' }}>
      <Skeleton height={10} width="40%" style={{ marginBottom: 8 }} />
      <Skeleton height={16} width="70%" style={{ marginBottom: 10 }} />
      <Skeleton height={10} width="90%" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
      <Skeleton width={32} height={32} radius={16} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={11} width="50%" />
        <Skeleton height={9} width="30%" />
      </div>
      <Skeleton height={9} width={60} />
    </div>
  );
}
