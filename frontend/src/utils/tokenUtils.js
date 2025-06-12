/**
 * Utility functions for handling authentication tokens
 */

// Глобальный объект для хранения информации о токене
const tokenInfo = {
  tokenTimer: null,
  tokenRefreshTimer: null,
  tokenExpiryWarningShown: false,
};

/**
 * Get the current user from localStorage
 * @returns {Object|null} The user object or null if not found
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }
  return null;
};

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The token or null if not found
 */
export const getToken = () => {
  const user = getCurrentUser();
  return user?.accessToken || null;
};

/**
 * Save user data (including token) to localStorage
 * @param {Object} userData The user data to save
 */
export const saveUser = (userData) => {
  if (userData) {
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Устанавливаем таймер для проверки срока действия токена
    // и предупреждения пользователя перед истечением
    setupTokenExpiryTimer(userData.tokenExpiry);
  }
};

/**
 * Remove user data and token from localStorage
 */
export const removeUser = () => {
  localStorage.removeItem('user');
  clearTokenTimers();
};

/**
 * Update token in axios headers
 * @param {Object} api The axios instance
 * @param {string} token The token to set
 */
export const setAuthHeader = (api, token) => {
  if (token) {
    api.defaults.headers.common['x-access-token'] = token;
  } else {
    delete api.defaults.headers.common['x-access-token'];
  }
};

/**
 * Обновляет только токен пользователя, сохраняя остальные данные
 * @param {string} newToken Новый токен доступа
 * @param {number} tokenExpiry Срок действия нового токена в секундах
 */
export const updateToken = (newToken, tokenExpiry) => {
  const user = getCurrentUser();
  if (user && newToken) {
    user.accessToken = newToken;
    
    // Сохраняем информацию о сроке действия токена, если она предоставлена
    if (tokenExpiry) {
      user.tokenExpiry = tokenExpiry;
    }
    
    localStorage.setItem('user', JSON.stringify(user));
    
    // Обновляем таймеры для нового токена
    setupTokenExpiryTimer(tokenExpiry);
    
    console.log('Token updated successfully');
    return true;
  }
  return false;
};

/**
 * Настройка таймера для проверки срока истечения токена
 * @param {number} tokenExpirySeconds Срок действия токена в секундах
 */
export const setupTokenExpiryTimer = (tokenExpirySeconds) => {
  // Очищаем предыдущий таймер, если он был
  clearTokenTimers();
  
  // Получаем срок действия токена из параметра или используем значение по умолчанию
  const tokenLifetime = (tokenExpirySeconds || 7200) * 1000; // в миллисекундах
  
  console.log(`Setting up token expiry timer for ${tokenLifetime/1000} seconds`);
  
  // Время предупреждения - за 5 минут до истечения
  const warningBeforeExpiry = 5 * 60 * 1000; // 5 минут
  
  // Время для обновления токена - за 10 минут до истечения
  const refreshBeforeExpiry = 10 * 60 * 1000; // 10 минут
  
  // Устанавливаем таймер для автоматического обновления токена
  if (tokenLifetime > refreshBeforeExpiry) {
    tokenInfo.tokenRefreshTimer = setTimeout(() => {
      console.log('Attempting to refresh token before expiry');
      // Импортируем сервис аутентификации динамически чтобы избежать циклических зависимостей
      import('../services/auth.service').then(module => {
        const authService = module.default;
        authService.refreshToken();
      });
    }, tokenLifetime - refreshBeforeExpiry);
  }
  
  // Устанавливаем таймер для предупреждения
  if (tokenLifetime > warningBeforeExpiry) {
    tokenInfo.tokenTimer = setTimeout(() => {
      // Предупреждаем пользователя об истечении срока токена
      if (!tokenInfo.tokenExpiryWarningShown) {
        console.log('Token will expire soon, user should re-login');
        // Показываем системное уведомление, если возможно
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Предупреждение о сессии', {
            body: 'Ваша сессия скоро истечет. Пожалуйста, сохраните данные и войдите заново.',
          });
        }
        
        // Отмечаем, что предупреждение показано
        tokenInfo.tokenExpiryWarningShown = true;
      }
    }, tokenLifetime - warningBeforeExpiry);
  }
};

/**
 * Очистка всех таймеров, связанных с токеном
 */
export const clearTokenTimers = () => {
  if (tokenInfo.tokenTimer) {
    clearTimeout(tokenInfo.tokenTimer);
    tokenInfo.tokenTimer = null;
  }
  
  if (tokenInfo.tokenRefreshTimer) {
    clearTimeout(tokenInfo.tokenRefreshTimer);
    tokenInfo.tokenRefreshTimer = null;
  }
  
  tokenInfo.tokenExpiryWarningShown = false;
};

/**
 * Обновляет объект пользователя с новыми данными, сохраняя существующий токен
 * @param {Object} userUpdate - Новые данные пользователя
 */
export const updateUserData = (userUpdate) => {
  const currentUser = getCurrentUser();
  if (currentUser && userUpdate) {
    // Сохраняем текущий токен
    const updatedUser = {
      ...currentUser,
      ...userUpdate,
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }
}; 