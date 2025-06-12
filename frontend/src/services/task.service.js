import api from './api';

class TaskService {
  async getAllTasks() {
    const response = await api.get('/tasks');
    return response.data;
  }

  async getTaskById(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  }

  async getTasksByProject(projectId) {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response.data;
  }

  async createTask(taskData) {
    console.log('Creating new task with data:', taskData);
    try {
      const response = await api.post('/tasks', taskData);
      console.log('Task created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  async updateTask(id, taskData) {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  }

  async deleteTask(id) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  }

  async updateActualHours(taskId, actualHours) {
    const response = await api.put(`/tasks/${taskId}/actual-hours`, { actualHours });
    return response.data;
  }

  async addComment(taskId, comment) {
    const response = await api.post(`/tasks/${taskId}/comments`, { comment });
    return response.data;
  }

  async addAttachment(taskId, file) {
    // Используем FormData для отправки файла
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}

export default new TaskService(); 