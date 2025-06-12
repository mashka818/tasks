import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Row, Col, Table, Form, Modal, Alert, InputGroup, FormControl, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';
import TaskService from '../services/task.service';
import AuthService from '../services/auth.service';
import UserService from '../services/user.service';
import TaskDetail from '../components/TaskDetail';

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [showEditProjectForm, setShowEditProjectForm] = useState(false);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    description: '',
    status: '',
    startDate: '',
    endDate: '',
    location: '',
    budget: '',
    clientName: '',
    clientContact: ''
  });
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: 'planned',
    priority: 'medium',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    assigneeId: ''
  });
  const [editTaskId, setEditTaskId] = useState(null);
  const [users, setUsers] = useState([]);
  const currentUser = AuthService.getCurrentUser();
  console.log('Current user:', currentUser);
  console.log('User roles:', currentUser?.roles);
  
  // Проверяем роли пользователя
  const isManagerOrAdmin = currentUser && 
    currentUser.roles && 
    (currentUser.roles.includes('ROLE_MANAGER') || 
     currentUser.roles.includes('ROLE_ADMIN') ||
     currentUser.roles.includes('manager') || 
     currentUser.roles.includes('admin'));
  
  // Проверяем, является ли пользователь менеджером этого проекта
  const [isProjectManager, setIsProjectManager] = useState(false);
  
  console.log('Is manager or admin:', isManagerOrAdmin);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Near the top of the component, add a state for managers
  const [managers, setManagers] = useState([]);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projectData = await ProjectService.getProjectById(id);
        setProject(projectData);
        
        // Проверяем, является ли текущий пользователь менеджером проекта
        if (currentUser && projectData) {
          setIsProjectManager(currentUser.id === projectData.managerId);
        }

        // Инициализируем форму данными проекта
        const formatDate = (dateString) => {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };

        setProjectFormData({
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
          startDate: formatDate(projectData.startDate),
          endDate: formatDate(projectData.endDate),
          location: projectData.location,
          budget: projectData.budget,
          clientName: projectData.clientName,
          clientContact: projectData.clientContact
        });

        const tasksData = await TaskService.getTasksByProject(id);
        setTasks(tasksData);

        // Загружаем менеджеров только для админа
        if (currentUser && currentUser.roles && 
            (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin'))) {
          try {
            const managersData = await UserService.getAllManagers();
            setManagers(managersData || []);
          } catch (error) {
            console.error('Error fetching managers:', error);
          }
        }

        // Get workers from API instead of hard-coded data
        try {
          const workersData = await UserService.getAllWorkers();
          setUsers(workersData || []);
        } catch (error) {
          console.error('Error fetching workers:', error);
          // Fallback to default users if API fails
          setUsers([
            { id: 1, username: 'worker1', fullName: 'Петр Работников' },
            { id: 2, username: 'worker2', fullName: 'Алексей Строителев' },
            { id: 3, username: 'worker3', fullName: 'Сергей Монтажников' }
          ]);
        }
      } catch (err) {
        setError('Ошибка при загрузке данных проекта');
        toast.error('Ошибка при загрузке данных проекта');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...taskFormData, [name]: value };
    
    // Validate that due date is not before start date
    if (name === 'dueDate' && taskFormData.startDate && value) {
      if (new Date(value) < new Date(taskFormData.startDate)) {
        toast.error('Срок выполнения не может быть раньше даты начала');
        return;
      }
    }
    
    if (name === 'startDate' && taskFormData.dueDate && value) {
      if (new Date(taskFormData.dueDate) < new Date(value)) {
        // Auto-adjust due date to be same as start date
        updatedFormData.dueDate = value;
      }
    }
    
    setTaskFormData(updatedFormData);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      // Сначала проверим токен аутентификации
      const tokenCheck = await AuthService.checkToken();
      console.log('Token check before task creation:', tokenCheck);
      
      if (!tokenCheck.valid) {
        toast.error('Проблема с аутентификацией. Пожалуйста, войдите в систему заново.');
        AuthService.logout();
        navigate('/login');
        return;
      }
      
      // Проверяем, является ли пользователь менеджером проекта или администратором
      if (!isProjectManager && !(currentUser && currentUser.roles && 
          (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) {
        toast.error('У вас нет прав на создание задач в этом проекте');
        setShowTaskForm(false);
        return;
      }
      
      // Дополнительная проверка для менеджеров - только для своих проектов
      if (currentUser && currentUser.roles && 
          currentUser.roles.includes('ROLE_MANAGER') &&
          !isProjectManager) {
        toast.error('Вы можете добавлять задачи только в проекты, на которые вы назначены как менеджер');
        setShowTaskForm(false);
        return;
      }
      
      await TaskService.createTask({
        ...taskFormData,
        projectId: project.id,
        estimatedHours: Number(taskFormData.estimatedHours)
      });
      
      setShowTaskForm(false);
      setTaskFormData({
        title: '',
        description: '',
        status: 'planned',
        priority: 'medium',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        assigneeId: ''
      });
      
      // Обновляем список задач
      const tasksData = await TaskService.getTasksByProject(id);
      setTasks(tasksData);
      toast.success('Задача успешно создана!');
    } catch (err) {
      console.error('Error creating task:', err);
      
      // Показываем сообщение из API, если есть
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(`Ошибка: ${err.response.data.message}`);
      } else {
        toast.error('Ошибка при создании задачи');
      }
      
      // Проверка на 401 ошибку
      if (err.response && err.response.status === 401) {
        console.log('401 Unauthorized error detected');
        toast.error('Ваша сессия истекла. Пожалуйста, войдите снова.');
        AuthService.logout();
        navigate('/login');
      }
    }
  };

  const handleEditTask = (task) => {
    // Форматируем даты для input type="date"
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    setTaskFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: formatDate(task.startDate),
      dueDate: formatDate(task.dueDate),
      estimatedHours: task.estimatedHours,
      assigneeId: task.assigneeId || ''
    });
    setEditTaskId(task.id);
    setShowEditTaskForm(true);
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      // Проверка прав доступа: только менеджер проекта или администратор
      if (!isProjectManager && !(currentUser && currentUser.roles && 
          (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) {
        toast.error('У вас нет прав на редактирование задач в этом проекте');
        setShowEditTaskForm(false);
        return;
      }
      
      await TaskService.updateTask(editTaskId, {
        ...taskFormData,
        estimatedHours: Number(taskFormData.estimatedHours)
      });
      
      setShowEditTaskForm(false);
      setTaskFormData({
        title: '',
        description: '',
        status: 'planned',
        priority: 'medium',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        assigneeId: ''
      });
      setEditTaskId(null);
      
      // Обновляем список задач
      const tasksData = await TaskService.getTasksByProject(id);
      setTasks(tasksData);
      toast.success('Задача успешно обновлена!');
    } catch (err) {
      console.error('Error updating task:', err);
      
      // Показываем сообщение из API, если есть
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(`Ошибка: ${err.response.data.message}`);
      } else {
        toast.error('Ошибка при обновлении задачи');
      }
    }
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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <Badge bg="danger">Высокий</Badge>;
      case 'medium':
        return <Badge bg="warning">Средний</Badge>;
      case 'low':
        return <Badge bg="success">Низкий</Badge>;
      default:
        return <Badge bg="light">{priority}</Badge>;
    }
  };

  // Handle search for workers
  const handleWorkerSearch = async (query) => {
    setSearchTerm(query);
    
    if (!query || query.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await UserService.searchWorkers(query);
      
      // Filter out any workers that might be admin or manager (as a frontend safeguard)
      const filteredResults = results.filter(worker => {
        if (!worker.roles) return true;
        
        const hasManagerOrAdminRole = worker.roles.some(role => {
          const roleName = typeof role === 'string' ? role.toLowerCase() : 
                         (role && role.name ? role.name.toLowerCase() : '');
          return roleName.includes('admin') || roleName.includes('manager');
        });
        
        return !hasManagerOrAdminRole;
      });
      
      setSearchResults(filteredResults || []);
    } catch (error) {
      console.error('Error searching workers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a worker from search results
  const selectWorker = (worker) => {
    setTaskFormData(prev => ({
      ...prev,
      assigneeId: worker.id
    }));
    setSearchTerm(worker.fullName);
    setSearchResults([]);
  };

  // Clear selected worker
  const clearSelectedWorker = () => {
    setTaskFormData(prev => ({
      ...prev,
      assigneeId: ''
    }));
    setSearchTerm('');
    setSearchResults([]);
  };

  // Get name of selected worker
  const getSelectedWorkerName = () => {
    if (!taskFormData.assigneeId) return '';
    
    const selectedWorker = users.find(u => u.id === parseInt(taskFormData.assigneeId));
    return selectedWorker ? selectedWorker.fullName : '';
  };

  // Обработчик изменения полей формы проекта
  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...projectFormData, [name]: value };
    
    // Validate that end date is not before start date
    if (name === 'endDate' && projectFormData.startDate && value) {
      if (new Date(value) < new Date(projectFormData.startDate)) {
        toast.error('Дата окончания не может быть раньше даты начала');
        return;
      }
    }
    
    if (name === 'startDate' && projectFormData.endDate && value) {
      if (new Date(projectFormData.endDate) < new Date(value)) {
        // Auto-adjust end date to be same as start date
        updatedFormData.endDate = value;
      }
    }
    
    setProjectFormData(updatedFormData);
  };

  // Обработчик отправки формы проекта
  const handleEditProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      // Проверяем, является ли пользователь менеджером проекта или администратором
      if (!isProjectManager && !(currentUser && currentUser.roles && 
          (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) {
        toast.error('У вас нет прав на редактирование этого проекта');
        setShowEditProjectForm(false);
        return;
      }
      
      // Дополнительная проверка для менеджеров - только для своих проектов
      if (currentUser && currentUser.roles && 
          currentUser.roles.includes('ROLE_MANAGER') &&
          !isProjectManager) {
        toast.error('Вы можете редактировать только те проекты, на которые вы назначены как менеджер');
        setShowEditProjectForm(false);
        return;
      }
      
      await ProjectService.updateProject(project.id, {
        ...projectFormData,
        budget: Number(projectFormData.budget)
      });
      
      // Обновляем данные проекта
      const updatedProject = await ProjectService.getProjectById(id);
      setProject(updatedProject);
      
      setShowEditProjectForm(false);
      toast.success('Проект успешно обновлен!');
    } catch (err) {
      console.error('Error updating project:', err);
      
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(`Ошибка: ${err.response.data.message}`);
      } else {
        toast.error('Ошибка при обновлении проекта');
      }
    }
  };

  // Add a function to handle manager assignment
  const handleManagerChange = (e) => {
    setSelectedManager(e.target.value);
  };

  const handleAssignManager = async () => {
    if (!selectedManager) {
      toast.error('Выберите менеджера для назначения');
      return;
    }

    try {
      await ProjectService.updateProject(project.id, {
        managerId: parseInt(selectedManager)
      });

      // Обновляем данные проекта
      const updatedProject = await ProjectService.getProjectById(id);
      setProject(updatedProject);
      
      setShowAssignManagerModal(false);
      toast.success('Менеджер проекта успешно изменен!');
    } catch (err) {
      console.error('Error assigning manager:', err);
      
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(`Ошибка: ${err.response.data.message}`);
      } else {
        toast.error('Ошибка при назначении менеджера');
      }
    }
  };

  const handleViewTaskDetail = async (task) => {
    try {
      setLoading(true);
      // Загружаем актуальные данные задачи
      const taskData = await TaskService.getTaskById(task.id);
      setSelectedTaskForDetail(taskData);
      setShowTaskDetailModal(true);
    } catch (err) {
      toast.error('Ошибка при загрузке информации о задаче');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDetailUpdate = async () => {
    try {
      // Обновляем выбранную задачу
      if (selectedTaskForDetail) {
        const updatedTask = await TaskService.getTaskById(selectedTaskForDetail.id);
        setSelectedTaskForDetail(updatedTask);
      }
      
      // Обновляем весь список задач
      const tasksData = await TaskService.getTasksByProject(id);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error updating task data:', err);
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

  if (error || !project) {
    return (
      <div className="page-container">
        <Alert variant="danger">
          {error || 'Проект не найден'}
        </Alert>
        <Button variant="primary" onClick={() => navigate('/projects')}>
          Вернуться к списку проектов
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{project.name}</h1>
        <div className="d-flex">
          {(isProjectManager || (currentUser && currentUser.roles && 
              (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) && (
            <Button 
              variant="primary" 
              onClick={() => setShowEditProjectForm(true)} 
              className="me-2"
            >
              Редактировать проект
            </Button>
          )}
          {(currentUser && currentUser.roles && 
              (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin'))) && (
            <Button 
              variant="outline-primary" 
              onClick={() => setShowAssignManagerModal(true)}
            >
              Назначить менеджера
            </Button>
          )}
        </div>
      </div>

      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p><strong>Статус:</strong> {getStatusBadge(project.status)}</p>
                  <p><strong>Даты:</strong> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</p>
                  <p><strong>Бюджет:</strong> {project.budget.toLocaleString()} руб.</p>
                </Col>
                <Col md={6}>
                  <p><strong>Локация:</strong> {project.location || 'Не указана'}</p>
                  <p><strong>Клиент:</strong> {project.clientName || 'Не указан'}</p>
                  <p><strong>Контакт клиента:</strong> {project.clientContact || 'Не указан'}</p>
                </Col>
              </Row>
              <hr />
              <h5>Описание проекта</h5>
              <p>{project.description || 'Описание отсутствует'}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <h5>Менеджер проекта</h5>
              {project.manager ? (
                <div className="d-flex align-items-center">
                  <div 
                    className="profile-image-sm me-2" 
                    style={{ backgroundImage: project.manager.profileImage ? `url(${project.manager.profileImage})` : 'none' }}
                  >
                    {!project.manager.profileImage && (
                      <span>{project.manager.fullName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="mb-0"><strong>{project.manager.fullName}</strong></p>
                    <p className="text-muted mb-0">{project.manager.email}</p>
                  </div>
                </div>
              ) : (
                <p>Менеджер не назначен</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Задачи проекта</h2>
        {(isProjectManager || (currentUser && currentUser.roles && 
            (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) && (
          <Button variant="primary" onClick={() => setShowTaskForm(true)}>
            Добавить задачу
          </Button>
        )}
      </div>

      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <h5>Описание проекта</h5>
                {getStatusBadge(project.status)}
              </div>
              <p>{project.description}</p>
              
              <Row className="mt-4">
                <Col md={6}>
                  <p><strong>Начало:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
                  <p><strong>Завершение:</strong> {new Date(project.endDate).toLocaleDateString()}</p>
                  <p><strong>Адрес:</strong> {project.location}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Бюджет:</strong> {project.budget.toLocaleString()} руб.</p>
                  <p><strong>Клиент:</strong> {project.clientName}</p>
                  <p><strong>Контакт клиента:</strong> {project.clientContact}</p>
                </Col>
              </Row>
              
              <div className="mt-4 pt-3 border-top">
                <h6>Руководитель проекта:</h6>
                {project.manager ? (
                  <div className="d-flex align-items-center">
                    {project.manager.profileImage ? (
                      <Image
                        src={`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/${project.manager.profileImage.startsWith('/') ? project.manager.profileImage.substring(1) : project.manager.profileImage}`}
                        alt={project.manager.fullName}
                        className="rounded-circle me-2"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div 
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                        style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
                      >
                        {project.manager.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="mb-0 fw-bold">{project.manager.fullName}</p>
                      <p className="text-muted mb-0 small">{project.manager.position || 'Менеджер проекта'}</p>
                      <p className="text-muted mb-0 small fst-italic">
                        {isProjectManager ? (
                          <span className="text-success">Вы отвечаете за этот проект и можете редактировать задачи</span>
                        ) : (
                          'Ответственный за проект и задачи'
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">Не назначен</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Прогресс проекта</h5>
            </Card.Header>
            <Card.Body>
              {tasks.length > 0 ? (
                <div>
                  <div className="mb-3">
                    <p><strong>Всего задач:</strong> {tasks.length}</p>
                    <p><strong>Завершено:</strong> {tasks.filter(t => t.status === 'completed').length}</p>
                    <p><strong>В процессе:</strong> {tasks.filter(t => t.status === 'in_progress').length}</p>
                    <p><strong>Запланировано:</strong> {tasks.filter(t => t.status === 'planned').length}</p>
                  </div>
                  <div className="progress">
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: `${(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100}%` }} 
                      aria-valuenow={(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100} 
                      aria-valuemin="0" 
                      aria-valuemax="100">
                    </div>
                  </div>
                </div>
              ) : (
                <p>Нет задач для отображения прогресса</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h3 className="mb-3">Задачи проекта</h3>
      {!isProjectManager && !(currentUser && currentUser.roles && 
          (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin'))) && (
        <Alert variant="info" className="mb-3">
          <strong>Примечание:</strong> Редактировать задачи может только менеджер проекта или администратор.
        </Alert>
      )}
      {tasks.length === 0 ? (
        <Alert variant="info">
          Задачи не найдены для этого проекта.
          {(isProjectManager || (currentUser && currentUser.roles && 
            (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) && 
            ' Добавьте новую задачу, нажав на кнопку выше.'}
        </Alert>
      ) : (
        <Table responsive striped hover>
          <thead>
            <tr>
              <th>Название</th>
              <th>Статус</th>
              <th>Приоритет</th>
              <th>Сроки</th>
              <th>Часы (план/факт)</th>
              <th>Исполнитель</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td>
                  <div>{task.title}</div>
                  <small className="text-muted">{task.description && task.description.length > 50 
                    ? `${task.description.substring(0, 50)}...` 
                    : task.description}</small>
                </td>
                <td>{getStatusBadge(task.status)}</td>
                <td>{getPriorityBadge(task.priority)}</td>
                <td>
                  <div>
                    <small>Начало: {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'Не указано'}</small>
                  </div>
                  <div>
                    <small>Конец: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Не указано'}</small>
                  </div>
                </td>
                <td>
                  {task.estimatedHours || 0} / {task.actualHours || 0}
                </td>
                <td>
                  {task.assignee ? task.assignee.fullName : 'Не назначен'}
                </td>
                <td>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    className="me-1"
                    onClick={() => handleViewTaskDetail(task)}
                  >
                    Просмотр
                  </Button>
                  {(isProjectManager || (currentUser && currentUser.roles && 
                    (currentUser.roles.includes('ROLE_ADMIN') || currentUser.roles.includes('admin')))) && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => handleEditTask(task)}
                    >
                      Редактировать
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal для создания задачи */}
      <Modal show={showTaskForm} onHide={() => setShowTaskForm(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Создание новой задачи</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleTaskSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Название задачи *</Form.Label>
              <Form.Control 
                type="text" 
                name="title" 
                value={taskFormData.title} 
                onChange={handleTaskInputChange} 
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Описание *</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                name="description" 
                value={taskFormData.description} 
                onChange={handleTaskInputChange} 
                required 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Статус *</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={taskFormData.status} 
                    onChange={handleTaskInputChange} 
                    required
                  >
                    <option value="planned">Запланировано</option>
                    <option value="in_progress">В процессе</option>
                    <option value="completed">Завершено</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Приоритет *</Form.Label>
                  <Form.Select 
                    name="priority" 
                    value={taskFormData.priority} 
                    onChange={handleTaskInputChange} 
                    required
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Дата начала *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="startDate" 
                    value={taskFormData.startDate} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Срок выполнения *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="dueDate" 
                    value={taskFormData.dueDate} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Плановые часы *</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="estimatedHours" 
                    value={taskFormData.estimatedHours} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Исполнитель</Form.Label>
                  <InputGroup>
                    <FormControl
                      placeholder="Поиск исполнителя..."
                      value={taskFormData.assigneeId ? getSelectedWorkerName() : searchTerm}
                      onChange={(e) => handleWorkerSearch(e.target.value)}
                      disabled={!!taskFormData.assigneeId}
                    />
                    {taskFormData.assigneeId && (
                      <Button 
                        variant="outline-secondary" 
                        onClick={clearSelectedWorker}
                      >
                        ✕
                      </Button>
                    )}
                  </InputGroup>
                  
                  {isSearching && (
                    <div className="mt-2 text-center">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="ms-2">Поиск...</span>
                    </div>
                  )}
                  
                  {searchResults.length > 0 && !taskFormData.assigneeId && (
                    <div className="search-results mt-2">
                      <ul className="list-group">
                        {searchResults.map(worker => (
                          <li 
                            key={worker.id}
                            className="list-group-item list-group-item-action"
                            onClick={() => selectWorker(worker)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div><strong>{worker.fullName}</strong></div>
                            <div className="text-muted small">{worker.position}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-3">
              <Button variant="secondary" className="me-2" onClick={() => setShowTaskForm(false)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit">
                Создать задачу
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal для редактирования задачи */}
      <Modal show={showEditTaskForm} onHide={() => setShowEditTaskForm(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Редактирование задачи</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditTaskSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Название задачи *</Form.Label>
              <Form.Control 
                type="text" 
                name="title" 
                value={taskFormData.title} 
                onChange={handleTaskInputChange} 
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Описание *</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                name="description" 
                value={taskFormData.description} 
                onChange={handleTaskInputChange} 
                required 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Статус *</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={taskFormData.status} 
                    onChange={handleTaskInputChange} 
                    required
                  >
                    <option value="planned">Запланировано</option>
                    <option value="in_progress">В процессе</option>
                    <option value="completed">Завершено</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Приоритет *</Form.Label>
                  <Form.Select 
                    name="priority" 
                    value={taskFormData.priority} 
                    onChange={handleTaskInputChange} 
                    required
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Дата начала *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="startDate" 
                    value={taskFormData.startDate} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Срок выполнения *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="dueDate" 
                    value={taskFormData.dueDate} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Плановые часы *</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="estimatedHours" 
                    value={taskFormData.estimatedHours} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Исполнитель</Form.Label>
                  <InputGroup>
                    <FormControl
                      placeholder="Поиск исполнителя..."
                      value={taskFormData.assigneeId ? getSelectedWorkerName() : searchTerm}
                      onChange={(e) => handleWorkerSearch(e.target.value)}
                      disabled={!!taskFormData.assigneeId}
                    />
                    {taskFormData.assigneeId && (
                      <Button 
                        variant="outline-secondary" 
                        onClick={clearSelectedWorker}
                      >
                        ✕
                      </Button>
                    )}
                  </InputGroup>
                  
                  {isSearching && (
                    <div className="mt-2 text-center">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="ms-2">Поиск...</span>
                    </div>
                  )}
                  
                  {searchResults.length > 0 && !taskFormData.assigneeId && (
                    <div className="search-results mt-2">
                      <ul className="list-group">
                        {searchResults.map(worker => (
                          <li 
                            key={worker.id}
                            className="list-group-item list-group-item-action"
                            onClick={() => selectWorker(worker)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div><strong>{worker.fullName}</strong></div>
                            <div className="text-muted small">{worker.position}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-3">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditTaskForm(false)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit">
                Сохранить изменения
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Модальное окно для редактирования проекта */}
      <Modal show={showEditProjectForm} onHide={() => setShowEditProjectForm(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Редактирование проекта</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditProjectSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Название проекта *</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="name" 
                    value={projectFormData.name} 
                    onChange={handleProjectInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Статус *</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={projectFormData.status} 
                    onChange={handleProjectInputChange} 
                    required
                  >
                    <option value="active">Активен</option>
                    <option value="completed">Завершено</option>
                    <option value="on_hold">На паузе</option>
                    <option value="cancelled">Отменен</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Описание проекта</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                name="description" 
                value={projectFormData.description} 
                onChange={handleProjectInputChange} 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Дата начала *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="startDate" 
                    value={projectFormData.startDate} 
                    onChange={handleProjectInputChange} 
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
                    value={projectFormData.endDate} 
                    onChange={handleProjectInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Адрес проекта</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="location" 
                    value={projectFormData.location} 
                    onChange={handleProjectInputChange} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Бюджет (руб.) *</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="budget" 
                    value={projectFormData.budget} 
                    onChange={handleProjectInputChange} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя клиента</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="clientName" 
                    value={projectFormData.clientName} 
                    onChange={handleProjectInputChange} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Контакт клиента</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="clientContact" 
                    value={projectFormData.clientContact} 
                    onChange={handleProjectInputChange} 
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-3">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditProjectForm(false)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit">
                Сохранить изменения
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Add the manager assignment modal */}
      <Modal show={showAssignManagerModal} onHide={() => setShowAssignManagerModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Назначение менеджера проекта</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Выберите менеджера</Form.Label>
              <Form.Select value={selectedManager} onChange={handleManagerChange}>
                <option value="">Выберите менеджера...</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName} ({manager.username})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignManagerModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleAssignManager}>
            Назначить
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модальное окно для просмотра задачи */}
      <Modal 
        show={showTaskDetailModal} 
        onHide={() => setShowTaskDetailModal(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Информация о задаче</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTaskForDetail && (
            <TaskDetail 
              task={selectedTaskForDetail}
              onTaskUpdate={handleTaskDetailUpdate}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTaskDetailModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ProjectDetails; 