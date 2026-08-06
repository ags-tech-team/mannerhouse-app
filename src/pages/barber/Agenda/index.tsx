import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';
import { appointmentService } from '../../../services/appointment.service';
import type { Appointment, Client } from '../../../services/appointment.service';
import { 
  Calendar as CalendarIcon,
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Check,
  User as UserIcon,
  Phone,
  Mail,
  Clock,
  Scissors,
  AlertCircle,
  Search,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

const BarberAgenda = () => {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    service: 'corte',
    serviceDescription: '',
    price: 0,
    notes: '',
  });
  
  // Auto-complete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // Status options
  const statusOptions = [
    { value: 'pending', label: '⏳ Pendente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: '✅ Confirmado', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: '🎯 Concluído', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: '❌ Cancelado', color: 'bg-red-100 text-red-800' },
  ];

  const services = [
    { value: 'corte', label: '✂️ Corte' },
    { value: 'barba', label: '🧔 Barba' },
    { value: 'corte_barba', label: '✂️ Corte + Barba' },
    { value: 'sobrancelha', label: '👁️ Sobrancelha' },
    { value: 'outro', label: '📌 Outro' },
  ];

  // Carregar barbeiros
  const loadBarbers = useCallback(async () => {
    try {
      const response = await api.get('/barbers');
      const activeBarbers = response.data.filter((b: Barber) => b.isActive);
      setBarbers(activeBarbers);
      if (activeBarbers.length > 0 && !selectedBarberId) {
        setSelectedBarberId(activeBarbers[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  }, [selectedBarberId]);

  // Carregar agendamentos
  const loadAppointments = useCallback(async () => {
    if (!selectedBarberId) return;
    
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(year, currentDate.getMonth() + 1, 0).getDate()}`;
      
      const data = await appointmentService.getAll({
        startDate,
        endDate,
        barberId: selectedBarberId,
      });
      setAppointments(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBarberId, currentDate]);

  // Carregar horários disponíveis
  const loadAvailableTimes = useCallback(async () => {
    if (!selectedBarberId || !selectedDate) return;
    
    setLoadingTimes(true);
    try {
      const times = await appointmentService.getAvailableTimes(selectedBarberId, selectedDate);
      setAvailableTimes(times);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
    } finally {
      setLoadingTimes(false);
    }
  }, [selectedBarberId, selectedDate]);

  // Buscar clientes (auto-complete)
  const searchClients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setSearching(true);
    try {
      const results = await appointmentService.searchClients(query);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Selecionar cliente do auto-complete
  const selectClient = (client: Client) => {
    setFormData({
      ...formData,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
    });
    setSearchQuery(client.name);
    setShowSearchResults(false);
  };

  // 🔥 ABRIR MODAL DE DETALHES DO AGENDAMENTO
  const openDetailModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  // 🔥 ATUALIZAR STATUS DO AGENDAMENTO
  const handleUpdateStatus = async (status: string) => {
    if (!selectedAppointment) return;
    
    try {
      const updated = await appointmentService.updateStatus(selectedAppointment.id, status);
      setSelectedAppointment(updated);
      await loadAppointments();
      
      // Se o status for 'completed', mostrar mensagem
      if (status === 'completed') {
        alert('✅ Serviço concluído! O valor foi enviado para o caixa.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  // 🔥 DELETAR AGENDAMENTO
  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    
    try {
      await appointmentService.delete(selectedAppointment.id);
      setShowDetailModal(false);
      await loadAppointments();
      alert('✅ Agendamento excluído!');
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento');
    }
  };

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchClients(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchClients]);

  // Carregar dados iniciais
  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  useEffect(() => {
    if (selectedBarberId) {
      loadAppointments();
    }
  }, [selectedBarberId, currentDate, loadAppointments]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableTimes();
    }
  }, [selectedDate, loadAvailableTimes]);

  // Navegação do calendário
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // Abrir modal para criar agendamento
  const openCreateModal = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setAvailableTimes([]);
    setFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      service: 'corte',
      serviceDescription: '',
      price: 0,
      notes: '',
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowModal(true);
  };

  // Criar agendamento
  const handleCreateAppointment = async () => {
    if (!selectedBarberId) {
      alert('Selecione um barbeiro');
      return;
    }
    if (!selectedDate) {
      alert('Selecione uma data');
      return;
    }
    if (!selectedTime) {
      alert('Selecione um horário');
      return;
    }
    if (!formData.clientName.trim()) {
      alert('Digite o nome do cliente');
      return;
    }
    if (!formData.clientEmail.trim()) {
      alert('Digite o email do cliente');
      return;
    }
    if (!formData.clientPhone.trim()) {
      alert('Digite o telefone do cliente');
      return;
    }

    try {
      await appointmentService.create({
        barberId: selectedBarberId,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        date: selectedDate,
        time: selectedTime,
        service: formData.service,
        serviceDescription: formData.serviceDescription,
        price: formData.price || 0,
        notes: formData.notes,
      });

      setShowModal(false);
      await loadAppointments();
      alert('✅ Agendamento criado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      alert(error.response?.data?.error || 'Erro ao criar agendamento');
    }
  };

  // Gerar dias do mês
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayAppointments = appointments.filter(a => a.date === dateStr);
      days.push({
        day: i,
        date: dateStr,
        isToday: date.toDateString() === new Date().toDateString(),
        appointments: dayAppointments,
      });
    }
    
    return { weekdays, days };
  };

  const { weekdays, days } = getDaysInMonth();

  // Formatar data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Pegar label do status
  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Verificar se um horário está disponível
  const isTimeAvailable = (time: string) => {
    return availableTimes.includes(time);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">📅 Agenda</h1>
          <p className="text-[#7f7c7a]">Gerencie os agendamentos da barbearia</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
          >
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                ✂️ {barber.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => openCreateModal(new Date().toISOString().split('T')[0])}
            className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={18} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Cabeçalho do calendário */}
        <div className="flex justify-between items-center p-4 border-b">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-[#060606]">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 p-4 bg-[#f5f0e8]">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-[#544941]">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-1 p-4">
          {days.map((day, index) => (
            <div
              key={index}
              className={`
                relative min-h-[100px] p-2 rounded-lg border transition cursor-pointer
                ${day === null ? 'bg-gray-50' : 'hover:shadow-md hover:border-[#9c7f64]'}
                ${day?.isToday ? 'border-[#9c7f64] bg-[#9c7f64]/5' : 'border-gray-200'}
                ${day?.appointments && day.appointments.length > 0 ? 'bg-[#9c7f64]/5' : ''}
              `}
              onClick={() => day && openCreateModal(day.date)}
            >
              {day !== null && (
                <>
                  <div className="flex justify-between items-start">
                    <span className={`
                      text-sm font-medium
                      ${day.isToday ? 'text-[#9c7f64]' : 'text-[#060606]'}
                    `}>
                      {day.day}
                    </span>
                    {day.appointments.length > 0 && (
                      <span className="text-xs bg-[#9c7f64] text-white rounded-full px-2 py-0.5">
                        {day.appointments.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Mostrar agendamentos do dia */}
                  <div className="mt-1 space-y-0.5 max-h-[60px] overflow-y-auto">
                    {day.appointments.slice(0, 3).map((app) => {
                      const statusInfo = getStatusLabel(app.status);
                      const isCompleted = app.status === 'completed';
                      const isCancelled = app.status === 'cancelled';
                      
                      return (
                        <div
                          key={app.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(app);
                          }}
                          className={`
                            text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80
                            ${isCompleted ? 'bg-green-100 text-green-800' : ''}
                            ${isCancelled ? 'bg-red-100 text-red-800 line-through' : ''}
                            ${!isCompleted && !isCancelled ? 'bg-[#f5f0e8] text-[#060606]' : ''}
                          `}
                          title={`${app.time} - ${app.Client?.name || 'Cliente'} (${statusInfo.label})`}
                        >
                          {app.time} {app.Client?.name || 'Cliente'}
                          {isCompleted && ' ✅'}
                          {isCancelled && ' ❌'}
                        </div>
                      );
                    })}
                    {day.appointments.length > 3 && (
                      <div className="text-[10px] text-[#7f7c7a] text-center">
                        +{day.appointments.length - 3} mais...
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE DETALHES DO AGENDAMENTO */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                📋 Detalhes do Agendamento
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Informações do Cliente */}
              <div className="bg-[#f5f0e8] p-4 rounded-lg">
                <h3 className="text-sm font-medium text-[#7f7c7a] mb-2">👤 Cliente</h3>
                <p className="font-semibold text-[#060606]">{selectedAppointment.Client?.name || 'N/A'}</p>
                <div className="flex gap-4 mt-1 text-sm text-[#7f7c7a]">
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {selectedAppointment.Client?.email || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> {selectedAppointment.Client?.phone || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Informações do Serviço */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#7f7c7a]">📅 Data</p>
                  <p className="font-medium">{formatDate(selectedAppointment.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7f7c7a]">⏰ Horário</p>
                  <p className="font-medium">{selectedAppointment.time}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7f7c7a]">✂️ Serviço</p>
                  <p className="font-medium">
                    {services.find(s => s.value === selectedAppointment.service)?.label || selectedAppointment.service}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#7f7c7a]">💰 Valor</p>
                  <p className="font-medium text-[#9c7f64]">
                    R$ {selectedAppointment.price?.toFixed(2) || '0,00'}
                  </p>
                </div>
              </div>

              {selectedAppointment.serviceDescription && (
                <div>
                  <p className="text-sm text-[#7f7c7a]">📝 Descrição</p>
                  <p className="text-sm text-[#060606]">{selectedAppointment.serviceDescription}</p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-[#7f7c7a]">📌 Observações</p>
                  <p className="text-sm text-[#060606]">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Status Atual */}
              <div className="border-t pt-4">
                <p className="text-sm text-[#7f7c7a] mb-2">📊 Status Atual</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusLabel(selectedAppointment.status).color}`}>
                    {getStatusLabel(selectedAppointment.status).label}
                  </span>
                  {selectedAppointment.status === 'completed' && (
                    <span className="text-xs text-green-600">✅ Já foi para o caixa</span>
                  )}
                </div>
              </div>

              {/* Ações de Status */}
              <div className="border-t pt-4">
                <p className="text-sm text-[#7f7c7a] mb-2">🔄 Alterar Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleUpdateStatus(status.value)}
                      disabled={selectedAppointment.status === status.value}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition
                        ${selectedAppointment.status === status.value 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : `hover:opacity-80 ${status.color}`
                        }
                      `}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
                {selectedAppointment.status === 'completed' && (
                  <p className="text-xs text-green-600 mt-2">
                    ✅ Este serviço já foi concluído e enviado para o caixa.
                  </p>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleDeleteAppointment}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Excluir
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE AGENDAMENTO (mesmo de antes) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">📅 Novo Agendamento</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Data</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Horário</label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  >
                    <option value="">Selecione</option>
                    {loadingTimes ? (
                      <option disabled>Carregando...</option>
                    ) : availableTimes.length === 0 ? (
                      <option disabled>Nenhum horário disponível</option>
                    ) : (
                      availableTimes.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Auto-complete de Cliente */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Cliente</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={18} />
                  <input
                    type="text"
                    value={searchQuery || formData.clientName}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFormData({ ...formData, clientName: e.target.value });
                    }}
                    placeholder="Digite o nome do cliente..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  />
                  
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="w-full px-4 py-2 text-left hover:bg-[#f5f0e8] transition flex items-center gap-3"
                        >
                          <UserIcon size={16} className="text-[#9c7f64]" />
                          <div>
                            <p className="font-medium text-[#060606]">{client.name}</p>
                            <p className="text-xs text-[#7f7c7a]">{client.email} • {client.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searching && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-center text-[#7f7c7a]">
                      Buscando...
                    </div>
                  )}
                </div>
              </div>

              {/* Email e Telefone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={16} />
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={16} />
                    <input
                      type="text"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Serviço */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Serviço</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                >
                  {services.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Descrição do Serviço</label>
                <input
                  type="text"
                  value={formData.serviceDescription}
                  onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                  placeholder="Ex: Corte Degradê com Barba"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  rows={3}
                  placeholder="Observações sobre o agendamento..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateAppointment}
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Criar Agendamento
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberAgenda;