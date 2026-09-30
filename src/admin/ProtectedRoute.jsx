import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, roles = ['ADMIN', 'TECHNICIAN'] }) {
  let user;
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  if (!localStorage.getItem('token') || !userRoles.length) return <Navigate to="/login" replace />;
  if (!roles.some(role => userRoles.includes(role))) {
    const home = userRoles.some(role => ['ADMIN', 'TECHNICIAN'].includes(role)) ? '/admin' : userRoles.includes('CLIENT') ? '/portal' : '/login';
    return <Navigate to={home} replace />;
  }
  return children;
}
