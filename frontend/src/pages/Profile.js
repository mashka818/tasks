import React, { useState, useRef } from 'react';
import { Card, Button, Form, Row, Col, Alert, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import UserService from '../services/user.service';

function Profile({ user, setUser }) {
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    position: user.position || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': user.accessToken
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          position: formData.position
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      
      const updatedUser = {
        ...user,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        position: formData.position
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setSuccess('Профиль успешно обновлен');
      toast.success('Профиль успешно обновлен');
      setEditMode(false);
    } catch (err) {
      setError('Ошибка при обновлении профиля');
      toast.error('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccess('');
    
    // Валидация
    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': user.accessToken
        },
        body: JSON.stringify({
          password: formData.newPassword
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update password');
      }
      
      setSuccess('Пароль успешно изменен');
      toast.success('Пароль успешно изменен');
      
      // Сбрасываем поля
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setPasswordMode(false);
    } catch (err) {
      setPasswordError('Ошибка при смене пароля');
      toast.error('Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      toast.error('Файл слишком большой. Максимальный размер 5MB.');
      return;
    }

    setImageLoading(true);

    try {
      const result = await UserService.uploadProfileImage(file);
      
      // Обновляем пользователя с новым изображением
      const updatedUser = {
        ...user,
        profileImage: result.profileImage
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast.success('Фото профиля успешно обновлено');
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="mb-4">Профиль пользователя</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Личная информация</h5>
                {!editMode && (
                  <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
                    Редактировать
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {editMode ? (
                <Form onSubmit={handleProfileUpdate}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Полное имя</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="fullName" 
                          value={formData.fullName} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control 
                          type="email" 
                          name="email" 
                          value={formData.email} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Телефон</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Должность</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="position" 
                          value={formData.position} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-end mt-3">
                    <Button variant="secondary" className="me-2" onClick={() => setEditMode(false)}>
                      Отмена
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </Form>
              ) : (
                <div>
                  <Row className="mb-3">
                    <Col md={3}>
                      <strong>Имя пользователя:</strong>
                    </Col>
                    <Col md={9}>
                      {user.username}
                    </Col>
                  </Row>
                  
                  <Row className="mb-3">
                    <Col md={3}>
                      <strong>Полное имя:</strong>
                    </Col>
                    <Col md={9}>
                      {user.fullName || 'Не указано'}
                    </Col>
                  </Row>
                  
                  <Row className="mb-3">
                    <Col md={3}>
                      <strong>Email:</strong>
                    </Col>
                    <Col md={9}>
                      {user.email}
                    </Col>
                  </Row>
                  
                  <Row className="mb-3">
                    <Col md={3}>
                      <strong>Телефон:</strong>
                    </Col>
                    <Col md={9}>
                      {user.phone || 'Не указан'}
                    </Col>
                  </Row>
                  
                  <Row className="mb-3">
                    <Col md={3}>
                      <strong>Должность:</strong>
                    </Col>
                    <Col md={9}>
                      {user.position || 'Не указана'}
                    </Col>
                  </Row>
                  
                  <Row className="mb-3">
                    <Col md={3}>
                      <strong>Роли:</strong>
                    </Col>
                    <Col md={9}>
                      {user.roles.map(role => role.replace('ROLE_', '')).join(', ')}
                    </Col>
                  </Row>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Безопасность</h5>
                {!passwordMode && (
                  <Button variant="primary" size="sm" onClick={() => setPasswordMode(true)}>
                    Изменить пароль
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {passwordMode ? (
                <Form onSubmit={handlePasswordChange}>
                  {passwordError && <Alert variant="danger">{passwordError}</Alert>}
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Текущий пароль</Form.Label>
                    <Form.Control 
                      type="password" 
                      name="currentPassword" 
                      value={formData.currentPassword} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Новый пароль</Form.Label>
                    <Form.Control 
                      type="password" 
                      name="newPassword" 
                      value={formData.newPassword} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Подтверждение нового пароля</Form.Label>
                    <Form.Control 
                      type="password" 
                      name="confirmPassword" 
                      value={formData.confirmPassword} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </Form.Group>
                  
                  <div className="d-flex justify-content-end mt-3">
                    <Button variant="secondary" className="me-2" onClick={() => setPasswordMode(false)}>
                      Отмена
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Сохранение...' : 'Изменить пароль'}
                    </Button>
                  </div>
                </Form>
              ) : (
                <p>Здесь вы можете изменить свой пароль для входа в систему.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Сведения об аккаунте</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/jpeg, image/png, image/gif"
                  onChange={handleImageChange}
                />
                
                {user.profileImage ? (
                  <div className="position-relative mb-3">
                    <Image 
                      src={`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:8080'}${user.profileImage.startsWith('/') ? user.profileImage : `/${user.profileImage}`}`}
                      alt={user.fullName}
                      className="rounded-circle"
                      style={{ width: '120px', height: '120px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={handleImageClick}
                    />
                    {imageLoading && (
                      <div className="position-absolute top-50 start-50 translate-middle">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: '120px', height: '120px', fontSize: '2.5rem', cursor: 'pointer' }}
                    onClick={handleImageClick}
                  >
                    {imageLoading ? (
                      <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
                <p className="text-muted small mt-2">Нажмите на изображение для загрузки фото</p>
                <h5>{user.fullName || user.username}</h5>
                <p className="text-muted">{user.position || 'Сотрудник'}</p>
              </div>
              
              <div className="mb-3">
                <h6>Последний вход:</h6>
                <p className="text-muted">Сегодня, {new Date().toLocaleTimeString()}</p>
              </div>
              
              <Button 
                variant="outline-danger" 
                className="w-100"
                onClick={() => {
                  AuthService.logout();
                  setUser(null);
                  window.location.href = '/login';
                }}
              >
                Выйти из системы
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Profile; 