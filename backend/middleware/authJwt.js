const jwt = require('jsonwebtoken');
const config = require('../config/auth.config.js');
const db = require('../models');
const User = db.user;

verifyToken = (req, res, next) => {
  let token = req.headers['x-access-token'];
  
  console.log('Auth middleware - All Headers:', JSON.stringify(req.headers));
  console.log('Auth middleware - Token received:', token ? `${token.substring(0, 15)}...` : 'none');
  console.log('Auth middleware - Request method:', req.method);
  console.log('Auth middleware - Request URL:', req.originalUrl);

  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(403).send({
      message: 'Токен не предоставлен!'
    });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      console.log('Auth middleware - Token verification failed:', err.message);
      console.log('Auth middleware - Token error type:', err.name);
      console.log('Auth middleware - Invalid token (first 20 chars):', token.substring(0, 20) + '...');
      
      // Provide more specific error messages based on the error type
      if (err.name === 'TokenExpiredError') {
        return res.status(401).send({
          message: 'Срок действия токена истек!',
          error: 'jwt expired'
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).send({
          message: 'Неверный токен!',
          error: 'invalid token'
        });
      } else {
        return res.status(401).send({
          message: 'Неавторизован!',
          error: err.message
        });
      }
    }
    
    // Store user ID from token payload
    req.userId = decoded.id;
    console.log('Auth middleware - Token verified successfully for user ID:', decoded.id);
    
    // Check if user exists in database
    User.findByPk(decoded.id)
      .then(user => {
        if (!user) {
          console.log('Auth middleware - User not found in database:', decoded.id);
          return res.status(401).send({
            message: 'Пользователь не найден в системе!',
            error: 'user not found'
          });
        }
        
        // User exists, proceed
        next();
      })
      .catch(err => {
        console.error('Auth middleware - Error querying user:', err);
        return res.status(500).send({
          message: 'Ошибка при проверке пользователя',
          error: err.message
        });
      });
  });
};

isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    const roles = await user.getRoles();

    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === 'admin') {
        return next();
      }
    }

    return res.status(403).send({
      message: 'Требуется роль администратора!'
    });
  } catch (error) {
    return res.status(500).send({
      message: 'Невозможно проверить роль администратора!'
    });
  }
};

isManager = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    const roles = await user.getRoles();

    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === 'manager') {
        return next();
      }
    }

    return res.status(403).send({
      message: 'Требуется роль менеджера!'
    });
  } catch (error) {
    return res.status(500).send({
      message: 'Невозможно проверить роль менеджера!'
    });
  }
};

isManagerOrAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    console.log('User ID:', req.userId);
    console.log('User object:', user ? user.username : 'User not found');
    
    if (!user) {
      console.log('User not found, access denied');
      return res.status(401).send({
        message: 'Пользователь не найден!'
      });
    }
    
    const roles = await user.getRoles();
    console.log('User roles:', roles.map(r => r.name));
    
    // Проверяем разные форматы ролей
    const isManagerOrAdmin = roles.some(role => {
      const roleName = role.name.toLowerCase();
      return roleName === 'manager' || 
             roleName === 'admin' || 
             roleName === 'role_manager' || 
             roleName === 'role_admin';
    });
    
    if (isManagerOrAdmin) {
      console.log('User is manager or admin, access granted');
      return next();
    }

    // Проверка, является ли пользователь менеджером проекта (для API задач)
    if (req.originalUrl.includes('/api/tasks') && req.method === 'POST' && req.body.projectId) {
      console.log('Checking if user is project manager for project:', req.body.projectId);
      const project = await db.project.findByPk(req.body.projectId);
      
      if (project && project.managerId === req.userId) {
        console.log('User is the project manager, access granted');
        return next();
      }
    }

    console.log('User is not manager or admin, access denied');
    return res.status(403).send({
      message: 'Требуется роль менеджера или администратора!'
    });
  } catch (error) {
    console.error('Error checking manager/admin role:', error);
    return res.status(500).send({
      message: 'Невозможно проверить роль!'
    });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isManager,
  isManagerOrAdmin
};

module.exports = authJwt; 