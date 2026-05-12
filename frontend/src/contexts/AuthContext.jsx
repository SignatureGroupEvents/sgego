import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromToken = useCallback((token) => {
    if (!token) {
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      return Promise.resolve();
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return api
      .get('/auth/profile')
      .then((response) => setUser(response.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
      });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUserFromToken(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadUserFromToken]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.storageArea !== localStorage) return;
      if (e.key !== 'token' && e.key !== null) return;
      if (e.key === null) {
        if (!localStorage.getItem('token')) {
          loadUserFromToken(null).finally(() => setLoading(false));
        }
        return;
      }
      loadUserFromToken(e.newValue).finally(() => setLoading(false));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadUserFromToken]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
