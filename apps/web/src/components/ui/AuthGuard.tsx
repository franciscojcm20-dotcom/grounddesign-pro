'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 10, color: 'var(--faint)', fontSize: 11,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)' }}>⏚</span>
        Cargando…
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
