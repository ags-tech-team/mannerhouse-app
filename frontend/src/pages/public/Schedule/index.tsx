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
  UserX
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
  
  // ESTADO PARA MÚLTIPLOS SERVIÇOS
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  
  // AUTO-COMPLETE
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
  });

  // Carregar barbeiros
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

  // Carregar horários disponíveis
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
      const isSunday = date.getDay() === 0;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      days.push({
        day: i,
        date: dateStr,
        isPast,
        isToday: date.toDateString() === today.toDateString(),
        isSunday,
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

  // CALCULAR TOTAL DOS SERVIÇOS
  const getTotalPrice = () => {
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };

  // PEGAR NOMES DOS SERVIÇOS
  const getServiceNames = () => {
    return selectedServices.map(s => s.service.name).join(', ');
  };

  // HANDLE SELECT CLIENT
  const handleSelectClient = (client: any) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setFormData(prev => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone,
    }));
  };

  // Enviar agendamento
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
    
    if (!formData.clientName.trim() || !formData.clientPhone.trim()) {
      setError('Preencha seu nome e telefone');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      await api.post('/public/appointments', {
        barberId: selectedBarber,
        clientName: formData.clientName.trim(),
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

  // HANDLE PARA MULTI SERVICE SELECTOR
  const handleServicesChange = (services: SelectedService[]) => {
    setSelectedServices(services);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#060606] mb-2">✅ Agendamento Confirmado!</h2>
          <p className="text-[#7f7c7a] mb-4">
            Seu agendamento foi realizado com sucesso!
          </p>
          <div className="bg-[#f5f0e8] rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[#7f7c7a]">📅 Data: {new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
            <p className="text-sm text-[#7f7c7a]">⏰ Horário: {selectedTime}</p>
            <p className="text-sm text-[#7f7c7a]">👤 Cliente: {formData.clientName}</p>
            <p className="text-sm text-[#7f7c7a]">✂️ Serviços: {getServiceNames()}</p>
            <p className="text-sm text-[#7f7c7a]">💰 Total: R$ {getTotalPrice().toFixed(2)}</p>
            <p className="text-sm text-[#7f7c7a]">📞 Telefone: {formData.clientPhone}</p>
          </div>
          <button
            onClick={resetForm}
            className="w-full bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition"
          >
            Novo Agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold tracking-wider text-[#060606]">
            M<span className="text-[#9c7f64]">Ä</span>NNER HAUS
          </h1>
          <p className="text-sm tracking-[0.3em] text-[#9c7f64] uppercase mt-1">
            Barber Club
          </p>
          <p className="text-[#7f7c7a] mt-4">Agende seu horário online</p>
        </div>

        {/* Progresso */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 1 ? 'bg-[#9c7f64] text-white' : 'bg-gray-200 text-gray-500'
          }`}>1</div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#9c7f64]' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 2 ? 'bg-[#9c7f64]' : 'bg-gray-200 text-gray-500'
          }`}>2</div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-[#9c7f64]' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 3 ? 'bg-[#9c7f64]' : 'bg-gray-200 text-gray-500'
          }`}>3</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Escolher Barbeiro e Data */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#060606]">1. Escolha o barbeiro e a data</h2>
                
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-2">
                    <Users size={16} className="inline mr-1" /> Barbeiro
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {barbers.map((barber) => (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => setSelectedBarber(barber.id)}
                        className={`p-3 rounded-lg border-2 transition ${
                          selectedBarber === barber.id
                            ? 'border-[#9c7f64] bg-[#9c7f64]/10'
                            : 'border-gray-200 hover:border-[#9c7f64]'
                        }`}
                      >
                        <Scissors size={20} className="mx-auto mb-1 text-[#9c7f64]" />
                        <p className="text-sm font-medium text-[#060606]">{barber.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-2">
                    <CalendarDays size={16} className="inline mr-1" /> Data
                  </label>
                  <div className="bg-[#f5f0e8] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="font-semibold text-[#060606]">
                        {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                      {weekdays.map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-[#7f7c7a] py-1">
                          {day}
                        </div>
                      ))}
                      {days.map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          disabled={!day || day.isPast || day.isSunday}
                          onClick={() => {
                            if (day && !day.isPast && !day.isSunday) {
                              setSelectedDate(day.date);
                            }
                          }}
                          className={`py-2 rounded-lg text-sm transition ${
                            !day ? 'invisible' :
                            day.isPast || day.isSunday ? 'text-gray-300 cursor-not-allowed bg-gray-100' :
                            selectedDate === day.date ? 'bg-[#9c7f64] text-white' :
                            'hover:bg-[#9c7f64]/10'
                          }`}
                        >
                          {day?.day}
                          {day?.isSunday && (
                            <span className="block text-[8px] text-red-400">Fechado</span>
                          )}
                        </button>
                      ))}
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
                  className="w-full bg-[#9c7f64] hover:bg-[#544941] text-white py-3 rounded-lg transition font-medium"
                >
                  Próximo →
                </button>
              </div>
            )}

            {/* Step 2: Escolher Horário e Serviços */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#060606]">2. Escolha o horário e serviços</h2>
                
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-2">
                    <Clock size={16} className="inline mr-1" /> Horário disponível
                  </label>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader size={32} className="animate-spin text-[#9c7f64]" />
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <div className="text-center py-8 text-[#7f7c7a]">
                      <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhum horário disponível nesta data</p>
                      <button
                        type="button"
                        onClick={() => { setStep(1); setSelectedDate(''); }}
                        className="text-[#9c7f64] hover:underline mt-2"
                      >
                        Voltar e escolher outra data
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableTimes.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 rounded-lg border-2 transition ${
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

                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-2">
                    <Scissors size={16} className="inline mr-1" /> Serviços
                  </label>
                  <MultiServiceSelector
                    selectedServices={selectedServices}
                    onChange={handleServicesChange}
                    maxServices={5}
                  />
                </div>

                {selectedServices.length > 0 && (
                  <div className="bg-[#9c7f64]/10 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium text-[#060606]">
                      Total: <span className="text-[#9c7f64] font-bold">R$ {getTotalPrice().toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-[#7f7c7a]">
                      {selectedServices.length} serviço(s) selecionado(s)
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-3 rounded-lg transition font-medium"
                  >
                    ← Voltar
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
                    className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-3 rounded-lg transition font-medium"
                  >
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Dados do Cliente */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#060606]">3. Seus dados</h2>
                
                <div className="bg-[#f5f0e8] rounded-lg p-4 mb-4">
                  <p className="text-sm text-[#7f7c7a]">📅 {new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm text-[#7f7c7a]">⏰ {selectedTime}</p>
                  <p className="text-sm text-[#7f7c7a]">💈 {barbers.find(b => b.id === selectedBarber)?.name}</p>
                  <p className="text-sm text-[#7f7c7a]">✂️ Serviços: {getServiceNames()}</p>
                  <p className="text-sm text-[#7f7c7a] font-bold text-[#9c7f64]">💰 Total: R$ {getTotalPrice().toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-2">
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
                  <label className="block text-sm font-medium text-[#060606] mb-2">
                    <Phone size={16} className="inline mr-1" /> Telefone
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                    <input
                      type="text"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                  <p className="text-xs text-[#7f7c7a] mt-1">Usaremos para confirmar seu agendamento</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  💡 Você receberá um lembrete 1 hora antes do horário agendado.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-3 rounded-lg transition font-medium"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#9c7f64] hover:bg-[#544941] disabled:opacity-50 text-white py-3 rounded-lg transition font-medium flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Agendando...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Confirmar Agendamento
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="text-center mt-8 text-xs text-[#7f7c7a]/40">
          © 2026 Manner Haus Barber Club
        </div>
      </div>
    </div>
  );
};

export default PublicSchedule;