import { DollarSign, Users, Package, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    { title: 'Faturamento Hoje', value: 'R$ 1.280,00', icon: DollarSign, color: 'text-green-600' },
    { title: 'Barbeiros Ativos', value: '6', icon: Users, color: 'text-blue-600' },
    { title: 'Produtos em Estoque', value: '42', icon: Package, color: 'text-purple-600' },
    { title: 'Comissões Pagas', value: 'R$ 384,00', icon: TrendingUp, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Faturamento Semanal</h3>
          <p className="text-gray-500">Gráfico em breve...</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Últimos Serviços</h3>
          <p className="text-gray-500">Lista em breve...</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;