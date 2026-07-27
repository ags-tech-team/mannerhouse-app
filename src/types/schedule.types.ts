export interface Appointment {
  id: string;
  barberId: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  date: string;
  time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  isWalkIn: boolean;
}
