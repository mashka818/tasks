import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Modal } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthService, api } from '../services';
import { setAuthHeader } from '../utils/tokenUtils';

function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Состояния для модального окна сброса пароля
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    // Запрашиваем разрешение на показ уведомлений
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    // Check for expired token message in URL
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('expired') === 'true') {
      setError('Время сессии истекло. Пожалуйста, войдите снова.');
      toast.info('Время сессии истекло. Пожалуйста, войдите снова.');
    }
  }, [location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!username.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    setLoading(true);
    
    try {
      const userData = await AuthService.login(username, password);
      
      // Ensure token is properly set in localStorage and API headers
      if (userData.accessToken) {
        console.log('Token received:', userData.accessToken.substring(0, 10) + '...');
        // Set token in axios headers for all future requests
        setAuthHeader(api, userData.accessToken);
        
        // Set user in parent component
        setUser(userData);
        
        toast.success('Вход выполнен успешно!');
        
        // Добавляем задержку перед переадресацией для обеспечения сохранения токена
        setTimeout(() => {
          // Force a full page reload to ensure a clean state with the token properly set
          window.location.href = '/dashboard';
        }, 100);
      } else {
        throw new Error('Токен не получен от сервера');
      }
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Ошибка при входе в систему';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Пользователь не найден';
        } else if (err.response.status === 401) {
          errorMessage = 'Неверный пароль';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    
    // Валидация
    if (!resetEmail.trim()) {
      setResetError('Пожалуйста, укажите email');
      return;
    }
    
    if (!newPassword.trim()) {
      setResetError('Пожалуйста, введите новый пароль');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetError('Пароли не совпадают');
      return;
    }
    
    if (newPassword.length < 6) {
      setResetError('Пароль должен содержать не менее 6 символов');
      return;
    }
    
    setResetLoading(true);
    
    try {
      await AuthService.resetPassword(resetEmail, newPassword);
      toast.success('Пароль успешно обновлен');
      setShowResetModal(false);
      
      // Очищаем поля формы
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Reset password error:', err);
      let errorMessage = 'Ошибка при сбросе пароля';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Пользователь с указанным email не найден';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }
      
      setResetError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="page-container d-flex align-items-center justify-content-center">
      <Card className="auth-form">
        <Card.Body>
          <h2 className="text-center mb-4">Вход в систему</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Имя пользователя</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите имя пользователя"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Пароль</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
              {loading ? 'Загрузка...' : 'Войти'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <p>
              Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
            </p>
            <p>
              <a href="#" onClick={(e) => {
                e.preventDefault();
                setResetEmail(username.includes('@') ? username : '');
                setShowResetModal(true);
              }}>
                Забыли пароль?
              </a>
            </p>
          </div>
        </Card.Body>
      </Card>
      
      {/* Модальное окно сброса пароля */}
      <Modal show={showResetModal} onHide={() => setShowResetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Сброс пароля</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetError && <Alert variant="danger">{resetError}</Alert>}
          <Form onSubmit={handleResetPassword}>
            <Form.Group className="mb-3" controlId="resetEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Введите ваш email"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="newPassword">
              <Form.Label>Новый пароль</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Введите новый пароль"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Подтверждение пароля</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Подтвердите новый пароль"
                required
              />
            </Form.Group>
            
            <div className="d-grid">
              <Button variant="primary" type="submit" disabled={resetLoading}>
                {resetLoading ? 'Сохранение...' : 'Сохранить новый пароль'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Login; 