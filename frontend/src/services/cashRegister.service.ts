import { api } from '../api/client';

export interface CashRegister {
  id: string | null;
  userId: string;
  date: string;
  isOpen: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  initialCash: number;
  finalCash?: number | null;
  services: any[];
  totalRevenue: number;
  totalCommissions: number;
  servicesCount: number;
  barber?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  // 🔥 Quem fechou o caixa
  closedByBarber?: {
    id: string;
    name: string;
  } | null;
  // 🔥 Totais por forma de pagamento
  totalsByPayment?: {
    dinheiro: number;
    credito: number;
    debito: number;
    pix: number;
    outros: number;
  };
}

export const cashRegisterService = {
  // Buscar caixa do dia
  async getToday(): Promise<CashRegister> {
    const response = await api.get('/cash-register/today');
    return response.data;
  },

  // Abrir caixa
  async open(initialCash: number, barberId?: string): Promise<CashRegister> {
    const response = await api.post('/cash-register/open', { initialCash, barberId });
    return response.data;
  },

  // 🔥 Fechar caixa (agora com barbeiro que está fechando)
  async close(barberId?: string): Promise<CashRegister> {
    const response = await api.post('/cash-register/close', { barberId });
    return response.data;
  },

  // Adicionar serviço ao caixa com comissão
  async addService(data: {
    client: string;
    barberId: string;
    service: string;
    serviceId?: string;
    price: number;
    commission: number;
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

  // Atualizar serviços
  async updateServices(services: any[]): Promise<CashRegister> {
    const response = await api.put('/cash-register/services', { services });
    return response.data;
  },
};