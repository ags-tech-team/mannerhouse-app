import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Eye,
  Printer,
  Plus,
  X,
  Check,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

// Tipos
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

interface CaixaDiario {
  data: string;
  aberto: boolean;
  horaAbertura?: string;
  horaFechamento?: string;
  valorInicial: number;
  valorFinal?: number;
  totalVendas: number;
  totalComissoes: number;
  quantidadeServicos: number;
  servicos: ServicoFaturamento[];
}

const AdminFaturamento = () => {
  const [loading, setLoading] = useState(true);
  const [caixa, setCaixa] = useState<CaixaDiario | null>(null);
  const [servicos, setServicos] = useState<ServicoFaturamento[]>([]);
  const [periodo, setPeriodo] = useState('hoje');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showModalAbrirCaixa, setShowModalAbrirCaixa] = useState(false);
  const [showModalFecharCaixa, setShowModalFecharCaixa] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoFaturamento | null>(null);
  const [valorInicial, setValorInicial] = useState(0);

  // Form data para novo serviço
  const [formData, setFormData] = useState({
    cliente: '',
    barbeiroId: '',
    servico: '',
    valor: 0,
    formaPagamento: 'dinheiro',
    observacao: '',
  });

  // Dados mockados
  const mockServicos: ServicoFaturamento[] = [
    {
      id: '1',
      cliente: 'João Silva',
      barbeiro: 'Carlos Santos',
      barbeiroId: '1',
      servico: 'Corte + Barba',
      servicoId: '1',
      valor: 120.00,
      comissao: 24.00,
      data: new Date().toISOString().split('T')[0],
      hora: '10:30',
      status: 'concluido',
      formaPagamento: 'pix',
    },
    {
      id: '2',
      cliente: 'Pedro Oliveira',
      barbeiro: 'André Lima',
      barbeiroId: '2',
      servico: 'Corte Degradê',
      servicoId: '2',
      valor: 80.00,
      comissao: 16.00,
      data: new Date().toISOString().split('T')[0],
      hora: '11:00',
      status: 'concluido',
      formaPagamento: 'dinheiro',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Verifica se existe caixa aberto hoje
      const hoje = new Date().toISOString().split('T')[0];
      const caixaSalvo = localStorage.getItem(`@caixa_${hoje}`);
      
      if (caixaSalvo) {
        const caixaData = JSON.parse(caixaSalvo);
        setCaixa(caixaData);
        setServicos(caixaData.servicos || []);
      } else {
        // Caixa fechado hoje
        setCaixa({
          data: hoje,
          aberto: false,
          valorInicial: 0,
          totalVendas: 0,
          totalComissoes: 0,
          quantidadeServicos: 0,
          servicos: [],
        });
        setServicos([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  // Salvar caixa no localStorage
  const saveCaixa = (caixaData: CaixaDiario) => {
    localStorage.setItem(`@caixa_${caixaData.data}`, JSON.stringify(caixaData));
    setCaixa(caixaData);
    setServicos(caixaData.servicos || []);
  };

  // 👇 FUNÇÃO CORRIGIDA - Abrir modal para novo serviço ou editar
  const handleOpenModal = (servico?: ServicoFaturamento) => {
    if (servico) {
      // Editar serviço existente
      setEditingServico(servico);
      setFormData({
        cliente: servico.cliente,
        barbeiroId: servico.barbeiroId,
        servico: servico.servico,
        valor: servico.valor,
        formaPagamento: servico.formaPagamento,
        observacao: servico.observacao || '',
      });
    } else {
      // Novo serviço
      setEditingServico(null);
      setFormData({
        cliente: '',
        barbeiroId: '',
        servico: '',
        valor: 0,
        formaPagamento: 'dinheiro',
        observacao: '',
      });
    }
    setShowModal(true);
  };

  // Abrir caixa
  const handleAbrirCaixa = () => {
    if (!valorInicial || valorInicial < 0) {
      alert('Digite um valor inicial válido');
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const novoCaixa: CaixaDiario = {
      data: hoje,
      aberto: true,
      horaAbertura: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      valorInicial: valorInicial,
      totalVendas: 0,
      totalComissoes: 0,
      quantidadeServicos: 0,
      servicos: [],
    };

    saveCaixa(novoCaixa);
    setShowModalAbrirCaixa(false);
    setValorInicial(0);
    alert('Caixa aberto com sucesso!');
  };

  const handleFecharCaixa = () => {
    if (!caixa) return;

    const totalVendas = servicos
      .filter(s => s.status === 'concluido')
      .reduce((acc, s) => acc + s.valor, 0);

    const totalComissoes = servicos
      .filter(s => s.status === 'concluido')
      .reduce((acc, s) => acc + s.comissao, 0);

    const totalServicos = servicos.filter(s => s.status === 'concluido').length;

    // 👇 REGISTRA O FATURAMENTO
    const faturamentoRegistro = {
      id: Date.now().toString(),
      data: new Date().toISOString().split('T')[0],
      valor: totalVendas,
      comissoes: totalComissoes,
      quantidadeServicos: totalServicos,
      valorInicial: caixa.valorInicial,
      valorFinal: caixa.valorInicial + totalVendas,
      caixaId: caixa.data,
    };

    // Salva no localStorage
    const faturamentosSalvos = localStorage.getItem('@faturamentos');
    const todosFaturamentos = faturamentosSalvos ? JSON.parse(faturamentosSalvos) : [];
    todosFaturamentos.push(faturamentoRegistro);
    localStorage.setItem('@faturamentos', JSON.stringify(todosFaturamentos));

    // Resto do código de fechamento...
    const caixaFechado: CaixaDiario = {
      ...caixa,
      aberto: false,
      horaFechamento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      totalVendas,
      totalComissoes,
      quantidadeServicos: totalServicos,
      valorFinal: caixa.valorInicial + totalVendas,
    };

    saveCaixa(caixaFechado);
    setShowModalFecharCaixa(false);
    alert('Caixa fechado com sucesso!');
  };
  // Adicionar serviço
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caixa?.aberto) {
      alert('O caixa precisa estar aberto para registrar serviços!');
      return;
    }

    try {
      const novoServico: ServicoFaturamento = {
        id: Date.now().toString(),
        cliente: formData.cliente,
        barbeiro: ['Carlos Santos', 'André Lima', 'Rafael Souza'][Number(formData.barbeiroId) - 1] || 'Barbeiro',
        barbeiroId: formData.barbeiroId,
        servico: formData.servico,
        servicoId: '1',
        valor: formData.valor,
        comissao: formData.valor * 0.2,
        data: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'concluido',
        formaPagamento: formData.formaPagamento as any,
        observacao: formData.observacao,
      };

      let updatedServicos;
      if (editingServico) {
        updatedServicos = servicos.map(s => 
          s.id === editingServico.id ? { ...s, ...novoServico } : s
        );
      } else {
        updatedServicos = [novoServico, ...servicos];
      }

      setServicos(updatedServicos);
      
      // Atualiza caixa
      if (caixa) {
        const totalVendas = updatedServicos
          .filter(s => s.status === 'concluido')
          .reduce((acc, s) => acc + s.valor, 0);
        
        const totalComissoes = updatedServicos
          .filter(s => s.status === 'concluido')
          .reduce((acc, s) => acc + s.comissao, 0);

        const caixaAtualizado: CaixaDiario = {
          ...caixa,
          servicos: updatedServicos,
          totalVendas,
          totalComissoes,
          quantidadeServicos: updatedServicos.filter(s => s.status === 'concluido').length,
        };
        saveCaixa(caixaAtualizado);
      }

      setShowModal(false);
      setEditingServico(null);
      setFormData({
        cliente: '',
        barbeiroId: '',
        servico: '',
        valor: 0,
        formaPagamento: 'dinheiro',
        observacao: '',
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar serviço');
    }
  };

  // Deletar serviço
  const handleDelete = async (id: string) => {
    if (!caixa?.aberto) {
      alert('O caixa precisa estar aberto para excluir serviços!');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
      const updatedServicos = servicos.filter(s => s.id !== id);
      setServicos(updatedServicos);
      
      // Atualiza caixa
      if (caixa) {
        const totalVendas = updatedServicos
          .filter(s => s.status === 'concluido')
          .reduce((acc, s) => acc + s.valor, 0);
        
        const totalComissoes = updatedServicos
          .filter(s => s.status === 'concluido')
          .reduce((acc, s) => acc + s.comissao, 0);

        const caixaAtualizado: CaixaDiario = {
          ...caixa,
          servicos: updatedServicos,
          totalVendas,
          totalComissoes,
          quantidadeServicos: updatedServicos.filter(s => s.status === 'concluido').length,
        };
        saveCaixa(caixaAtualizado);
      }
    } catch (error) {
      alert('Erro ao excluir serviço');
    }
  };

  // Filtra serviços
  const filteredServicos = servicos.filter(servico => {
    const matchSearch = 
      servico.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.barbeiro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.servico.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filtroStatus === 'todos' || servico.status === filtroStatus;
    
    return matchSearch && matchStatus;
  });

  // Calcula totais
  const totalVendas = servicos
    .filter(s => s.status === 'concluido')
    .reduce((acc, s) => acc + s.valor, 0);
  
  const totalComissoes = servicos
    .filter(s => s.status === 'concluido')
    .reduce((acc, s) => acc + s.comissao, 0);
  
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
          <h1 className="text-3xl font-bold text-[#060606]">Faturamento</h1>
          <p className="text-[#7f7c7a]">
            {caixa?.aberto ? (
              <span className="flex items-center gap-2 text-green-600">
                <Unlock size={16} />
                Caixa aberto desde {caixa.horaAbertura}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-600">
                <Lock size={16} />
                Caixa fechado
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!caixa?.aberto ? (
            <button
              onClick={() => setShowModalAbrirCaixa(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Unlock size={18} />
              Abrir Caixa
            </button>
          ) : (
            <>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
              >
                <Plus size={18} />
                Nova Venda
              </button>
              <button
                onClick={() => setShowModalFecharCaixa(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Lock size={18} />
                Fechar Caixa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas */}
      {!caixa?.aberto && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-yellow-600" size={20} />
          <div>
            <p className="text-yellow-800 font-medium">Caixa fechado</p>
            <p className="text-yellow-700 text-sm">
              Abra o caixa para começar a registrar os serviços do dia
            </p>
          </div>
        </div>
      )}

      {caixa?.aberto && servicos.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-blue-600" size={20} />
          <div>
            <p className="text-blue-800 font-medium">Nenhum serviço registrado</p>
            <p className="text-blue-700 text-sm">
              Clique em "Nova Venda" para adicionar o primeiro serviço do dia
            </p>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      {(caixa?.aberto || servicos.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Vendas do Dia</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {totalVendas.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign size={20} className="text-green-600" />
              </div>
            </div>
            {caixa?.valorInicial !== undefined && (
              <p className="text-sm text-[#7f7c7a] mt-1">
                Caixa inicial: R$ {caixa.valorInicial.toFixed(2)}
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Comissões</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {totalComissoes.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp size={20} className="text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Ticket Médio</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {ticketMedio.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Serviços</p>
                <p className="text-2xl font-bold text-[#060606]">
                  {totalServicos}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {(caixa?.aberto || servicos.length > 0) && (
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
                disabled={!caixa?.aberto}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-[#7f7c7a]" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                disabled={!caixa?.aberto}
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
      {(caixa?.aberto || servicos.length > 0) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Barbeiro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-[#7f7c7a]">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredServicos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-[#7f7c7a]">
                      {caixa?.aberto ? 'Nenhum serviço registrado' : 'Caixa fechado'}
                    </td>
                  </tr>
                ) : (
                  filteredServicos.map((servico) => (
                    <tr key={servico.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                        {servico.cliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                        {servico.barbeiro}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                        {servico.servico}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                        R$ {servico.valor.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                        R$ {servico.comissao.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                        {getPaymentText(servico.formaPagamento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(servico.status)}`}>
                          {getStatusText(servico.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleOpenModal(servico)}
                          className="text-[#9c7f64] hover:text-[#544941] transition mr-2"
                          disabled={!caixa?.aberto}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="text-[#9c7f64] hover:text-[#544941] transition mr-2"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(servico.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          disabled={!caixa?.aberto}
                        >
                          <X size={18} />
                        </button>
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
              <button onClick={() => setShowModalAbrirCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Ao abrir o caixa, você poderá registrar serviços e vendas do dia.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Valor Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder="0,00"
                  min="0"
                  required
                />
              </div>

              <button
                onClick={handleAbrirCaixa}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Unlock size={18} />
                Abrir Caixa
              </button>
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
              <button onClick={() => setShowModalFecharCaixa(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-yellow-800">Valor Inicial</span>
                  <span className="font-medium">R$ {caixa.valorInicial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-yellow-200 pt-2">
                  <span className="text-sm text-yellow-800">Vendas do Dia</span>
                  <span className="font-medium">R$ {totalVendas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-yellow-200 pt-2">
                  <span className="text-sm font-bold text-yellow-800">Total em Caixa</span>
                  <span className="font-bold text-lg">R$ {(caixa.valorInicial + totalVendas).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-[#7f7c7a]">Serviços Realizados</span>
                  <span className="font-medium">{totalServicos}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-[#7f7c7a]">Comissões Pagas</span>
                  <span className="font-medium">R$ {totalComissoes.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleFecharCaixa}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                Fechar Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Venda/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingServico ? 'Editar Serviço' : 'Nova Venda'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Cliente</label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Barbeiro</label>
                <select
                  value={formData.barbeiroId}
                  onChange={(e) => setFormData({ ...formData, barbeiroId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  <option value="">Selecione um barbeiro</option>
                  <option value="1">Carlos Santos</option>
                  <option value="2">André Lima</option>
                  <option value="3">Rafael Souza</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Serviço</label>
                <input
                  type="text"
                  value={formData.servico}
                  onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Forma de Pagamento</label>
                <select
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Observação</label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  rows={3}
                />
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

export default AdminFaturamento;