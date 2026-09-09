import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit,
  Clock,
  User,
  Phone,
  Scissors,
  Loader
} from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  time: string;
  client: { id: string; name: string; phone: string };
  barber: { id: string; name: string };
  service: string;
  serviceDescription: string;
  price: number;
  commission: number;
  status: string;
  notes: string;
}

interface Barber {
  id: string;
  name: string;
  isActive: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '⏳ Pendente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: '✅ Confirmado', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: '🎯 Concluído', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: '❌ Cancelado', color: 'bg-red-100 text-red-800' },
];

const MobileAgenda = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;

  useEffect(() => {
    const token = localStorage.getItem('@mannerhouse:token');
    const userData = localStorage.getItem('@mannerhouse:user');
    if (!token) {
      navigate('/mobile/login');
      return;
    }
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const response = await api.get('/barbers');
      const active = response.data.filter((b: Barber) => b.isActive);
      setBarbers(active);
      // 🔥 Seleciona o barbeiro do usuário ou o primeiro ativo
      if (user?.barberId) {
        setSelectedBarberId(user.barberId);
      } else if (active.length > 0) {
        setSelectedBarberId(active[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar barbeiros:', err);
    }
  };

  const loadAppointments = async () => {
    if (!selectedBarberId) return; // não carrega se não houver barbeiro
    setLoading(true);
    setError('');
    try {
      const params: any = { month, year, barberId: selectedBarberId };
      const response = await api.get('/mobile/appointments', { params });
      setAppointments(response.data);
    } catch (err: any) {
      setError('Erro ao carregar agenda');
      if (err.response?.status === 401) {
        localStorage.removeItem('@mannerhouse:token');
        localStorage.removeItem('@mannerhouse:user');
        navigate('/mobile/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBarberId) {
      loadAppointments();
    }
  }, [selectedMonth, selectedBarberId]);

  const getDaysInMonth = () => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const firstDay = new Date(dateStr + 'T00:00:00');
    const lastDay = new Date(year, month, 0);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 🔥 Dias vazios antes do primeiro dia
    const firstDayOfWeek = firstDay.getDay(); // 0=domingo, 1=segunda, ...
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}T00:00:00`);
      const dateStr2 = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayAppointments = appointments.filter(a => a.date === dateStr2);
      const isSelected = i === selectedDay;
      days.push({
        day: i,
        date: dateStr2,
        isPast: date < today,
        isToday: date.toDateString() === today.toDateString(),
        isSelected,
        appointments: dayAppointments,
      });
    }
    return days;
  };

  const days = getDaysInMonth();

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(selectedMonth.getMonth() + delta);
    setSelectedMonth(newDate);
    setSelectedDay(1);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
  };

  const getAppointmentsForSelectedDay = () => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dateStr);
  };

  const handleAppointmentClick = (app: Appointment) => {
    setSelectedAppointment(app);
    setShowModal(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedAppointment) return;
    if (newStatus === selectedAppointment.status) {
      alert(`O agendamento já está com status "${newStatus}"`);
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/mobile/appointments/${selectedAppointment.id}/status`, {
        status: newStatus
      });
      await loadAppointments();
      setShowModal(false);
    } catch (err) {
      alert('Erro ao atualizar status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/mobile/appointments/${selectedAppointment.id}`);
      await loadAppointments();
      setShowModal(false);
    } catch (err) {
      alert('Erro ao excluir agendamento');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAppointment) return;
    const newNotes = prompt('Observações:', selectedAppointment.notes || '');
    if (newNotes === null) return;
    setActionLoading(true);
    try {
      await api.put(`/mobile/appointments/${selectedAppointment.id}`, {
        notes: newNotes
      });
      await loadAppointments();
      setShowModal(false);
    } catch (err) {
      alert('Erro ao editar observações');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDateDisplay = new Date(selectedDateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const dayAppointments = getAppointmentsForSelectedDay();

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size={32} className="animate-spin text-[#9c7f64]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#060606]">Minha Agenda</h1>
            <p className="text-xs text-[#7f7c7a]">Olá, {user.name}</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('@mannerhouse:token');
              localStorage.removeItem('@mannerhouse:user');
              navigate('/mobile/login');
            }} 
            className="text-sm text-red-500"
          >
            Sair
          </button>
        </div>

        {/* 🔥 Seletor de barbeiro – sem "Todos os barbeiros" */}
        <div className="mt-3">
          <select
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9c7f64]"
          >
            {barbers.map(barber => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendário */}
      <div className="p-3">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold">
              {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-[#7f7c7a]">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader size={32} className="animate-spin text-[#9c7f64]" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const hasAppointments = day.appointments.length > 0;
                const isToday = day.isToday;
                const isSelected = day.isSelected;
                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day.day)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg border cursor-pointer transition ${
                      isSelected ? 'border-[#9c7f64] bg-[#9c7f64]/20' :
                      isToday ? 'border-[#9c7f64] bg-[#9c7f64]/10' : 'border-gray-100'
                    } ${hasAppointments ? 'bg-[#9c7f64]/5' : ''}`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-[#9c7f64]' : isToday ? 'text-[#9c7f64]' : 'text-[#060606]'}`}>
                      {day.day}
                    </span>
                    {hasAppointments && (
                      <span className="text-[8px] bg-[#9c7f64] text-white rounded-full px-1.5 py-0.5">
                        {day.appointments.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de agendamentos do dia selecionado */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#060606]">
              Agendamentos - {selectedDateDisplay}
            </h2>
            <button 
              onClick={() => setSelectedDay(new Date().getDate())}
              className="text-xs text-[#9c7f64] hover:underline"
            >
              Hoje
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#7f7c7a]">Carregando...</p>
          ) : dayAppointments.length === 0 ? (
            <p className="text-sm text-[#7f7c7a]">Nenhum agendamento neste dia</p>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map(app => (
                <div
                  key={app.id}
                  onClick={() => handleAppointmentClick(app)}
                  className="bg-white rounded-lg shadow p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-sm text-[#060606]">{app.client.name}</p>
                    <p className="text-xs text-[#7f7c7a]">{app.time} - {app.serviceDescription || app.service}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    app.status === 'completed' ? 'bg-green-100 text-green-700' :
                    app.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    app.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : app.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalhes */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#060606]">Detalhes</h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a]">
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User size={18} className="text-[#7f7c7a] mt-1" />
                <div>
                  <p className="font-medium">{selectedAppointment.client.name}</p>
                  <p className="text-sm text-[#7f7c7a]">{selectedAppointment.client.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#7f7c7a]" />
                <span>{selectedAppointment.date} às {selectedAppointment.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Scissors size={18} className="text-[#7f7c7a]" />
                <span>{selectedAppointment.serviceDescription || selectedAppointment.service}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-[#7f7c7a]" />
                <span>{selectedAppointment.client.phone}</span>
              </div>
              {selectedAppointment.notes && (
                <div className="bg-[#f5f0e8] p-2 rounded-lg text-sm">
                  <p className="font-medium">Observações:</p>
                  <p className="text-[#7f7c7a]">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-[#060606] mb-2">Alterar Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      disabled={actionLoading || selectedAppointment.status === status.value}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedAppointment.status === status.value
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : `hover:opacity-80 ${status.color}`
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3 flex flex-col gap-2">
                <button
                  onClick={handleEdit}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Edit size={18} /> Editar Observações
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Excluir Agendamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAgenda;