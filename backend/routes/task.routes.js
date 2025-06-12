const { authJwt } = require('../middleware');
const controller = require('../controllers/task.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Убедимся, что директория для загрузок существует
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // лимит 10МБ
});

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // Маршруты для задач доступные всем авторизованным пользователям
  app.get(
    '/api/tasks',
    [authJwt.verifyToken],
    controller.getAllTasks
  );

  app.get(
    '/api/tasks/:taskId',
    [authJwt.verifyToken],
    controller.getTaskById
  );

  // Маршруты для задач доступные только менеджерам и администраторам
  app.post(
    '/api/tasks',
    [authJwt.verifyToken, authJwt.isManagerOrAdmin],
    controller.createTask
  );

  app.put(
    '/api/tasks/:taskId',
    [authJwt.verifyToken], // Проверка прав происходит в самом контроллере
    controller.updateTask
  );

  app.delete(
    '/api/tasks/:taskId',
    [authJwt.verifyToken], // Проверка прав происходит в самом контроллере
    controller.deleteTask
  );

  // Получение задач, назначенных текущему пользователю
  app.get(
    '/api/my-tasks',
    [authJwt.verifyToken],
    controller.getMyTasks
  );

  // Получение задач по ID проекта
  app.get(
    '/api/projects/:projectId/tasks',
    [authJwt.verifyToken],
    controller.getTasksByProject
  );

  // Обновление фактических часов работы над задачей
  app.put(
    '/api/tasks/:taskId/actual-hours',
    [authJwt.verifyToken],
    controller.updateActualHours
  );
  
  // Добавление комментария к задаче
  app.post(
    '/api/tasks/:taskId/comments',
    [authJwt.verifyToken],
    controller.addComment
  );
  
  // Загрузка вложения к задаче
  app.post(
    '/api/tasks/:taskId/attachments',
    [authJwt.verifyToken, upload.single('file')],
    controller.addAttachment
  );
}; 