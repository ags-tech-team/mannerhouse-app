import { api } from '../api/client';
import type { Barber } from '../types/barber.types';

export const barberService = {
  async getAll(): Promise<Barber[]> {
    const response = await api.get('/barbers');
    return response.data;
  },

  async getById(id: string): Promise<Barber | undefined> {
    const response = await api.get(`/barbers/${id}`);
    return response.data;
  },

  async create(data: Omit<Barber, 'id' | 'createdAt'>): Promise<Barber> {
    const response = await api.post('/barbers', data);
    return response.data;
  },

  async update(id: string, data: Partial<Omit<Barber, 'id' | 'createdAt'>>): Promise<Barber> {
    const response = await api.put(`/barbers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/barbers/${id}`);
  },
};