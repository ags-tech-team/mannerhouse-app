import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { 
  Plus, 
  Save, 
  Trash2, 
  X, 
  Edit, 
  Check, 
  Search,
  Scissors,
  AlertCircle
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  category: 'corte' | 'barba' | 'cabelo' | 'tratamento' | 'outro';
  isActive: boolean;
}

const CATEGORIES = [
  { value: 'corte', label: '✂️ Corte' },
  { value: 'barba', label: '🧔 Barba' },
  { value: 'cabelo', label: '💈 Cabelo' },
  { value: 'tratamento', label: '💆 Tratamento' },
  { value: 'outro', label: '📌 Outro' },
];

const AdminServicos = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Service>>({});
  const [showNewModal, setShowNewModal] = useState(false);
  const [newService, setNewService] = useState<Partial<Service>>({
    category: 'corte',
    isActive: true,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/services');
      setServices(response.data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      showMessage('error', 'Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleStartEdit = (service: Service) => {
    setEditingId(service.id);
    setEditData({ ...service });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name || editData.price === undefined) {
      showMessage('error', 'Preencha todos os campos');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/services/${editingId}`, {
        name: editData.name,
        price: parseFloat(String(editData.price)),
        category: editData.category,
        isActive: editData.isActive,
      });
      await loadServices();
      setEditingId(null);
      setEditData({});
      showMessage('success', '✅ Serviço atualizado!');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newService.name || newService.price === undefined || !newService.category) {
      showMessage('error', 'Preencha todos os campos');
      return;
    }
    setSaving(true);
    try {
      // 🔥 Gerar ID slug a partir do nome
      const generatedId = newService.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await api.post('/services', {
        id: generatedId,
        name: newService.name,
        price: parseFloat(String(newService.price)),
        category: newService.category,
      });
      await loadServices();
      setShowNewModal(false);
      setNewService({ category: 'corte', isActive: true });
      showMessage('success', '✅ Serviço criado!');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Erro ao criar serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
    try {
      await api.delete(`/services/${id}`);
      await loadServices();
      showMessage('success', '✅ Serviço excluído!');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Erro ao excluir serviço');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar por categoria
  const groupedByCategory = filteredServices.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">💈 Serviços</h1>
          <p className="text-sm text-[#7f7c7a]">Gerencie os serviços oferecidos pela barbearia</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-[#7f7c7a]" />
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
          />
          <span className="text-sm text-[#7f7c7a] whitespace-nowrap">
            {filteredServices.length} serviços
          </span>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[#544941] uppercase text-xs">ID</th>
                  <th className="px-3 py-2 text-left font-medium text-[#544941] uppercase text-xs">Nome</th>
                  <th className="px-3 py-2 text-left font-medium text-[#544941] uppercase text-xs">Categoria</th>
                  <th className="px-3 py-2 text-right font-medium text-[#544941] uppercase text-xs">Preço</th>
                  <th className="px-3 py-2 text-center font-medium text-[#544941] uppercase text-xs">Ativo</th>
                  <th className="px-3 py-2 text-right font-medium text-[#544941] uppercase text-xs">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map(service => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    {editingId === service.id ? (
                      <>
                        <td className="px-3 py-2 text-[#7f7c7a] text-xs">{service.id}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editData.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full px-2 py-1 border rounded-lg text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editData.category || 'outro'}
                            onChange={(e) => setEditData({ ...editData, category: e.target.value as any })}
                            className="w-full px-2 py-1 border rounded-lg text-sm"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.price ?? ''}
                            onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 border rounded-lg text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={editData.isActive ?? true}
                            onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                            className="w-4 h-4 text-[#9c7f64] focus:ring-[#9c7f64]"
                          />
                        </td>
                        <td className="px-3 py-2 text-right space-x-1">
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50"
                            title="Salvar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-[#7f7c7a] text-xs font-mono">{service.id}</td>
                        <td className="px-3 py-2 font-medium text-[#060606]">{service.name}</td>
                        <td className="px-3 py-2 text-[#7f7c7a]">
                          {CATEGORIES.find(c => c.value === service.category)?.label || service.category}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[#9c7f64]">
                          {formatCurrency(service.price)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {service.isActive ? (
                            <span className="text-green-600 text-xs">✅</span>
                          ) : (
                            <span className="text-gray-400 text-xs">❌</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right space-x-1">
                          <button
                            onClick={() => handleStartEdit(service)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id, service.name)}
                            className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30"
                            disabled={service.id === 'mensalista'}
                            title={service.id === 'mensalista' ? 'Não pode ser removido' : 'Excluir'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[#7f7c7a]">
                      Nenhum serviço encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo Serviço */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">Novo Serviço</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Nome *</label>
                <input
                  type="text"
                  value={newService.name || ''}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#9c7f64]"
                  placeholder="ex: Corte + Barba"
                />
                {newService.name && (
                  <p className="text-xs text-[#7f7c7a] mt-1">
                    ID gerado: <span className="font-mono">
                      {newService.name
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Categoria *</label>
                <select
                  value={newService.category || 'corte'}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#9c7f64]"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newService.price ?? ''}
                  onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#9c7f64]"
                  placeholder="0,00"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} /> Criar
                </button>
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    setNewService({ category: 'corte', isActive: true });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg transition"
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

export default AdminServicos;