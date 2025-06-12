const db = require('../models');
const Project = db.project;
const User = db.user;
const Task = db.task;

exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      description: req.body.description,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || 'active',
      location: req.body.location,
      budget: req.body.budget,
      clientName: req.body.clientName,
      clientContact: req.body.clientContact,
      managerId: req.userId // Устанавливаем текущего пользователя как менеджера проекта
    });
    
    return res.status(201).send(project);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    return res.status(200).send(projects);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: Task,
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'username', 'fullName']
            }
          ]
        }
      ]
    });
    
    if (!project) {
      return res.status(404).send({ message: 'Проект не найден.' });
    }
    
    return res.status(200).send(project);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  const projectId = req.params.projectId;
  
  try {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).send({ message: 'Проект не найден.' });
    }
    
    // Проверяем, является ли пользователь менеджером проекта
    if (project.managerId !== req.userId) {
      // Проверяем, имеет ли пользователь роль администратора
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      const isAdmin = roles.some(role => role.name === 'admin');
      
      if (!isAdmin) {
        return res.status(403).send({
          message: 'Вы не можете редактировать этот проект, так как не являетесь его менеджером.'
        });
      }
    }
    
    // Обновляем проект
    await Project.update(req.body, {
      where: { id: projectId }
    });
    
    return res.send({ message: 'Проект успешно обновлен.' });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  const projectId = req.params.projectId;
  
  try {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).send({ message: 'Проект не найден.' });
    }
    
    // Проверяем, является ли пользователь менеджером проекта
    if (project.managerId !== req.userId) {
      // Проверяем, имеет ли пользователь роль администратора
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      const isAdmin = roles.some(role => role.name === 'admin');
      
      if (!isAdmin) {
        return res.status(403).send({
          message: 'Вы можете удалять только те проекты, на которые вы назначены как менеджер.'
        });
      }
    }
    
    // Удаляем проект
    await Project.destroy({
      where: { id: projectId }
    });
    
    return res.send({ message: 'Проект успешно удален.' });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// Получение проектов, управляемых текущим пользователем
exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: { managerId: req.userId },
      include: [
        {
          model: Task,
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'username', 'fullName']
            }
          ]
        }
      ]
    });
    
    return res.status(200).send(projects);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
}; 