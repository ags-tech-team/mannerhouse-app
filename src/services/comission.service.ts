import { api } from '../api/client';

export interface BarberCommission {
  barberId: string;
  barberName: string;
  barberEmail: string;
  serviceCommissionRate: number;
  productCommissionRate: number;
  servicesCount: number;
  serviceRevenue: number;
  serviceCommission: number;
  productsCount: number;
  productRevenue: number;
  productCommission: number;
  totalRevenue: number;
  totalCommission: number;
}

export interface BarberCommissionDetail {
  barber: {
    id: string;
    name: string;
    email: string;
    phone: string;
    username: string;
    isActive: boolean;
    serviceCommissionRate: number;
    productCommissionRate: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalServices: number;
    totalServiceRevenue: number;
    serviceCommission: number;
    totalProducts: number;
    totalProductRevenue: number;
    productCommission: number;
    totalRevenue: number;
    totalCommission: number;
  };
  details: {
    services: Array<{
      id: string;
      date: string;
      client: string;
      service: string;
      price: number;
      commission: number;
    }>;
    products: Array<{
      id: string;
      date: string;
      product: string;
      quantity: number;
      salePrice: number;
      costPrice: number;
      profit: number;
      commission: number;
    }>;
  };
}

export const commissionService = {
  async getAll(startDate?: string, endDate?: string): Promise<{
    period: { startDate: string; endDate: string };
    barbers: BarberCommission[];
    totals: {
      totalServices: number;
      totalProducts: number;
      totalRevenue: number;
      totalCommission: number;
    };
  }> {
    const response = await api.get('/commissions/barbers', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async getByBarberId(barberId: string, startDate?: string, endDate?: string): Promise<BarberCommissionDetail> {
    const response = await api.get(`/commissions/barber/${barberId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  },
};