import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { authService } from '../services/auth.service';
import type { User } from '../types/auth.types';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  verifyPassword: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('@mannerhouse:token');
    const storedUser = localStorage.getItem('@mannerhouse:user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('@mannerhouse:token');
        localStorage.removeItem('@mannerhouse:user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await authService.login(email, password);
      const { token, user } = response;

      localStorage.setItem('@mannerhouse:token', token);
      localStorage.setItem('@mannerhouse:user', JSON.stringify(user));

      setToken(token);
      setUser(user);
      setIsAuthenticated(true);

      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('@mannerhouse:token');
    localStorage.removeItem('@mannerhouse:user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/verify-password', { password });
      return response.data.valid === true;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout, verifyPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};