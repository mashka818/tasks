const { authJwt } = require('../middleware');
const controller = require('../controllers/project.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // Маршруты для проектов доступные всем авторизованным пользователям
  app.get(
    '/api/projects',
    [authJwt.verifyToken],
    controller.getAllProjects
  );

  app.get(
    '/api/projects/:projectId',
    [authJwt.verifyToken],
    controller.getProjectById
  );

  // Маршруты для проектов доступные только администраторам
  app.post(
    '/api/projects',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.createProject
  );

  app.put(
    '/api/projects/:projectId',
    [authJwt.verifyToken], // Проверка прав происходит в самом контроллере
    controller.updateProject
  );

  app.delete(
    '/api/projects/:projectId',
    [authJwt.verifyToken], // Проверка прав происходит в самом контроллере
    controller.deleteProject
  );

  // Получение проектов текущего менеджера
  app.get(
    '/api/my-projects',
    [authJwt.verifyToken, authJwt.isManagerOrAdmin],
    controller.getMyProjects
  );
}; 