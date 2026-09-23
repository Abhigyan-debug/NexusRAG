import axios from 'axios';
import { useAuthStore } from '../store';
import type { AnalyticsRange } from '../types';

// Override with VITE_API_URL (e.g. http://localhost:5000/api) for local development.
// The "/api" suffix is added if missing, since every backend route lives under it.
function resolveApiBase(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
const API_BASE = resolveApiBase(import.meta.env.VITE_API_URL || 'https://nexusrag-qk61.onrender.com/api');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const settingsStr = localStorage.getItem('nexus-app-settings');
  if (settingsStr) {
    try {
      const settings = JSON.parse(settingsStr).state;
      if (settings.apiKey) config.headers['X-API-Key'] = settings.apiKey;
      if (settings.aiModel) config.headers['X-AI-Model'] = settings.aiModel;
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 429 && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = Math.pow(2, config._retryCount) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }
    // A 401 on the login request just means bad credentials; anywhere else the session is gone
    const url: string = config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/logout')) {
      // Clears the persisted auth store too, so ProtectedRoute redirects to /login
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; otp?: string }) =>
    api.post('/auth/login', data),
  // The token is passed explicitly because the store is cleared right after this call
  logout: (token: string) =>
    api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } }),
  refresh: () => api.post('/auth/refresh'),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data: { name: string }) => api.put('/auth/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/password', data),
  deleteAccount: (password: string) => api.delete('/auth/account', { data: { password } }),
  sessions: () => api.get('/auth/sessions'),
  revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
  revokeOtherSessions: () => api.post('/auth/sessions/revoke-others'),
  twoFactorSetup: () => api.post('/auth/2fa/setup'),
  twoFactorEnable: (code: string) => api.post('/auth/2fa/enable', { code }),
  twoFactorDisable: (password: string, code: string) => api.post('/auth/2fa/disable', { password, code }),
  regenerateRecoveryCodes: (code: string) => api.post('/auth/2fa/recovery-codes', { code }),
};

export const documentsApi = {
  upload: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/documents'),
  get: (id: number) => api.get(`/documents/${id}`),
  delete: (id: number) => api.delete(`/documents/${id}`),
  summarize: (id: number, type: string) =>
    api.post(`/documents/${id}/summarize`, { type }),
};

export const chatApi = {
  send: (data: {
    message: string;
    chat_id?: number;
    document_ids?: number[];
    stream?: boolean;
  }) => api.post('/chat', { ...data, stream: false }),

  sendStream: async function* (
    data: { message: string; chat_id?: number; document_ids?: number[] }
  ) {
    const token = localStorage.getItem('nexus_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    
    const settingsStr = localStorage.getItem('nexus-app-settings');
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr).state;
        if (settings.apiKey) headers['X-API-Key'] = settings.apiKey;
        if (settings.aiModel) headers['X-AI-Model'] = settings.aiModel;
      } catch {}
    }

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 401) useAuthStore.getState().logout();
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {
        /* non-JSON error body */
      }
      const err = new Error(message) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6));
          } catch {
            /* skip malformed */
          }
        }
      }
    }
  },

  history: () => api.get('/chat/history'),
  getChat: (id: number) => api.get(`/chat/${id}`),
  search: (query: string, top_k?: number) =>
    api.post('/chat/search', { query, top_k }),
  research: (type: string, document_ids?: number[]) =>
    api.post('/chat/research', { type, document_ids }),
};

export const analyticsApi = {
  get: (range: AnalyticsRange = '7d') =>
    api.get('/analytics', { params: { range, tz: new Date().getTimezoneOffset() } }),
  activity: (limit = 10, offset = 0) => api.get('/analytics/activity', { params: { limit, offset } }),
};

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  sessions: (params: { status: string; q?: string; page?: number; per_page?: number }) =>
    api.get('/admin/sessions', { params }),
  revokeSession: (id: string) => api.delete(`/admin/sessions/${id}`),
};

export const knowledgeGraphApi = {
  get: () => api.get('/knowledge-graph'),
};

export default api;
