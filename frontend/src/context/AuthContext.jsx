import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const DEMO_USERS = {
  administrator: { email: 'admin@foodfresh.io', role: 'administrator', name: 'System Administrator', dept: 'HQ Engineering' },
  consumer: { email: 'consumer@foodfresh.io', role: 'consumer', name: 'Sarah Jenkins', dept: 'Household Pantry' },
  retail_manager: { email: 'retail@foodfresh.io', role: 'retail_manager', name: 'Marcus Vance', dept: 'Store #104 - Fresh Produce' },
  warehouse_operator: { email: 'warehouse@foodfresh.io', role: 'warehouse_operator', name: 'David Chen', dept: 'Central Cold Logistics Hub' },
  food_quality_inspector: { email: 'inspector@foodfresh.io', role: 'food_quality_inspector', name: 'Elena Rostova', dept: 'State Agri-Food Safety Board' }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ff_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await api.getMe(token);
          setUser(userData);
        } catch {
          // Token expired or invalid
          setToken('');
          setUser(null);
          localStorage.removeItem('ff_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('ff_token', res.access_token);
    return res.user;
  };

  const register = async (data) => {
    const res = await api.register(data);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('ff_token', res.access_token);
    return res.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('ff_token');
  };

  const switchRole = async (targetRole) => {
    const demo = DEMO_USERS[targetRole] || DEMO_USERS.retail_manager;
    try {
      const res = await api.login(demo.email, 'password123');
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('ff_token', res.access_token);
      return res.user;
    } catch {
      // Fallback local mock user if offline
      const mock = {
        id: 1,
        email: demo.email,
        full_name: demo.name,
        role: demo.role,
        department: demo.dept,
        is_active: true
      };
      setUser(mock);
      return mock;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
