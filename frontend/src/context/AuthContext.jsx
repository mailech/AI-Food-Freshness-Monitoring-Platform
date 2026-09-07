import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export const ROLES = [
  "Consumer",
  "Retail Manager",
  "Warehouse Operator",
  "Food Quality Inspector",
  "Administrator",
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("ffm_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  useEffect(() => {
    if (user && user.token) {
      localStorage.setItem("ffm_user", JSON.stringify(user));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem("ffm_user");
      setIsAuthenticated(false);
    }
  }, [user]);

  const login = async (email, password, role) => {
    const data = await api.login(email, password, role);
    setUser(data);
    return data;
  };

  const register = async (name, email, password, role) => {
    const data = await api.register(name, email, password, role);
    setUser(data);
    return data;
  };

  const logout = () => {
    setUser(null);
  };

  const setRole = (newRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
