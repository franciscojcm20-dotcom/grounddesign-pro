import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { AuthProvider } from '@/context/AuthContext';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

describe('AuthGuard — protege rutas de /platform según el estado de auth', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    replaceMock.mockClear();
    vi.restoreAllMocks();
  });

  it('sin sesión (401), redirige a /login y no renderiza el contenido protegido', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });

    render(
      <AuthProvider>
        <AuthGuard><div>contenido protegido</div></AuthGuard>
      </AuthProvider>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
  });

  it('con sesión activa, renderiza el contenido y no redirige', async () => {
    const user = { id: '1', email: 'a@a.com', name: 'A', plan: 'community' as const };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ user }) });

    render(
      <AuthProvider>
        <AuthGuard><div>contenido protegido</div></AuthGuard>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('contenido protegido')).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('con un error de red (no 401), NO redirige — muestra el error en vez de confundirlo con "sesión cerrada"', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    render(
      <AuthProvider>
        <AuthGuard><div>contenido protegido</div></AuthGuard>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText(/No se pudo conectar/)).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
  });
});
