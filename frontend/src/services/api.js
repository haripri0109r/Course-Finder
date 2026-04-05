import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Render URL - Set to domain root for absolute path handling
const API_URL = 'https://course-finder-backend.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds for cold starts
});

// Request interceptor: add tokens
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handles retries for Render cold starts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry once on network errors or 503/504 (cold start symptoms)
    if (!config || config.__retry || (error.response && error.response.status < 500)) {
      return Promise.reject(error);
    }

    config.__retry = true;

    // Wait 3 seconds before retrying to give the server time to wake up
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return api(config);
  }
);

// AUTH
api.login = (email, password) => api.post('/api/auth/login', { email, password });
api.register = (payload) => api.post('/api/auth/register', payload);
api.getMe = () => api.get('/api/auth/me');
api.getUserProfile = (userId) => api.get(`/api/auth/profile/${userId}`);

// SOCIAL FEED & ACTIVITY
api.getRecentActivity = () => api.get('/api/completed/recent'); 

// LIKES
api.likeCompletion = (id) => api.post(`/api/completed/${id}/like`);
api.unlikeCompletion = (id) => api.post(`/api/completed/${id}/unlike`);

// COMMENTS
api.addComment = (id, text) => api.post(`/api/completed/${id}/comments`, { text });
api.getComments = (id) => api.get(`/api/completed/${id}/comments`);

// FOLLOWS
api.followUser = (id) => api.post(`/api/auth/follow/${id}`);
api.unfollowUser = (id) => api.post(`/api/auth/unfollow/${id}`);

// BOOKMARKS
api.getSavedCompletions = () => api.get('/api/bookmarks');
api.addBookmark = (id) => api.post(`/api/bookmarks/${id}`);
api.removeBookmark = (id) => api.delete(`/api/bookmarks/${id}`);

// NOTIFICATIONS
api.getNotifications = () => api.get('/api/notifications');
api.markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`);
api.getUnreadCount = () => api.get('/api/notifications/unread-count');

export default api;
