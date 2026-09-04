import { api } from '../api/client';

export interface CashRegister {
  id: string;
  userId: string;
  date: string;
  isOpen: boolean;
  openingTime?: string;
  closingTime?: string;
  initialCash: number;
  finalCash?: number;
  services: any[];
  totalRevenue: number;
  totalCommissions: number;
  servicesCount: number;
  barber?: { // 🔥 ADICIONAR
    id: string;
    name: string;
  } | null;
}

export const cashRegisterService = {
  // Buscar caixa do dia
  async getToday(): Promise<CashRegister> {
    const response = await api.get('/cash-register/today');
    return response.data;
  },

  // Abrir caixa
  async open(initialCash: number, barberId?: string) {
    const response = await api.post('/cash-register/open', { initialCash, barberId });
    return response.data;
  },

  // Fechar caixa
  async close(): Promise<CashRegister> {
    const response = await api.post('/cash-register/close');
    return response.data;
  },

  // 🔥 Adicionar serviço ao caixa com comissão
  async addService(data: {
    client: string;
    barberId: string;
    service: string;
    serviceId?: string;
    price: number;
    commission: number; // 🔥 OBRIGATÓRIO - comissão calculada
    paymentMethod: string;
    date: string;
    time: string;
    phone?: string;
  }): Promise<any> {
    const response = await api.post('/cash-register/service', data);
    return response.data;
  },

  // Remover serviço do caixa
  async removeService(serviceId: string): Promise<void> {
    await api.delete(`/cash-register/service/${serviceId}`);
  },

  // Buscar histórico
  async getHistory(startDate?: string, endDate?: string): Promise<CashRegister[]> {
    const response = await api.get('/cash-register/history', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async updateServices(services: any[]): Promise<CashRegister> {
    const response = await api.put('/cash-register/services', { services });
    return response.data;
  },
};