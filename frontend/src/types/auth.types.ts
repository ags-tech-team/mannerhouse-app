export type UserRole = 'admin' | 'barber';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  barber?: {
    id: string;
    name: string;
    commissionRate: number;
    isActive: boolean;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}