import { useState } from 'react';
import { SERVICES, getServiceById } from '../../utils/services';
import { Plus, X, Scissors } from 'lucide-react';

interface SelectedService {
  id: string;
  service: {
    id: string;
    name: string;
    price: number;
    category: string;
  };
}

interface MultiServiceSelectorProps {
  selectedServices: SelectedService[];
  onChange: (services: SelectedService[]) => void;
  maxServices?: number;
  hideMensalista?: boolean; // 🔥 NOVA PROP PARA ESCONDER O MENSALISTA
}

const MultiServiceSelector: React.FC<MultiServiceSelectorProps> = ({
  selectedServices,
  onChange,
  maxServices = 10,
  hideMensalista = false, // 🔥 PADRÃO: false
}) => {
  const [selectedId, setSelectedId] = useState('');

  // 🔥 FILTRAR SERVIÇOS - REMOVER MENSALISTA SE hideMensalista = true
  const availableServices = hideMensalista
    ? SERVICES.filter(s => s.id !== 'mensalista')
    : SERVICES;

  const handleAddService = () => {
    if (!selectedId) return;
    if (selectedServices.length >= maxServices) {
      alert(`Máximo de ${maxServices} serviços por agendamento`);
      return;
    }

    const service = getServiceById(selectedId);
    if (!service) return;

    const uniqueId = `${selectedId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    onChange([...selectedServices, { id: uniqueId, service }]);
    setSelectedId('');
  };

  const handleRemoveService = (index: number) => {
    const updated = selectedServices.filter((_, i) => i !== index);
    onChange(updated);
  };

  const getTotal = () => {
    // 🔥 SE TIVER MENSALISTA, TOTAL = 0
    if (selectedServices.some(s => s.service.id === 'mensalista')) {
      return 0;
    }
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };

  // 🔥 AGRUPAR SERVIÇOS PARA MOSTRAR O CONTADOR
  const getGroupedServices = () => {
    const groups: { [key: string]: { service: any; count: number; indices: number[] } } = {};
    
    selectedServices.forEach((item, index) => {
      const key = item.service.id;
      if (!groups[key]) {
        groups[key] = {
          service: item.service,
          count: 0,
          indices: []
        };
      }
      groups[key].count++;
      groups[key].indices.push(index);
    });
    
    return groups;
  };

  const groupedServices = getGroupedServices();

  return (
    <div className="space-y-3">
      {/* Selector de Serviços */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
          >
            <option value="">Selecione um serviço</option>
            {availableServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - R$ {service.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddService}
          disabled={!selectedId}
          className="px-4 py-2 bg-[#9c7f64] hover:bg-[#544941] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-1 text-sm"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Lista de Serviços Selecionados */}
      {selectedServices.length > 0 && (
        <div className="bg-[#f5f0e8] rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center text-sm font-medium text-[#060606]">
            <span>Serviços adicionados ({selectedServices.length})</span>
            <span className={selectedServices.some(s => s.service.id === 'mensalista') ? 'text-green-600 font-bold' : ''}>
              Total: R$ {getTotal().toFixed(2)}
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(groupedServices).map(([key, group]) => {
              const firstIndex = group.indices[0];
              const isMensalista = key === 'mensalista';
              
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between bg-white p-2 rounded-lg ${isMensalista ? 'border-2 border-purple-300 bg-purple-50' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Scissors size={14} className={`flex-shrink-0 ${isMensalista ? 'text-purple-600' : 'text-[#9c7f64]'}`} />
                    <span className={`text-sm truncate ${isMensalista ? 'font-bold text-purple-700' : 'text-[#060606]'}`}>
                      {group.service.name}
                      {isMensalista && (
                        <span className="ml-2 text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                          Zera valor
                        </span>
                      )}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${isMensalista ? 'text-purple-600 font-bold' : 'text-[#9c7f64]'}`}>
                      R$ {isMensalista ? '0,00' : group.service.price.toFixed(2)}
                    </span>
                    {group.count > 1 && (
                      <span className="text-xs bg-[#9c7f64] text-white px-2 py-0.5 rounded-full flex-shrink-0">
                        x{group.count}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveService(firstIndex)}
                    className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔥 INDICAÇÃO QUE PERMITE REPETIR SERVIÇOS */}
      {selectedServices.length > 0 && (
        <p className="text-[10px] text-[#7f7c7a] text-center">
          💡 Você pode adicionar o mesmo serviço várias vezes para múltiplas pessoas
        </p>
      )}
    </div>
  );
};

export default MultiServiceSelector;