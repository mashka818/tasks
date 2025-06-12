const db = require('../models');
const User = db.user;
const Role = db.role;
const argon2 = require('argon2');

exports.getAllUsers = async (req, res) => {
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
    return res.status(200).send(users);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }]
    });
    
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }
    
    return res.status(200).send(user);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  const userId = req.params.userId;
  
  try {
    // Проверяем, существует ли пользователь
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }
    
    // Обновляем основные данные пользователя
    const updateData = {
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      position: req.body.position
    };
    
    // Если передан пароль, хешируем его
    if (req.body.password) {
      updateData.password = await argon2.hash(req.body.password);
    }
    
    // Обновляем пользователя
    await User.update(updateData, {
      where: { id: userId }
    });
    
    // Если переданы роли и у пользователя есть права обновлять роли
    if (req.body.roles) {
      // Проверяем, имеет ли текущий пользователь роль admin
      const currentUser = await User.findByPk(req.userId);
      const currentUserRoles = await currentUser.getRoles();
      const isAdmin = currentUserRoles.some(role => role.name === 'admin');
      
      if (isAdmin) {
        const roles = await Role.findAll({
          where: {
            name: {
              [db.Sequelize.Op.or]: req.body.roles
            }
          }
        });
        
        const userToUpdate = await User.findByPk(userId);
        await userToUpdate.setRoles(roles);
      }
    }
    
    return res.send({ message: 'Пользователь успешно обновлен.' });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const result = await User.destroy({ where: { id: userId } });
    
    if (result === 0) {
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }
    
    return res.send({ message: 'Пользователь успешно удален.' });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Получение собственных данных пользователя
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }]
    });
    
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }
    
    return res.status(200).send(user);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Загрузка изображения профиля
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'Файл не был загружен.' });
    }

    // Получаем информацию о пользователе
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }

    // Формируем путь к изображению 
    const profileImageUrl = `/uploads/profile/${req.file.filename}`;

    // Обновляем профиль пользователя с изображением
    await User.update(
      { profileImage: profileImageUrl },
      { where: { id: req.userId } }
    );

    return res.status(200).send({ 
      message: 'Изображение профиля успешно загружено.',
      profileImage: profileImageUrl
    });
  } catch (err) {
    console.error('Error uploading profile image:', err);
    return res.status(500).send({ message: 'Ошибка при загрузке изображения профиля.' });
  }
};

// Обновление собственных данных пользователя
exports.updateCurrentUser = async (req, res) => {
  try {
    // Проверяем, существует ли пользователь
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }
    
    // Обновляем только разрешенные поля для самообновления
    const updateData = {};
    
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.fullName) updateData.fullName = req.body.fullName;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.position) updateData.position = req.body.position;
    if (req.body.profileImage) updateData.profileImage = req.body.profileImage;
    if (req.body.password) updateData.password = await argon2.hash(req.body.password);
    
    // Обновляем пользователя
    await User.update(updateData, {
      where: { id: req.userId }
    });
    
    // Получаем обновленные данные пользователя
    const updatedUser = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }]
    });
    
    return res.send({ 
      message: 'Ваш профиль успешно обновлен.',
      user: updatedUser
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Добавляем новый метод для получения всех пользователей с ролями
exports.getAllUsersWithRoles = async (req, res) => {
  try {
    const users = await db.user.findAll({
      attributes: ['id', 'username', 'email', 'fullName'],
      include: [{
        model: db.role,
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }]
    });
    
    return res.status(200).send(users);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Диагностический метод для проверки токена
exports.checkToken = async (req, res) => {
  try {
    console.log('Token check endpoint called');
    console.log('User ID from token:', req.userId);
    
    // Проверяем, существует ли пользователь
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'username', 'email'],
      include: [{
        model: Role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });
    
    if (!user) {
      console.log('No user found for ID:', req.userId);
      return res.status(404).send({ message: 'Пользователь не найден.' });
    }
    
    console.log('User found:', user.username);
    console.log('User roles:', user.roles.map(r => r.name));
    
    return res.status(200).send({
      message: 'Токен действителен',
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles.map(r => r.name)
      }
    });
  } catch (err) {
    console.error('Error in token check:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Add a new method to get all workers (users with worker role)
exports.getAllWorkers = async (req, res) => {
  try {
    const workerRole = await Role.findOne({
      where: {
        name: {
          [db.Sequelize.Op.or]: ['worker', 'ROLE_WORKER', 'user', 'ROLE_USER']
        }
      }
    });
    
    if (!workerRole) {
      return res.status(404).send({ message: 'Роль работника не найдена в системе.' });
    }
    
    // Find admin and manager roles to exclude users who have these roles
    const adminManagerRoles = await Role.findAll({
      where: {
        name: {
          [db.Sequelize.Op.or]: [
            'admin', 'ROLE_ADMIN', 'manager', 'ROLE_MANAGER'
          ]
        }
      }
    });
    
    const adminManagerRoleIds = adminManagerRoles.map(role => role.id);
    
    // Get all users with worker role
    const users = await User.findAll({
      attributes: ['id', 'username', 'fullName', 'position', 'phone', 'email'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }],
      order: [['fullName', 'ASC']]
    });
    
    // Filter out users who have admin or manager roles
    const workers = users.filter(user => {
      const hasWorkerRole = user.roles.some(role => role.id === workerRole.id);
      const hasAdminManagerRole = user.roles.some(role => adminManagerRoleIds.includes(role.id));
      
      return hasWorkerRole && !hasAdminManagerRole;
    });
    
    // Include the roles in the response for frontend filtering
    const formattedWorkers = workers.map(worker => {
      const workerData = worker.toJSON();
      workerData.roles = workerData.roles.map(role => role.name);
      return workerData;
    });
    
    return res.status(200).send(formattedWorkers);
  } catch (err) {
    console.error('Error getting workers:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Search workers by name
exports.searchWorkers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).send({ message: 'Необходимо указать поисковый запрос.' });
    }
    
    const workerRole = await Role.findOne({
      where: {
        name: {
          [db.Sequelize.Op.or]: ['worker', 'ROLE_WORKER', 'user', 'ROLE_USER']
        }
      }
    });
    
    if (!workerRole) {
      return res.status(404).send({ message: 'Роль работника не найдена в системе.' });
    }
    
    // Find admin and manager roles to exclude users who have these roles
    const adminManagerRoles = await Role.findAll({
      where: {
        name: {
          [db.Sequelize.Op.or]: [
            'admin', 'ROLE_ADMIN', 'manager', 'ROLE_MANAGER'
          ]
        }
      }
    });
    
    const adminManagerRoleIds = adminManagerRoles.map(role => role.id);
    
    // Get users matching the search query
    const users = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { fullName: { [db.Sequelize.Op.like]: `%${query}%` } },
          { username: { [db.Sequelize.Op.like]: `%${query}%` } },
          { position: { [db.Sequelize.Op.like]: `%${query}%` } }
        ]
      },
      attributes: ['id', 'username', 'fullName', 'position', 'phone', 'email'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }],
      order: [['fullName', 'ASC']]
    });
    
    // Filter out users who have admin or manager roles
    const workers = users.filter(user => {
      const hasWorkerRole = user.roles.some(role => role.id === workerRole.id);
      const hasAdminManagerRole = user.roles.some(role => adminManagerRoleIds.includes(role.id));
      
      return hasWorkerRole && !hasAdminManagerRole;
    });
    
    // Include the roles in the response for frontend filtering
    const formattedWorkers = workers.map(worker => {
      const workerData = worker.toJSON();
      workerData.roles = workerData.roles.map(role => role.name);
      return workerData;
    });
    
    return res.status(200).send(formattedWorkers);
  } catch (err) {
    console.error('Error searching workers:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Получение всех менеджеров (для назначения на проекты)
exports.getAllManagers = async (req, res) => {
  try {
    const managerRole = await Role.findOne({
      where: {
        name: {
          [db.Sequelize.Op.or]: ['manager', 'ROLE_MANAGER']
        }
      }
    });
    
    if (!managerRole) {
      return res.status(404).send({ message: 'Роль менеджера не найдена в системе.' });
    }
    
    // Получаем всех пользователей с ролью менеджера
    const users = await User.findAll({
      attributes: ['id', 'username', 'fullName', 'position', 'phone', 'email', 'profileImage'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] }
      }],
      order: [['fullName', 'ASC']]
    });
    
    // Фильтруем пользователей с ролью менеджера
    const managers = users.filter(user => {
      return user.roles.some(role => role.id === managerRole.id);
    });
    
    // Форматируем данные для ответа
    const formattedManagers = managers.map(manager => {
      const managerData = manager.toJSON();
      managerData.roles = managerData.roles.map(role => role.name);
      return managerData;
    });
    
    return res.status(200).send(formattedManagers);
  } catch (err) {
    console.error('Error getting managers:', err);
    return res.status(500).send({ message: err.message });
  }
}; 