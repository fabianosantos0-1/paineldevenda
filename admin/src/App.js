import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminSupremo from './pages/AdminSupremo';
import Suporte from './pages/Suporte';
import Sub from './pages/Sub';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { isAuthenticated, loading, admin } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Redirecionamento baseado no nível/tipo do admin
  const isAdminOrFunc = admin?.nivel === 'supreme' || admin?.tipo === 'admin' || admin?.tipo === 'funcionario';

  const getDashboardRoute = () => {
    if (isAdminOrFunc) return '/admin-supremo';
    switch (admin?.nivel) {
      case 'atendente':
        return '/suporte';
      case 'revendedor':
        return '/sub';
      default:
        return '/admin-supremo';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={getDashboardRoute()} replace />} />
      <Route 
        path="/admin-supremo/*" 
        element={
          isAdminOrFunc ? 
          <AdminSupremo /> : 
          <Navigate to={getDashboardRoute()} replace />
        } 
      />
      <Route 
        path="/suporte/*" 
        element={
          admin?.nivel === 'atendente' ? 
          <Suporte /> : 
          <Navigate to={getDashboardRoute()} replace />
        } 
      />
      <Route 
        path="/sub/*" 
        element={
          admin?.nivel === 'revendedor' ? 
          <Sub /> : 
          <Navigate to={getDashboardRoute()} replace />
        } 
      />
      <Route path="/" element={<Navigate to={getDashboardRoute()} replace />} />
      <Route path="*" element={<Navigate to={getDashboardRoute()} replace />} />
    </Routes>
  );
}

export default App;
