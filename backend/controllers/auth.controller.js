const { authService } = require('../services');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const db = require('../models');
const argon2 = require('argon2');

exports.signup = async (req, res) => {
  try {
    console.log('Signup attempt with data:', {
      username: req.body.username,
      email: req.body.email,
      fullName: req.body.fullName,
      position: req.body.position,
      phone: req.body.phone,
      roles: req.body.roles
    });
    
    // Проверка наличия пользователя с таким именем или email
    await authService.checkDuplicateUser(req.body.username, req.body.email);
    
    // Проверка ролей, если они переданы
    if (req.body.roles) {
      authService.checkRolesExisted(req.body.roles);
    }
    
    // Регистрация пользователя
    await authService.signup(req.body, req.body.roles);
    
    return res.status(201).send({ 
      message: 'Пользователь успешно зарегистрирован!' 
    });
  } catch (err) {
    console.error('Error during signup:', err);
    return res.status(500).send({ message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    // Аутентификация пользователя
    const userData = await authService.signin(req.body.username, req.body.password);
    
    return res.status(200).send(userData);
  } catch (err) {
    if (err.message === 'Пользователь не найден') {
      return res.status(404).send({ message: err.message });
    } else if (err.message === 'Неверный пароль') {
      return res.status(401).send({
        accessToken: null,
        message: err.message
      });
    }
    return res.status(500).send({ message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(403).send({ message: 'Токен обновления не предоставлен!' });
    }
    
    // Верифицируем старый токен, чтобы получить ID пользователя
    let userId;
    try {
      const decoded = jwt.verify(req.headers['x-access-token'], config.secret, { ignoreExpiration: true });
      userId = decoded.id;
    } catch (err) {
      return res.status(401).send({ message: 'Неверный токен!' });
    }
    
    // Проверяем существование пользователя
    const user = await db.user.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден!' });
    }
    
    // Получаем срок действия токена из конфигурации
    const tokenExpiry = config.jwtExpiration;
    
    // Создаем новый токен
    const newToken = jwt.sign({ id: userId }, config.secret, {
      expiresIn: tokenExpiry
    });
    
    // Получаем роли пользователя
    const roles = await user.getRoles();
    const authorities = roles.map(role => `ROLE_${role.name.toUpperCase()}`);
    
    return res.status(200).send({
      accessToken: newToken,
      tokenExpiry: tokenExpiry
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).send({ message: 'Email и новый пароль обязательны' });
    }
    
    // Поиск пользователя по email
    const user = await db.user.findOne({
      where: { email: email }
    });
    
    if (!user) {
      return res.status(404).send({ message: 'Пользователь с указанным email не найден' });
    }
    
    // Хеширование нового пароля
    const hashedPassword = await argon2.hash(newPassword);
    
    // Обновление пароля
    await user.update({ password: hashedPassword });
    
    return res.status(200).send({ message: 'Пароль успешно обновлен' });
  } catch (err) {
    console.error('Error during password reset:', err);
    return res.status(500).send({ message: err.message });
  }
}; 