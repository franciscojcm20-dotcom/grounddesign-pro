import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function Probe() {
  const { user, loading, authError } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <div data-testid="error">{authError ?? 'none'}</div>
    </div>
  );
}

describe('AuthContext — distinción entre "no autenticado" (401) y "no se pudo verificar" (red/servidor)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('un 401 en /auth/me se interpreta como sesión no iniciada (user=null, sin error)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 401, json: () => Promise.resolve({ error: 'No autorizado' }),
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('una falla de red en /auth/me NO se interpreta como "sin sesión" — expone authError en vez de desloguear', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('error').textContent).not.toBe('none'));
    expect(screen.getByTestId('error').textContent).toContain('No se pudo conectar');
  });

  it('un error 500 en /auth/me tampoco desloguea — expone el mensaje del servidor como authError', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500, json: () => Promise.resolve({ error: 'Error interno' }),
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Error interno'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('me() exitoso deja al usuario autenticado', async () => {
    const user = { id: '1', email: 'a@a.com', name: 'A', plan: 'community' as const };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ user }) });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@a.com'));
  });
});
