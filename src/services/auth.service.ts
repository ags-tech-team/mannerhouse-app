import { api } from '../api/client';
import type { User } from '../types/auth.types';

interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/login', { email, password });
    return response.data;
  },

  async register(data: any): Promise<any> {
    const response = await api.post('/register', data);
    return response.data;
  },
};