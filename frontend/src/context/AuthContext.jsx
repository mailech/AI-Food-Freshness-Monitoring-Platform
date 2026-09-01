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
    const saved = localStorage.getItem("ffm_user");
    return saved
      ? JSON.parse(saved)
      : {
          id: "usr-demo-01",
          name: "Dr. Elena Rostova",
          email: "elena.inspector@freshguard.io",
          role: "Food Quality Inspector",
          token: "demo-jwt-token-active",
        };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  useEffect(() => {
    if (user) {
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

  const logout = () => {
    setUser(null);
  };

  const setRole = (newRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
