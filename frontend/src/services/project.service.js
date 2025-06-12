import api from './api';

class ProjectService {
  async getAllProjects() {
    const response = await api.get('/projects');
    return response.data;
  }

  async getProjectById(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data;
  }

  async updateProject(id, projectData) {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  }

  async deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }
}

export default new ProjectService(); 