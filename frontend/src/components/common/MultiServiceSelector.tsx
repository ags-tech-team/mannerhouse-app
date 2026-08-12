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
}

const MultiServiceSelector: React.FC<MultiServiceSelectorProps> = ({
  selectedServices,
  onChange,
  maxServices = 5
}) => {
  const [selectedId, setSelectedId] = useState('');

  const handleAddService = () => {
    if (!selectedId) return;
    if (selectedServices.length >= maxServices) {
      alert(`Máximo de ${maxServices} serviços por agendamento`);
      return;
    }

    const service = getServiceById(selectedId);
    if (!service) return;

    // Verificar se o serviço já foi adicionado
    if (selectedServices.some(s => s.id === selectedId)) {
      alert('Este serviço já foi adicionado');
      return;
    }

    onChange([...selectedServices, { id: selectedId, service }]);
    setSelectedId('');
  };

  const handleRemoveService = (id: string) => {
    const updated = selectedServices.filter(s => s.id !== id);
    onChange(updated);
  };

  const getTotal = () => {
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };

  const availableServices = SERVICES.filter(
    s => !selectedServices.some(selected => selected.id === s.id)
  );

  return (
    <div className="space-y-3">
      {/* Selector de Serviços */}
      <div className="flex gap-2">
        <div className="flex-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
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
          className="px-4 py-2 bg-[#9c7f64] hover:bg-[#544941] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-1"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Lista de Serviços Selecionados */}
      {selectedServices.length > 0 && (
        <div className="bg-[#f5f0e8] rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-[#060606]">
            <span>Serviços adicionados ({selectedServices.length})</span>
            <span>Total: R$ {getTotal().toFixed(2)}</span>
          </div>
          <div className="space-y-1">
            {selectedServices.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Scissors size={14} className="text-[#9c7f64]" />
                  <span className="text-sm text-[#060606]">{item.service.name}</span>
                  <span className="text-xs text-[#9c7f64]">
                    R$ {item.service.price.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveService(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiServiceSelector;