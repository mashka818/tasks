import axios from 'axios';
import { getToken, removeUser, getCurrentUser, saveUser } from '../utils/tokenUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Создаем объект для хранения времени последнего использования токена
const tokenState = {
  lastUsed: Date.now(),
  checkingToken: false
};

const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Увеличиваем таймаут для предотвращения ложных ошибок из-за сети
  timeout: 10000
});

// Функция для проверки, не истек ли токен бездействия
const checkTokenInactivity = () => {
  const inactivityPeriod = 30 * 60 * 1000; // 30 минут бездействия
  const now = Date.now();
  
  if (now - tokenState.lastUsed > inactivityPeriod) {
    console.log('Token inactive for too long, cleaning up');
    removeUser();
    return false;
  }
  
  // Обновляем время последнего использования
  tokenState.lastUsed = now;
  return true;
};

// Request interceptor to add auth token to every request
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.log('API Request to:', config.url);
    
    // Проверяем токен на бездействие
    if (token && !checkTokenInactivity()) {
      // Если токен истек из-за бездействия, перенаправляем на страницу логина
      console.log('Token inactive, redirecting to login');
      window.location.href = '/login?expired=true';
      return Promise.reject(new Error('Token inactive'));
    }
    
    console.log('Token available:', token ? 'Yes' : 'No');
    
    if (token) {
      config.headers['x-access-token'] = token;
      console.log('Adding token to request headers');
    } else {
      console.log('No token available, request will be unauthorized');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
instance.interceptors.response.use(
  (response) => {
    // Обновляем время последнего использования токена
    tokenState.lastUsed = Date.now();
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Проверяем, есть ли ответ от сервера
    if (!error.response) {
      console.error('Network error or server down:', error.message);
      return Promise.reject(error);
    }
    
    // Если ошибка связана с истечением срока токена и запрос не пытался обновиться ранее
    if (error.response && 
        (error.response.status === 401 || error.response.status === 403) && 
        !originalRequest._retry && 
        error.response.data?.error === 'jwt expired') {
      
      console.log('Token expired, attempting to refresh');
      originalRequest._retry = true;
      
      try {
        // Динамический импорт для избежания циклических зависимостей
        const authServiceModule = await import('./auth.service');
        const authService = authServiceModule.default;
        
        // Попытка обновить токен
        const newToken = await authService.refreshToken();
        
        if (newToken) {
          console.log('Token refreshed, retrying original request');
          originalRequest.headers['x-access-token'] = newToken;
          return instance(originalRequest);
        } else {
          console.log('Could not refresh token, redirecting to login');
          // Очищаем данные пользователя
          removeUser();
          
          // Перенаправляем на страницу входа
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        // Выполняем выход при ошибке обновления
        removeUser();
        
        // Перенаправляем на страницу входа
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    
    // Обрабатываем другие ошибки авторизации
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Authorization error:', error.response.data);
      
      // Показываем сообщение пользователю о проблеме с авторизацией
      const errorMessage = error.response.data?.message || 'Ошибка авторизации';
      console.log(`Auth error: ${errorMessage}`);
      
      // Если это не страница входа, перенаправляем на неё
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        removeUser();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default instance; 