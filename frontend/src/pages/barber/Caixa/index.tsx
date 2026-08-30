import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus,
  X,
  Check,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  Printer,
  RefreshCw,
  UserX,
  User,
  Phone,
  Scissors,
  Calendar as CalendarIcon,
  Clock as ClockIcon
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { cashRegisterService } from '../../../services/cashRegister.service';
import type { CashRegister } from '../../../services/cashRegister.service';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { api } from '../../../api/client';
import { SERVICES, getServiceById } from '../../../utils/services';
import MultiServiceSelector from '../../../components/common/MultiServiceSelector';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';

interface ServicoFaturamento {
  id: string;
  cliente: string;
  barbeiro: string;
  barbeiroId: string;
  servico: string;
  telefone: string;
  servicoId: string;
  valor: number;
  comissao: number;
  data: string;
  hora: string;
  status: 'concluido' | 'pendente' | 'cancelado';
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  observacao?: string;
}

interface Barber {
  id: string;
  name: string;
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

const BarberCaixa = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [caixa, setCaixa] = useState<CashRegister | null>(null);
  const [servicos, setServicos] = useState<ServicoFaturamento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showModalAbrirCaixa, setShowModalAbrirCaixa] = useState(false);
  const [showModalFecharCaixa, setShowModalFecharCaixa] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoFaturamento | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [barbersList, setBarbersList] = useState<Barber[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [currentBarber, setCurrentBarber] = useState<Barber | null>(null);

  const [formData, setFormData] = useState({
    cliente: '',
    clienteTelefone: '',
    barbeiroId: '',
    barbeiroNome: '',
    formaPagamento: 'dinheiro',
    observacao: '',
  });

  const valor = useNumberInput();
  const valorInicial = useNumberInput();

  const handleSelectClient = (client: any) => {
    console.log('🔍 Cliente selecionado:', client);
    setClientName(client.name);
    setClientPhone(client.phone);
    setFormData(prev => ({
      ...prev,
      cliente: client.name,
      clienteTelefone: client.phone,
    }));
  };

  const getTotalServices = () => {
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };

  const getServiceNames = () => {
    return selectedServices.map(s => s.service.name).join(' + ');
  };

  const getServiceIds = () => {
    return selectedServices.map(s => s.id).join(',');
  };

  const calcularComissaoProduto = async (productId: string, price: number) => {
    try {
      const response = await api.get(`/products/${productId}`);
      const product = response.data;
      if (!product.hasCommission) return 0;
      const barberId = formData.barbeiroId || currentBarber?.id;
      const barber = barbersList.find(b => b.id === barberId);
      const taxaComissao = barber?.productCommissionRate || 0.50;
      const lucro = product.price - product.costPrice;
      return lucro * taxaComissao;
    } catch (error) {
      console.error('Erro ao calcular comissão do produto:', error);
      return 0;
    }
  };

  const loadOccupiedTimes = async () => {
    const barberId = formData.barbeiroId || currentBarber?.id;
    if (!barberId || !selectedDate) {
      setOccupiedTimes([]);
      return;
    }
    setLoadingTimes(true);
    try {
      const response = await api.get('/appointments/check-availability', {
        params: { barberId, date: selectedDate }
      });
      const bookedFromAppointments = response.data.times || [];
      const caixaAtual = await cashRegisterService.getToday();
      const bookedFromCashRegister = caixaAtual?.services
        ?.filter((s: any) => s.barberId === barberId && s.date === selectedDate)
        ?.map((s: any) => s.time) || [];
      const allBooked = [...new Set([...bookedFromAppointments, ...bookedFromCashRegister])];
      setOccupiedTimes(allBooked);
    } catch (error) {
      console.error('Erro ao carregar horários ocupados:', error);
      setOccupiedTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const isTimeOccupied = (time: string) => {
    return occupiedTimes.includes(time);
  };

  const loadBarbersList = async () => {
    try {
      const response = await api.get('/barbers');
      const activeBarbers = response.data.filter((b: any) => b.isActive);
      setBarbersList(activeBarbers);
      if (activeBarbers.length > 0 && !currentBarber) {
        setCurrentBarber(activeBarbers[0]);
        setFormData(prev => ({
          ...prev,
          barbeiroId: activeBarbers[0].id,
          barbeiroNome: activeBarbers[0].name,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadBarbersList();
  }, []);

  useEffect(() => {
    loadOccupiedTimes();
  }, [formData.barbeiroId, selectedDate, currentBarber?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await cashRegisterService.getToday();
      console.log('📦 Dados do caixa:', data);
      setCaixa(data);
      if (data.services && data.services.length > 0) {
        const servicosFormatados = data.services.map((s: any) => ({
          id: s.id || Date.now().toString(),
          cliente: s.client || 'Cliente',
          telefone: s.phone || '',
          barbeiro: s.barberName || s.barber || user?.name || 'Barbeiro',
          barbeiroId: s.barberId || user?.id || '',
          servico: s.service || s.servico || 'Serviço',
          servicoId: s.serviceId || '',
          valor: s.price || s.valor || 0,
          comissao: s.commission || s.comissao || 0,
          data: s.date || new Date().toISOString().split('T')[0],
          hora: s.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: 'concluido',
          formaPagamento: s.paymentMethod || 'dinheiro',
          observacao: s.observacao || '',
        }));
        setServicos(servicosFormatados);
      } else {
        setServicos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      try {
        const hoje = new Date().toISOString().split('T')[0];
        const caixaSalvo = localStorage.getItem(`@caixa_${hoje}`);
        if (caixaSalvo) {
          const caixaData = JSON.parse(caixaSalvo);
          setCaixa({
            id: 'local',
            userId: user?.id || '',
            date: hoje,
            isOpen: caixaData.aberto,
            openingTime: caixaData.horaAbertura,
            closingTime: caixaData.horaFechamento,
            initialCash: caixaData.valorInicial,
            finalCash: caixaData.valorFinal,
            services: caixaData.servicos || [],
            totalRevenue: caixaData.totalVendas || 0,
            totalCommissions: caixaData.totalComissoes || 0,
            servicesCount: caixaData.quantidadeServicos || 0,
          });
          setServicos(caixaData.servicos || []);
        }
      } catch (e) {
        console.error('Erro ao carregar fallback:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async () => {
    const initialValor = valorInicial.getNumberValue();
    if (!initialValor || initialValor < 0) {
      alert('Digite um valor inicial válido');
      return;
    }
    try {
      await cashRegisterService.open(initialValor);
      await loadData();
      setShowModalAbrirCaixa(false);
      valorInicial.reset();
      alert('✅ Caixa aberto com sucesso!');
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      alert(error.response?.data?.error || 'Erro ao abrir caixa');
    }
  };

  const handleFecharCaixa = async () => {
    try {
      await cashRegisterService.close();
      await loadData();
      setShowModalFecharCaixa(false);
      alert('✅ Caixa fechado com sucesso!');
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      alert(error.response?.data?.error || 'Erro ao fechar caixa');
    }
  };

  const handleOpenModal = (servico?: ServicoFaturamento) => {
    if (servico) {
      setEditingServico(servico);
      setClientName(servico.cliente);
      setClientPhone(servico.telefone || ''); 
      setFormData({
        cliente: servico.cliente,
        clienteTelefone: servico.telefone || '', 
        barbeiroId: servico.barbeiroId,
        barbeiroNome: servico.barbeiro,
        formaPagamento: servico.formaPagamento,
        observacao: servico.observacao || '',
      });
      setSelectedDate(servico.data || new Date().toISOString().split('T')[0]);
      setSelectedTime(servico.hora || '');
      valor.setValue(String(servico.valor));
      setIsGuest(servico.cliente === 'Cliente sem cadastro');
      setSelectedServices([]);
    } else {
      setEditingServico(null);
      setClientName('');
      setClientPhone('');
      setFormData({
        cliente: '',
        clienteTelefone: '',
        barbeiroId: '',
        barbeiroNome: '',
        formaPagamento: 'dinheiro',
        observacao: '',
      });
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('');
      valor.reset();
      setIsGuest(false);
      setSelectedServices([]);
      if (barbersList.length > 0) {
        setCurrentBarber(barbersList[0]);
        setFormData(prev => ({
          ...prev,
          barbeiroId: barbersList[0].id,
          barbeiroNome: barbersList[0].name,
        }));
      }
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixa?.isOpen) {
      alert('O caixa precisa estar aberto para registrar serviços!');
      return;
    }
    const barberId = formData.barbeiroId || currentBarber?.id;
    if (!barberId) {
      alert('Selecione um barbeiro');
      return;
    }
    if (selectedServices.length === 0) {
      alert('Selecione pelo menos um serviço');
      return;
    }
    
    // 🔥 CORRIGIDO: VALIDAÇÃO DO NOME DO CLIENTE
    const clientNameFinal = isGuest ? 'Cliente sem cadastro' : clientName.trim() || formData.cliente.trim();
    
    if (!clientNameFinal || clientNameFinal === '') {
      alert('Digite o nome do cliente');
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
    if (isTimeOccupied(selectedTime)) {
      alert(`⚠️ O horário ${selectedTime} já está ocupado para este barbeiro!`);
      return;
    }

    try {
      const clientPhoneFinal = isGuest ? '00000000000' : formData.clienteTelefone || '(00) 00000-0000';
      const total = getTotalServices();
      const serviceNames = getServiceNames();
      const serviceIds = getServiceIds();

      const barber = barbersList.find(b => b.id === barberId);
      const taxaComissaoServico = barber?.serviceCommissionRate || 0.50;
      const comissaoServico = total * taxaComissaoServico;

      let comissaoProduto = 0;
      for (const service of selectedServices) {
        if (service.id && service.id.startsWith('prod_')) {
          const comissao = await calcularComissaoProduto(service.id, service.service.price);
          comissaoProduto += comissao;
        }
      }

      const comissaoTotal = comissaoServico + comissaoProduto;

      console.log('📤 ENVIANDO SERVIÇO:');
      console.log('  client:', clientNameFinal);
      console.log('  phone:', clientPhoneFinal);
      console.log('  barberId:', barberId);
      console.log('  service:', serviceNames);
      console.log('  price:', total);

      if (editingServico) {
        const updatedServicos = servicos.map(s => 
          s.id === editingServico.id 
            ? { 
                ...s, 
                cliente: clientNameFinal,
                servico: serviceNames,
                servicoId: serviceIds,
                valor: total,
                comissao: comissaoTotal,
                formaPagamento: formData.formaPagamento,
                observacao: formData.observacao,
                barbeiro: formData.barbeiroNome || currentBarber?.name || 'Barbeiro',
                barbeiroId: barberId,
                data: selectedDate,
                hora: selectedTime,
              }
            : s
        );
        await cashRegisterService.updateServices(updatedServicos);
        await loadData();
      } else {
        await cashRegisterService.addService({
          client: clientNameFinal,
          barberId: barberId,
          service: serviceNames,
          serviceId: serviceIds,
          price: total,
          commission: comissaoTotal,
          paymentMethod: formData.formaPagamento,
          date: selectedDate,
          time: selectedTime,
          phone: clientPhoneFinal,
        });
        await loadData();
      }

      setShowModal(false);
      setClientName('');
      setClientPhone('');
      setEditingServico(null);
      setFormData({
        cliente: '',
        clienteTelefone: '',
        barbeiroId: '',
        barbeiroNome: '',
        formaPagamento: 'dinheiro',
        observacao: '',
      });
      setSelectedDate('');
      setSelectedTime('');
      valor.reset();
      setIsGuest(false);
      setSelectedServices([]);
      alert('✅ Serviço registrado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      if (error.response?.data?.error?.includes('já existe')) {
        alert(error.response.data.error);
      } else {
        alert(error.response?.data?.error || 'Erro ao salvar serviço');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!caixa?.isOpen) {
      alert('O caixa precisa estar aberto para excluir serviços!');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await cashRegisterService.removeService(id);
      await loadData();
    } catch (error) {
      alert('Erro ao excluir serviço');
    }
  };

  const filteredServicos = servicos.filter(servico => {
    const matchSearch = 
      servico.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.barbeiro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.servico.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || servico.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const totalVendas = servicos.filter(s => s.status === 'concluido').reduce((acc, s) => acc + s.valor, 0);
  const totalComissoes = servicos.filter(s => s.status === 'concluido').reduce((acc, s) => acc + s.comissao, 0);
  const totalServicos = servicos.filter(s => s.status === 'concluido').length;
  const ticketMedio = totalServicos > 0 ? totalVendas / totalServicos : 0;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'concluido': return 'Concluído';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPaymentText = (payment: string) => {
    switch(payment) {
      case 'dinheiro': return 'Dinheiro';
      case 'cartao': return 'Cartão';
      case 'pix': return 'PIX';
      case 'debito': return 'Débito';
      default: return payment;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">💰 Caixa</h1>
          <p className="text-sm sm:text-base text-[#7f7c7a]">
            {caixa?.isOpen ? (
              <span className="flex items-center gap-2 text-green-600">
                <Unlock size={16} /> Caixa aberto desde {caixa.openingTime}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-600">
                <Lock size={16} /> Caixa fechado
              </span>
            )}
            {currentBarber && (
              <span className="ml-2 sm:ml-4 text-xs sm:text-sm text-[#9c7f64]">👤 {currentBarber.name}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {!caixa?.isOpen ? (
            <button 
              onClick={() => setShowModalAbrirCaixa(true)} 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base"
            >
              <Unlock size={18} /> Abrir Caixa
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleOpenModal()} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base"
              >
                <Plus size={18} /> Novo Serviço
              </button>
              <button 
                onClick={() => setShowModalFecharCaixa(true)} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base"
              >
                <Lock size={18} /> Fechar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas */}
      {!caixa?.isOpen && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5 sm:mt-0" size={18} />
          <div>
            <p className="text-yellow-800 font-medium text-sm sm:text-base">Caixa fechado</p>
            <p className="text-yellow-700 text-xs sm:text-sm">Abra o caixa para começar a registrar os serviços do dia</p>
          </div>
        </div>
      )}

      {caixa?.isOpen && servicos.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" size={18} />
          <div>
            <p className="text-blue-800 font-medium text-sm sm:text-base">Nenhum serviço registrado</p>
            <p className="text-blue-700 text-xs sm:text-sm">Clique em "Novo Serviço" para adicionar o primeiro serviço do dia</p>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      {(caixa?.isOpen || servicos.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Vendas</p>
                <p className="text-lg sm:text-2xl font-bold text-[#060606]">R$ {totalVendas.toFixed(2)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full"><DollarSign size={16} className="sm:w-5 sm:h-5 text-green-600" /></div>
            </div>
            {caixa?.initialCash !== undefined && (
              <p className="text-xs text-[#7f7c7a] mt-1">Inicial: R$ {caixa.initialCash.toFixed(2)}</p>
            )}
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Comissões</p>
                <p className="text-lg sm:text-2xl font-bold text-[#060606]">R$ {totalComissoes.toFixed(2)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-full"><TrendingUp size={16} className="sm:w-5 sm:h-5 text-orange-600" /></div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Ticket Médio</p>
                <p className="text-lg sm:text-2xl font-bold text-[#060606]">R$ {ticketMedio.toFixed(2)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full"><Users size={16} className="sm:w-5 sm:h-5 text-blue-600" /></div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Serviços</p>
                <p className="text-lg sm:text-2xl font-bold text-[#060606]">{totalServicos}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full"><Clock size={16} className="sm:w-5 sm:h-5 text-purple-600" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {(caixa?.isOpen || servicos.length > 0) && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Search size={16} className="sm:w-[18px] sm:h-[18px] text-[#7f7c7a] flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                disabled={!caixa?.isOpen}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="sm:w-[18px] sm:h-[18px] text-[#7f7c7a] flex-shrink-0" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                disabled={!caixa?.isOpen}
              >
                <option value="todos">Todos</option>
                <option value="concluido">Concluídos</option>
                <option value="pendente">Pendentes</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {(caixa?.isOpen || servicos.length > 0) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px] sm:min-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#f5f0e8]">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Cliente</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Barbeiro</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Serviço</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Valor</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Comissão</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Pagto</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-[#544941] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={8} className="px-3 sm:px-6 py-4 text-center text-[#7f7c7a] text-sm">Carregando...</td></tr>
                  ) : filteredServicos.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 sm:px-6 py-4 text-center text-[#7f7c7a] text-sm">{caixa?.isOpen ? 'Nenhum serviço registrado' : 'Caixa fechado'}</td></tr>
                  ) : (
                    filteredServicos.map((servico) => (
                      <tr key={servico.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] font-medium text-xs sm:text-sm">{servico.cliente}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">{servico.barbeiro}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">{servico.servico}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] font-medium text-xs sm:text-sm">R$ {servico.valor.toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">R$ {servico.comissao.toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">{getPaymentText(servico.formaPagamento)}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${getStatusColor(servico.status)}`}>
                            {getStatusText(servico.status)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right">
                          <button 
                            onClick={() => handleOpenModal(servico)} 
                            className="text-[#9c7f64] hover:text-[#544941] transition mr-1 sm:mr-2" 
                            disabled={!caixa?.isOpen}
                          >
                            <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button 
                            onClick={() => window.print()} 
                            className="text-[#9c7f64] hover:text-[#544941] transition mr-1 sm:mr-2"
                          >
                            <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button 
                            onClick={() => handleDelete(servico.id)} 
                            className="text-red-500 hover:text-red-700 transition" 
                            disabled={!caixa?.isOpen}
                          >
                            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abrir Caixa */}
      {showModalAbrirCaixa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">Abrir Caixa</h2>
              <button onClick={() => setShowModalAbrirCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-blue-800">Ao abrir o caixa, você poderá registrar serviços e vendas do dia.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Valor Inicial (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={valorInicial.value} 
                  onChange={valorInicial.onChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm sm:text-base" 
                  placeholder="0,00" 
                  min="0" 
                  required 
                />
              </div>
              <button 
                onClick={handleAbrirCaixa} 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Unlock size={18} /> Abrir Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {showModalFecharCaixa && caixa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">Fechar Caixa</h2>
              <button onClick={() => setShowModalFecharCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm"><span className="text-yellow-800">Valor Inicial</span><span className="font-medium">R$ {caixa.initialCash.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-yellow-200 pt-2 text-sm"><span className="text-yellow-800">Vendas do Dia</span><span className="font-medium">R$ {totalVendas.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-yellow-200 pt-2"><span className="text-sm font-bold text-yellow-800">Total em Caixa</span><span className="font-bold text-base sm:text-lg">R$ {(caixa.initialCash + totalVendas).toFixed(2)}</span></div>
              </div>
              <button 
                onClick={handleFecharCaixa} 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Lock size={18} /> Fechar Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Serviço */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">
                {editingServico ? 'Editar Serviço' : '📝 Novo Serviço'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* SELECT DE BARBEIROS */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Barbeiro</label>
                <select
                  value={formData.barbeiroId || currentBarber?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const barber = barbersList.find(b => b.id === id);
                    if (barber) {
                      setCurrentBarber(barber);
                      setFormData(prev => ({
                        ...prev,
                        barbeiroId: barber.id,
                        barbeiroNome: barber.name,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm sm:text-base"
                  required
                >
                  <option value="">Selecione um barbeiro</option>
                  {barbersList.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Data</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Horário</label>
                  {loadingTimes ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#9c7f64]"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
                      ].map((time) => {
                        const isBooked = isTimeOccupied(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => !isBooked && setSelectedTime(time)}
                            disabled={isBooked}
                            className={`py-1.5 rounded-lg border-2 text-[10px] sm:text-xs transition ${isBooked ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through' : selectedTime === time ? 'border-[#9c7f64] bg-[#9c7f64]/10 text-[#9c7f64] font-medium' : 'border-gray-200 hover:border-[#9c7f64] hover:bg-[#9c7f64]/5'}`}
                          >
                            {time}
                            {isBooked && ' 🔒'}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedTime && !isTimeOccupied(selectedTime) && (
                    <p className="text-[10px] sm:text-xs text-green-600 mt-1">✅ {selectedTime}</p>
                  )}
                  {selectedTime && isTimeOccupied(selectedTime) && (
                    <p className="text-[10px] sm:text-xs text-red-600 mt-1">❌ Ocupado!</p>
                  )}
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Nome do Cliente</label>
                 <ClientAutocomplete
                    value={formData.cliente} // 🔥 USAR formData.cliente EM VEZ DE clientName
                    onChange={(value) => {
                      console.log('📝 onChange:', value);
                      setClientName(value);
                      setFormData(prev => ({
                        ...prev,
                        cliente: value,
                      }));
                    }}
                    onSelectClient={handleSelectClient}
                    placeholder="Digite o nome ou telefone..."
                    disabled={isGuest}
                    required={!isGuest}
                  />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Telefone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="text"
                    value={formData.clienteTelefone}
                    onChange={(e) => setFormData({ ...formData, clienteTelefone: e.target.value })}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                    placeholder="(00) 00000-0000"
                    disabled={isGuest}
                  />
                </div>
              </div>

              {/* Opção sem cadastro */}
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#9c7f64] transition cursor-pointer">
                <input
                  type="checkbox"
                  id="isGuest"
                  checked={isGuest}
                  onChange={(e) => {
                    setIsGuest(e.target.checked);
                    if (e.target.checked) {
                      setFormData({ ...formData, cliente: '' });
                      setClientName('');
                    }
                  }}
                  className="w-4 h-4 text-[#9c7f64] focus:ring-[#9c7f64]"
                />
                <label htmlFor="isGuest" className="text-sm text-[#060606] cursor-pointer flex items-center gap-2">
                  <UserX size={16} /> Cliente sem cadastro
                </label>
              </div>

              {/* Multi Serviços */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Serviços</label>
                <MultiServiceSelector
                  selectedServices={selectedServices}
                  onChange={setSelectedServices}
                  maxServices={5}
                />
              </div>

              {/* Total e Comissão */}
              {selectedServices.length > 0 && (
                <div className="bg-[#f5f0e8] rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7f7c7a]">Total:</span>
                    <span className="font-medium">R$ {getTotalServices().toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Forma de Pagamento</label>
                <select
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                  required
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="debito">Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Observação</label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Observações..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base order-2 sm:order-1"
                >
                  <Check size={18} /> Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base order-1 sm:order-2"
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

export default BarberCaixa;