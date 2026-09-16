import { api } from '../api/client';

export interface CashRegisterItem {
  type: 'service' | 'product';
  serviceId?: string;
  productId?: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  costPrice?: number;
  price: number;
  commission: number;
  isCommissioned?: boolean;
  hasCommission?: boolean;
}

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
  barber?: { id: string; name: string; email?: string; phone?: string } | null;
  closedByBarber?: { id: string; name: string } | null;
  totalsByPayment?: {
    dinheiro: number;
    credito: number;
    debito: number;
    pix: number;
    outros: number;
  };
}

export interface AddServiceData {
  client: string;
  barberId: string;
  // Formato novo
  items?: CashRegisterItem[];
  // Formato antigo (compat)
  service?: string;
  serviceId?: string;
  price?: number;
  commission?: number;
  // Comuns
  paymentMethod: string;
  date: string;
  time: string;
  phone?: string;
}

export const cashRegisterService = {
  async getToday(): Promise<CashRegister> {
    const response = await api.get('/cash-register/today');
    return response.data;
  },

  async open(initialCash: number, barberId?: string): Promise<CashRegister> {
    const response = await api.post('/cash-register/open', { initialCash, barberId });
    return response.data;
  },

  async close(barberId?: string): Promise<CashRegister> {
    const response = await api.post('/cash-register/close', { barberId });
    return response.data;
  },

  async addService(data: AddServiceData): Promise<any> {
    const response = await api.post('/cash-register/service', data);
    return response.data;
  },

  async removeService(serviceId: string): Promise<void> {
    await api.delete(`/cash-register/service/${serviceId}`);
  },

  async getHistory(startDate?: string, endDate?: string): Promise<CashRegister[]> {
    const response = await api.get('/cash-register/history', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  async updateServices(services: any[]): Promise<CashRegister> {
    const response = await api.put('/cash-register/services', { services });
    return response.data;
  },
};