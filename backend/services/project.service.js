const db = require('../models');
const Project = db.project;
const User = db.user;
const Task = db.task;
const userService = require('./user.service');

/**
 * Сервис для управления проектами
 */
class ProjectService {
  /**
   * Создание нового проекта
   * @param {Object} projectData - Данные проекта
   * @param {number} managerId - ID менеджера проекта
   * @returns {Object} - Созданный проект
   */
  async createProject(projectData, managerId) {
    try {
      const project = await Project.create({
        ...projectData,
        managerId
      });
      
      return project;
    } catch (error) {
      throw new Error(`Ошибка при создании проекта: ${error.message}`);
    }
  }
  
  /**
   * Получение всех проектов
   * @returns {Array} - Массив проектов
   */
  async getAllProjects() {
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
      
      return projects;
    } catch (error) {
      throw new Error(`Ошибка при получении проектов: ${error.message}`);
    }
  }
  
  /**
   * Получение проекта по ID
   * @param {number} projectId - ID проекта
   * @returns {Object} - Данные проекта
   */
  async getProjectById(projectId) {
    try {
      const project = await Project.findByPk(projectId, {
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
        throw new Error('Проект не найден');
      }
      
      return project;
    } catch (error) {
      throw new Error(`Ошибка при получении проекта: ${error.message}`);
    }
  }
  
  /**
   * Обновление проекта
   * @param {number} projectId - ID проекта
   * @param {Object} projectData - Новые данные проекта
   * @param {number} userId - ID пользователя, выполняющего обновление
   * @returns {boolean} - Успешно ли обновление
   */
  async updateProject(projectId, projectData, userId) {
    try {
      const project = await Project.findByPk(projectId);
      
      if (!project) {
        throw new Error('Проект не найден');
      }
      
      // Проверяем права на редактирование
      const canEdit = await this.canManageProject(project, userId);
      
      if (!canEdit) {
        throw new Error('У вас нет прав на редактирование этого проекта');
      }
      
      // Обновляем проект
      await Project.update(projectData, {
        where: { id: projectId }
      });
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при обновлении проекта: ${error.message}`);
    }
  }
  
  /**
   * Удаление проекта
   * @param {number} projectId - ID проекта
   * @param {number} userId - ID пользователя, выполняющего удаление
   * @returns {boolean} - Успешно ли удаление
   */
  async deleteProject(projectId, userId) {
    try {
      const project = await Project.findByPk(projectId);
      
      if (!project) {
        throw new Error('Проект не найден');
      }
      
      // Проверяем права на удаление
      const canDelete = await this.canManageProject(project, userId);
      
      if (!canDelete) {
        throw new Error('У вас нет прав на удаление этого проекта');
      }
      
      // Удаляем проект
      await Project.destroy({
        where: { id: projectId }
      });
      
      return true;
    } catch (error) {
      throw new Error(`Ошибка при удалении проекта: ${error.message}`);
    }
  }
  
  /**
   * Получение проектов, управляемых пользователем
   * @param {number} userId - ID пользователя
   * @returns {Array} - Массив проектов
   */
  async getProjectsByManager(userId) {
    try {
      const projects = await Project.findAll({
        where: { managerId: userId },
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
      
      return projects;
    } catch (error) {
      throw new Error(`Ошибка при получении проектов менеджера: ${error.message}`);
    }
  }
  
  /**
   * Проверка прав пользователя на управление проектом
   * @param {Object} project - Проект
   * @param {number} userId - ID пользователя
   * @returns {boolean} - Имеет ли пользователь права
   */
  async canManageProject(project, userId) {
    // Проверяем, является ли пользователь менеджером проекта
    if (project.managerId === userId) {
      return true;
    }
    
    // Проверяем, имеет ли пользователь роль администратора
    const isAdmin = await userService.hasRole(userId, 'admin');
    return isAdmin;
  }
}

module.exports = new ProjectService(); 