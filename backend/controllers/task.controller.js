const db = require('../models');
const Task = db.task;
const Project = db.project;
const User = db.user;
const Role = db.role;
const path = require('path');

// Utility function to check if a user has admin or manager role
async function hasAdminOrManagerRole(userId) {
  try {
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });
    
    if (!user || !user.roles) return false;
    
    return user.roles.some(role => {
      const roleName = role.name.toLowerCase();
      return roleName.includes('admin') || roleName.includes('manager');
    });
  } catch (err) {
    console.error('Error checking user roles:', err);
    return false;
  }
}

exports.createTask = async (req, res) => {
  try {
    console.log('Creating task, user ID:', req.userId);
    
    // Проверяем существование проекта
    const project = await Project.findByPk(req.body.projectId);
    if (!project) {
      return res.status(404).send({ message: 'Проект не найден.' });
    }
    
    console.log('Project found:', project.id, project.name);
    console.log('Project manager ID:', project.managerId);
    console.log('Current user ID:', req.userId);
    
    // Проверяем, является ли пользователь менеджером проекта
    if (req.userId !== project.managerId) {
      // Проверяем, является ли пользователь администратором
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      const isAdmin = roles.some(role => role.name.toLowerCase() === 'admin');
      
      if (!isAdmin) {
        return res.status(403).send({
          message: 'Вы можете добавлять задачи только в проекты, на которые вы назначены как менеджер.'
        });
      }
    }
    
    // Если указан assigneeId, проверяем его существование и роли
    if (req.body.assigneeId) {
      const assignee = await User.findByPk(req.body.assigneeId);
      if (!assignee) {
        return res.status(404).send({ message: 'Указанный исполнитель не найден.' });
      }
      
      // Проверяем, не является ли исполнитель администратором или менеджером
      const isAdminOrManager = await hasAdminOrManagerRole(req.body.assigneeId);
      if (isAdminOrManager) {
        return res.status(400).send({ 
          message: 'Менеджеры и администраторы не могут быть назначены исполнителями задач.' 
        });
      }
    }
    
    // Создаем задачу
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || 'planned',
      priority: req.body.priority || 'medium',
      startDate: req.body.startDate,
      dueDate: req.body.dueDate,
      estimatedHours: req.body.estimatedHours,
      projectId: req.body.projectId,
      assigneeId: req.body.assigneeId
    });
    
    console.log('Task created successfully:', task.id);
    return res.status(201).send(task);
  } catch (err) {
    console.error('Error creating task:', err);
    return res.status(500).send({ message: err.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    let condition = {};
    
    // Фильтрация по проекту, если указан
    if (req.query.projectId) {
      condition.projectId = req.query.projectId;
    }
    
    // Фильтрация по статусу, если указан
    if (req.query.status) {
      condition.status = req.query.status;
    }
    
    const tasks = await Task.findAll({
      where: condition,
      include: [
        {
          model: Project,
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    return res.status(200).send(tasks);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId, {
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'managerId']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    if (!task) {
      return res.status(404).send({ message: 'Задача не найдена.' });
    }
    
    return res.status(200).send(task);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  const taskId = req.params.taskId;
  
  try {
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'managerId']
        }
      ]
    });
    
    if (!task) {
      return res.status(404).send({ message: 'Задача не найдена.' });
    }
    
    // Проверяем права на редактирование
    let hasPermission = false;
    
    // Проверяем, является ли пользователь менеджером проекта
    if (task.project.managerId === req.userId) {
      hasPermission = true;
    } 
    // Проверяем, является ли пользователь исполнителем задачи
    else if (task.assigneeId === req.userId) {
      // Если пользователь является исполнителем, он может обновить только статус
      if (Object.keys(req.body).length === 1 && req.body.status) {
        await Task.update(
          { status: req.body.status },
          { where: { id: taskId } }
        );
        return res.send({ message: 'Статус задачи успешно обновлен.' });
      } else {
        return res.status(403).send({
          message: 'Исполнитель может обновлять только статус задачи.'
        });
      }
    } 
    
    // Если пользователь не менеджер и не исполнитель, проверяем роль администратора
    if (!hasPermission) {
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      const isAdmin = roles.some(role => role.name.toLowerCase().includes('admin'));
      
      if (isAdmin) {
        hasPermission = true;
      }
    }
    
    // Если нет прав на редактирование, возвращаем ошибку
    if (!hasPermission) {
      return res.status(403).send({
        message: 'Вы не имеете прав на редактирование этой задачи.'
      });
    }
    
    // Если указан новый исполнитель, проверяем его существование и роли
    if (req.body.assigneeId) {
      const assignee = await User.findByPk(req.body.assigneeId);
      if (!assignee) {
        return res.status(404).send({ message: 'Указанный исполнитель не найден.' });
      }
      
      // Проверяем, не является ли исполнитель администратором или менеджером
      const isAdminOrManager = await hasAdminOrManagerRole(req.body.assigneeId);
      if (isAdminOrManager) {
        return res.status(400).send({ 
          message: 'Менеджеры и администраторы не могут быть назначены исполнителями задач.' 
        });
      }
    }
    
    // Обновляем задачу
    await Task.update(req.body, {
      where: { id: taskId }
    });
    
    return res.send({ message: 'Задача успешно обновлена.' });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  const taskId = req.params.taskId;
  
  try {
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'managerId']
        }
      ]
    });
    
    if (!task) {
      return res.status(404).send({ message: 'Задача не найдена.' });
    }
    
    // Проверяем, является ли пользователь менеджером проекта
    if (task.project.managerId !== req.userId) {
      // Проверяем, имеет ли пользователь роль администратора
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      const isAdmin = roles.some(role => role.name === 'admin');
      
      if (!isAdmin) {
        return res.status(403).send({
          message: 'Вы не имеете прав на удаление этой задачи.'
        });
      }
    }
    
    // Удаляем задачу
    await Task.destroy({
      where: { id: taskId }
    });
    
    return res.send({ message: 'Задача успешно удалена.' });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Получение задач, назначенных текущему пользователю
exports.getMyTasks = async (req, res) => {
  try {
    let condition = { assigneeId: req.userId };
    
    // Фильтрация по статусу, если указан
    if (req.query.status) {
      condition.status = req.query.status;
    }
    
    const tasks = await Task.findAll({
      where: condition,
      include: [
        {
          model: Project,
          attributes: ['id', 'name']
        }
      ]
    });
    
    return res.status(200).send(tasks);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Получение задач по ID проекта
exports.getTasksByProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    // Проверяем существование проекта
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).send({ message: 'Проект не найден.' });
    }
    
    // Получаем задачи проекта
    const tasks = await Task.findAll({
      where: { projectId: projectId },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    return res.status(200).send(tasks);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Обновление фактических часов работы над задачей исполнителем
exports.updateActualHours = async (req, res) => {
  const taskId = req.params.taskId;
  
  try {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      return res.status(404).send({ message: 'Задача не найдена.' });
    }
    
    // Проверяем, является ли пользователь исполнителем задачи
    if (task.assigneeId !== req.userId) {
      return res.status(403).send({
        message: 'Только исполнитель задачи может обновлять фактические часы работы.'
      });
    }
    
    // Валидация
    if (req.body.actualHours === undefined || isNaN(req.body.actualHours) || req.body.actualHours < 0) {
      return res.status(400).send({
        message: 'Необходимо указать корректное значение фактических часов работы.'
      });
    }
    
    // Обновляем фактические часы
    await Task.update(
      { actualHours: req.body.actualHours },
      { where: { id: taskId } }
    );
    
    return res.send({ 
      message: 'Фактические часы работы успешно обновлены.',
      actualHours: req.body.actualHours
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Добавление комментария к задаче исполнителем
exports.addComment = async (req, res) => {
  const taskId = req.params.taskId;
  
  try {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      return res.status(404).send({ message: 'Задача не найдена.' });
    }
    
    // Проверяем, является ли пользователь исполнителем задачи
    if (task.assigneeId !== req.userId) {
      return res.status(403).send({
        message: 'Только исполнитель задачи может добавлять комментарии.'
      });
    }
    
    // Валидация
    if (!req.body.comment) {
      return res.status(400).send({
        message: 'Комментарий не может быть пустым.'
      });
    }
    
    // Форматируем текущие примечания + новый комментарий
    const currentDate = new Date().toISOString();
    const user = await User.findByPk(req.userId);
    const userName = user ? user.fullName || user.username : 'Пользователь';
    
    const newComment = `[${currentDate}] ${userName}: ${req.body.comment}\n\n`;
    const updatedNotes = task.notes ? (newComment + task.notes) : newComment;
    
    // Обновляем примечания
    await Task.update(
      { notes: updatedNotes },
      { where: { id: taskId } }
    );
    
    return res.send({ 
      message: 'Комментарий успешно добавлен.',
      notes: updatedNotes
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Загрузка вложения к задаче исполнителем
exports.addAttachment = async (req, res) => {
  const taskId = req.params.taskId;
  
  try {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      return res.status(404).send({ message: 'Задача не найдена.' });
    }
    
    // Проверяем, является ли пользователь исполнителем задачи
    if (task.assigneeId !== req.userId) {
      return res.status(403).send({
        message: 'Только исполнитель задачи может добавлять вложения.'
      });
    }
    
    // Проверяем, есть ли файл
    if (!req.file) {
      return res.status(400).send({
        message: 'Не выбран файл для загрузки.'
      });
    }
    
    // Получаем текущие вложения
    let attachments = task.attachments ? JSON.parse(JSON.stringify(task.attachments)) : [];
    if (!Array.isArray(attachments)) attachments = [];
    
    // Получаем имя файла
    const fileName = req.file.filename || path.basename(req.file.path);
    
    // Добавляем новое вложение с путем uploads/имя_файла
    const newAttachment = {
      id: Date.now(),
      fileName: req.file.originalname,
      filePath: `${fileName}`, // Убираем префикс uploads/
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: new Date().toISOString()
    };
    
    attachments.push(newAttachment);
    
    // Обновляем вложения
    await Task.update(
      { attachments: attachments },
      { where: { id: taskId } }
    );
    
    return res.send({ 
      message: 'Вложение успешно добавлено.',
      attachment: newAttachment
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
}; 