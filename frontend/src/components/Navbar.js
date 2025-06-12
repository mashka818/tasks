import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';
import { AuthService, api } from '../services';
import { setAuthHeader } from '../utils/tokenUtils';

function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clean up auth state
    AuthService.logout();
    
    // Clear auth header
    setAuthHeader(api, null);
    
    // Update app state
    setUser(null);
    
    // Force a full page reload to ensure a clean state
    window.location.href = '/login';
  };

  // Check if user has a specific role
  const hasRole = (roleName) => {
    return user && user.roles && (
      user.roles.includes(roleName) || 
      user.roles.includes(`ROLE_${roleName.toUpperCase()}`)
    );
  };

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isWorker = !isAdmin && !isManager;

  return (
    <BootstrapNavbar bg="primary" variant="dark" expand="lg" className="mb-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Container style={{ maxWidth: '1320px' }}>
        <BootstrapNavbar.Brand as={Link} to="/" className="fw-bold">
          <i className="bi bi-kanban me-2"></i>
          Управление проектами
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          {user ? (
            <>
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/dashboard">
                  <i className="bi bi-speedometer2 me-1"></i> Дашборд
                </Nav.Link>
                <Nav.Link as={Link} to="/projects">
                  <i className="bi bi-folder me-1"></i> Проекты
                </Nav.Link>
                {isWorker && (
                  <Nav.Link as={Link} to="/tasks">
                    <i className="bi bi-check2-square me-1"></i> Задачи
                  </Nav.Link>
                )}
                {isAdmin && (
                  <Nav.Link as={Link} to="/admin">
                    <i className="bi bi-shield-lock me-1"></i> Панель администратора
                  </Nav.Link>
                )}
              </Nav>
              <Nav>
                <Nav.Link as={Link} to="/profile">
                  <i className="bi bi-person-circle me-1"></i> Профиль
                </Nav.Link>
                <Button className="btn-accent ms-2" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-1"></i> Выйти
                </Button>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login">
                <i className="bi bi-box-arrow-in-right me-1"></i> Войти
              </Nav.Link>
              <Button as={Link} to="/register" className="btn-accent ms-2">
                <i className="bi bi-person-plus me-1"></i> Регистрация
              </Button>
            </Nav>
          )}
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar; 