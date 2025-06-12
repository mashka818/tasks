const db = require('../models');
const User = db.user;
const Role = db.role;
const argon2 = require('argon2');

/**
 * Сервис для управления пользователями
 */
class UserService {
  /**
   * Получение всех пользователей
   * @returns {Array} - Массив пользователей
   */
  async getAllUsers() {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }]
      });
      return users;
    } catch (error) {
      throw new Error(`Ошибка при получении пользователей: ${error.message}`);
    }
  }
  
  /**
   * Получение пользователя по ID
   * @param {number} userId - ID пользователя
   * @returns {Object} - Данные пользователя
   */
  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }]
      });
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      return user;
    } catch (error) {
      throw new Error(`Ошибка при получении пользователя: ${error.message}`);
    }
  }
  
  /**
   * Обновление данных пользователя
   * @param {number} userId - ID пользователя
   * @param {Object} userData - Новые данные пользователя
   * @param {Array} roles - Новые роли пользователя (опционально)
   * @returns {boolean} - Успешно ли обновление
   */
  async updateUser(userId, userData, roles = null) {
    try {
      // Проверяем, существует ли пользователь
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      // Подготавливаем данные для обновления
      const updateData = { ...userData };
      
      // Если передан пароль, хешируем его
      if (userData.password) {
        updateData.password = await argon2.hash(userData.password);
      }
      
      // Обновляем пользователя
      await User.update(updateData, {
        where: { id: userId }
      });
      
      // Обновляем роли, если они переданы
      if (roles && roles.length > 0) {
        const userRoles = await Role.findAll({
          where: {
            name: {
              [db.Sequelize.Op.or]: roles
            }
          }
        });
        
        const userToUpdate = await User.findByPk(userId);
        await userToUpdate.setRoles(userRoles);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при обновлении пользователя: ${error.message}`);
    }
  }
  
  /**
   * Удаление пользователя
   * @param {number} userId - ID пользователя
   * @returns {boolean} - Успешно ли удаление
   */
  async deleteUser(userId) {
    try {
      const result = await User.destroy({ where: { id: userId } });
      
      if (result === 0) {
        throw new Error('Пользователь не найден');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при удалении пользователя: ${error.message}`);
    }
  }
  
  /**
   * Обновление собственного профиля пользователя
   * @param {number} userId - ID пользователя
   * @param {string} email - Новый email (опционально)
   * @param {string} password - Новый пароль (опционально)
   * @returns {boolean} - Успешно ли обновление
   */
  async updateUserProfile(userId, email, password) {
    try {
      // Проверяем, существует ли пользователь
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      // Подготавливаем данные для обновления
      const updateData = {};
      
      if (email) updateData.email = email;
      if (password) updateData.password = await argon2.hash(password);
      
      // Обновляем пользователя
      await User.update(updateData, {
        where: { id: userId }
      });
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при обновлении профиля: ${error.message}`);
    }
  }
  
  /**
   * Проверка, имеет ли пользователь указанную роль
   * @param {number} userId - ID пользователя
   * @param {string} roleName - Название роли
   * @returns {boolean} - Имеет ли пользователь роль
   */
  async hasRole(userId, roleName) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      const roles = await user.getRoles();
      return roles.some(role => role.name === roleName);
    } catch (error) {
      throw new Error(`Ошибка при проверке роли: ${error.message}`);
    }
  }
}

module.exports = new UserService(); 