import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Alert, Form, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectService, AuthService } from '../services';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    startDate: '',
    endDate: '',
    location: '',
    budget: '',
    clientName: '',
    clientContact: ''
  });
  const currentUser = AuthService.getCurrentUser();
  const isManagerOrAdmin = currentUser.roles.includes('ROLE_MANAGER') || currentUser.roles.includes('ROLE_ADMIN');
  const isAdmin = currentUser.roles.includes('ROLE_ADMIN');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // Filter projects based on selected status
    if (statusFilter === 'all') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(projects.filter(project => project.status === statusFilter));
    }
  }, [statusFilter, projects]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await ProjectService.getAllProjects();
      setProjects(data);
    } catch (err) {
      setError('Ошибка при загрузке проектов');
      toast.error('Ошибка при загрузке проектов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };
    
    // Validate that end date is not before start date
    if (name === 'endDate' && formData.startDate && value) {
      if (new Date(value) < new Date(formData.startDate)) {
        toast.error('Дата окончания не может быть раньше даты начала');
        return;
      }
    }
    
    if (name === 'startDate' && formData.endDate && value) {
      if (new Date(formData.endDate) < new Date(value)) {
        // Auto-adjust end date to be same as start date
        updatedFormData.endDate = value;
      }
    }
    
    setFormData(updatedFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ProjectService.createProject({
        ...formData,
        budget: Number(formData.budget),
        managerId: currentUser.id
      });
      
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        status: 'active',
        startDate: '',
        endDate: '',
        location: '',
        budget: '',
        clientName: '',
        clientContact: ''
      });
      
      fetchProjects();
      toast.success('Проект успешно создан!');
    } catch (err) {
      toast.error('Ошибка при создании проекта');
      console.error(err);
    }
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="success">Активен</Badge>;
      case 'completed':
        return <Badge bg="success">Завершено</Badge>;
      case 'on_hold':
        return <Badge bg="secondary">На паузе</Badge>;
      case 'cancelled':
        return <Badge bg="danger">Отменен</Badge>;
      case 'in_progress':
        return <Badge bg="primary">В процессе</Badge>;
      case 'planned':
        return <Badge bg="warning">Запланировано</Badge>;
      default:
        return <Badge bg="info">{status}</Badge>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'completed':
        return 'Завершено';
      case 'on_hold':
        return 'На паузе';
      case 'cancelled':
        return 'Отменен';
      case 'in_progress':
        return 'В процессе';
      case 'planned':
        return 'Запланировано';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="page-container d-flex justify-content-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Проекты</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Создать проект
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      
      {currentUser && currentUser.roles && currentUser.roles.includes('ROLE_MANAGER') && !currentUser.roles.includes('ROLE_ADMIN') && (
        <Alert variant="info" className="mb-4">
          <strong>Примечание:</strong> Как менеджер, вы можете редактировать и добавлять задачи только к тем проектам, на которые вы назначены.
        </Alert>
      )}

      <div className="mb-4">
        <Form.Group>
          <Form.Label>Фильтр по статусу</Form.Label>
          <Form.Select 
            value={statusFilter} 
            onChange={handleStatusFilterChange}
            style={{ maxWidth: '300px' }}
          >
            <option value="all">Все проекты</option>
            <option value="active">Активные</option>
            <option value="completed">Завершено</option>
            <option value="on_hold">На паузе</option>
            <option value="cancelled">Отмененные</option>
            <option value="in_progress">В процессе</option>
            <option value="planned">Запланировано</option>
          </Form.Select>
        </Form.Group>
      </div>

      {filteredProjects.length === 0 ? (
        <Alert variant="info">
          {statusFilter === 'all' 
            ? `Проекты не найдены. ${isManagerOrAdmin ? 'Создайте новый проект, нажав на кнопку выше.' : ''}` 
            : `Проекты со статусом "${getStatusText(statusFilter)}" не найдены.`}
        </Alert>
      ) : (
        <Row>
          {filteredProjects.map(project => (
            <Col md={6} lg={4} key={project.id} className="mb-4">
              <Card className="project-card h-100">
                <Card.Body>
                  <Card.Title className="d-flex justify-content-between align-items-start">
                    <div>{project.name}</div>
                    {getStatusBadge(project.status)}
                  </Card.Title>
                  <Card.Text className="text-muted mb-2">
                    {project.description}
                  </Card.Text>
                  <div className="mb-2">
                    <small className="text-muted">
                      <strong>Бюджет:</strong> {project.budget.toLocaleString()} руб.
                    </small>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">
                      <strong>Сроки:</strong> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">
                      <strong>Клиент:</strong> {project.clientName}
                    </small>
                  </div>
                  <div className="d-grid gap-2 mt-3">
                    <Link className="btn btn-accent" to={`/projects/${project.id}`}>
                      Подробнее
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modal для создания проекта */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Создание нового проекта</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Название проекта *</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Статус *</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleInputChange} 
                    required
                  >
                    <option value="active">Активен</option>
                    <option value="on_hold">На паузе</option>
                    <option value="completed">Завершено</option>
                    <option value="cancelled">Отменен</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Описание *</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Дата начала *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="startDate" 
                    value={formData.startDate} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Дата окончания *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="endDate" 
                    value={formData.endDate} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Адрес *</Form.Label>
              <Form.Control 
                type="text" 
                name="location" 
                value={formData.location} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Бюджет (руб.) *</Form.Label>
              <Form.Control 
                type="number" 
                name="budget" 
                value={formData.budget} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Название клиента *</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="clientName" 
                    value={formData.clientName} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Контакт клиента *</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="clientContact" 
                    value={formData.clientContact} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-3">
              <Button variant="secondary" className="me-2" onClick={() => setShowForm(false)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit">
                Создать проект
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Projects; 