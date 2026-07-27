const BarberDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu Painel</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Hoje</h3>
          <p className="text-2xl font-bold">R$ 320,00</p>
          <p className="text-sm text-gray-500">4 serviços</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Comissão (20%)</h3>
          <p className="text-2xl font-bold">R$ 64,00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Caixa</h3>
          <p className="text-2xl font-bold text-green-600">Aberto</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Agenda de Hoje</h3>
        <p className="text-gray-500">Lista de agendamentos...</p>
      </div>
    </div>
  );
};

export default BarberDashboard;
