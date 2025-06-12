const { authJwt } = require('../middleware');
const controller = require('../controllers/admin.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // Get all users (admin only)
  app.get(
    '/api/admin/users',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getAllUsers
  );

  // Search users by query (admin only)
  app.post(
    '/api/admin/users/search',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.searchUsers
  );

  // Get user by ID (admin only)
  app.get(
    '/api/admin/users/:userId',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getUserById
  );

  // Update user roles (admin only)
  app.put(
    '/api/admin/users/:userId/roles',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.updateUserRoles
  );

  // Update user status (admin only)
  app.put(
    '/api/admin/users/:userId/status',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.updateUserStatus
  );
}; 