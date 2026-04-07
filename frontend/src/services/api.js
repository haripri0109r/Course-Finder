import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 1. Find Your Local IP Address
// Run 'ipconfig' in your terminal and look for IPv4 Address: 192.168.X.X
// Use that IP here for mobile/emulator connectivity:
const API_URL = 'http://172.17.1.42:5000/api/v1';

// Production Render URL (Comment out when testing local changes)
// const API_URL = 'https://course-finder-fnxs.onrender.com';

console.log('🚀 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds for cold starts
});

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response?.status === 401 && logoutCallback) {
      console.log('Centralized Auth: Session expired. Logging out...');
      await logoutCallback();
      return Promise.reject(error);
    }

    if (error.response?.status === 503 && !config.__retry) {
      config.__retry = true;
      console.log('Server waking up... retrying in 3s');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return api(config);
    }

    if (!error.response && error.message === 'Network Error') {
      console.log('Network Error: Please check your internet connection.');
    }

    return Promise.reject(error);
  }
);

api.login = (email, password) => api.post('/auth/login', { email, password });
api.register = (payload) => api.post('/auth/register', payload);
api.getMe = () => api.get('/auth/me');
api.getUserProfile = (userId) => api.get(`/auth/profile/${userId}`);

api.getRecentActivity = (page = 1) => api.get(`/completed/recent?page=${page}`);
api.getCompletedCourse = (id) => api.get(`/completed/${id}`);
api.fetchMetadata = (url) => api.post('/courses/fetch-metadata', { url });
api.incrementViewCount = (id) => api.post(`/courses/${id}/view`);

api.likeCompletion = (id) => api.post(`/completed/${id}/like`);
api.unlikeCompletion = (id) => api.post(`/completed/${id}/unlike`);

api.addComment = (id, text) => api.post(`/completed/${id}/comments`, { text });
api.getComments = (id) => api.get(`/completed/${id}/comments`);

api.followUser = (id) => api.post(`/auth/follow/${id}`);
api.unfollowUser = (id) => api.post(`/auth/unfollow/${id}`);

api.getSavedCompletions = () => api.get('/bookmarks');
api.addBookmark = (id) => api.post(`/bookmarks/${id}`);
api.removeBookmark = (id) => api.delete(`/bookmarks/${id}`);

api.getNotifications = () => api.get('/notifications');
api.markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
api.getUnreadCount = () => api.get('/notifications/unread-count');

export default api;
