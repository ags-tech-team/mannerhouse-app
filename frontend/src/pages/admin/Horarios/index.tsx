import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { 
  Save,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  isActive: boolean;
  schedule?: Schedule;
}

interface DaySchedule {
  enabled: boolean;
  times: string[];
}

interface Schedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

const DAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const ALL_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

const AdminHorarios = () => {
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar barbeiros
  useEffect(() => {
    loadBarbers();
  }, []);

  // Quando selecionar um barbeiro, carregar o schedule dele
  useEffect(() => {
    if (selectedBarberId) {
      loadSchedule(selectedBarberId);
    }
  }, [selectedBarberId]);

  const loadBarbers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/barbers', { params: { includeInactive: 'true' } });
      setBarbers(response.data);
      if (response.data.length > 0) {
        setSelectedBarberId(response.data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
      showMessage('error', 'Erro ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (barberId: string) => {
    try {
      const response = await api.get(`/barbers/${barberId}/schedule`);
      const barber = response.data;
      // Garantir que todos os dias existam no schedule
      const defaultSchedule: Schedule = {};
      DAYS.forEach(day => {
        const existing = barber.schedule?.[day.key as keyof Schedule];
        defaultSchedule[day.key as keyof Schedule] = {
          enabled: existing?.enabled ?? false,
          times: existing?.times ?? [],
        };
      });
      setEditingSchedule(defaultSchedule);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      showMessage('error', 'Erro ao carregar horários do barbeiro');
    }
  };

  const handleBarberSelect = (barberId: string) => {
    setSelectedBarberId(barberId);
  };

  const toggleDay = (dayKey: string) => {
    if (!editingSchedule) return;
    const day = editingSchedule[dayKey as keyof Schedule];
    if (!day) return;
    setEditingSchedule({
      ...editingSchedule,
      [dayKey]: {
        ...day,
        enabled: !day.enabled,
      },
    });
  };

  const toggleTime = (dayKey: string, time: string) => {
    if (!editingSchedule) return;
    const day = editingSchedule[dayKey as keyof Schedule];
    if (!day) return;
    const times = day.times.includes(time)
      ? day.times.filter(t => t !== time)
      : [...day.times, time].sort();
    setEditingSchedule({
      ...editingSchedule,
      [dayKey]: { ...day, times },
    });
  };

  const handleSave = async () => {
    if (!selectedBarberId || !editingSchedule) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/barbers/${selectedBarberId}/schedule`, {
        schedule: editingSchedule,
      });
      showMessage('success', '✅ Horários salvos com sucesso!');
      // Recarregar lista para atualizar nomes (caso mude algo)
      await loadBarbers();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage('error', '❌ Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getSelectedBarber = () => {
    return barbers.find(b => b.id === selectedBarberId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]" />
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-[#9c7f64] mb-4" />
        <h2 className="text-xl font-bold text-[#060606]">Nenhum barbeiro cadastrado</h2>
        <p className="text-[#7f7c7a]">Cadastre barbeiros para gerenciar os horários.</p>
      </div>
    );
  }

  const selectedBarber = getSelectedBarber();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">🕐 Gerenciar Horários</h1>
          <p className="text-sm text-[#7f7c7a]">Defina os dias e horários de trabalho de cada barbeiro</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedBarberId}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Seletor de barbeiro */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-[#060606] mb-2">Selecione o barbeiro</label>
        <div className="flex flex-wrap gap-2">
          {barbers.map(barber => (
            <button
              key={barber.id}
              onClick={() => handleBarberSelect(barber.id)}
              className={`px-4 py-2 rounded-lg border transition text-sm ${
                selectedBarberId === barber.id
                  ? 'border-[#9c7f64] bg-[#9c7f64]/10 text-[#9c7f64]'
                  : 'border-gray-200 hover:border-[#9c7f64] text-[#060606]'
              }`}
            >
              {barber.name} {!barber.isActive && '(inativo)'}
            </button>
          ))}
        </div>
      </div>

      {/* Grade de horários */}
      {selectedBarber && editingSchedule && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#060606] flex items-center gap-2">
              <Clock size={20} className="text-[#9c7f64]" />
              Horários de {selectedBarber.name}
            </h2>
            <span className="text-sm text-[#7f7c7a]">
              {DAYS.reduce((acc, day) => {
                const daySchedule = editingSchedule[day.key as keyof Schedule];
                return acc + (daySchedule?.enabled ? 1 : 0);
              }, 0)} dias ativos
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#544941] uppercase">Dia</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#544941] uppercase">Horários</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {DAYS.map((day) => {
                  const daySchedule = editingSchedule[day.key as keyof Schedule];
                  if (!daySchedule) return null;
                  const enabled = daySchedule.enabled;
                  const times = daySchedule.times || [];
                  return (
                    <tr key={day.key} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-[#060606]">
                        {day.label}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleDay(day.key)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                            enabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {enabled ? '✅ Aberto' : '🔒 Fechado'}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        {enabled ? (
                          <div className="flex flex-wrap gap-1 max-w-xl">
                            {ALL_TIMES.map((time) => {
                              const isSelected = times.includes(time);
                              return (
                                <button
                                  key={time}
                                  onClick={() => toggleTime(day.key, time)}
                                  className={`px-2 py-0.5 text-xs rounded border transition ${
                                    isSelected
                                      ? 'border-[#9c7f64] bg-[#9c7f64]/10 text-[#9c7f64]'
                                      : 'border-gray-200 text-[#7f7c7a] hover:border-gray-400'
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-[#7f7c7a]">Dia fechado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-200 bg-[#f5f0e8] text-xs text-[#7f7c7a] flex flex-wrap items-center gap-4">
            <span>💡 Clique em <strong>Aberto/Fechado</strong> para ativar/desativar o dia.</span>
            <span>Clique nos <strong>horários</strong> para selecionar/desselecionar.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHorarios;