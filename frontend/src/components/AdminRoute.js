import React from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// AdminRoute is a wrapper component that checks if the user has an admin role
// If not, it redirects to the dashboard page
const AdminRoute = ({ user, children }) => {
  // Function to check if user has admin role
  const isAdmin = () => {
    if (!user || !user.roles) return false;
    
    return user.roles.some(role => 
      role === 'admin' || 
      role === 'ROLE_ADMIN'
    );
  };

  if (!user) {
    toast.error('Требуется авторизация');
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    toast.error('Доступ запрещен. Требуются права администратора');
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default AdminRoute; 