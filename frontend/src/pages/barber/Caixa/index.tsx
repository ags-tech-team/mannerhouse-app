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

interface ServicoFaturamento {
  id: string;
  cliente: string;
  barbeiro: string;
  barbeiroId: string;
  servico: string;
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  
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

  const loadCurrentBarber = async () => {
    try {
      const savedBarberId = localStorage.getItem('@mannerhouse:selectedBarber');
      const savedBarberName = localStorage.getItem('@mannerhouse:selectedBarberName');
      
      if (savedBarberId) {
        const response = await api.get(`/barbers/${savedBarberId}`);
        const barber = response.data;
        setCurrentBarber(barber);
        setFormData(prev => ({
          ...prev,
          barbeiroId: barber.id,
          barbeiroNome: barber.name,
        }));
      } else {
        const response = await api.get('/barbers');
        const barbers = response.data;
        const userBarber = barbers.find((b: any) => b.userId === user?.id);
        if (userBarber) {
          setCurrentBarber(userBarber);
          setFormData(prev => ({
            ...prev,
            barbeiroId: userBarber.id,
            barbeiroNome: userBarber.name,
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiro da agenda:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadCurrentBarber();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await cashRegisterService.getToday();
      setCaixa(data);
      
      if (data.services && data.services.length > 0) {
        const servicosFormatados = data.services.map((s: any) => ({
          id: s.id || Date.now().toString(),
          cliente: s.client || 'Cliente',
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
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      alert(error.response?.data?.error || 'Erro ao fechar caixa');
    }
  };

  const handleOpenModal = (servico?: ServicoFaturamento) => {
    if (servico) {
      setEditingServico(servico);
      setFormData({
        cliente: servico.cliente,
        clienteTelefone: '',
        barbeiroId: servico.barbeiroId,
        barbeiroNome: servico.barbeiro,
        formaPagamento: servico.formaPagamento,
        observacao: servico.observacao || '',
      });
      setSelectedServiceId(servico.servicoId || '');
      setSelectedDate(servico.data || new Date().toISOString().split('T')[0]);
      setSelectedTime(servico.hora || '');
      valor.setValue(String(servico.valor));
      setIsGuest(servico.cliente === 'Cliente sem cadastro');
    } else {
      setEditingServico(null);
      setFormData({
        cliente: '',
        clienteTelefone: '',
        barbeiroId: currentBarber?.id || '',
        barbeiroNome: currentBarber?.name || '',
        formaPagamento: 'dinheiro',
        observacao: '',
      });
      setSelectedServiceId('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('');
      valor.reset();
      setIsGuest(false);
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
      alert('Nenhum barbeiro selecionado! Volte para a agenda e selecione um barbeiro.');
      return;
    }

    const selectedService = getServiceById(selectedServiceId);
    if (!selectedService) {
      alert('Selecione um serviço');
      return;
    }

    if (!isGuest && !formData.cliente.trim()) {
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

    try {
      const clientName = isGuest ? 'Cliente sem cadastro' : formData.cliente.trim();
      const clientPhone = isGuest ? '00000000000' : formData.clienteTelefone || '(00) 00000-0000';

      if (editingServico) {
        const updatedServicos = servicos.map(s => 
          s.id === editingServico.id 
            ? { 
                ...s, 
                cliente: clientName,
                servico: selectedService.name,
                servicoId: selectedService.id,
                valor: valor.getNumberValue() || selectedService.price,
                comissao: (valor.getNumberValue() || selectedService.price) * 0.2,
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
          client: clientName,
          barberId: barberId,
          service: selectedService.name,
          serviceId: selectedService.id,
          price: valor.getNumberValue() || selectedService.price,
          paymentMethod: formData.formaPagamento,
          date: selectedDate,
          time: selectedTime,
          phone: clientPhone,
        });
        await loadData();
      }

      setShowModal(false);
      setEditingServico(null);
      setFormData({
        cliente: '',
        clienteTelefone: '',
        barbeiroId: currentBarber?.id || '',
        barbeiroNome: currentBarber?.name || '',
        formaPagamento: 'dinheiro',
        observacao: '',
      });
      setSelectedServiceId('');
      setSelectedDate('');
      setSelectedTime('');
      valor.reset();
      setIsGuest(false);
      alert('✅ Serviço registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar serviço');
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">💰 Caixa</h1>
          <p className="text-[#7f7c7a]">
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
              <span className="ml-4 text-sm text-[#9c7f64]">👤 Barbeiro: {currentBarber.name}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!caixa?.isOpen ? (
            <button onClick={() => setShowModalAbrirCaixa(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
              <Unlock size={18} /> Abrir Caixa
            </button>
          ) : (
            <>
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition">
                <Plus size={18} /> Novo Serviço
              </button>
              <button onClick={() => setShowModalFecharCaixa(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition">
                <Lock size={18} /> Fechar Caixa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas */}
      {!caixa?.isOpen && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-yellow-600" size={20} />
          <div>
            <p className="text-yellow-800 font-medium">Caixa fechado</p>
            <p className="text-yellow-700 text-sm">Abra o caixa para começar a registrar os serviços do dia</p>
          </div>
        </div>
      )}

      {caixa?.isOpen && servicos.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-blue-600" size={20} />
          <div>
            <p className="text-blue-800 font-medium">Nenhum serviço registrado</p>
            <p className="text-blue-700 text-sm">Clique em "Novo Serviço" para adicionar o primeiro serviço do dia</p>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      {(caixa?.isOpen || servicos.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Vendas do Dia</p>
                <p className="text-2xl font-bold text-[#060606]">R$ {totalVendas.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full"><DollarSign size={20} className="text-green-600" /></div>
            </div>
            {caixa?.initialCash !== undefined && <p className="text-sm text-[#7f7c7a] mt-1">Caixa inicial: R$ {caixa.initialCash.toFixed(2)}</p>}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Comissões</p>
                <p className="text-2xl font-bold text-[#060606]">R$ {totalComissoes.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full"><TrendingUp size={20} className="text-orange-600" /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Ticket Médio</p>
                <p className="text-2xl font-bold text-[#060606]">R$ {ticketMedio.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full"><Users size={20} className="text-blue-600" /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Serviços</p>
                <p className="text-2xl font-bold text-[#060606]">{totalServicos}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full"><Clock size={20} className="text-purple-600" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {(caixa?.isOpen || servicos.length > 0) && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Search size={18} className="text-[#7f7c7a]" />
              <input
                type="text"
                placeholder="Buscar por cliente, barbeiro ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                disabled={!caixa?.isOpen}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-[#7f7c7a]" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Barbeiro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Serviço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Comissão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Pagamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-[#7f7c7a]">Carregando...</td></tr>
                ) : filteredServicos.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-[#7f7c7a]">{caixa?.isOpen ? 'Nenhum serviço registrado' : 'Caixa fechado'}</td></tr>
                ) : (
                  filteredServicos.map((servico) => (
                    <tr key={servico.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">{servico.cliente}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{servico.barbeiro}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{servico.servico}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">R$ {servico.valor.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">R$ {servico.comissao.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{getPaymentText(servico.formaPagamento)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(servico.status)}`}>{getStatusText(servico.status)}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => handleOpenModal(servico)} className="text-[#9c7f64] hover:text-[#544941] transition mr-2" disabled={!caixa?.isOpen}><Eye size={18} /></button>
                        <button onClick={() => window.print()} className="text-[#9c7f64] hover:text-[#544941] transition mr-2"><Printer size={18} /></button>
                        <button onClick={() => handleDelete(servico.id)} className="text-red-500 hover:text-red-700 transition" disabled={!caixa?.isOpen}><X size={18} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Abrir Caixa */}
      {showModalAbrirCaixa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">Abrir Caixa</h2>
              <button onClick={() => setShowModalAbrirCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-blue-800">Ao abrir o caixa, você poderá registrar serviços e vendas do dia.</p></div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Valor Inicial (R$)</label>
                <input type="number" step="0.01" value={valorInicial.value} onChange={valorInicial.onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent" placeholder="0,00" min="0" required />
              </div>
              <button onClick={handleAbrirCaixa} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"><Unlock size={18} /> Abrir Caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {showModalFecharCaixa && caixa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">Fechar Caixa</h2>
              <button onClick={() => setShowModalFecharCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-sm text-yellow-800">Valor Inicial</span><span className="font-medium">R$ {caixa.initialCash.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-yellow-200 pt-2"><span className="text-sm text-yellow-800">Vendas do Dia</span><span className="font-medium">R$ {totalVendas.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-yellow-200 pt-2"><span className="text-sm font-bold text-yellow-800">Total em Caixa</span><span className="font-bold text-lg">R$ {(caixa.initialCash + totalVendas).toFixed(2)}</span></div>
              </div>
              <button onClick={handleFecharCaixa} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"><Lock size={18} /> Fechar Caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Serviço */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingServico ? 'Editar Serviço' : '📝 Novo Serviço'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Barbeiro */}
              <div className="bg-[#f5f0e8] p-3 rounded-lg">
                <p className="text-sm text-[#7f7c7a]">👤 Barbeiro</p>
                <p className="font-semibold text-[#060606]">{currentBarber?.name || 'Nenhum barbeiro selecionado'}</p>
                <p className="text-xs text-[#7f7c7a] mt-1">Barbeiro selecionado na agenda</p>
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">
                    <CalendarIcon size={14} className="inline mr-1" /> Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">
                    <ClockIcon size={14} className="inline mr-1" /> Horário
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder="Digite o nome do cliente"
                  disabled={isGuest}
                  required={!isGuest}
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Telefone do Cliente</label>
                <input
                  type="text"
                  value={formData.clienteTelefone}
                  onChange={(e) => setFormData({ ...formData, clienteTelefone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder="(00) 00000-0000"
                  disabled={isGuest}
                />
                <p className="text-xs text-[#7f7c7a] mt-1">Opcional, mas recomendado para contato</p>
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
                    }
                  }}
                  className="w-4 h-4 text-[#9c7f64] focus:ring-[#9c7f64]"
                />
                <label htmlFor="isGuest" className="text-sm text-[#060606] cursor-pointer flex items-center gap-2">
                  <UserX size={16} />
                  Cliente sem cadastro
                </label>
              </div>

              {/* Serviço */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Serviço</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    const serviceId = e.target.value;
                    setSelectedServiceId(serviceId);
                    const service = getServiceById(serviceId);
                    if (service) {
                      valor.setValue(String(service.price));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  <option value="">Selecione um serviço</option>
                  {SERVICES.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - R$ {service.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valor.value}
                  onChange={valor.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder="0,00"
                />
                <p className="text-xs text-[#7f7c7a] mt-1">Preenchido automaticamente ao selecionar o serviço</p>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Forma de Pagamento</label>
                <select
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  rows={3}
                  placeholder="Observações sobre o serviço..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Salvar
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

export default BarberCaixa;