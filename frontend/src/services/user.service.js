import api from './api';

class UserService {
  // Get all users (for admin purposes only)
  async getAllUsers() {
    const response = await api.get('/admin/users');
    return response.data;
  }

  // Search users by query
  async searchUsers(query, retryCount = 0) {
    try {
      // Проверяем, не пустой ли запрос
      if (!query || !query.trim()) {
        return []; // Возвращаем пустой массив вместо ошибки
      }
      
      // Проверяем минимальную длину запроса
      if (query.trim().length < 2) {
        console.log('Search query too short, minimum 2 characters required');
        return []; // Возвращаем пустой массив для коротких запросов
      }
      
      // Подготавливаем запрос
      const searchQuery = query.trim();
      console.log('Preparing search with query:', searchQuery);
      
      try {
        // Отправляем POST запрос вместо GET
        const response = await api.post(`/admin/users/search`, 
          { query: searchQuery },
          { timeout: 30000 } // Увеличиваем таймаут для поисковых запросов
        );
        
        // Проверяем тип ответа - должен быть массив
        if (Array.isArray(response.data)) {
          console.log('Received valid array response, length:', response.data.length);
          return response.data;
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          console.log('Received results in data object, length:', response.data.results.length);
          return response.data.results;
        } else {
          console.log('Received non-array response:', response.data);
          // Если получили не массив, возвращаем пустой массив вместо ошибки
          return [];
        }
      } catch (requestError) {
        console.error('Error in searchUsers service:', requestError);
        
        // Выводим больше деталей об ошибке
        if (requestError.response) {
          console.log('Response status:', requestError.response.status);
          console.log('Response data:', requestError.response.data);
        }
        
        // Если это ошибка сервера (500) и у нас есть еще попытки, пробуем снова
        if (requestError.response && requestError.response.status === 500 && retryCount < 3) {
          console.log(`Retry attempt ${retryCount + 1} for search query`);
          
          // Увеличиваем задержку перед повторными попытками
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
          
          // Рекурсивно вызываем себя с увеличенным счетчиком повторов
          return this.searchUsers(query, retryCount + 1);
        }
        
        // Если все попытки исчерпаны или это не ошибка 500, возвращаем пустой массив
        return [];
      }
    } catch (error) {
      console.error('Global error in searchUsers service:', error);
      return []; // Возвращаем пустой массив при любой ошибке
    }
  }

  // Get user details by ID
  async getUserById(id) {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  }

  // Update user roles
  async updateUserRoles(userId, roles) {
    const response = await api.put(`/admin/users/${userId}/roles`, { roles });
    return response.data;
  }

  // Update user status (active/inactive)
  async updateUserStatus(userId, isActive) {
    const response = await api.put(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  }

  // Upload profile image
  async uploadProfileImage(imageFile) {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    
    const response = await api.post('/user/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  // Get all workers (for task assignment)
  async getAllWorkers() {
    const response = await api.get('/workers');
    return response.data;
  }

  // Search workers by name, username, or position
  async searchWorkers(query) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      
      const response = await api.get(`/workers/search?query=${encodeURIComponent(query.trim())}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error searching workers:', error);
      return [];
    }
  }

  // Get all managers
  async getAllManagers() {
    const response = await api.get('/admin/managers');
    return response.data;
  }
}

export default new UserService(); 