import { useState, useEffect } from 'react';
import { productService } from '../../../services/product.service';
import { useNumberInput } from '../../../hooks/useNumberInput';
import type { Product } from '../../../services/product.service';
import { Plus, Edit, Trash2, Search, Package, DollarSign, AlertCircle, Scissors } from 'lucide-react';

const AdminEstoque = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // HOOKS PARA OS INPUTS NUMBER
  const price = useNumberInput();
  const costPrice = useNumberInput();
  const stock = useNumberInput();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'outros',
    hasCommission: true, // 🔥 NOVO CAMPO
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      // 🔥 FILTRA SÓ OS PRODUTOS ATIVOS
      const activeProducts = data.filter(product => product.isActive !== false);
      setProducts(activeProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      alert('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: price.getNumberValue(),
        costPrice: costPrice.getNumberValue(),
        stock: stock.getNumberValue(),
        category: formData.category,
        hasCommission: formData.hasCommission, // 🔥 ENVIAR CAMPO
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, payload);
      } else {
        await productService.create(payload);
      }
      
      await loadProducts();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      alert(error.response?.data?.error || 'Erro ao salvar produto');
    }
  };

  const handleDelete = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const message = `Tem certeza que deseja excluir "${product.name}"?\n\n`;
    const confirmMessage = product.stock > 0 
      ? `${message}Este produto tem ${product.stock} unidades em estoque.`
      : message;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const response = await productService.delete(id);
      
      if (response.action === 'deactivated') {
        alert(`✅ Produto "${product.name}" foi desativado!\n\nMotivo: Possui ${response.salesCount} venda(s) associada(s).\nEle não aparecerá mais no estoque, mas o histórico de vendas permanece intacto.`);
      } else {
        alert(`✅ Produto "${product.name}" foi excluído com sucesso!`);
      }
      
      await loadProducts();
    } catch (error: any) {
      console.error('Erro ao deletar produto:', error);
      alert(error.response?.data?.error || 'Erro ao excluir produto');
    }
  };
  
  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: 'outros',
      hasCommission: true,
    });
    price.reset();
    costPrice.reset();
    stock.reset();
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        hasCommission: product.hasCommission !== undefined ? product.hasCommission : true,
      });
      price.setValue(String(product.price));
      costPrice.setValue(String(product.costPrice));
      stock.setValue(String(product.stock));
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const categories = [
    { value: 'higiene', label: 'Higiene' },
    { value: 'cabelo', label: 'Cabelo' },
    { value: 'barba', label: 'Barba' },
    { value: 'acessorios', label: 'Acessórios' },
    { value: 'outros', label: 'Outros' },
  ];

  const getCommissionStatus = (product: Product) => {
    if (product.hasCommission === undefined) return '✅ Ativa';
    return product.hasCommission ? '✅ Ativa' : '❌ Inativa';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">📦 Estoque</h1>
          <p className="text-[#7f7c7a]">Gerencie os produtos da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Adicionar Produto
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Total de Produtos</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package className="text-[#9c7f64]" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Em Estoque</p>
              <p className="text-2xl font-bold">
                {products.reduce((acc, p) => acc + p.stock, 0)}
              </p>
            </div>
            <Package className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Valor do Estoque</p>
              <p className="text-2xl font-bold">
                R$ {products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-[#7f7c7a]" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
          />
          <span className="text-sm text-[#7f7c7a]">
            {filteredProducts.length} produtos
          </span>
        </div>
      </div>

      {/* Lista de Produtos */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-[#7f7c7a]">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum produto cadastrado</p>
          <p className="text-sm mt-1">Clique em "Adicionar Produto" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#060606]">{product.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                      {categories.find(c => c.value === product.category)?.label || product.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Editar"
                    >
                      <Edit size={16} className="text-[#9c7f64]" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[#7f7c7a] line-clamp-2 mt-1">
                  {product.description || 'Sem descrição'}
                </p>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7f7c7a]">Preço:</span>
                    <span className="font-medium text-[#9c7f64]">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7f7c7a]">Custo:</span>
                    <span className="text-[#7f7c7a]">R$ {product.costPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7f7c7a]">Estoque:</span>
                    <span className={`font-medium ${
                      product.stock === 0 ? 'text-red-600' :
                      product.stock < 5 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {product.stock} unidades
                    </span>
                  </div>
                  {/* 🔥 STATUS DA COMISSÃO */}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-1 mt-1">
                    <span className="text-[#7f7c7a] flex items-center gap-1">
                      <Scissors size={14} /> Comissão:
                    </span>
                    <span className={`font-medium ${
                      product.hasCommission !== false ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {product.hasCommission !== false ? '✅ Ativa' : '❌ Inativa'}
                    </span>
                  </div>
                </div>

                {product.stock === 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center gap-2 text-red-600 text-xs">
                    <AlertCircle size={14} />
                    Produto esgotado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-[#060606]">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-[#060606]">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  rows={3}
                />
              </div>

              {/* Preço e Custo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price.value}
                    onChange={price.onChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                    placeholder="0,00"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Custo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice.value}
                    onChange={costPrice.onChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                    placeholder="0,00"
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Estoque e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Estoque *</label>
                  <input
                    type="number"
                    step="1"
                    value={stock.value}
                    onChange={stock.onChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                    placeholder="0"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 🔥 CHECKBOX COMISSÃO */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-[#060606] mb-3">Comissão do Produto</h3>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#9c7f64] transition cursor-pointer">
                  <input
                    type="checkbox"
                    id="hasCommission"
                    checked={formData.hasCommission}
                    onChange={(e) => setFormData({ ...formData, hasCommission: e.target.checked })}
                    className="w-4 h-4 text-[#9c7f64] focus:ring-[#9c7f64] rounded"
                  />
                  <label htmlFor="hasCommission" className="text-sm text-[#060606] cursor-pointer flex items-center gap-2">
                    <Scissors size={16} className="text-[#9c7f64]" />
                    Produto gera comissão para o barbeiro
                  </label>
                </div>
                {!formData.hasCommission && (
                  <p className="text-xs text-[#7f7c7a] mt-2 flex items-center gap-1">
                    <AlertCircle size={14} className="text-yellow-500" />
                    Comissão desativada. O barbeiro não vai ganhar comissão sobre este produto.
                  </p>
                )}
                {formData.hasCommission && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    ✅ Comissão ativada. O barbeiro vai ganhar comissão sobre o lucro do produto.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  {editingProduct ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
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

export default AdminEstoque;