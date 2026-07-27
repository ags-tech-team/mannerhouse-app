import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  Users, 
  Package, 
  Calendar, 
  LogOut, 
  Settings, 
  Scissors,
  PiggyBank
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/auth.types';

interface SidebarProps {
  role: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth();

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/revenue', icon: DollarSign, label: 'Faturamento' },
    { to: '/admin/expenses', icon: PiggyBank, label: 'Despesas' },
    { to: '/admin/barbers', icon: Users, label: 'Barbeiros' },
    { to: '/admin/products', icon: Package, label: 'Estoque' },
    { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  const barberLinks = [
    { to: '/barber', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/barber/cash-register', icon: PiggyBank, label: 'Caixa' },
    { to: '/barber/schedule', icon: Calendar, label: 'Agenda' },
    { to: '/barber/services', icon: Scissors, label: 'Serviços' },
  ];

  const links = role === 'admin' ? adminLinks : barberLinks;

  return (
    <aside className="w-64 bg-[#060606] text-[#ada8a3] h-screen flex flex-col">
      {/* Cabeçalho com logo maior */}
      <div className="p-4 border-b border-[#7f7c7a]/20">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpeg" 
            alt="Logo" 
            className="h-14 w-14 rounded-full object-cover border-2 border-[#9c7f64]/40 shadow-md" 
          />
          <div>
            <span className="font-serif text-xl font-bold tracking-wider text-[#ada8a3]">
              MANNER HAUS
            </span>
            <p className="text-[10px] tracking-[0.2em] text-[#9c7f64] uppercase">Barber Club</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#9c7f64]/20 text-[#ada8a3] font-medium'
                  : 'text-[#7f7c7a] hover:bg-[#7f7c7a]/10 hover:text-[#ada8a3]'
              }`
            }
          >
            <link.icon className="h-5 w-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#7f7c7a]/20">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;