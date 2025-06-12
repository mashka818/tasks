const db = require('../models');
const User = db.user;
const Role = db.role;
const { Op } = require('sequelize');

// Get all users for admin purposes
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'fullName', 'position', 'phone', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['name'],
          through: {
            attributes: []
          }
        }
      ]
    });

    // Format user data with roles
    const formattedUsers = users.map(user => {
      const userData = user.toJSON();
      // Ensure roles is an array of strings
      userData.roles = Array.isArray(userData.roles) 
        ? userData.roles.map(role => role.name || '')
        : [];
      return userData;
    });

    return res.status(200).send(formattedUsers);
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'fullName', 'position', 'phone', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['name'],
          through: {
            attributes: []
          }
        }
      ]
    });
    
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден' });
    }
    
    // Format user data with roles
    const userData = user.toJSON();
    // Ensure roles is an array of strings
    userData.roles = Array.isArray(userData.roles) 
      ? userData.roles.map(role => role.name || '')
      : [];
    
    return res.status(200).send(userData);
  } catch (err) {
    console.error('Error in getUserById:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Update user roles
exports.updateUserRoles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { roles } = req.body;
    
    console.log('Updating roles for user ID:', userId);
    console.log('Received roles data:', roles);
    
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      console.log('Invalid roles data format:', roles);
      return res.status(400).send({ 
        message: 'Необходимо указать хотя бы одну роль в виде массива' 
      });
    }
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).send({ message: 'Пользователь не найден' });
    }
    
    console.log('Found user:', user.username);
    
    // Check if user is trying to remove admin from self
    const currentUserId = req.userId;
    if (currentUserId === parseInt(userId)) {
      const userRoles = await user.getRoles();
      const isAdmin = userRoles.some(r => r.name.toLowerCase().includes('admin'));
      const willRemainAdmin = roles.some(r => 
        r === 'admin' || r === 'ROLE_ADMIN' || r.toLowerCase().includes('admin')
      );
      
      if (isAdmin && !willRemainAdmin) {
        console.log('User trying to remove admin role from self');
        return res.status(400).send({ 
          message: 'Невозможно удалить роль администратора у текущего пользователя' 
        });
      }
    }
    
    // Map role names to expected format
    const roleNames = roles.map(role => {
      // Check if role is a valid string
      if (typeof role !== 'string') {
        return `ROLE_USER`; // Default fallback
      }
      
      // Handle different formats (ADMIN, admin, ROLE_ADMIN)
      return role.startsWith('ROLE_') ? role : `ROLE_${role.toUpperCase()}`;
    });
    
    console.log('Formatted role names:', roleNames);
    
    // Find available roles in the database
    const availableRoles = await Role.findAll();
    console.log('Available roles in DB:', availableRoles.map(r => r.name));
    
    // Special handling for "user" role - ensure it exists and is handled properly
    const basicUserRole = availableRoles.find(r => 
      r.name.toLowerCase() === 'user' || 
      r.name.toLowerCase() === 'role_user' || 
      r.name.toLowerCase() === 'worker'
    );
    
    if (!basicUserRole && roles.some(r => r.toLowerCase() === 'user')) {
      console.log('Basic user role not found in database, but user role requested');
      return res.status(400).send({ 
        message: 'Базовая роль пользователя не найдена в системе' 
      });
    }
    
    // Find role objects that match our requested roles
    let roleInstances = await Role.findAll({
      where: {
        name: {
          [Op.or]: roleNames.map(roleName => {
            // Check if the exact role exists, otherwise use the base name
            const baseName = roleName.replace('ROLE_', '').toLowerCase();
            return [roleName, baseName, `role_${baseName}`, `ROLE_${baseName.toUpperCase()}`];
          }).flat()
        }
      }
    });
    
    // If user is being demoted to just a basic user role, make sure we use the existing "worker" or "user" role
    if (roles.length === 1 && (roles[0].toLowerCase() === 'user' || roles[0].toLowerCase() === 'worker')) {
      if (basicUserRole && !roleInstances.some(r => r.id === basicUserRole.id)) {
        roleInstances = [basicUserRole];
      }
    }
    
    console.log('Found role instances:', roleInstances.map(r => r.name));
    
    if (roleInstances.length === 0) {
      console.log('No matching roles found in the database');
      return res.status(400).send({ 
        message: 'Указанные роли не найдены в системе' 
      });
    }
    
    // Remove existing roles and add new ones
    await user.setRoles(roleInstances);
    console.log('Roles updated successfully');
    
    return res.status(200).send({ 
      message: 'Роли пользователя успешно обновлены',
      roles: roleInstances.map(r => r.name)
    });
  } catch (err) {
    console.error('Error in updateUserRoles:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Update user status (active/inactive)
exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).send({ 
        message: 'Необходимо указать статус пользователя (isActive)' 
      });
    }
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'Пользователь не найден' });
    }
    
    // Update user status
    await user.update({ isActive });
    
    return res.status(200).send({ 
      message: 'Статус пользователя успешно обновлен' 
    });
  } catch (err) {
    console.error('Error in updateUserStatus:', err);
    return res.status(500).send({ message: err.message });
  }
};

// Search users by query
exports.searchUsers = async (req, res) => {
  try {
    // Извлекаем запрос из тела POST-запроса
    let searchQuery = req.body.query;
    
    console.log('Search query received from POST body:', searchQuery);
    
    // Проверяем, задан ли запрос
    if (!searchQuery || typeof searchQuery !== 'string') {
      console.log('Invalid or empty search query provided');
      return res.status(200).send([]);
    }
    
    try {
      const searchTermLower = searchQuery.toLowerCase().trim();
      console.log('Using search term:', searchTermLower);
      
      // Получаем всех пользователей (небольшое количество, поэтому это не критично)
      const allUsers = await User.findAll({
        attributes: ['id', 'username', 'email', 'fullName', 'position', 'phone', 'createdAt', 'updatedAt'],
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
            through: {
              attributes: []
            }
          }
        ]
      });
      
      console.log(`Got all users, total count: ${allUsers.length}`);
      
      // Обрабатываем и фильтруем пользователей вручную
      const userData = [];
      
      for (const user of allUsers) {
        const userJson = user.toJSON();
        
        // Приводим строки к нижнему регистру для нечувствительного к регистру поиска
        const usernameLC = (userJson.username || '').toLowerCase();
        const emailLC = (userJson.email || '').toLowerCase();
        const fullNameLC = (userJson.fullName || '').toLowerCase();
        const positionLC = (userJson.position || '').toLowerCase();
        
        // Фильтруем только если хотя бы одно поле содержит искомую строку
        if (usernameLC.includes(searchTermLower) || 
            emailLC.includes(searchTermLower) || 
            fullNameLC.includes(searchTermLower) || 
            positionLC.includes(searchTermLower)) {
          
          // Нормализуем роли, как в других функциях
          userJson.roles = Array.isArray(userJson.roles) 
            ? userJson.roles.map(role => role.name || '')
            : [];
            
          userData.push(userJson);
        }
      }
      
      console.log(`Filtered results: ${userData.length} users`);
      
      // Возвращаем результаты
      return res.status(200).json(userData);
      
    } catch (error) {
      console.error('Detailed error in user search:', error);
      if (error.name) console.error('Error name:', error.name);
      if (error.message) console.error('Error message:', error.message);
      if (error.sql) console.error('SQL query:', error.sql);
      if (error.stack) console.error('Stack trace:', error.stack);
      
      // В случае ошибки возвращаем пустой массив
      return res.status(200).json([]);
    }
  } catch (err) {
    console.error('Global error in searchUsers:', err);
    // Детальное логирование
    if (err.name) console.error('Error name:', err.name);
    if (err.message) console.error('Error message:', err.message);
    if (err.stack) console.error('Stack trace:', err.stack);
    
    // Даже при критической ошибке возвращаем пустой массив вместо ошибки 500
    return res.status(200).json([]);
  }
}; 