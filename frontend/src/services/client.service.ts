import { api } from '../api/client';

export interface Client {
  id: string;
  name: string;
  phone: string; // 🔥 REMOVER EMAIL
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  name: string;
  phone: string; // 🔥 REMOVER EMAIL
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
};