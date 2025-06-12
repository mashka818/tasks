const { authJwt } = require('../middleware');
const controller = require('../controllers/user.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require('express');

// Настройка хранения файлов с multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/profile';
    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый формат файла. Разрешены только изображения (JPEG, PNG, GIF).'), false);
  }
};

// Настройка загрузки
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // Статические файлы для изображений профилей
  app.use('/uploads', express.static('uploads'));

  // Маршруты для администратора
  app.get(
    '/api/admin/users',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getAllUsers
  );

  app.get(
    '/api/admin/users/:userId',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getUserById
  );

  app.put(
    '/api/admin/users/:userId',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.updateUser
  );

  app.delete(
    '/api/admin/users/:userId',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.deleteUser
  );

  // Маршруты для текущего пользователя
  app.get(
    '/api/user/profile',
    [authJwt.verifyToken],
    controller.getCurrentUser
  );

  app.put(
    '/api/user/profile',
    [authJwt.verifyToken],
    controller.updateCurrentUser
  );

  // Загрузка изображения профиля
  app.post(
    '/api/user/profile/image',
    [authJwt.verifyToken, upload.single('profileImage')],
    controller.uploadProfileImage
  );
  
  // Маршрут для получения всех пользователей с ролями (для отладки)
  app.get(
    '/api/debug/users-with-roles',
    controller.getAllUsersWithRoles
  );
  
  // Маршрут для проверки токена аутентификации
  app.get(
    '/api/debug/check-token',
    [authJwt.verifyToken],
    controller.checkToken
  );
  
  // Получение всех рабочих (пользователей с ролью worker)
  app.get(
    '/api/workers',
    [authJwt.verifyToken],
    controller.getAllWorkers
  );
  
  // Поиск рабочих по имени
  app.get(
    '/api/workers/search',
    [authJwt.verifyToken],
    controller.searchWorkers
  );

  // Получение всех менеджеров (для назначения на проекты)
  app.get(
    '/api/admin/managers',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getAllManagers
  );
}; 