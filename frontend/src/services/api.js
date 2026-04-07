import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Render URL - Set to domain root for absolute path handling
const API_URL = 'https://course-finder-fnxs.onrender.com';

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

let logoutCallback = null;

api.onUnauthorized = (cb) => {
  logoutCallback = cb;
};

// Response interceptor: handles retries for Render cold starts and global errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Handle 401 Unauthorized (Auto-Logout)
    if (error.response?.status === 401 && logoutCallback) {
      console.log('Centralized Auth: Session expired. Logging out...');
      await logoutCallback();
      return Promise.reject(error);
    }

    // Handle 503 Service Unavailable (Render Cold Start or Maintenance)
    if (error.response?.status === 503 && !config.__retry) {
      config.__retry = true;
      console.log('Server waking up... retrying in 3s');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return api(config);
    }

    // Handle Network Errors (Offline)
    if (!error.response && error.message === 'Network Error') {
      console.log('Network Error: Please check your internet connection.');
    }

    return Promise.reject(error);
  }
);

// AUTH
api.login = (email, password) => api.post('/api/v1/auth/login', { email, password });
api.register = (payload) => api.post('/api/v1/auth/register', payload);
api.getMe = () => api.get('/api/v1/auth/me');
api.getUserProfile = (userId) => api.get(`/api/v1/auth/profile/${userId}`);

// SOCIAL FEED & ACTIVITY
api.getRecentActivity = (page = 1) => api.get(`/api/v1/completed/recent?page=${page}`);
api.getCompletedCourse = (id) => api.get(`/api/v1/completed/${id}`);

// LIKES
api.likeCompletion = (id) => api.post(`/api/v1/completed/${id}/like`);
api.unlikeCompletion = (id) => api.post(`/api/v1/completed/${id}/unlike`);

// COMMENTS
api.addComment = (id, text) => api.post(`/api/v1/completed/${id}/comments`, { text });
api.getComments = (id) => api.get(`/api/v1/completed/${id}/comments`);

// FOLLOWS
api.followUser = (id) => api.post(`/api/v1/auth/follow/${id}`);
api.unfollowUser = (id) => api.post(`/api/v1/auth/unfollow/${id}`);

// BOOKMARKS
api.getSavedCompletions = () => api.get('/api/v1/bookmarks');
api.addBookmark = (id) => api.post(`/api/v1/bookmarks/${id}`);
api.removeBookmark = (id) => api.delete(`/api/v1/bookmarks/${id}`);

// NOTIFICATIONS
api.getNotifications = () => api.get('/api/v1/notifications');
api.markNotificationRead = (id) => api.patch(`/api/v1/notifications/${id}/read`);
api.getUnreadCount = () => api.get('/api/v1/notifications/unread-count');

export default api;
