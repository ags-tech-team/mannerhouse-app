import { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Check, 
  Search,
  Filter,
  Eye,
  Trash2,
  Edit,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Wallet,
  Home,
  Zap,
  Wifi,
  Droplet,
  ShoppingBag,
  Wrench,
  Users,
  MoreHorizontal
} from 'lucide-react';
import type { Despesa, FaturamentoRegistro, ResumoFinanceiro } from '../../types/finance.types';

const AdminDespesas = () => {
  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [faturamentos, setFaturamentos] = useState<FaturamentoRegistro[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'despesas' | 'faturamentos'>('despesas');

  // Form data para despesa
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'outros',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    formaPagamento: 'dinheiro',
    observacao: '',
  });

  // Categorias com ícones
  const categorias = [
    { value: 'agua', label: 'Água', icon: Droplet },
    { value: 'luz', label: 'Luz', icon: Zap },
    { value: 'internet', label: 'Internet', icon: Wifi },
    { value: 'aluguel', label: 'Aluguel', icon: Home },
    { value: 'salario', label: 'Salários', icon: Users },
    { value: 'produtos', label: 'Produtos', icon: ShoppingBag },
    { value: 'manutencao', label: 'Manutenção', icon: Wrench },
    { value: 'outros', label: 'Outros', icon: MoreHorizontal },
  ];

  useEffect(() => {
    loadData();
    // Escuta mudanças no localStorage (quando caixa é fechado)
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [mesSelecionado]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar despesas do mês
      const despesasSalvas = localStorage.getItem('@despesas');
      const todasDespesas: Despesa[] = despesasSalvas ? JSON.parse(despesasSalvas) : [];
      
      // Filtrar despesas do mês selecionado
      const despesasDoMes = todasDespesas.filter(d => 
        d.data.startsWith(mesSelecionado)
      );
      setDespesas(despesasDoMes);

      // Carregar faturamentos (caixas fechados)
      const faturamentosSalvos = localStorage.getItem('@faturamentos');
      const todosFaturamentos: FaturamentoRegistro[] = faturamentosSalvos ? JSON.parse(faturamentosSalvos) : [];
      
      // Filtrar faturamentos do mês selecionado
      const faturamentosDoMes = todosFaturamentos.filter(f => 
        f.data.startsWith(mesSelecionado)
      );
      setFaturamentos(faturamentosDoMes);

      // Calcular resumo
      const totalFaturamento = faturamentosDoMes.reduce((acc, f) => acc + f.valor, 0);
      const totalDespesas = despesasDoMes.reduce((acc, d) => acc + d.valor, 0);
      const totalComissoes = faturamentosDoMes.reduce((acc, f) => acc + f.comissoes, 0);
      const quantidadeServicos = faturamentosDoMes.reduce((acc, f) => acc + f.quantidadeServicos, 0);

      // Calcular por categoria
      const categoriasDespesas = despesasDoMes.reduce((acc: any, d) => {
        const categoria = categorias.find(c => c.value === d.categoria)?.label || d.categoria;
        acc[categoria] = (acc[categoria] || 0) + d.valor;
        return acc;
      }, {});

      setResumo({
        mes: mesSelecionado,
        ano: mesSelecionado.split('-')[0],
        faturamentoTotal: totalFaturamento,
        despesasTotal: totalDespesas,
        lucroLiquido: totalFaturamento - totalDespesas,
        totalComissoes,
        quantidadeServicos,
        categoriasDespesas: Object.entries(categoriasDespesas).map(([categoria, total]) => ({
          categoria,
          total: total as number,
        })),
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salvar despesas
  const saveDespesas = (novaLista: Despesa[]) => {
    const despesasSalvas = localStorage.getItem('@despesas');
    const todasDespesas: Despesa[] = despesasSalvas ? JSON.parse(despesasSalvas) : [];
    
    if (editingDespesa) {
      // Editar
      const index = todasDespesas.findIndex(d => d.id === editingDespesa.id);
      if (index !== -1) {
        todasDespesas[index] = novaLista[0];
      }
    } else {
      // Adicionar
      todasDespesas.push(novaLista[0]);
    }
    
    localStorage.setItem('@despesas', JSON.stringify(todasDespesas));
    loadData();
  };

  // Abrir modal para nova despesa
  const handleOpenModal = (despesa?: Despesa) => {
    if (despesa) {
      setEditingDespesa(despesa);
      setFormData({
        descricao: despesa.descricao,
        categoria: despesa.categoria,
        valor: despesa.valor,
        data: despesa.data,
        formaPagamento: despesa.formaPagamento,
        observacao: despesa.observacao || '',
      });
    } else {
      setEditingDespesa(null);
      setFormData({
        descricao: '',
        categoria: 'outros',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        formaPagamento: 'dinheiro',
        observacao: '',
      });
    }
    setShowModal(true);
  };

  // Salvar despesa
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const novaDespesa: Despesa = {
      id: editingDespesa?.id || Date.now().toString(),
      descricao: formData.descricao,
      categoria: formData.categoria as any,
      valor: formData.valor,
      data: formData.data,
      formaPagamento: formData.formaPagamento as any,
      observacao: formData.observacao,
    };

    saveDespesas([novaDespesa]);
    setShowModal(false);
  };

  // Excluir despesa
  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    const despesasSalvas = localStorage.getItem('@despesas');
    const todasDespesas: Despesa[] = despesasSalvas ? JSON.parse(despesasSalvas) : [];
    const novasDespesas = todasDespesas.filter(d => d.id !== id);
    localStorage.setItem('@despesas', JSON.stringify(novasDespesas));
    loadData();
  };

  // Formatar mês
  const formatarMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[Number(mes) - 1]} ${ano}`;
  };

  // Mudar mês
  const mudarMes = (delta: number) => {
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const novaData = new Date(ano, mes - 1 + delta, 1);
    const novoMes = `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, '0')}`;
    setMesSelecionado(novoMes);
  };

  // Filtrar despesas
  const despesasFiltradas = despesas.filter(d => {
    const matchSearch = d.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filtroCategoria === 'todos' || d.categoria === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  const getCategoriaIcon = (categoria: string) => {
    const cat = categorias.find(c => c.value === categoria);
    return cat ? cat.icon : MoreHorizontal;
  };

  const getCategoriaLabel = (categoria: string) => {
    const cat = categorias.find(c => c.value === categoria);
    return cat ? cat.label : categoria;
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
          <h1 className="text-3xl font-bold text-[#060606]">Despesas</h1>
          <p className="text-[#7f7c7a]">Controle financeiro geral da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Nova Despesa
        </button>
      </div>

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Faturamento</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {resumo.faturamentoTotal.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp size={20} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {resumo.despesasTotal.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown size={20} className="text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${resumo.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {resumo.lucroLiquido.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <PiggyBank size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Comissões</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {resumo.totalComissoes.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de Mês */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => mudarMes(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-[#060606]">
            {formatarMes(mesSelecionado)}
          </h2>
          <button
            onClick={() => mudarMes(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const hoje = new Date();
              setMesSelecionado(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="px-4 py-2 bg-[#f5f0e8] hover:bg-[#e8e0d4] text-[#060606] rounded-lg transition"
          >
            Mês Atual
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setAbaAtiva('despesas')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                abaAtiva === 'despesas'
                  ? 'border-[#9c7f64] text-[#9c7f64]'
                  : 'border-transparent text-[#7f7c7a] hover:text-[#060606] hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <TrendingDown size={16} />
                Despesas
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
                  {despesas.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => setAbaAtiva('faturamentos')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                abaAtiva === 'faturamentos'
                  ? 'border-[#9c7f64] text-[#9c7f64]'
                  : 'border-transparent text-[#7f7c7a] hover:text-[#060606] hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={16} />
                Faturamentos
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                  {faturamentos.length}
                </span>
              </span>
            </button>
          </nav>
        </div>

        {/* Conteúdo das abas */}
        <div className="p-4">
          {abaAtiva === 'despesas' ? (
            // Aba de Despesas
            <>
              {/* Filtros Despesas */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 flex items-center gap-2">
                  <Search size={18} className="text-[#7f7c7a]" />
                  <input
                    type="text"
                    placeholder="Buscar despesa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-[#7f7c7a]" />
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  >
                    <option value="todos">Todas categorias</option>
                    {categorias.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lista de Despesas */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#f5f0e8]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Pagamento</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-[#7f7c7a]">Carregando...</td></tr>
                    ) : despesasFiltradas.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-[#7f7c7a]">Nenhuma despesa encontrada</td></tr>
                    ) : (
                      despesasFiltradas.map((despesa) => {
                        const Icon = getCategoriaIcon(despesa.categoria);
                        return (
                          <tr key={despesa.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                              {despesa.descricao}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="flex items-center gap-2">
                                <Icon size={16} className="text-[#7f7c7a]" />
                                {getCategoriaLabel(despesa.categoria)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">
                              R$ {despesa.valor.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                              {new Date(despesa.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                              {getPaymentText(despesa.formaPagamento)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleOpenModal(despesa)}
                                className="text-[#9c7f64] hover:text-[#544941] transition mr-2"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(despesa.id)}
                                className="text-red-500 hover:text-red-700 transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {despesasFiltradas.length > 0 && (
                    <tfoot className="bg-[#f5f0e8]">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-right font-bold text-[#060606]">Total</td>
                        <td className="px-6 py-4 font-bold text-red-600">
                          R$ {despesasFiltradas.reduce((acc, d) => acc + d.valor, 0).toFixed(2)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          ) : (
            // Aba de Faturamentos
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#f5f0e8]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Serviços</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Valor Inicial</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Faturamento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Comissões</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Total em Caixa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-[#7f7c7a]">Carregando...</td></tr>
                    ) : faturamentos.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-[#7f7c7a]">Nenhum faturamento registrado neste mês</td></tr>
                    ) : (
                      faturamentos.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                            {new Date(f.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                            {f.quantidadeServicos}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                            R$ {f.valorInicial.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                            R$ {f.valor.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                            R$ {f.comissoes.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-bold">
                            R$ {f.valorFinal.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {faturamentos.length > 0 && (
                    <tfoot className="bg-[#f5f0e8]">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-right font-bold text-[#060606]">Total</td>
                        <td className="px-6 py-4 font-bold text-[#060606]">
                          R$ {faturamentos.reduce((acc, f) => acc + f.valorInicial, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-bold text-green-600">
                          R$ {faturamentos.reduce((acc, f) => acc + f.valor, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#060606]">
                          R$ {faturamentos.reduce((acc, f) => acc + f.comissoes, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          R$ {faturamentos.reduce((acc, f) => acc + f.valorFinal, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {faturamentos.length > 0 && (
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 Os faturamentos são registrados automaticamente quando um caixa é fechado.
                    Cada linha representa um dia de trabalho.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Nova/Editar Despesa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Descrição</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Categoria</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  {categorias.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium text-[#060606]">Data</label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Forma de Pagamento</label>
                <select
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="pix">PIX</option>
                  <option value="debito">Débito</option>
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

// Componente faltando (ChevronLeft/Right)
const ChevronLeft = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRight = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default AdminDespesas;