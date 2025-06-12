import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Form, Row, Col, Card, Alert, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { TaskService, AuthService } from '../services';
import TaskDetail from '../components/TaskDetail';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });
  const currentUser = AuthService.getCurrentUser();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await TaskService.getAllTasks();
        setTasks(data);
        setFilteredTasks(data);
      } catch (err) {
        setError('Ошибка при загрузке задач');
        toast.error('Ошибка при загрузке задач');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, tasks]);

  const applyFilters = () => {
    let result = [...tasks];
    
    // Фильтр по статусу
    if (filters.status !== 'all') {
      result = result.filter(task => task.status === filters.status);
    }
    
    // Фильтр по приоритету
    if (filters.priority !== 'all') {
      result = result.filter(task => task.priority === filters.priority);
    }
    
    // Фильтр по поиску (в названии или описании)
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        task => 
          task.title.toLowerCase().includes(searchLower) || 
          task.description.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredTasks(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await TaskService.updateTask(taskId, { status: newStatus });
      
      // Обновляем состояние задачи локально
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      toast.success('Статус задачи обновлен');
    } catch (err) {
      toast.error('Ошибка при обновлении статуса задачи');
      console.error(err);
    }
  };

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

  const handleViewTask = async (taskId) => {
    try {
      setLoading(true);
      const taskData = await TaskService.getTaskById(taskId);
      setSelectedTask(taskData);
      setShowTaskDetail(true);
    } catch (err) {
      toast.error('Ошибка при загрузке информации о задаче');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTaskUpdate = async () => {
    try {
      // Обновляем выбранную задачу
      if (selectedTask) {
        const updatedTask = await TaskService.getTaskById(selectedTask.id);
        setSelectedTask(updatedTask);
      }
      
      // Обновляем весь список задач
      const data = await TaskService.getAllTasks();
      setTasks(data);
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

  // Получаем задачи, назначенные текущему пользователю
  const myTasks = filteredTasks.filter(task => task.assigneeId === currentUser.id);

  return (
    <div className="page-container">
      <h1 className="mb-4">Мои задачи</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Body>
          <h5>Фильтры</h5>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Статус</Form.Label>
                <Form.Select 
                  name="status" 
                  value={filters.status} 
                  onChange={handleFilterChange}
                >
                  <option value="all">Все статусы</option>
                  <option value="planned">Запланировано</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершено</option>
                  <option value="on_hold">На паузе</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Приоритет</Form.Label>
                <Form.Select 
                  name="priority" 
                  value={filters.priority} 
                  onChange={handleFilterChange}
                >
                  <option value="all">Все приоритеты</option>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Поиск</Form.Label>
                <Form.Control 
                  type="text" 
                  name="search" 
                  value={filters.search} 
                  onChange={handleFilterChange}
                  placeholder="Поиск по названию или описанию" 
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {myTasks.length === 0 ? (
        <Alert variant="info">
          Задачи не найдены. Проверьте настройки фильтров или обратитесь к менеджеру проекта для назначения задач.
        </Alert>
      ) : (
        <Table responsive striped hover>
          <thead>
            <tr>
              <th>Название</th>
              <th>Статус</th>
              <th>Приоритет</th>
              <th>Проект</th>
              <th>Сроки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {myTasks.map(task => (
              <tr key={task.id}>
                <td>
                  <div>{task.title}</div>
                  <small className="text-muted">{task.description && task.description.length > 50 
                    ? `${task.description.substring(0, 50)}...` 
                    : task.description}</small>
                </td>
                <td>{getStatusBadge(task.status)}</td>
                <td>{getPriorityBadge(task.priority)}</td>
                <td>{task.project ? task.project.name : 'Не указан'}</td>
                <td>
                  {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewTask(task.id)}
                    disabled={loading}
                  >
                    Просмотр
                  </Button>
                  {' '}
                  {task.status !== 'completed' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleUpdateStatus(task.id, 'completed')}
                      disabled={loading}
                    >
                      Завершить
                    </Button>
                  )}
                  {task.status === 'planned' && (
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                      disabled={loading}
                    >
                      Начать
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      {/* Модальное окно с детальной информацией о задаче */}
      <Modal 
        show={showTaskDetail} 
        onHide={() => setShowTaskDetail(false)} 
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Информация о задаче</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask && (
            <TaskDetail 
              task={selectedTask} 
              onTaskUpdate={handleTaskUpdate}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTaskDetail(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Tasks; 