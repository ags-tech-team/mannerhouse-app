import { api } from '../api/client';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  barberId: string;
  clientId: string;
  date: string;
  time: string;
  service: 'corte' | 'barba' | 'corte_barba' | 'sobrancelha' | 'outro';
  serviceDescription: string;
  price: number;
  commission: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  Barber?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  Client?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

// 🔥 CreateAppointmentData com commission obrigatório
export interface CreateAppointmentData {
  barberId: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  date: string;
  time: string;
  service: string;
  serviceDescription?: string;
  price: number;
  commission: number; // 🔥 OBRIGATÓRIO
  notes?: string;
}

export const appointmentService = {
  async getAll(params?: { startDate?: string; endDate?: string; barberId?: string }): Promise<Appointment[]> {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  async getById(id: string): Promise<Appointment> {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  async getByBarber(barberId: string, date?: string): Promise<Appointment[]> {
    const response = await api.get(`/appointments/barber/${barberId}`, { params: { date } });
    return response.data;
  },

  async getAvailableTimes(barberId: string, date: string): Promise<string[]> {
    const response = await api.get(`/appointments/barber/${barberId}/available`, { params: { date } });
    return response.data;
  },

  async searchClients(query: string): Promise<Client[]> {
    const response = await api.get('/appointments/clients/search', { params: { q: query } });
    return response.data;
  },

  async create(data: CreateAppointmentData): Promise<Appointment> {
    const response = await api.post('/appointments', data);
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<Appointment> {
    const response = await api.patch(`/appointments/${id}/status`, { status });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  },
};