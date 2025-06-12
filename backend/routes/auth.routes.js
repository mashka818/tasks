const { verifySignUp } = require('../middleware');
const controller = require('../controllers/auth.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // Маршрут для регистрации
  app.post(
    '/api/auth/signup',
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      verifySignUp.checkRolesExisted
    ],
    controller.signup
  );

  // Маршрут для входа
  app.post('/api/auth/signin', controller.signin);
  
  // Маршрут для обновления токена
  app.post('/api/auth/refresh-token', controller.refreshToken);
  
  // Маршрут для сброса пароля
  app.post('/api/auth/reset-password', controller.resetPassword);
}; 