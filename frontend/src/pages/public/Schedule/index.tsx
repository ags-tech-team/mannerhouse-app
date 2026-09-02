import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useNavigate } from 'react-router-dom';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { SERVICES, getServiceById } from '../../../utils/services';
import MultiServiceSelector from '../../../components/common/MultiServiceSelector';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Scissors,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Loader,
  Users,
  CalendarDays,
  UserPlus,
  UserX,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  phone: string;
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

const PublicSchedule = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
  });

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const response = await api.get('/public/barbers');
      setBarbers(response.data);
      if (response.data.length > 0) {
        setSelectedBarber(response.data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
      setError('Erro ao carregar barbeiros. Tente novamente.');
    }
  };

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      loadAvailableTimes();
    }
  }, [selectedBarber, selectedDate]);

  const loadAvailableTimes = async () => {
    setLoading(true);
    setSelectedTime('');
    try {
      const response = await api.get('/public/available-times', {
        params: { barberId: selectedBarber, date: selectedDate }
      });
      setAvailableTimes(response.data);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      setError('Erro ao carregar horários disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const isDayAllowedForBooking = (date: Date) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return { allowed: false, reason: 'Fechado' };
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return { allowed: false, reason: 'Apenas ordem de chegada' };
    }
    return { allowed: true, reason: '' };
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const isPast = date < today;
      const dayInfo = isDayAllowedForBooking(date);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      days.push({
        day: i,
        date: dateStr,
        isPast,
        isToday: date.toDateString() === today.toDateString(),
        allowed: dayInfo.allowed,
        reason: dayInfo.reason,
      });
    }
    
    return { weekdays, days };
  };

  const { weekdays, days } = getDaysInMonth();

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };

  const getServiceNames = () => {
    return selectedServices.map(s => s.service.name).join(', ');
  };

  const handleSelectClient = (client: any) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setFormData(prev => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBarber || !selectedDate || !selectedTime) {
      setError('Selecione um barbeiro, data e horário');
      return;
    }
    
    if (selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço');
      return;
    }
    
    if (!clientName.trim() || !formData.clientPhone.trim()) {
      setError('Preencha seu nome e telefone');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      await api.post('/public/appointments', {
        barberId: selectedBarber,
        clientName: clientName.trim(),
        clientPhone: formData.clientPhone.trim(),
        date: selectedDate,
        time: selectedTime,
        services: selectedServices.map(s => ({
          id: s.id,
          name: s.service.name,
          price: s.service.price,
        })),
        service: getServiceNames(),
        serviceDescription: getServiceNames(),
        price: getTotalPrice(),
      });
      
      setSuccess(true);
    } catch (error: any) {
      console.error('Erro ao agendar:', error);
      if (error.response?.data?.error?.includes('já existe')) {
        setError(error.response.data.error);
      } else {
        setError(error.response?.data?.error || 'Erro ao realizar agendamento');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableTimes([]);
    setSuccess(false);
    setError('');
    setSelectedServices([]);
    setClientName('');
    setClientPhone('');
    setFormData({
      clientName: '',
      clientPhone: '',
    });
  };

  const handleServicesChange = (services: SelectedService[]) => {
    setSelectedServices(services);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 md:p-8 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="md:w-10 md:h-10 text-green-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#060606] mb-2">✅ Agendamento Confirmado!</h2>
          <p className="text-[#7f7c7a] mb-4 text-sm md:text-base">
            Seu agendamento foi realizado com sucesso!
          </p>
          <div className="bg-[#f5f0e8] rounded-lg p-4 mb-6 text-left text-sm md:text-base">
            <p className="text-[#7f7c7a]">📅 Data: {new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
            <p className="text-[#7f7c7a]">⏰ Horário: {selectedTime}</p>
            <p className="text-[#7f7c7a]">👤 Cliente: {clientName}</p>
            <p className="text-[#7f7c7a]">✂️ Serviços: {getServiceNames()}</p>
            <p className="text-[#7f7c7a]">💰 Total: R$ {getTotalPrice().toFixed(2)}</p>
            <p className="text-[#7f7c7a]">📞 Telefone: {formData.clientPhone}</p>
          </div>
          <button
            onClick={resetForm}
            className="w-full bg-[#9c7f64] hover:bg-[#544941] text-white py-3 rounded-lg transition text-sm md:text-base"
          >
            Novo Agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-wider text-[#060606]">
            M<span className="text-[#9c7f64]">Ä</span>NNER HAUS
          </h1>
          <p className="text-[10px] sm:text-xs md:text-sm tracking-[0.2em] sm:tracking-[0.3em] text-[#9c7f64] uppercase mt-1">
            Barber Club
          </p>
          <p className="text-sm sm:text-base md:text-lg text-[#7f7c7a] mt-2 sm:mt-3 md:mt-4">Agende seu horário online</p>
        </div>

        {/* Progresso */}
        <div className="flex justify-center items-center gap-1 sm:gap-2 md:gap-3 mb-6 sm:mb-8 md:mb-10">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold ${
            step >= 1 ? 'bg-[#9c7f64] text-white' : 'bg-gray-200 text-gray-500'
          }`}>1</div>
          <div className={`w-8 sm:w-12 md:w-16 h-1 ${step >= 2 ? 'bg-[#9c7f64]' : 'bg-gray-200'}`} />
          <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold ${
            step >= 2 ? 'bg-[#9c7f64] text-white' : 'bg-gray-200 text-gray-500'
          }`}>2</div>
          <div className={`w-8 sm:w-12 md:w-16 h-1 ${step >= 3 ? 'bg-[#9c7f64]' : 'bg-gray-200'}`} />
          <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold ${
            step >= 3 ? 'bg-[#9c7f64] text-white' : 'bg-gray-200 text-gray-500'
          }`}>3</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-red-700 text-sm sm:text-base">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#060606]">1. Escolha o barbeiro e a data</h2>
                
                <div>
                  <label className="block text-sm sm:text-base font-medium text-[#060606] mb-2">
                    <Users size={16} className="inline mr-1" /> Barbeiro
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {barbers.map((barber) => (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => setSelectedBarber(barber.id)}
                        className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition text-sm sm:text-base ${
                          selectedBarber === barber.id
                            ? 'border-[#9c7f64] bg-[#9c7f64]/10'
                            : 'border-gray-200 hover:border-[#9c7f64]'
                        }`}
                      >
                        <Scissors size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 mx-auto mb-1 text-[#9c7f64]" />
                        <p className="text-xs sm:text-sm font-medium text-[#060606]">{barber.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-medium text-[#060606] mb-2">
                    <CalendarDays size={16} className="inline mr-1" /> Data
                  </label>
                  <div className="bg-[#f5f0e8] rounded-lg p-3 sm:p-4 md:p-5">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition"
                      >
                        <ChevronLeft size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </button>
                      <span className="font-semibold text-[#060606] text-sm sm:text-base md:text-lg">
                        {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition"
                      >
                        <ChevronRight size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {weekdays.map((day) => (
                        <div key={day} className="text-center text-[10px] sm:text-xs md:text-sm font-medium text-[#7f7c7a] py-1">
                          {day}
                        </div>
                      ))}
                      {days.map((day, index) => {
                        const isDisabled = !day || day.isPast || !day.allowed;
                        
                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (day && !day.isPast && day.allowed) {
                                setSelectedDate(day.date);
                              }
                            }}
                            className={`py-1.5 sm:py-2 md:py-3 rounded-lg text-xs sm:text-sm md:text-base transition relative ${
                              !day ? 'invisible' :
                              day.isPast ? 'text-gray-300 cursor-not-allowed bg-gray-100' :
                              !day.allowed ? 'text-gray-400 cursor-not-allowed bg-gray-100' :
                              selectedDate === day.date ? 'bg-[#9c7f64] text-white' :
                              'hover:bg-[#9c7f64]/10'
                            }`}
                          >
                            {day?.day}
                            {day && !day.allowed && (
                              <span className="block text-[6px] sm:text-[8px] md:text-[10px] leading-tight">
                                {day.reason === 'Fechado' ? '🔴' : '🚶'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Legenda */}
                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-wrap gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs md:text-sm text-[#7f7c7a] justify-center border-t pt-2 sm:pt-3 md:pt-4">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-green-100 border border-green-300 rounded inline-block"></span>
                        Disponível
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-100 border border-gray-300 rounded inline-block"></span>
                        🚶 Ordem de chegada
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-red-100 border border-red-300 rounded inline-block"></span>
                        🔴 Fechado
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBarber) {
                      setError('Selecione um barbeiro');
                      return;
                    }
                    if (!selectedDate) {
                      setError('Selecione uma data');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="w-full bg-[#9c7f64] hover:bg-[#544941] text-white py-3 sm:py-4 rounded-lg transition font-medium text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  Próximo <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#060606]">2. Escolha o horário e serviços</h2>
                
                <div>
                  <label className="block text-sm sm:text-base font-medium text-[#060606] mb-2">
                    <Clock size={16} className="inline mr-1" /> Horário disponível
                  </label>
                  {loading ? (
                    <div className="flex justify-center py-6 sm:py-8 md:py-10">
                      <Loader size={28} className="animate-spin text-[#9c7f64]" />
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 md:py-10 text-[#7f7c7a]">
                      <Calendar size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm sm:text-base">Nenhum horário disponível nesta data</p>
                      <button
                        type="button"
                        onClick={() => { setStep(1); setSelectedDate(''); }}
                        className="text-[#9c7f64] hover:underline mt-2 text-sm"
                      >
                        Voltar e escolher outra data
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                      {availableTimes.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 sm:py-2.5 md:py-3 rounded-lg border-2 transition text-xs sm:text-sm md:text-base ${
                            selectedTime === time
                              ? 'border-[#9c7f64] bg-[#9c7f64]/10 text-[#9c7f64]'
                              : 'border-gray-200 hover:border-[#9c7f64]'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 🔥 MULTI SERVICE SELECTOR COM hideMensalista */}
                <div>
                  <label className="block text-sm sm:text-base font-medium text-[#060606] mb-2">
                    <Scissors size={16} className="inline mr-1" /> Serviços
                  </label>
                  <MultiServiceSelector
                    selectedServices={selectedServices}
                    onChange={handleServicesChange}
                    maxServices={5}
                  />
                </div>

                {selectedServices.length > 0 && (
                  <div className="bg-[#9c7f64]/10 rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-sm sm:text-base font-medium text-[#060606]">
                      Total: <span className="text-[#9c7f64] font-bold">R$ {getTotalPrice().toFixed(2)}</span>
                    </p>
                    <p className="text-xs sm:text-sm text-[#7f7c7a]">
                      {selectedServices.length} serviço(s) selecionado(s)
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-3 sm:py-4 rounded-lg transition font-medium text-sm sm:text-base flex items-center justify-center gap-2 order-2 sm:order-1"
                  >
                    <ArrowLeft size={18} /> Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedTime) {
                        setError('Selecione um horário');
                        return;
                      }
                      if (selectedServices.length === 0) {
                        setError('Selecione pelo menos um serviço');
                        return;
                      }
                      setError('');
                      setStep(3);
                    }}
                    className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-3 sm:py-4 rounded-lg transition font-medium text-sm sm:text-base flex items-center justify-center gap-2 order-1 sm:order-2"
                  >
                    Próximo <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#060606]">3. Seus dados</h2>
                
                <div className="bg-[#f5f0e8] rounded-lg p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 text-sm sm:text-base">
                  <p className="text-[#7f7c7a]">📅 {new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[#7f7c7a]">⏰ {selectedTime}</p>
                  <p className="text-[#7f7c7a]">💈 {barbers.find(b => b.id === selectedBarber)?.name}</p>
                  <p className="text-[#7f7c7a]">✂️ Serviços: {getServiceNames()}</p>
                  <p className="text-[#7f7c7a] font-bold text-[#9c7f64]">💰 Total: R$ {getTotalPrice().toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-medium text-[#060606] mb-2">
                    <User size={16} className="inline mr-1" /> Seu nome
                  </label>
                  <ClientAutocomplete
                    value={clientName}
                    onChange={setClientName}
                    onSelectClient={handleSelectClient}
                    placeholder="Digite seu nome ou telefone..."
                    publicMode={true}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-medium text-[#060606] mb-2">
                    <Phone size={16} className="inline mr-1" /> Telefone
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                    <input
                      type="text"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm sm:text-base"
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-[#7f7c7a] mt-1">Usaremos para confirmar seu agendamento</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs sm:text-sm text-blue-700">
                  💡 Você receberá um lembrete 1 hora antes do horário agendado.
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-3 sm:py-4 rounded-lg transition font-medium text-sm sm:text-base flex items-center justify-center gap-2 order-2 sm:order-1"
                  >
                    <ArrowLeft size={18} /> Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#9c7f64] hover:bg-[#544941] disabled:opacity-50 text-white py-3 sm:py-4 rounded-lg transition font-medium text-sm sm:text-base flex items-center justify-center gap-2 order-1 sm:order-2"
                  >
                    {submitting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        <span className="text-sm sm:text-base">Agendando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        <span className="text-sm sm:text-base">Confirmar Agendamento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="text-center mt-6 sm:mt-8 md:mt-10 text-[10px] sm:text-xs text-[#7f7c7a]/40">
          © 2026 Manner Haus Barber Club
        </div>
      </div>
    </div>
  );
};

export default PublicSchedule;