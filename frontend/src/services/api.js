import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Injecter le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gérer les erreurs 401 globalement
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // If a token-based auth is in use, clear and redirect.
      // In frontend-only/local mode we don't set `crm_token`, so keep local user.
      if (localStorage.getItem('crm_token')){
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── USERS ────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── GROUPS ───────────────────────────────────────────────────────────────
export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
};

// ─── LEADS ────────────────────────────────────────────────────────────────
export const leadsApi = {
  list: (params) => api.get('/leads', { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  importCSV: (formData) => api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  addComment: (id, note) => api.post(`/leads/${id}/comments`, { note }),
};

// ─── STATS ────────────────────────────────────────────────────────────────
export const statsApi = {
  get: (params) => api.get('/stats', { params }),
};

// ─── SECURITY (admin only) ────────────────────────────────────────────────
export const securityApi = {
  // IP Whitelist
  getIPs:    ()         => api.get('/security/ips'),
  addIP:     (data)     => api.post('/security/ips', data),
  updateIP:  (id, data) => api.put(`/security/ips/${id}`, data),
  deleteIP:  (id)       => api.delete(`/security/ips/${id}`),
  // Mon IP
  getMyIP:   ()         => api.get('/security/myip'),
  // Logs
  getLogs:   (params)   => api.get('/security/logs', { params }),
};

export default api;
