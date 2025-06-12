import axios from 'axios';
import { getCurrentUser, saveUser, removeUser, setupTokenExpiryTimer, updateToken } from '../utils/tokenUtils';
import api from './api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Данные для отслеживания состояния сессии
const sessionState = {
  lastAuth: 0,
  refreshing: false
};

class AuthService {
  async login(username, password) {
    console.log('Attempting login for user:', username);
    try {
      const response = await axios.post(`${API_URL}/auth/signin`, { 
        username, 
        password,
        // Добавляем текущее время к запросу для снижения вероятности кэширования
        _t: Date.now()
      });
      console.log('Login response received:', response.status);
      
      if (response.data.accessToken) {
        console.log('Access token received, saving user data');
        console.log('Token:', response.data.accessToken.substring(0, 20) + '...');
        
        // Получаем время жизни токена из ответа или используем значение по умолчанию
        const tokenExpiry = response.data.tokenExpiry || 7200;
        console.log(`Token expiry set to ${tokenExpiry} seconds`);
        
        // Записываем время последнего получения токена
        sessionState.lastAuth = Date.now();
        sessionState.tokenExpiry = Date.now() + (tokenExpiry * 1000);
        
        // Сохраняем пользователя в localStorage
        saveUser(response.data);
      } else {
        console.log('No access token in response');
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error.message);
      if (error.response) {
        console.error('Server response data:', error.response.data);
      }
      throw error;
    }
  }

  async refreshToken() {
    try {
      // Проверяем, не выполняется ли уже обновление токена
      if (sessionState.refreshing) {
        console.log('Token refresh already in progress');
        return null;
      }
      
      sessionState.refreshing = true;
      console.log('Refreshing token...');
      
      // Получаем текущий токен
      const user = getCurrentUser();
      if (!user || !user.accessToken) {
        console.log('No token available to refresh');
        sessionState.refreshing = false;
        return null;
      }
      
      // Отправляем запрос на обновление токена
      const response = await api.post(`/auth/refresh-token`, { 
        refreshToken: 'refresh' // Используется только для валидации запроса
      });
      
      console.log('Token refresh response received');
      
      if (response.data && response.data.accessToken) {
        console.log('New access token received');
        
        // Обновляем токен в localStorage
        const success = updateToken(
          response.data.accessToken, 
          response.data.tokenExpiry
        );
        
        if (success) {
          console.log('Token refreshed successfully');
          sessionState.lastAuth = Date.now();
          sessionState.refreshing = false;
          return response.data.accessToken;
        }
      }
      
      sessionState.refreshing = false;
      return null;
    } catch (error) {
      console.error('Token refresh error:', error.message);
      if (error.response) {
        console.error('Server response data:', error.response.data);
      }
      
      sessionState.refreshing = false;
      
      // Если обновление токена не удалось из-за ошибки авторизации, выполняем выход
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Authentication error during token refresh, logging out');
        this.logout();
      }
      
      return null;
    }
  }

  logout() {
    console.log('Logging out user');
    removeUser();
    // Сбрасываем состояние сессии
    sessionState.lastAuth = 0;
    sessionState.refreshing = false;
  }

  register(username, email, password, fullName, position, phone) {
    const userData = {
      username,
      email,
      password,
      fullName,
      position,
      phone
    };
    return axios.post(`${API_URL}/auth/signup`, userData);
  }

  getCurrentUser() {
    const user = getCurrentUser();
    console.log('Getting current user:', user ? `${user.username} (ID: ${user.id})` : 'No user found');
    if (user) {
      console.log('User has token:', !!user.accessToken);
    }
    return user;
  }

  getAuthHeader() {
    const user = this.getCurrentUser();
    if (user && user.accessToken) {
      // Ensure the token is properly formatted
      return { 'x-access-token': user.accessToken };
    } else {
      return {};
    }
  }
  
  // Метод для проверки токена
  async checkToken() {
    try {
      console.log('Checking token validity...');
      
      // Проверяем, есть ли токен вообще
      const user = getCurrentUser();
      if (!user || !user.accessToken) {
        console.log('No token available to check');
        return { valid: false, error: 'no_token' };
      }
      
      // Добавляем текущее время, чтобы избежать кэширования
      const response = await api.get(`/debug/check-token?t=${Date.now()}`);
      console.log('Token check response:', response.data);
      
      // Если токен валиден, запускаем таймер проверки истечения
      if (response.data && response.data.message === 'Токен действителен') {
        setupTokenExpiryTimer();
      }
      
      return { valid: true, data: response.data };
    } catch (error) {
      console.error('Token check failed:', error.message);
      
      // If error is due to unauthorized or token expiration
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token is invalid or expired');
        // Clear the invalid token
        removeUser();
      }
      
      return { valid: false, error: error.message };
    }
  }
  
  // Метод для проверки срока сессии
  isSessionValid() {
    const user = getCurrentUser();
    if (!user || !user.accessToken) {
      return false;
    }
    
    // Если прошло более 2 часов с момента входа, считаем сессию недействительной
    const sessionDuration = 2 * 60 * 60 * 1000; // 2 часа
    const now = Date.now();
    const sessionElapsed = now - sessionState.lastAuth;
    
    return sessionState.lastAuth > 0 && sessionElapsed < sessionDuration;
  }

  // Метод для сброса пароля
  async resetPassword(email, newPassword) {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error.message);
      if (error.response) {
        console.error('Server response data:', error.response.data);
      }
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService; 