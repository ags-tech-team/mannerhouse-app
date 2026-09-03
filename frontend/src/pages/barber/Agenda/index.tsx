import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';
import { appointmentService } from '../../../services/appointment.service';
import type { Appointment, Client } from '../../../services/appointment.service';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { SERVICES, getServiceById } from '../../../utils/services';
import MultiServiceSelector from '../../../components/common/MultiServiceSelector';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';
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
  Eye,
  DollarSign
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  serviceCommissionRate: number;
  productCommissionRate: number;
}

interface SelectedService {
  id: string;
  service: {
    id: string;
    name: string;
    price: number;
    category: string;
  };
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
  
  // MÚLTIPLOS SERVIÇOS
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  
  // AUTO-COMPLETE
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // 🔥 VALOR PERSONALIZADO
  const valorPersonalizado = useNumberInput();
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    notes: '',
  });
  
  const price = useNumberInput();

  // Status options
  const statusOptions = [
    { value: 'pending', label: '⏳ Pendente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: '✅ Confirmado', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: '🎯 Concluído', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: '❌ Cancelado', color: 'bg-red-100 text-red-800' },
  ];

  const handleSelectClient = (client: Client) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setFormData(prev => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone,
    }));
  };

  // HANDLE BARBER CHANGE
  const handleBarberChange = (barberId: string) => {
    setSelectedBarberId(barberId);
    localStorage.setItem('@mannerhouse:selectedBarber', barberId);
    const barber = barbers.find(b => b.id === barberId);
    if (barber) {
      localStorage.setItem('@mannerhouse:selectedBarberName', barber.name);
    }
  };

  const loadBarbers = useCallback(async () => {
  try {
    const response = await api.get('/barbers');
    // 🔥 FILTRAR O LUIZ
    const activeBarbers = response.data.filter((b: Barber) => 
      b.isActive && !b.name.includes('Luiz')
    );
    setBarbers(activeBarbers);
    const savedBarberId = localStorage.getItem('@mannerhouse:selectedBarber');
    if (savedBarberId && activeBarbers.some(b => b.id === savedBarberId)) {
      setSelectedBarberId(savedBarberId);
    } else if (activeBarbers.length > 0) {
      setSelectedBarberId(activeBarbers[0].id);
      localStorage.setItem('@mannerhouse:selectedBarber', activeBarbers[0].id);
      localStorage.setItem('@mannerhouse:selectedBarberName', activeBarbers[0].name);
    }
  } catch (error) {
    console.error('Erro ao carregar barbeiros:', error);
  }
}, []);

  // Carregar agendamentos
  const loadAppointments = useCallback(async () => {
    if (!selectedBarberId) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(year, currentDate.getMonth() + 1, 0).getDate()}`;
      const data = await appointmentService.getAll({ startDate, endDate, barberId: selectedBarberId });
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

  const getTotalServices = () => {
    if (selectedServices.some(s => s.service.id === 'mensalista')) {
      return 0;
    }
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };
  
  const getServiceNames = () => {
    return selectedServices.map(s => s.service.name).join(' + ');
  };

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

  const openCreateModal = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setAvailableTimes([]);
    setClientName('');
    setClientPhone('');
    setFormData({
      clientName: '',
      clientPhone: '',
      notes: '',
    });
    setSelectedServices([]);
    price.reset();
    valorPersonalizado.reset();
    setShowModal(true);
  };

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
    
    if (!clientName.trim()) {
      alert('Digite o nome do cliente');
      return;
    }
    if (!formData.clientPhone.trim()) {
      alert('Digite o telefone do cliente');
      return;
    }

    // 🔥 VERIFICAR SE TEM MENSALISTA
    const hasMensalista = selectedServices.some(s => s.service.id === 'mensalista');
    
    // 🔥 USAR VALOR PERSONALIZADO SE PREENCHIDO
    const valorDigitado = valorPersonalizado.getNumberValue();
    let total = valorDigitado > 0 ? valorDigitado : getTotalServices();
    
    // 🔥 SE TIVER MENSALISTA, TOTAL = 0
    if (hasMensalista) {
      total = 0;
    }
    
    if (total <= 0 && !hasMensalista) {
      alert('Digite um valor válido ou selecione um serviço');
      return;
    }

    try {
      const serviceNames = selectedServices.length > 0 
        ? selectedServices.map(s => s.service.name).join(' + ') 
        : 'Serviço Personalizado';
      const serviceIds = selectedServices.map(s => s.id).join(',');

      const barber = barbers.find(b => b.id === selectedBarberId);
      const taxaComissao = barber?.serviceCommissionRate || 0.50;
      
      // 🔥 COMISSÃO SÓ É CALCULADA SE NÃO TIVER MENSALISTA
      const comissao = hasMensalista ? 0 : (total * taxaComissao);

      console.log('📤 CRIANDO AGENDAMENTO:');
      console.log('  client:', clientName.trim());
      console.log('  phone:', formData.clientPhone.trim());
      console.log('  barberId:', selectedBarberId);
      console.log('  service:', serviceNames);
      console.log('  price:', total);
      console.log('  hasMensalista:', hasMensalista);
      console.log('  commission:', comissao);

      await appointmentService.create({
        barberId: selectedBarberId,
        clientName: clientName.trim(),
        clientPhone: formData.clientPhone.trim(),
        date: selectedDate,
        time: selectedTime,
        service: serviceIds || 'personalizado',
        serviceDescription: serviceNames || 'Serviço Personalizado',
        price: total,
        commission: comissao,
        notes: formData.notes + (valorDigitado > 0 ? ` (Valor personalizado: R$ ${valorDigitado.toFixed(2)})` : '') + (hasMensalista ? ' [MENSALISTA]' : ''),
      });

      closeModal();
      setClientName('');
      setClientPhone('');
      setSelectedServices([]);
      valorPersonalizado.reset();
      await loadAppointments();
      alert('✅ Agendamento criado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      if (error.response?.data?.error?.includes('já existe')) {
        alert(error.response.data.error);
      } else {
        alert(error.response?.data?.error || 'Erro ao criar agendamento');
      }
    }
  };

  const openDetailModal = async (appointment: Appointment) => {
    try {
      // 🔥 BUSCAR OS DADOS COMPLETOS DO AGENDAMENTO
      const fullAppointment = await appointmentService.getById(appointment.id);
      setSelectedAppointment(fullAppointment);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do agendamento:', error);
      // Fallback: usar os dados que já temos
      setSelectedAppointment(appointment);
      setShowDetailModal(true);
    }
  };

  // ATUALIZAR STATUS
  const handleUpdateStatus = async (status: string) => {
    if (!selectedAppointment) return;
    try {
      const updated = await appointmentService.updateStatus(selectedAppointment.id, status);
      setSelectedAppointment(updated);
      await loadAppointments();
      if (status === 'completed') {
        alert('✅ Serviço concluído! O valor foi enviado para o caixa.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  // DELETAR AGENDAMENTO
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableTimes([]);
    setClientName('');
    setClientPhone('');
    setFormData({
      clientName: '',
      clientPhone: '',
      notes: '',
    });
    setSelectedServices([]);
    price.reset();
    valorPersonalizado.reset();
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
            onChange={(e) => handleBarberChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
          >
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>✂️ {barber.name}</option>
            ))}
          </select>
          <button
            onClick={() => openCreateModal(new Date().toISOString().split('T')[0])}
            className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>
      </div>

     {/* Calendário - Responsivo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-between items-center p-3 sm:p-4 border-b">
          <button onClick={() => changeMonth(-1)} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <h2 className="text-base sm:text-xl font-semibold text-[#060606]">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 p-2 sm:p-4 bg-[#f5f0e8]">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-[10px] sm:text-sm font-medium text-[#544941]">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 p-2 sm:p-4">
          {days.map((day, index) => (
            <div
              key={index}
              className={`
                relative min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 rounded-lg border transition cursor-pointer
                ${day === null ? 'bg-gray-50' : 'hover:shadow-md hover:border-[#9c7f64]'}
                ${day?.isToday ? 'border-[#9c7f64] bg-[#9c7f64]/5' : 'border-gray-200'}
                ${day?.appointments && day.appointments.length > 0 ? 'bg-[#9c7f64]/5' : ''}
              `}
              onClick={() => day && openCreateModal(day.date)}
            >
              {day !== null && (
                <>
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] sm:text-sm font-medium ${day.isToday ? 'text-[#9c7f64]' : 'text-[#060606]'}`}>
                      {day.day}
                    </span>
                    {day.appointments.length > 0 && (
                      <span className="text-[8px] sm:text-xs bg-[#9c7f64] text-white rounded-full px-1.5 sm:px-2 py-0.5">
                        {day.appointments.length}
                      </span>
                    )}
                  </div>
                  
                  {/* 🔥 PARTE CORRIGIDA: LISTA COM SCROLL */}
                  <div className="mt-0.5 sm:mt-1 space-y-0.5 max-h-[50px] sm:max-h-[70px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#9c7f64] scrollbar-track-gray-100">
                    {day.appointments.map((app) => {
                      const isCompleted = app.status === 'completed';
                      const isCancelled = app.status === 'cancelled';
                      return (
                        <div
                          key={app.id}
                          onClick={(e) => { e.stopPropagation(); openDetailModal(app); }}
                          className={`text-[8px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${
                            isCompleted ? 'bg-green-100 text-green-800' : ''
                          } ${isCancelled ? 'bg-red-100 text-red-800 line-through' : ''} ${
                            !isCompleted && !isCancelled ? 'bg-[#f5f0e8] text-[#060606]' : ''
                          }`}
                          title={`${app.time} - ${app.Client?.name || 'Cliente'}`}
                        >
                          <span className="hidden sm:inline">{app.time} </span>
                          {app.Client?.name || 'Cliente'}
                          {isCompleted && ' ✅'}
                          {isCancelled && ' ❌'}
                        </div>
                      );
                    })}
                  </div>
                  {/* FIM DA PARTE CORRIGIDA */}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE DETALHES */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">📋 Detalhes do Agendamento</h2>
              <button onClick={closeModal} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-[#f5f0e8] p-4 rounded-lg">
                <h3 className="text-sm font-medium text-[#7f7c7a] mb-2">👤 Cliente</h3>
                <p className="font-semibold text-[#060606]">{selectedAppointment.Client?.name || 'N/A'}</p>
                <div className="flex gap-4 mt-1 text-sm text-[#7f7c7a]">
                  <span className="flex items-center gap-1"><Phone size={14} /> {selectedAppointment.Client?.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-[#7f7c7a]">📅 Data</p><p className="font-medium">{formatDate(selectedAppointment.date)}</p></div>
                <div><p className="text-sm text-[#7f7c7a]">⏰ Horário</p><p className="font-medium">{selectedAppointment.time}</p></div>
                <div><p className="text-sm text-[#7f7c7a]">✂️ Serviço</p><p className="font-medium">{selectedAppointment.serviceDescription || 'Serviço'}</p></div>
                <div><p className="text-sm text-[#7f7c7a]">💰 Valor</p><p className="font-medium text-[#9c7f64]">R$ {selectedAppointment.price?.toFixed(2) || '0,00'}</p></div>
              </div>
              <div><p className="text-sm text-[#7f7c7a]">💵 Comissão</p><p className="font-medium text-green-600">R$ {selectedAppointment.commission?.toFixed(2) || '0,00'}</p></div>
              {selectedAppointment.serviceDescription && <div><p className="text-sm text-[#7f7c7a]">📝 Descrição</p><p className="text-sm text-[#060606]">{selectedAppointment.serviceDescription}</p></div>}
              {selectedAppointment.notes && <div><p className="text-sm text-[#7f7c7a]">📌 Observações</p><p className="text-sm text-[#060606]">{selectedAppointment.notes}</p></div>}
              <div className="border-t pt-4">
                <p className="text-sm text-[#7f7c7a] mb-2">📊 Status Atual</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusLabel(selectedAppointment.status).color}`}>{getStatusLabel(selectedAppointment.status).label}</span>
                  {selectedAppointment.status === 'completed' && <span className="text-xs text-green-600">✅ Já foi para o caixa</span>}
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-[#7f7c7a] mb-2">🔄 Alterar Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleUpdateStatus(status.value)}
                      disabled={selectedAppointment.status === status.value}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${selectedAppointment.status === status.value ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : `hover:opacity-80 ${status.color}`}`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
                {selectedAppointment.status === 'completed' && <p className="text-xs text-green-600 mt-2">✅ Este serviço já foi concluído e enviado para o caixa.</p>}
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button onClick={handleDeleteAppointment} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"><Trash2 size={18} /> Excluir</button>
                <button onClick={() => setShowDetailModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">📅 Novo Agendamento</h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Data</label>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Horário</label>
                  <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]">
                    <option value="">Selecione</option>
                    {loadingTimes ? <option disabled>Carregando...</option>
                    : availableTimes.length === 0 ? <option disabled>Nenhum horário disponível</option>
                    : availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Cliente</label>
                <ClientAutocomplete
                  value={clientName}
                  onChange={setClientName}
                  onSelectClient={handleSelectClient}
                  placeholder="Digite o nome ou telefone do cliente..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={16} />
                  <input
                    type="text"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              {/* MULTI SERVIÇOS */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  <Scissors size={16} className="inline mr-1" /> Serviços
                </label>
                <MultiServiceSelector
                  selectedServices={selectedServices}
                  onChange={setSelectedServices}
                  maxServices={5}
                />
              </div>

              {/* 🔥 VALOR PERSONALIZADO */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  <DollarSign size={16} className="inline mr-1" /> Valor Personalizado (R$)
                </label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorPersonalizado.value}
                    onChange={valorPersonalizado.onChange}
                    placeholder="Digite o valor manualmente"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-[#7f7c7a] mt-1">
                  Deixe em branco para usar o valor dos serviços selecionados
                </p>
              </div>

              {/* 🔥 MOSTRAR COMISSÃO CALCULADA */}
              {(getTotalServices() > 0 || valorPersonalizado.getNumberValue() > 0) && (
                <div className="bg-[#f5f0e8] rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7f7c7a]">Total:</span>
                    <span className="font-medium">
                      R$ {(valorPersonalizado.getNumberValue() > 0 ? valorPersonalizado.getNumberValue() : getTotalServices()).toFixed(2)}
                    </span>
                  </div>
                  {(() => {
                    const total = valorPersonalizado.getNumberValue() > 0 ? valorPersonalizado.getNumberValue() : getTotalServices();
                    const barber = barbers.find(b => b.id === selectedBarberId);
                    const taxa = barber?.serviceCommissionRate || 0.50;
                    const comissao = total * taxa;
                  })()}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Observações</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]" rows={3} placeholder="Observações sobre o agendamento..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateAppointment} className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2"><Check size={18} /> Criar Agendamento</button>
                <button onClick={closeModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberAgenda;