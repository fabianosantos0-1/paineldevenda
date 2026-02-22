import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setAdmin(response.data);
    } catch (error) {
      localStorage.removeItem('adminToken');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/admin/login', credentials);
      const { access_token, admin: adminData } = response.data;
      
      localStorage.setItem('adminToken', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setAdmin(adminData);
      
      return { success: true, admin: adminData };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erro ao fazer login' 
      };
    }
  };

  const logout = async () => {
    if (admin && admin.tipo === 'funcionario') {
      try {
        await axios.post('/api/admin/ponto/logout');
      } catch (err) {
        console.error('Erro ao registrar logout no ponto:', err);
      }
    }
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setAdmin(null);
  };

  // Detectar fechamento de página para registrar logout automático
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (admin && admin.tipo === 'funcionario') {
        const tk = localStorage.getItem('adminToken');
        if (tk) {
          navigator.sendBeacon('/api/admin/ponto/logout', JSON.stringify({}));
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [admin]);

  const isAdmin = admin?.tipo === 'admin';
  const isGerente = admin?.cargo === 'gerente';

  const hasPermission = useCallback((permissao) => {
    if (!admin) return false;
    if (admin.tipo === 'admin') return true;
    return (admin.permissoes || []).includes(permissao);
  }, [admin]);

  const value = {
    admin,
    token,
    loading,
    login,
    logout,
    isAdmin,
    isGerente,
    hasPermission,
    isAuthenticated: !!token && !!admin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
