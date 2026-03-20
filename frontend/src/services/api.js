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
deleteMultiple: (ids) => api.post("/leads/delete-multiple", { ids }),
};
export const statsApi = {
  get: () => api.get("/stats"),
  dashboard: () => api.get("/stats/dashboard"),
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

// ─── STATUSES ─────────────────────────────────────────────────────────────
export const statusesApi = {
  list: () => Promise.resolve({ data: [
    { id: 'nouveau', label: 'Nouveau', color: '#0a84ff' },
    { id: 'en_cours', label: 'En cours', color: '#ff9f0a' },
    { id: 'rappel', label: 'Rappel', color: '#bf5af2' },
    { id: 'interesse', label: 'Intéressé', color: '#30d158' },
    { id: 'vendu', label: 'Vendu', color: '#00c7be' },
    { id: 'pas_interesse', label: 'Pas intéressé', color: '#ff453a' },
    { id: 'sans_reponse', label: 'Sans réponse', color: '#8e8e93' },
  ]}),
};

export const sourcesApi = {
  list: () => api.get("/sources"),
  create: (data) => api.post("/sources", data),
  update: (id, data) => api.put(`/sources/${id}`, data),
  delete: (id) => api.delete(`/sources/${id}`),
};

// ─── REMINDERS ────────────────────────────────────────────────────────────
export const remindersApi = {
  list: () => api.get('/reminders'),
  create: (data) => api.post('/reminders', data),
  update: (id, data) => api.put(`/reminders/${id}`, data),
  delete: (id) => api.delete(`/reminders/${id}`),
};

// ─── LOGIN LOGS ───────────────────────────────────────────────────────────
export const logsApi = {
  list: () => api.get('/logs'),
  create: (data) => api.post('/logs', data),
  clear: () => api.delete('/logs'),
};
