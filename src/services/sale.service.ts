import { api } from '../api/client';

export interface Sale {
  id: string;
  barberId: string;
  clientId: string | null;
  productId: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  profit: number;
  commission: number;
  date: string;
  paymentMethod: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  Barber?: { id: string; name: string };
  Product?: { id: string; name: string; price: number; costPrice: number };
  Client?: { id: string; name: string };
}

export interface CreateSaleData {
  barberId: string; 
  clientId?: string;
  clientName?: string;
  productId: string;
  quantity: number;
  paymentMethod: string;
}

export const saleService = {
  async getAll(): Promise<Sale[]> {
    const response = await api.get('/sales');
    return response.data;
  },

  async create(data: CreateSaleData): Promise<Sale> {
    console.log('📦 Criando venda com barbeiro:', data.barberId); // 🔥 DEBUG
    const response = await api.post('/sales', data);
    return response.data;
  },

  async getSummary(params?: { startDate?: string; endDate?: string; barberId?: string }) {
    const response = await api.get('/sales/summary', { params });
    return response.data;
  },
};