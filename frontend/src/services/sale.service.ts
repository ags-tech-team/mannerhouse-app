import { api } from '../api/client';

export interface Sale {
  id: string;
  barberId: string;
  clientId: string;
  productId: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  profit: number;
  commission: number;
  date: string;
  paymentMethod: string;
}

export interface CreateSaleData {
  barberId: string;
  clientName?: string;
  clientPhone?: string;
  productId: string;
  quantity: number;
  paymentMethod: string;
}

export const saleService = {
  async getAll(params?: { startDate?: string; endDate?: string; barberId?: string }): Promise<Sale[]> {
    const response = await api.get('/sales', { params });
    return response.data;
  },

  async create(data: CreateSaleData): Promise<Sale> {
    const response = await api.post('/sales', data);
    return response.data;
  },

  async update(id: string, data: Partial<Sale>): Promise<Sale> {
    const response = await api.put(`/sales/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sales/${id}`);
  },
};