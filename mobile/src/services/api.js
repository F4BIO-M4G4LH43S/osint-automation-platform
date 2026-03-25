import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// API Configuration
const API_BASE_URL = 'https://your-api-server.com/api/v1'
// For development: 'http://localhost:8000/api/v1'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config

    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token')
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        
        const { token } = response.data
        await AsyncStorage.setItem('auth_token', token)
        
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user'])
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error.response?.data || error.message)
  }
)

// API Endpoints
export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
}

export const dashboardApi = {
  getStats: (timeRange = '7d') => apiClient.get(`/dashboard/stats?range=${timeRange}`),
  getMobileStats: () => apiClient.get('/dashboard/stats/mobile'),
  getThreats: () => apiClient.get('/dashboard/threats'),
  getRecentScans: (limit = 5) => apiClient.get(`/scans/recent?limit=${limit}`),
  getRecentAlerts: (limit = 10) => apiClient.get(`/alerts/recent?limit=${limit}`),
}

export const scansApi = {
  getAll: (params) => apiClient.get('/scans', { params }),
  getById: (id) => apiClient.get(`/scans/${id}`),
  create: (data) => apiClient.post('/scans', data),
  cancel: (id) => apiClient.post(`/scans/${id}/cancel`),
  delete: (id) => apiClient.delete(`/scans/${id}`),
  getResults: (id) => apiClient.get(`/scans/${id}/results`),
  export: (id, format) => apiClient.get(`/scans/${id}/export?format=${format}`, {
    responseType: 'blob',
  }),
}

export const targetsApi = {
  getAll: () => apiClient.get('/targets'),
  getById: (id) => apiClient.get(`/targets/${id}`),
  create: (data) => apiClient.post('/targets', data),
  update: (id, data) => apiClient.put(`/targets/${id}`, data),
  delete: (id) => apiClient.delete(`/targets/${id}`),
  getHistory: (id) => apiClient.get(`/targets/${id}/history`),
}

export const wordpressApi = {
  scan: (target, options) => apiClient.post('/wordpress/scan', { target, ...options }),
  getVulnerabilities: () => apiClient.get('/wordpress/vulnerabilities'),
}

export const notificationsApi = {
  getAll: () => apiClient.get('/notifications'),
  markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.put('/notifications/read-all'),
  getSettings: () => apiClient.get('/notifications/settings'),
  updateSettings: (settings) => apiClient.put('/notifications/settings', settings),
  registerPushToken: (token) => apiClient.post('/notifications/push-token', { token }),
}

export default apiClient
