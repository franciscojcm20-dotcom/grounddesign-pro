import { API_BASE as BASE } from './apiBase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: 'community' | 'individual' | 'professional';
}

export class ApiError extends Error {
  /** Código HTTP de la respuesta, o undefined si la petición nunca llegó al servidor (red caída, servidor no disponible). */
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.');
  }
  const data = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? 'Error', res.status);
  return data;
}

export const authApi = {
  register: (email: string, name: string, password: string) =>
    apiFetch<{ user: AuthUser }>('/api/v1/auth/register', {
      method: 'POST', body: JSON.stringify({ email, name, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ user: AuthUser }>('/api/v1/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiFetch<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<{ user: AuthUser }>('/api/v1/auth/me'),
};

export const projectApi = {
  list: () =>
    apiFetch<{ projects: Project[] }>('/api/v1/projects'),

  create: (name: string, description?: string) =>
    apiFetch<{ project: Project }>('/api/v1/projects', {
      method: 'POST', body: JSON.stringify({ name, description }),
    }),

  get: (id: string) =>
    apiFetch<{ project: Project; results: CalcResultRow[] }>(`/api/v1/projects/${id}`),

  delete: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/projects/${id}`, { method: 'DELETE' }),

  saveResult: (projectId: string, module: string, inputs: unknown, outputs: unknown, norm?: string) =>
    apiFetch<{ result: CalcResultRow }>(`/api/v1/projects/${projectId}/results`, {
      method: 'POST', body: JSON.stringify({ module, inputs, outputs, norm }),
    }),
};

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalcResultRow {
  id: string;
  project_id: string;
  module: string;
  inputs: unknown;
  outputs: unknown;
  norm: string | null;
  created_at: string;
}
