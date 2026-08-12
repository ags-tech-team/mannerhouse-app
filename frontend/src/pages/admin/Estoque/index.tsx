import { useState, useEffect } from 'react';
import { productService } from '../../../services/product.service';
import { useNumberInput } from '../../../hooks/useNumberInput';
import type { Product } from '../../../services/product.service';
import { Plus, Edit, Trash2, Search, Package, DollarSign, AlertCircle } from 'lucide-react';

const AdminEstoque = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // 🔥 HOOKS PARA OS INPUTS NUMBER
  const price = useNumberInput();
  const costPrice = useNumberInput();
  const stock = useNumberInput();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'outros',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
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
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await productService.delete(id);
      await loadProducts();
    } catch (error) {
      alert('Erro ao excluir produto');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: 'outros',
    });
    price.reset();
    costPrice.reset();
    stock.reset();
  };

  const categories = [
    { value: 'higiene', label: 'Higiene' },
    { value: 'cabelo', label: 'Cabelo' },
    { value: 'barba', label: 'Barba' },
    { value: 'acessorios', label: 'Acessórios' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Estoque</h1>
          <p className="text-[#7f7c7a]">Gerencie os produtos da barbearia</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg"
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
        <div className="text-center py-12">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-[#060606]">{product.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setFormData({
                          name: product.name,
                          description: product.description || '',
                          category: product.category,
                        });
                        price.setValue(String(product.price));
                        costPrice.setValue(String(product.costPrice));
                        stock.setValue(String(product.stock));
                        setShowModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit size={16} className="text-[#9c7f64]" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1 hover:bg-gray-100 rounded"
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-[#060606] mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Preço (R$)</label>
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
                  <label className="block text-sm font-medium text-[#060606]">Custo (R$)</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Estoque</label>
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

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition"
                >
                  Salvar
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