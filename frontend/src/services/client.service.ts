import { api } from '../api/client';

export interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly?: boolean;
  monthlyFee?: number;
  isActive: boolean;
  isBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  name: string;
  phone: string;
  isMonthly?: boolean;
  monthlyFee?: number;
}

export const clientService = {
  async getAll(): Promise<Client[]> {
    const response = await api.get('/clients');
    return response.data;
  },

  async getById(id: string): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  async create(data: CreateClientData): Promise<Client> {
    const response = await api.post('/clients', data);
    return response.data;
  },

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  async search(query: string): Promise<Client[]> {
    const response = await api.get('/clients/search', { params: { q: query } });
    return response.data;
  },

  // 🔥 NOVO
  async block(id: string): Promise<{ message: string; client: Client }> {
    const response = await api.patch(`/clients/${id}/block`);
    return response.data;
  },

  // 🔥 NOVO
  async unblock(id: string): Promise<{ message: string; client: Client }> {
    const response = await api.patch(`/clients/${id}/unblock`);
    return response.data;
  },
};