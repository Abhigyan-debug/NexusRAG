import axios from 'axios';

const api = axios.create({
  baseURL: 'https://nexusrag-qk61.onrender.com/api',
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
    if (error.response?.status === 401) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data: { name: string }) => api.put('/auth/profile', data),
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

    const response = await fetch( 'https://nexusrag-qk61.onrender.com/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, stream: true }),
    });

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
  get: () => api.get('/analytics'),
};

export const knowledgeGraphApi = {
  get: () => api.get('/knowledge-graph'),
};

export default api;
