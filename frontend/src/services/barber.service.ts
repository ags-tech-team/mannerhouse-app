import { api } from '../api/client';

export interface Barber {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  commissionRate: number;
  serviceCommissionRate: number;
  productCommissionRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  User?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
}

export const barberService = {
  async getAll(): Promise<Barber[]> {
    const response = await api.get('/barbers');
    return response.data;
  },

  async getById(id: string): Promise<Barber> {
    const response = await api.get(`/barbers/${id}`);
    return response.data;
  },

  async create(data: Partial<Barber> & { password: string }): Promise<Barber> {
    const response = await api.post('/barbers', data);
    return response.data;
  },

  async update(id: string, data: Partial<Barber>): Promise<Barber> {
    const response = await api.put(`/barbers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<any> {
  try {
    const response = await api.delete(`/barbers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar barbeiro:', error);
    throw error;
  }
}
};