import { api } from '../api/client';

export interface Plan {
  id: 'inicial' | 'basico' | 'plus' | 'premium';
  name: string;
  price: number;
  days: number[];
  displayOrder: number;
}

export const planService = {
  async getAll(): Promise<Plan[]> {
    const response = await api.get('/plans');
    return response.data;
  },

  async update(id: string, price: number): Promise<Plan> {
    const response = await api.put(`/plans/${id}`, { price });
    return response.data;
  },
};