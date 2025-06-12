const db = require('../models');
const Task = db.task;
const Project = db.project;
const User = db.user;
const userService = require('./user.service');
const projectService = require('./project.service');

/**
 * Сервис для управления задачами
 */
class TaskService {
  /**
   * Создание новой задачи
   * @param {Object} taskData - Данные задачи
   * @param {number} userId - ID пользователя, создающего задачу
   * @returns {Object} - Созданная задача
   */
  async createTask(taskData, userId) {
    try {
      // Проверяем существование проекта
      const project = await Project.findByPk(taskData.projectId);
      if (!project) {
        throw new Error('Проект не найден');
      }
      
      // Проверяем права на создание задачи в проекте
      const canManage = await projectService.canManageProject(project, userId);
      if (!canManage) {
        throw new Error('У вас нет прав на создание задач в этом проекте');
      }
      
      // Если указан исполнитель, проверяем его существование
      if (taskData.assigneeId) {
        const assignee = await User.findByPk(taskData.assigneeId);
        if (!assignee) {
          throw new Error('Указанный исполнитель не найден');
        }
      }
      
      // Создаем задачу
      const task = await Task.create({
        ...taskData,
        status: taskData.status || 'planned',
        priority: taskData.priority || 'medium'
      });
      
      return task;
    } catch (error) {
      throw new Error(`Ошибка при создании задачи: ${error.message}`);
    }
  }
  
  /**
   * Получение всех задач с фильтрацией
   * @param {Object} filters - Фильтры (projectId, status)
   * @returns {Array} - Массив задач
   */
  async getAllTasks(filters = {}) {
    try {
      const condition = {};
      
      // Фильтрация по проекту, если указан
      if (filters.projectId) {
        condition.projectId = filters.projectId;
      }
      
      // Фильтрация по статусу, если указан
      if (filters.status) {
        condition.status = filters.status;
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
      
      return tasks;
    } catch (error) {
      throw new Error(`Ошибка при получении задач: ${error.message}`);
    }
  }
  
  /**
   * Получение задачи по ID
   * @param {number} taskId - ID задачи
   * @returns {Object} - Данные задачи
   */
  async getTaskById(taskId) {
    try {
      const task = await Task.findByPk(taskId, {
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
        throw new Error('Задача не найдена');
      }
      
      return task;
    } catch (error) {
      throw new Error(`Ошибка при получении задачи: ${error.message}`);
    }
  }
  
  /**
   * Обновление задачи
   * @param {number} taskId - ID задачи
   * @param {Object} taskData - Новые данные задачи
   * @param {number} userId - ID пользователя, выполняющего обновление
   * @returns {boolean} - Успешно ли обновление
   */
  async updateTask(taskId, taskData, userId) {
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
        throw new Error('Задача не найдена');
      }
      
      // Проверяем права на обновление
      const canUpdate = await this.canUpdateTask(task, userId, taskData);
      if (!canUpdate.success) {
        throw new Error(canUpdate.message);
      }
      
      // Если указан новый исполнитель, проверяем его существование
      if (taskData.assigneeId) {
        const assignee = await User.findByPk(taskData.assigneeId);
        if (!assignee) {
          throw new Error('Указанный исполнитель не найден');
        }
      }
      
      // Обновляем задачу
      await Task.update(taskData, {
        where: { id: taskId }
      });
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при обновлении задачи: ${error.message}`);
    }
  }
  
  /**
   * Удаление задачи
   * @param {number} taskId - ID задачи
   * @param {number} userId - ID пользователя, выполняющего удаление
   * @returns {boolean} - Успешно ли удаление
   */
  async deleteTask(taskId, userId) {
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
        throw new Error('Задача не найдена');
      }
      
      // Проверяем права на удаление
      const canDelete = await projectService.canManageProject(task.project, userId);
      if (!canDelete) {
        throw new Error('У вас нет прав на удаление этой задачи');
      }
      
      // Удаляем задачу
      await Task.destroy({
        where: { id: taskId }
      });
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при удалении задачи: ${error.message}`);
    }
  }
  
  /**
   * Получение задач, назначенных пользователю
   * @param {number} userId - ID пользователя
   * @param {string} status - Статус задач (опционально)
   * @returns {Array} - Массив задач
   */
  async getTasksByAssignee(userId, status = null) {
    try {
      const condition = { assigneeId: userId };
      
      // Фильтрация по статусу, если указан
      if (status) {
        condition.status = status;
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
      
      return tasks;
    } catch (error) {
      throw new Error(`Ошибка при получении задач пользователя: ${error.message}`);
    }
  }
  
  /**
   * Проверка прав на обновление задачи
   * @param {Object} task - Задача
   * @param {number} userId - ID пользователя
   * @param {Object} updateData - Данные для обновления
   * @returns {Object} - Результат проверки
   */
  async canUpdateTask(task, userId, updateData) {
    // Проверяем, является ли пользователь менеджером проекта
    if (task.project.managerId === userId) {
      return { success: true };
    }
    
    // Проверяем, является ли пользователь исполнителем задачи
    if (task.assigneeId === userId) {
      // Исполнитель может обновить только статус
      if (Object.keys(updateData).length === 1 && updateData.status) {
        return { success: true };
      } else {
        return { 
          success: false, 
          message: 'Исполнитель может обновлять только статус задачи'
        };
      }
    }
    
    // Проверяем, имеет ли пользователь роль администратора
    const isAdmin = await userService.hasRole(userId, 'admin');
    if (isAdmin) {
      return { success: true };
    }
    
    return { 
      success: false, 
      message: 'У вас нет прав на редактирование этой задачи'
    };
  }
}

module.exports = new TaskService(); 