import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));

  const login = async (email, password) => {
    const res = await axios.post('http://localhost:8000/api/auth/login', { email, password });
    setToken(res.data.access_token);
    setUserRole(res.data.role);
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('role', res.data.role);
  };

  const register = async (email, password, role) => {
    await axios.post('http://localhost:8000/api/auth/register', { email, password, role });
    await login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUserRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ token, userRole, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};