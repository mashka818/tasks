const db = require('../models');
const User = db.user;
const Role = db.role;
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');

/**
 * Сервис для управления аутентификацией и авторизацией
 */
class AuthService {
  /**
   * Регистрация нового пользователя
   * @param {Object} userData - Данные пользователя
   * @param {Array} roles - Массив ролей пользователя
   * @returns {Object} - Созданный пользователь
   */
  async signup(userData, roles = []) {
    try {
      // Хеширование пароля
      const hashedPassword = await argon2.hash(userData.password);
      
      // Создание пользователя
      const user = await User.create({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        phone: userData.phone,
        position: userData.position
      });
      
      // Назначение ролей
      if (roles && roles.length > 0) {
        const userRoles = await Role.findAll({
          where: {
            name: {
              [db.Sequelize.Op.or]: roles
            }
          }
        });
        await user.setRoles(userRoles);
      } else {
        // По умолчанию назначаем роль "worker"
        const defaultRole = await Role.findOne({
          where: { name: 'worker' }
        });
        await user.setRoles([defaultRole]);
      }
      
      return user;
    } catch (error) {
      throw new Error(`Ошибка при регистрации пользователя: ${error.message}`);
    }
  }
  
  /**
   * Аутентификация пользователя
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль пользователя
   * @returns {Object} - Данные пользователя с JWT токеном
   */
  async signin(username, password) {
    try {
      // Поиск пользователя
      const user = await User.findOne({
        where: { username }
      });
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      // Проверка пароля
      const passwordIsValid = await argon2.verify(user.password, password);
      
      if (!passwordIsValid) {
        throw new Error('Неверный пароль');
      }
      
      // Получаем срок действия токена из конфигурации
      const tokenExpiry = config.jwtExpiration;
      
      // Создание JWT токена
      const token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: tokenExpiry
      });
      
      // Получение ролей пользователя
      const roles = await user.getRoles();
      console.log('User roles from DB:', roles.map(role => role.name));
      const authorities = roles.map(role => `ROLE_${role.name.toUpperCase()}`);
      console.log('Authorities sent to client:', authorities);
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        position: user.position,
        profileImage: user.profileImage,
        roles: authorities,
        accessToken: token,
        tokenExpiry: tokenExpiry
      };
    } catch (error) {
      throw new Error(`Ошибка при аутентификации: ${error.message}`);
    }
  }
  
  /**
   * Проверка наличия пользователя с таким именем или email
   * @param {string} username - Имя пользователя
   * @param {string} email - Email пользователя
   * @returns {boolean} - Существует ли пользователь
   */
  async checkDuplicateUser(username, email) {
    try {
      // Проверка username
      const userByUsername = await User.findOne({
        where: { username }
      });
      
      if (userByUsername) {
        throw new Error('Имя пользователя уже используется');
      }
      
      // Проверка email
      const userByEmail = await User.findOne({
        where: { email }
      });
      
      if (userByEmail) {
        throw new Error('Email уже используется');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Проверка существования ролей
   * @param {Array} roles - Массив названий ролей
   * @returns {boolean} - Существуют ли все роли
   */
  checkRolesExisted(roles) {
    for (let i = 0; i < roles.length; i++) {
      if (!db.ROLES.includes(roles[i])) {
        throw new Error(`Роль ${roles[i]} не существует`);
      }
    }
    return true;
  }
}

module.exports = new AuthService(); 