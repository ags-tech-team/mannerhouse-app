import { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Phone, 
  Scissors,
  X,
  Check,
  List,
  Users,
  Plus,
  Trash2,
  Edit,
  AlertCircle
} from 'lucide-react';

// Tipos
interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface WalkIn {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  arrivalTime: string; // HH:mm
  status: 'waiting' | 'in_progress' | 'completed';
}

// Dias da semana
const WEEKDAYS = [
  { label: 'Segunda', value: 'monday' },
  { label: 'Terça', value: 'tuesday' },
  { label: 'Quarta', value: 'wednesday' },
  { label: 'Quinta', value: 'thursday' },
  { label: 'Sexta', value: 'friday' },
  { label: 'Sábado', value: 'saturday' },
  { label: 'Domingo', value: 'sunday' },
];

// Regras: seg-qui = agendamento, sex-sáb = ordem de chegada, domingo = fechado
const getDayType = (day: string): 'appointment' | 'walkin' | 'closed' => {
  if (day === 'sunday') return 'closed';
  if (day === 'friday' || day === 'saturday') return 'walkin';
  return 'appointment';
};

// Horários disponíveis para agendamento (30 min slots das 9h às 20h)
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

const BarberSchedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    service: '',
    time: '',
  });

  // Mock de serviços
  const SERVICES = ['Corte', 'Barba', 'Corte + Barba', 'Degradê', 'Platinado', 'Pézinho'];

  // Carregar dados mockados (simular API)
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    // Dados mockados para a semana atual
    const today = new Date();
    const weekStart = getWeekStart(today);
    
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        clientName: 'João Silva',
        clientPhone: '(11) 99999-9999',
        service: 'Corte + Barba',
        date: formatDate(addDays(weekStart, 0)), // segunda
        time: '10:00',
        status: 'scheduled',
      },
      {
        id: '2',
        clientName: 'Carlos Souza',
        clientPhone: '(11) 88888-8888',
        service: 'Corte Degradê',
        date: formatDate(addDays(weekStart, 0)),
        time: '14:30',
        status: 'scheduled',
      },
      {
        id: '3',
        clientName: 'Pedro Oliveira',
        clientPhone: '(11) 77777-7777',
        service: 'Barba',
        date: formatDate(addDays(weekStart, 1)), // terça
        time: '11:00',
        status: 'scheduled',
      },
    ];

    const mockWalkIns: WalkIn[] = [
      {
        id: 'w1',
        clientName: 'Rafael Santos',
        clientPhone: '(11) 66666-6666',
        service: 'Corte',
        arrivalTime: '09:15',
        status: 'waiting',
      },
      {
        id: 'w2',
        clientName: 'Marcos Lima',
        clientPhone: '(11) 55555-5555',
        service: 'Barba',
        arrivalTime: '09:45',
        status: 'in_progress',
      },
    ];

    setAppointments(mockAppointments);
    setWalkIns(mockWalkIns);
    setLoading(false);
  };

  // Utilitários
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date: Date): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  const getDateByDay = (dayIndex: number): Date => {
    const weekStart = getWeekStart(currentDate);
    return addDays(weekStart, dayIndex);
  };

  const getAppointmentsForDay = (date: string): Appointment[] => {
    return appointments.filter(a => a.date === date);
  };

  const getWalkInsForDay = (date: string): WalkIn[] => {
    // Como walk-ins não têm data, consideramos apenas os de hoje (se for sexta ou sábado)
    // Simplificando: retornamos todos os walk-ins se o dia for sexta ou sábado
    const dayName = getDayName(new Date(date + 'T00:00:00'));
    if (dayName === 'friday' || dayName === 'saturday') {
      return walkIns;
    }
    return [];
  };

  const isToday = (date: string): boolean => {
    return date === formatDate(new Date());
  };

  const isPast = (date: string): boolean => {
    return date < formatDate(new Date());
  };

  // Navegação
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Modal
  const handleOpenModal = (date: string, time?: string) => {
    setSelectedDay(date);
    const dayName = getDayName(new Date(date + 'T00:00:00'));
    if (getDayType(dayName) !== 'appointment') {
      alert('Este dia não permite agendamentos. Use a lista de ordem de chegada.');
      return;
    }
    setEditingAppointment(null);
    setFormData({
      clientName: '',
      clientPhone: '',
      service: SERVICES[0],
      time: time || '09:00',
    });
    setShowModal(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedDay(appointment.date);
    setFormData({
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      service: appointment.service,
      time: appointment.time,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAppointment) {
        // Atualizar
        const updated = appointments.map(a =>
          a.id === editingAppointment.id
            ? { ...a, ...formData }
            : a
        );
        setAppointments(updated);
      } else {
        // Novo
        const newAppointment: Appointment = {
          id: Date.now().toString(),
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          service: formData.service,
          date: selectedDay,
          time: formData.time,
          status: 'scheduled',
        };
        setAppointments([...appointments, newAppointment]);
      }
      setShowModal(false);
      alert(editingAppointment ? 'Agendamento atualizado!' : 'Agendamento criado!');
    } catch (error) {
      alert('Erro ao salvar agendamento');
    }
  };

  const handleDeleteAppointment = (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    setAppointments(appointments.filter(a => a.id !== id));
  };

  const handleStatusChange = (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    setAppointments(appointments.map(a =>
      a.id === id ? { ...a, status } : a
    ));
  };

  // Walk-in actions
  const handleAddWalkIn = (date: string) => {
    const dayName = getDayName(new Date(date + 'T00:00:00'));
    if (getDayType(dayName) !== 'walkin') {
      alert('Este dia não permite ordem de chegada.');
      return;
    }
    const name = prompt('Nome do cliente:');
    if (!name) return;
    const phone = prompt('Telefone:') || '';
    const service = prompt('Serviço:') || 'Corte';
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newWalkIn: WalkIn = {
      id: Date.now().toString(),
      clientName: name,
      clientPhone: phone,
      service,
      arrivalTime: time,
      status: 'waiting',
    };
    setWalkIns([...walkIns, newWalkIn]);
  };

  const handleWalkInStatus = (id: string, status: 'waiting' | 'in_progress' | 'completed') => {
    setWalkIns(walkIns.map(w =>
      w.id === id ? { ...w, status } : w
    ));
  };

  const handleDeleteWalkIn = (id: string) => {
    if (!confirm('Remover este cliente da fila?')) return;
    setWalkIns(walkIns.filter(w => w.id !== id));
  };

  // Renderização
  const weekStart = getWeekStart(currentDate);
  const weekEnd = addDays(weekStart, 6);
  const weekRange = `${weekStart.toLocaleDateString('pt-BR')} - ${weekEnd.toLocaleDateString('pt-BR')}`;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Agenda</h1>
          <p className="text-[#7f7c7a]">Gerencie seus horários e atendimentos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <ChevronLeft size={20} className="text-[#7f7c7a]" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-[#9c7f64] hover:bg-[#544941] text-white rounded-lg transition text-sm"
          >
            Hoje
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <ChevronRight size={20} className="text-[#7f7c7a]" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-[#7f7c7a]">
        <Calendar size={16} />
        <span>{weekRange}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#7f7c7a]">Carregando agenda...</div>
        </div>
      ) : (
        <>
          {/* Grade de dias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {WEEKDAYS.map((day, index) => {
              const dateObj = getDateByDay(index);
              const dateStr = formatDate(dateObj);
              const dayName = getDayName(dateObj);
              const dayType = getDayType(dayName);
              const isPastDay = isPast(dateStr);
              const isTodayDay = isToday(dateStr);
              const dayAppointments = getAppointmentsForDay(dateStr);
              const dayWalkIns = getWalkInsForDay(dateStr);

              return (
                <div
                  key={day.value}
                  className={`bg-white rounded-lg shadow border ${
                    isTodayDay ? 'border-[#9c7f64] border-2' : 'border-gray-200'
                  } ${isPastDay ? 'opacity-60' : ''}`}
                >
                  {/* Cabeçalho do dia */}
                  <div className={`p-4 border-b ${isTodayDay ? 'bg-[#f5f0e8]' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-[#060606]">{day.label}</h3>
                        <p className="text-xs text-[#7f7c7a]">
                          {dateObj.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        dayType === 'appointment' ? 'bg-blue-100 text-blue-800' :
                        dayType === 'walkin' ? 'bg-green-100 text-green-800' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {dayType === 'appointment' ? 'Agendamento' :
                         dayType === 'walkin' ? 'Ordem de Chegada' :
                         'Fechado'}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo do dia */}
                  <div className="p-3">
                    {dayType === 'closed' ? (
                      <div className="text-center py-6 text-[#7f7c7a] text-sm">
                        <AlertCircle size={20} className="mx-auto mb-1" />
                        Fechado
                      </div>
                    ) : dayType === 'appointment' ? (
                      <>
                        {/* Slots de horário */}
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {TIME_SLOTS.map((time) => {
                            const existing = dayAppointments.find(a => a.time === time);
                            const isPastTime = isPastDay || (dateStr === formatDate(new Date()) && time < new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                            return (
                              <div
                                key={time}
                                className={`flex items-center justify-between p-1.5 rounded text-sm ${
                                  existing
                                    ? existing.status === 'cancelled'
                                      ? 'bg-gray-100 text-gray-400 line-through'
                                      : 'bg-blue-50 border border-blue-200'
                                    : isPastTime
                                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                    : 'hover:bg-gray-50 cursor-pointer border border-dashed border-gray-200'
                                }`}
                                onClick={() => {
                                  if (!existing && !isPastTime) {
                                    handleOpenModal(dateStr, time);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className={existing ? 'text-[#9c7f64]' : 'text-[#7f7c7a]'} />
                                  <span className={existing ? 'font-medium' : ''}>{time}</span>
                                </div>
                                {existing ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-[#060606] truncate max-w-[80px]">
                                      {existing.clientName}
                                    </span>
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditAppointment(existing);
                                        }}
                                        className="p-0.5 hover:bg-blue-100 rounded"
                                        disabled={isPastDay}
                                      >
                                        <Edit size={12} className="text-[#9c7f64]" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAppointment(existing.id);
                                        }}
                                        className="p-0.5 hover:bg-red-100 rounded"
                                        disabled={isPastDay}
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[#7f7c7a]">
                                    {isPastTime ? 'passado' : 'disponível'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => handleOpenModal(dateStr)}
                          className="mt-2 w-full text-xs text-[#9c7f64] hover:text-[#544941] flex items-center justify-center gap-1 py-1 border border-dashed border-[#9c7f64] rounded hover:bg-[#f5f0e8] transition"
                          disabled={isPastDay}
                        >
                          <Plus size={14} /> Adicionar
                        </button>
                      </>
                    ) : (
                      // Walk-in (ordem de chegada)
                      <>
                        {dayWalkIns.length === 0 ? (
                          <div className="text-center py-6 text-[#7f7c7a] text-sm">
                            Nenhum cliente na fila
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {dayWalkIns.map((walkIn) => (
                              <div
                                key={walkIn.id}
                                className={`p-2 rounded border ${
                                  walkIn.status === 'waiting' ? 'border-yellow-200 bg-yellow-50' :
                                  walkIn.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                                  'border-green-200 bg-green-50'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium text-[#060606] text-sm">{walkIn.clientName}</span>
                                      <span className="text-[10px] text-[#7f7c7a]">{walkIn.arrivalTime}</span>
                                    </div>
                                    <p className="text-xs text-[#7f7c7a]">{walkIn.service}</p>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    {walkIn.status === 'waiting' && (
                                      <button
                                        onClick={() => handleWalkInStatus(walkIn.id, 'in_progress')}
                                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-1.5 py-0.5 rounded"
                                      >
                                        Atender
                                      </button>
                                    )}
                                    {walkIn.status === 'in_progress' && (
                                      <button
                                        onClick={() => handleWalkInStatus(walkIn.id, 'completed')}
                                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-1.5 py-0.5 rounded"
                                      >
                                        Concluir
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteWalkIn(walkIn.id)}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleAddWalkIn(dateStr)}
                          className="mt-2 w-full text-xs text-[#9c7f64] hover:text-[#544941] flex items-center justify-center gap-1 py-1 border border-dashed border-[#9c7f64] rounded hover:bg-[#f5f0e8] transition"
                        >
                          <Users size={14} /> Adicionar à fila
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de agendamento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Cliente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7f7c7a]" />
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7f7c7a]" />
                  <input
                    type="text"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Serviço</label>
                <div className="relative">
                  <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7f7c7a]" />
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  >
                    {SERVICES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Horário</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7f7c7a]" />
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  >
                    {TIME_SLOTS.map(t => {
                      const existing = appointments.find(a => a.date === selectedDay && a.time === t && a.id !== editingAppointment?.id);
                      return (
                        <option key={t} value={t} disabled={!!existing}>
                          {t} {existing ? '(ocupado)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Check size={18} />
                    Salvar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberSchedule;