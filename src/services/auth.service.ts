import { api } from '../api/client';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'barber';
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async getMe(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  },
};