import { useState, useEffect } from 'react';
import { barberService } from '../../../services/barber.service';
import type { Barber } from '../../../types/barber.types';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const AdminBarbers = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    commissionRate: 20,
    isActive: true,
  });

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    setLoading(true);
    try {
      const data = await barberService.getAll();
      setBarbers(data);
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        username: barber.username,
        password: '', // não exibimos a senha atual
        confirmPassword: '',
        commissionRate: barber.commissionRate * 100,
        isActive: barber.isActive,
      });
    } else {
      setEditingBarber(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        confirmPassword: '',
        commissionRate: 20,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBarber(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validação de senha (se for novo ou se senha foi preenchida)
    if (!editingBarber && !formData.password) {
      alert('Senha é obrigatória para novo barbeiro');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        username: formData.username,
        commissionRate: formData.commissionRate / 100,
        isActive: formData.isActive,
      };

      // Se senha foi preenchida, inclui
      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingBarber) {
        await barberService.update(editingBarber.id, payload);
      } else {
        await barberService.create(payload);
      }
      await loadBarbers();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar barbeiro:', error);
      alert('Erro ao salvar barbeiro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este barbeiro?')) return;
    try {
      await barberService.delete(id);
      await loadBarbers();
    } catch (error) {
      alert('Erro ao remover barbeiro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#060606]">Barbeiros</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Adicionar
        </button>
      </div>

      {loading ? (
        <p className="text-[#7f7c7a]">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#f5f0e8]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Comissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {barbers.map((barber) => (
                <tr key={barber.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{barber.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{barber.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{barber.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{barber.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#060606]">{(barber.commissionRate * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      barber.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {barber.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(barber)}
                      className="text-[#9c7f64] hover:text-[#544941] transition"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(barber.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
              </h2>
              <button onClick={handleCloseModal} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">Usuário (login)</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#060606]">
                  {editingBarber ? 'Nova senha (opcional)' : 'Senha'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder={editingBarber ? 'Deixe em branco para manter' : 'Digite a senha'}
                  required={!editingBarber}
                />
              </div>
              {formData.password && (
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Confirmar senha</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    placeholder="Confirme a senha"
                    required={!editingBarber && !!formData.password}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#060606]">Comissão (%)</label>
                <input
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-[#9c7f64] focus:ring-[#9c7f64]"
                />
                <label className="text-sm font-medium text-[#060606]">Ativo</label>
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
                  onClick={handleCloseModal}
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

export default AdminBarbers;