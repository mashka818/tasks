import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Modal, Card, Alert, Badge, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { UserService } from '../services';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleSelections, setRoleSelections] = useState({
    admin: false,
    manager: false,
    user: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Fetch all users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await UserService.getAllUsers();
      setUsers(response);
      setError('');
      setSearchQuery(''); // Сбросить поисковый запрос при обновлении списка
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Ошибка при получении списка пользователей');
      toast.error('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    try {
      // Проверяем, не пуст ли поисковый запрос
      if (!searchQuery || !searchQuery.trim()) {
        // Если поле поиска пустое, просто загружаем всех пользователей
        fetchUsers();
        return;
      }
      
      setSearching(true);
      setError(''); // Сбросить предыдущие ошибки
      console.log('Searching for users with query:', searchQuery);
      
      // Проверяем длину поискового запроса
      if (searchQuery.trim().length < 2) {
        toast.warning('Введите не менее 2 символов для поиска');
        setSearching(false);
        return;
      }
      
      // Очищаем запрос
      const cleanQuery = searchQuery.trim();
      console.log('Clean search query:', cleanQuery);
      
      try {
        // Используем сервис для поиска пользователей
        const results = await UserService.searchUsers(cleanQuery);
        
        // Проверяем, что результаты - это массив
        const validResults = Array.isArray(results) ? results : [];
        console.log('Search results:', validResults);
        
        // Устанавливаем результаты
        setUsers(validResults);
        
        // Показываем уведомление, если ничего не найдено
        if (validResults.length === 0) {
          toast.info(`По запросу "${cleanQuery}" ничего не найдено`);
        }
      } catch (searchError) {
        console.error('Search service error:', searchError);
        toast.error('Не удалось выполнить поиск. Пожалуйста, попробуйте позже.');
        setUsers([]);
      }
    } catch (globalError) {
      console.error('Global error in search handler:', globalError);
      toast.error('Произошла ошибка при поиске');
      setUsers([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    fetchUsers();
  };

  const handleEditRoles = (user) => {
    setSelectedUser(user);
    
    // Reset role selections
    const initialRoles = {
      admin: false,
      manager: false,
      user: true // User role is default
    };
    
    // Set current roles
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach(role => {
        // Make sure role is a string before using toLowerCase
        const roleStr = typeof role === 'string' ? role : 
                       (role && role.name ? role.name : String(role));
        const roleName = roleStr.toLowerCase().replace('role_', '');
        if (initialRoles.hasOwnProperty(roleName)) {
          initialRoles[roleName] = true;
        }
      });
    }
    
    setRoleSelections(initialRoles);
    setShowEditModal(true);
  };

  const handleRoleChange = (role) => {
    const newSelections = {
      ...roleSelections,
      [role]: !roleSelections[role]
    };
    
    // Ensure at least one role is selected
    const hasAnyRole = Object.values(newSelections).some(isSelected => isSelected);
    
    if (!hasAnyRole) {
      toast.warning('Пользователь должен иметь хотя бы одну роль');
      // Keep the role that was about to be unselected
      return;
    }
    
    // If trying to add admin role, also add user role by default
    if (role === 'admin' && newSelections.admin && !newSelections.user) {
      newSelections.user = true;
    }
    
    // If trying to add manager role, also add user role by default
    if (role === 'manager' && newSelections.manager && !newSelections.user) {
      newSelections.user = true;
    }
    
    setRoleSelections(newSelections);
  };

  const saveUserRoles = async () => {
    try {
      // Convert role selections to array of role names
      const selectedRoles = Object.entries(roleSelections)
        .filter(([_, isSelected]) => isSelected)
        .map(([role, _]) => role);

      // Ensure at least one role is selected
      if (selectedRoles.length === 0) {
        toast.error('Пользователь должен иметь хотя бы одну роль');
        return;
      }
      
      // If user is removing admin role from themselves, show warning
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (currentUser && 
          currentUser.id === selectedUser.id && 
          selectedUser.roles.some(r => typeof r === 'string' && r.toLowerCase().includes('admin')) &&
          !selectedRoles.includes('admin')) {
        if (!window.confirm('Вы собираетесь удалить права администратора у своей учетной записи. Это действие может привести к потере доступа к панели администратора. Продолжить?')) {
          return;
        }
      }

      console.log('Sending role update with roles:', selectedRoles);
      
      const result = await UserService.updateUserRoles(selectedUser.id, selectedRoles);
      console.log('Role update response:', result);
      
      toast.success('Роли пользователя обновлены');
      setShowEditModal(false);
      
      // Refresh the user list to ensure data consistency
      fetchUsers();
    } catch (err) {
      console.error('Error updating user roles:', err);
      
      // Show more detailed error information if available
      let errorMessage = 'Ошибка при обновлении ролей пользователя';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage += `: ${err.response.data.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const getRoleBadges = (userRoles) => {
    if (!userRoles || userRoles.length === 0) {
      return <Badge bg="secondary">Нет ролей</Badge>;
    }
    
    return userRoles.map(role => {
      // Make sure role is a string before using replace
      const roleStr = typeof role === 'string' ? role : 
                     (role && role.name ? role.name : String(role));
      const roleName = roleStr.replace('ROLE_', '').toLowerCase();
      let badgeColor = 'secondary';
      
      switch (roleName) {
        case 'admin':
          badgeColor = 'danger';
          break;
        case 'manager':
          badgeColor = 'primary';
          break;
        case 'user':
          badgeColor = 'success';
          break;
        default:
          badgeColor = 'info';
      }
      
      return (
        <Badge bg={badgeColor} className="me-1" key={roleStr}>
          {roleName}
        </Badge>
      );
    });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="mb-4">Панель администратора</h1>
      
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Управление пользователями</h5>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}
          
          <div className="d-flex justify-content-between mb-3">
            <Button 
              variant="primary"
              onClick={fetchUsers}
              disabled={loading || searching}
            >
              {loading ? "Загрузка..." : "Обновить список"}
            </Button>
            
            <Form onSubmit={handleSearch} className="d-flex">
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={clearSearch}
                  >
                    ✕
                  </Button>
                )}
                <Button 
                  variant="outline-primary" 
                  type="submit"
                  disabled={searching}
                >
                  {searching ? "Поиск..." : "Поиск"}
                </Button>
              </InputGroup>
            </Form>
          </div>
          
          {users.length === 0 ? (
            <Alert variant="info">
              {searchQuery ? `Пользователи по запросу "${searchQuery}" не найдены` : "Пользователи не найдены"}
            </Alert>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th>Роли</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{getRoleBadges(user.roles)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEditRoles(user)}
                      >
                        Изменить роли
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
      
      {/* Modal for editing user roles */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Изменение ролей пользователя {selectedUser?.username}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Роли пользователя</Form.Label>
              <div>
                <Form.Check 
                  type="checkbox"
                  id="role-admin"
                  label="Администратор"
                  checked={roleSelections.admin}
                  onChange={() => handleRoleChange('admin')}
                  className="mb-2"
                />
                <Form.Check 
                  type="checkbox"
                  id="role-manager"
                  label="Менеджер"
                  checked={roleSelections.manager}
                  onChange={() => handleRoleChange('manager')}
                  className="mb-2"
                />
                <Form.Check 
                  type="checkbox"
                  id="role-user"
                  label="Пользователь"
                  checked={roleSelections.user}
                  onChange={() => handleRoleChange('user')}
                />
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={saveUserRoles}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminPanel; 