import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Alert, ProgressBar, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectService, TaskService, AuthService } from '../services';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUser = AuthService.getCurrentUser();
  const [projectMembers, setProjectMembers] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectsData, tasksData] = await Promise.all([
          ProjectService.getAllProjects(),
          TaskService.getAllTasks()
        ]);
        
        setProjects(projectsData);
        setTasks(tasksData);

        // Группируем участников по проектам
        const membersMap = {};
        tasksData.forEach(task => {
          if (task.assignee && task.projectId) {
            if (!membersMap[task.projectId]) {
              membersMap[task.projectId] = new Map();
            }
            // Используем Map чтобы избежать дубликатов
            membersMap[task.projectId].set(task.assignee.id, task.assignee);
          }
        });

        // Преобразуем Map в массивы для удобства использования
        const projectMembersResult = {};
        Object.keys(membersMap).forEach(projectId => {
          projectMembersResult[projectId] = Array.from(membersMap[projectId].values());
        });

        setProjectMembers(projectMembersResult);
      } catch (err) {
        setError('Ошибка при загрузке данных');
        toast.error('Ошибка при загрузке данных');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge bg="success">Завершено</Badge>;
      case 'active':
        return <Badge bg="success">Активен</Badge>;
      case 'in_progress':
        return <Badge bg="primary">В процессе</Badge>;
      case 'planned':
        return <Badge bg="warning">Запланировано</Badge>;
      case 'on_hold':
        return <Badge bg="secondary">На паузе</Badge>;
      case 'cancelled':
        return <Badge bg="danger">Отменен</Badge>;
      default:
        return <Badge bg="info">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <Badge bg="danger">Высокий</Badge>;
      case 'medium':
        return <Badge bg="warning">Средний</Badge>;
      case 'low':
        return <Badge bg="success">Низкий</Badge>;
      default:
        return <Badge bg="info">{priority}</Badge>;
    }
  };

  // Рендер аватаров участников проекта
  const renderProjectMembers = (projectId) => {
    const members = projectMembers[projectId] || [];
    const maxDisplay = 3; // Максимальное количество аватаров для отображения
    
    if (members.length === 0) {
      return (
        <small className="text-muted">
          <i className="bi bi-people me-1"></i>
          Нет участников
        </small>
      );
    }

    return (
      <div className="d-flex align-items-center">
        <div className="d-flex">
          {members.slice(0, maxDisplay).map((member, index) => (
            <OverlayTrigger
              key={member.id}
              placement="top"
              overlay={<Tooltip>{member.fullName}</Tooltip>}
            >
              <div 
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-1"
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  fontSize: '0.7rem',
                  marginLeft: index > 0 ? '-8px' : '0',
                  border: '1px solid white',
                  zIndex: members.length - index
                }}
              >
                {member.fullName.charAt(0).toUpperCase()}
              </div>
            </OverlayTrigger>
          ))}
          
          {members.length > maxDisplay && (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip>
                  {members.slice(maxDisplay).map(m => m.fullName).join(', ')}
                </Tooltip>
              }
            >
              <div 
                className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  fontSize: '0.7rem',
                  marginLeft: '-8px',
                  border: '1px solid white',
                  zIndex: 0
                }}
              >
                +{members.length - maxDisplay}
              </div>
            </OverlayTrigger>
          )}
        </div>
        <small className="ms-2 text-muted">{members.length}</small>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-container d-flex justify-content-center align-items-center" style={{minHeight: '80vh'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Filter tasks assigned to current user
  const myTasks = tasks.filter(task => task.assigneeId === currentUser.id);
  const activeTasks = myTasks.filter(task => task.status !== 'completed');
  const completedTasks = myTasks.filter(task => task.status === 'completed');
  const activeProjects = projects.filter(project => project.status === 'active');
  
  // Calculate tasks statistics
  const totalTasks = myTasks.length;
  const completedTasksPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const highPriorityTasks = activeTasks.filter(task => task.priority === 'high').length;
  const dueSoonTasks = activeTasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }).length;

  // Get projects by status
  const projectsByStatus = {
    active: projects.filter(project => project.status === 'active').length,
    completed: projects.filter(project => project.status === 'completed').length,
    on_hold: projects.filter(project => project.status === 'on_hold').length,
    planned: projects.filter(project => project.status === 'planned').length
  };

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Дашборд</h1>
        <div className="d-flex align-items-center">
          <i className="bi bi-person-circle fs-4 me-2"></i>
          <h5 className="mb-0">Добро пожаловать, {currentUser.fullName || currentUser.username}!</h5>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Статистика - Инфографика */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <div className="stats-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <p className="stats-label">Всего задач</p>
                <h2 className="stats-value">{totalTasks}</h2>
              </div>
              <div className="rounded-circle bg-light p-3">
                <i className="bi bi-list-check fs-1 text-primary"></i>
              </div>
            </div>
            <div>
              <div className="d-flex justify-content-between mb-1">
                <small>Выполнено</small>
                <small>{completedTasksPercentage}%</small>
              </div>
              <ProgressBar now={completedTasksPercentage} className="progress-thin" />
            </div>
          </div>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <div className="stats-card accent">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <p className="stats-label">Активные задачи</p>
                <h2 className="stats-value">{activeTasks.length}</h2>
              </div>
              <div className="rounded-circle bg-light p-3">
                <i className="bi bi-hourglass-split fs-1" style={{color: 'var(--accent)'}}></i>
              </div>
            </div>
            <div>
              <div className="d-flex justify-content-between">
                <small>Высокий приоритет: <span className="fw-bold">{highPriorityTasks}</span></small>
                <small>Скоро срок: <span className="fw-bold">{dueSoonTasks}</span></small>
              </div>
            </div>
          </div>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <div className="stats-card success">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <p className="stats-label">Проекты</p>
                <h2 className="stats-value">{projects.length}</h2>
              </div>
              <div className="rounded-circle bg-light p-3">
                <i className="bi bi-folder-fill fs-1 text-success"></i>
              </div>
            </div>
            <div className="d-flex justify-content-between">
              <small>Активных: <span className="fw-bold">{projectsByStatus.active}</span></small>
              <small>Завершено: <span className="fw-bold">{projectsByStatus.completed}</span></small>
            </div>
          </div>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <div className="stats-card warning">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <p className="stats-label">Выполненные задачи</p>
                <h2 className="stats-value">{completedTasks.length}</h2>
              </div>
              <div className="rounded-circle bg-light p-3">
                <i className="bi bi-check-circle-fill fs-1 text-warning"></i>
              </div>
            </div>
            <div className="d-flex justify-content-between">
              <small className="text-muted">За последние 30 дней</small>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-check2-square me-2"></i>Мои активные задачи</h5>
                {activeTasks.length > 0 && (
                  <Badge bg="accent" className="rounded-pill">{activeTasks.length}</Badge>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {activeTasks.length > 0 ? (
                <div className="list-group">
                  {activeTasks.slice(0, 5).map(task => (
                    <div key={task.id} className={`list-group-item task-list-item ${task.priority}`}>
                      <div className="d-flex w-100 justify-content-between">
                        <h5 className="mb-1">{task.title}</h5>
                        <div>
                          {getStatusBadge(task.status)}
                          {' '}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>
                      <p className="mb-1 text-truncate">{task.description}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          <i className="bi bi-calendar me-1"></i>
                          Срок: {new Date(task.dueDate).toLocaleDateString()}
                        </small>
                        <small className="text-muted">
                          <i className="bi bi-briefcase me-1"></i>
                          {task.project?.name || 'Без проекта'}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-check2-all fs-1 text-muted"></i>
                  <p className="mt-2">У вас нет активных задач</p>
                </div>
              )}
              {activeTasks.length > 5 && (
                <div className="text-center mt-3">
                  <Link to="/tasks" className="btn btn-sm btn-accent">
                    Показать все ({activeTasks.length})
                  </Link>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-folder me-2"></i>Активные проекты</h5>
                {activeProjects.length > 0 && (
                  <Badge bg="accent" className="rounded-pill">{activeProjects.length}</Badge>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {activeProjects.length > 0 ? (
                <div className="list-group">
                  {activeProjects.slice(0, 5).map(project => (
                    <Link 
                      key={project.id} 
                      to={`/projects/${project.id}`} 
                      className="list-group-item list-group-item-action">
                      <div className="d-flex w-100 justify-content-between">
                        <h5 className="mb-1">{project.name}</h5>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="mb-1 text-truncate">{project.description}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          <i className="bi bi-currency-dollar me-1"></i>
                          Бюджет: {project.budget.toLocaleString()} руб.
                        </small>
                        <div>
                          {renderProjectMembers(project.id)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-folder-x fs-1 text-muted"></i>
                  <p className="mt-2">Нет активных проектов</p>
                </div>
              )}
              {activeProjects.length > 5 && (
                <div className="text-center mt-3">
                  <Link to="/projects" className="btn btn-sm btn-accent">
                    Показать все ({activeProjects.length})
                  </Link>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard; 