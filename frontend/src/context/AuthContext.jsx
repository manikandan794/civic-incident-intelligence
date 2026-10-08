import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('urbangrid_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiRequest('/auth/me');
        setUser(me);
      } catch (err) {
        console.error('Failed to verify token:', err);
        localStorage.removeItem('urbangrid_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('urbangrid_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    localStorage.setItem('urbangrid_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('urbangrid_token');
    setToken(null);
    setUser(null);
  };

  const quickLogin = async (targetRole) => {
    if (targetRole === 'OFFICER') {
      return await login('officer@chennai.urbangrid.gov.in', 'Officer@1234');
    } else if (targetRole === 'WORKER') {
      return await login('worker.karthik@worker.urbangrid.gov.in', 'Worker@1234');
    } else if (targetRole === 'CITIZEN') {
      return await login('citizen.anbu@gmail.com', 'Citizen@1234');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, role: user?.role || 'GUEST', loading, login, register, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
