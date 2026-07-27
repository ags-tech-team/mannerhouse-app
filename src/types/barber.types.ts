export interface Barber {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number;
  isActive: boolean;
  userId?: string;
  username: string;
  password: string; 
  createdAt: string;
}

export interface Service {
  id: string;
  barberId: string;
  clientName: string;
  serviceType: string;
  price: number;
  commission: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
}