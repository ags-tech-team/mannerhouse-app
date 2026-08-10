import { api } from '../api/client';
import type { RevenueService, RevenueSummary } from '../types/revenue.types';

export const revenueService = {
  async getAll(filtros?: {
    dataInicio?: string;
    dataFim?: string;
    barbeiroId?: string;
    status?: string;
  }): Promise<RevenueService[]> {
    const response = await api.get('/revenue', { params: filtros });
    return response.data;
  },

  async getSummary(periodo: 'hoje' | 'semana' | 'mes'): Promise<RevenueSummary> {
    const response = await api.get('/revenue/summary', { params: { periodo } });
    return response.data;
  },

  async create(data: Omit<RevenueService, 'id'>): Promise<RevenueService> {
    const response = await api.post('/revenue', data);
    return response.data;
  },

  async update(id: string, data: Partial<RevenueService>): Promise<RevenueService> {
    const response = await api.put(`/revenue/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/revenue/${id}`);
  },

  async exportar(filtros?: any): Promise<Blob> {
    const response = await api.get('/revenue/export', { 
      params: filtros,
      responseType: 'blob' 
    });
    return response.data;
  }
};