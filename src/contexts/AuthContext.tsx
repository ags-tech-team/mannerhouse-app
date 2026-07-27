import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthState } from '../types/auth.types';
import { authService } from '../services/auth.service';

interface AuthContextData extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('@barbershop:token');
    const user = localStorage.getItem('@barbershop:user');

    if (token && user) {
      try {
        setState({
          user: JSON.parse(user),
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const { token, user } = response;

    localStorage.setItem('@barbershop:token', token);
    localStorage.setItem('@barbershop:user', JSON.stringify(user));

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('@barbershop:token');
    localStorage.removeItem('@barbershop:user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const register = async (data: any) => {
    await authService.register(data);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};