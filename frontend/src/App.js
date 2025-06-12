import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

// Services
import { AuthService, api } from './services';
import { setAuthHeader, setupTokenExpiryTimer } from './utils/tokenUtils';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenCheckIntervalRef = useRef(null);

  // Функция для проверки токена
  const checkTokenValidity = async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      
      if (!currentUser || !currentUser.accessToken) {
        console.log('No user or token in localStorage');
        return false;
      }
      
      const result = await AuthService.checkToken();
      
      if (!result.valid) {
        console.log('Token check failed, logging out');
        AuthService.logout();
        setUser(null);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking token:', error);
      return false;
    }
  };

  // Запускаем первоначальную проверку и настраиваем интервал
  useEffect(() => {
    // Initialize user from localStorage
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      
      // Make sure token is set in API headers
      if (currentUser.accessToken) {
        setAuthHeader(api, currentUser.accessToken);
        
        // Setup token expiry timer
        setupTokenExpiryTimer();
      }
      
      // Проверяем валидность токена
      checkTokenValidity();
    }
    setLoading(false);
    
    // Устанавливаем интервал проверки токена (каждые 15 минут)
    tokenCheckIntervalRef.current = setInterval(() => {
      console.log('Running periodic token check');
      checkTokenValidity();
    }, 15 * 60 * 1000); // 15 минут
    
    // Очищаем интервал при размонтировании компонента
    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>;
  }

  return (
    <div className="App">
      <Navbar user={user} setUser={setUser} />
      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute user={user}>
              <Projects />
            </ProtectedRoute>
          } />
          
          <Route path="/projects/:id" element={
            <ProtectedRoute user={user}>
              <ProjectDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/tasks" element={
            <ProtectedRoute user={user}>
              <Tasks />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute user={user}>
              <Profile user={user} setUser={setUser} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <AdminRoute user={user}>
              <AdminPanel />
            </AdminRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App; 