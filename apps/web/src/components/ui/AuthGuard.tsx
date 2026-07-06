'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SkeletonCard } from './Skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo redirige cuando se confirmó que no hay sesión (401). Un authError
    // (red caída, servidor no disponible) no implica sesión cerrada — mandar
    // al usuario a /login en ese caso lo desloguearía visualmente sin motivo.
    if (!loading && !user && !authError) {
      router.replace('/login');
    }
  }, [user, loading, authError, router]);

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 800 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 480 }}>
        <p style={{ color: 'var(--text-secondary, #94a3b8)' }}>{authError}</p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
