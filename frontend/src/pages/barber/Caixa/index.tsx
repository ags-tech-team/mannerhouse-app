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
  formaPagamento: 'dinheiro' | 'credito' | 'pix' | 'debito';
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

  // 🔥 BARBEIRO SELECIONADO PARA ABERTURA
  const [selectedBarberForOpening, setSelectedBarberForOpening] = useState<Barber | null>(null);

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
    if (selectedServices.some(s => s.service.id === 'mensalista')) {
      return 0;
    }
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

  // ========== LOAD DATA CORRIGIDO ==========
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await cashRegisterService.getToday();
      console.log('📦 Dados do caixa (RAW):', data);
      
      setCaixa(data);
      
      // 🔥 ATUALIZA O CURRENT BARBER COM O BARBEIRO DO CAIXA
      if (data.barber) {
        console.log('👤 Barbeiro do caixa:', data.barber);
        setCurrentBarber(data.barber);
        setFormData(prev => ({
          ...prev,
          barbeiroId: data.barber.id,
          barbeiroNome: data.barber.name,
        }));
      } else {
        // Fallback: se não tiver barbeiro, tenta usar o primeiro da lista
        if (barbersList.length > 0 && !currentBarber) {
          setCurrentBarber(barbersList[0]);
          setFormData(prev => ({
            ...prev,
            barbeiroId: barbersList[0].id,
            barbeiroNome: barbersList[0].name,
          }));
        }
      }
      
      if (data.services && data.services.length > 0) {
        console.log(`📋 ${data.services.length} serviços encontrados`);
        const servicosFormatados = data.services.map((s: any, index: number) => {
          const formatted = {
            id: s.id || Date.now().toString(),
            cliente: s.cliente || s.client || 'Cliente',
            telefone: s.telefone || s.phone || '',
            barbeiro: s.barbeiro || s.barberName || s.barber || user?.name || 'Barbeiro',
            barbeiroId: s.barbeiroId || s.barberId || user?.id || '',
            servico: s.servico || s.service || 'Serviço',
            servicoId: s.servicoId || s.serviceId || '',
            valor: s.valor || s.price || 0,
            comissao: s.comissao || s.commission || 0,
            data: s.data || s.date || new Date().toISOString().split('T')[0],
            hora: s.hora || s.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'concluido',
            formaPagamento: s.formaPagamento || s.paymentMethod || 'dinheiro',
            observacao: s.observacao || '',
          };
          return formatted;
        });
        setServicos(servicosFormatados);
      } else {
        setServicos([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      // Fallback para localStorage
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
        console.error('❌ Erro ao carregar fallback:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== ABRIR CAIXA ==========
  const handleAbrirCaixa = async () => {
    const initialValor = valorInicial.getNumberValue();
    if (!initialValor || initialValor < 0) {
      alert('Digite um valor inicial válido');
      return;
    }
    if (!selectedBarberForOpening) {
      alert('Selecione o barbeiro que vai abrir o caixa');
      return;
    }
    try {
      await cashRegisterService.open(initialValor, selectedBarberForOpening.id);
      await loadData();
      setShowModalAbrirCaixa(false);
      valorInicial.reset();
      setSelectedBarberForOpening(null);
      alert('✅ Caixa aberto com sucesso!');
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      alert(error.response?.data?.error || 'Erro ao abrir caixa');
    }
  };

  // ========== FECHAR CAIXA ==========
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

  // ========== ABRIR MODAL (CRIAÇÃO/EDIÇÃO) ==========
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
      
      if (servico.servicoId) {
        const serviceIds = servico.servicoId.split(',');
        const loadedServices = serviceIds
          .map((id: string) => {
            const trimmedId = id.trim();
            let baseId = trimmedId;
            const parts = trimmedId.split('-');
            if (parts.length > 2) {
              const possibleBaseId = parts.slice(0, -2).join('-');
              const service = getServiceById(possibleBaseId);
              if (service) baseId = possibleBaseId;
            }
            const service = getServiceById(baseId);
            if (service) {
              return { id: trimmedId, service };
            }
            console.warn(`⚠️ Serviço não encontrado para ID: ${baseId}`);
            return null;
          })
          .filter(Boolean) as SelectedService[];
        setSelectedServices(loadedServices);
      } else {
        setSelectedServices([]);
      }
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

  // ========== SUBMIT ==========
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
    
    const clientNameFinal = isGuest 
      ? 'Cliente sem cadastro' 
      : (formData.cliente.trim() || clientName.trim() || (editingServico ? editingServico.cliente : ''));
    
    if (!clientNameFinal) {
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
    if (!editingServico && isTimeOccupied(selectedTime)) {
      alert(`⚠️ O horário ${selectedTime} já está ocupado para este barbeiro!`);
      return;
    }

    try {
      const clientPhoneFinal = isGuest 
        ? '00000000000' 
        : (formData.clienteTelefone || clientPhone || (editingServico ? editingServico.telefone : ''));
      
      const hasMensalista = selectedServices.some(s => s.service.id === 'mensalista');
      const total = hasMensalista ? 0 : getTotalServices();
      const serviceNames = getServiceNames();
      const serviceIds = getServiceIds();

      const barber = barbersList.find(b => b.id === barberId);
      const taxaComissaoServico = barber?.serviceCommissionRate || 0.50;
      const comissaoServico = hasMensalista ? 0 : (total * taxaComissaoServico);

      let comissaoProduto = 0;
      for (const service of selectedServices) {
        if (service.id && service.id.startsWith('prod_')) {
          const comissao = await calcularComissaoProduto(service.id, service.service.price);
          comissaoProduto += comissao;
        }
      }
      const comissaoTotal = hasMensalista ? 0 : (comissaoServico + comissaoProduto);

      console.log('📤 ENVIANDO SERVIÇO:', { clientNameFinal, barberId, serviceNames, total });

      if (editingServico) {
        const updatedServicos = servicos.map(s => {
          if (s.id === editingServico.id) {
            return {
              ...s,
              cliente: clientNameFinal || s.cliente,
              telefone: clientPhoneFinal || s.telefone,
              barbeiro: formData.barbeiroNome || currentBarber?.name || s.barbeiro,
              barbeiroId: barberId || s.barbeiroId,
              servico: serviceNames || s.servico,
              servicoId: serviceIds || s.servicoId,
              valor: total || s.valor,
              comissao: comissaoTotal || s.comissao,
              formaPagamento: formData.formaPagamento || s.formaPagamento,
              observacao: formData.observacao || s.observacao,
              data: selectedDate || s.data,
              hora: selectedTime || s.hora,
            };
          }
          return s;
        });
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
      setSelectedDate('');
      setSelectedTime('');
      valor.reset();
      setIsGuest(false);
      setSelectedServices([]);
      alert('✅ Serviço registrado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      alert(error.response?.data?.error || 'Erro ao salvar serviço');
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
      case 'credito': return 'Crédito';
      case 'cartao': return 'Cartão';
      case 'pix': return 'PIX';
      case 'debito': return 'Débito';
      default: return payment;
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingServico(null);
    setClientName('');
    setClientPhone('');
    setSelectedDate('');
    setSelectedTime('');
    setOccupiedTimes([]);
    setSelectedServices([]);
    setIsGuest(false);
    valor.reset();
    setFormData({
      cliente: '',
      clienteTelefone: '',
      barbeiroId: '',
      barbeiroNome: '',
      formaPagamento: 'dinheiro',
      observacao: '',
    });
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-4 sm:space-y-6">
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
            {/* 🔥 EXIBE O BARBEIRO DO CAIXA */}
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

      {/* Alertas e cards... (mantido) */}
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

      {/* Cards de resumo, filtros e tabela – mantidos como estão... */}
      {/* (Para não alongar, mantenha o restante do código exatamente como você tinha) */}
      {/* ... */}

      {/* Modal Abrir Caixa com seletor de barbeiro */}
      {showModalAbrirCaixa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">Abrir Caixa</h2>
              <button onClick={() => setShowModalAbrirCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Barbeiro responsável</label>
                <select
                  value={selectedBarberForOpening?.id || ''}
                  onChange={(e) => {
                    const barber = barbersList.find(b => b.id === e.target.value);
                    setSelectedBarberForOpening(barber || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
                  required
                >
                  <option value="">Selecione um barbeiro</option>
                  {barbersList.map((barber) => (
                    <option key={barber.id} value={barber.id}>{barber.name}</option>
                  ))}
                </select>
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

      {/* Modal Fechar Caixa e Modal de Serviço – mantidos */}
      {/* ... (você já tem esses modais) */}
    </div>
  );
};

export default BarberCaixa;