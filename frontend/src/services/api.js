import axios from 'axios';

// Support both single-origin ('/api') and separate-service deployment (e.g. VITE_API_URL=https://my-backend.onrender.com/api)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // Ensures cookies are automatically included with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  login: async ({ username, password }) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const universalSearchAPI = {
  search: async (query = '') => {
    const response = await api.get('/universal-search', {
      params: { q: (query || '').trim() },
    });
    return response.data;
  },
};

export const familyAPI = {
  getNextId: async () => {
    const response = await api.get('/families/next-id');
    return response.data;
  },
  registerHead: async (data) => {
    const response = await api.post('/families', data);
    return response.data;
  },
  getAll: async (search = '') => {
    const response = await api.get('/families', {
      params: { search: search.trim() },
    });
    return response.data;
  },
  getById: async (familyId) => {
    const response = await api.get(`/families/${familyId}`);
    return response.data;
  },
  update: async (familyId, data) => {
    const response = await api.put(`/families/${familyId}`, data);
    return response.data;
  },
  delete: async (familyId) => {
    const response = await api.delete(`/families/${familyId}`);
    return response.data;
  },
};

export const masterDataAPI = {
  getItems: async (type = '', search = '', page = 1, limit = 10) => {
    const response = await api.get('/master-data', {
      params: {
        type,
        search: (search || '').trim(),
        page,
        limit,
      },
    });
    return response.data;
  },
  addItem: async (data) => {
    const response = await api.post('/master-data', data);
    return response.data;
  },
  updateItem: async (id, data) => {
    const response = await api.put(`/master-data/${id}`, data);
    return response.data;
  },
  deleteItem: async (id) => {
    const response = await api.delete(`/master-data/${id}`);
    return response.data;
  },
};

export const patientAPI = {
  addMember: async (data) => {
    const response = await api.post('/patients', data);
    return response.data;
  },
  getAll: async (search = '', familyId = '') => {
    const response = await api.get('/patients', {
      params: { search: (search || '').trim(), familyId: (familyId || '').trim() },
    });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  },
};

export const visitAPI = {
  create: async (data) => {
    const response = await api.post('/visits', data);
    return response.data;
  },
  getByPatient: async (patientId) => {
    const response = await api.get('/visits', {
      params: { patientId },
    });
    return response.data;
  },
  getByFamily: async (familyId) => {
    const response = await api.get('/visits', {
      params: { familyId },
    });
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/visits/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/visits/${id}`);
    return response.data;
  },
};

export const reportAPI = {
  getDashboardSummary: async (params = {}) => {
    const response = await api.get('/reports/dashboard-summary', { params });
    return response.data;
  },
  getAreaWise: async (params = {}) => {
    const response = await api.get('/reports/area-wise', { params });
    return response.data;
  },
  getRefDoctor: async (params = {}) => {
    const response = await api.get('/reports/ref-doctor', { params });
    return response.data;
  },
  getPatientHistory: async (params = {}) => {
    const response = await api.get('/reports/patient-history', { params });
    return response.data;
  },
  getDailyCollections: async (params = {}) => {
    const response = await api.get('/reports/daily-collections', { params });
    return response.data;
  },
  getMonthlyIncome: async (params = {}) => {
    const response = await api.get('/reports/monthly-income', { params });
    return response.data;
  },
  getDues: async (params = {}) => {
    const response = await api.get('/reports/dues', { params });
    return response.data;
  },
};

export const certificateAPI = {
  getNextId: async () => {
    const response = await api.get('/certificates/next-id');
    return response.data;
  },
  getTemplates: async () => {
    const response = await api.get('/certificates/templates');
    return response.data;
  },
  createTemplate: async (data) => {
    const response = await api.post('/certificates/templates', data);
    return response.data;
  },
  getAll: async (search = '', page = 1, limit = 10) => {
    const response = await api.get('/certificates', {
      params: { search: (search || '').trim(), page, limit },
    });
    return response.data;
  },
  issue: async (data) => {
    const response = await api.post('/certificates', data);
    return response.data;
  },
  verify: async (certId) => {
    const response = await api.get(`/certificates/verify/${certId}`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/certificates/${id}`);
    return response.data;
  },
};

export const labReportAPI = {
  create: async (data) => {
    const response = await api.post('/lab-reports', data);
    return response.data;
  },
  getAll: async (params = {}) => {
    const response = await api.get('/lab-reports', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/lab-reports/${id}`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/lab-reports/${id}`);
    return response.data;
  },
};

export default api;
