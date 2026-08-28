import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  User,
  Users, 
  Package, 
  Calendar, 
  LogOut, 
  Settings, 
  Scissors,
  FileText,
  PiggyBank,
  ShoppingBag,
  CreditCard,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/auth.types';

interface SidebarProps {
  role: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, isOpen = false, onClose }) => {
  const { logout } = useAuth();
  const location = useLocation();

  // 🔥 FECHAR MENU AO MUDAR DE PÁGINA (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  // 🔥 FECHAR AO REDIMENSIONAR PARA TELA GRANDE
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && onClose) {
        onClose();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/revenue', icon: DollarSign, label: 'Faturamento' },
    { to: '/admin/expenses', icon: PiggyBank, label: 'Despesas' },
    { to: '/admin/barbers', icon: Users, label: 'Barbeiros' },
    { to: '/admin/clients', icon: User, label: 'Clientes' },
    { to: '/admin/mensalistas', icon: CreditCard, label: 'Mensalistas' },
    { to: '/admin/products', icon: Package, label: 'Estoque' },
  ];

  const barberLinks = [
    { to: '/barber', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/barber/cash-register', icon: PiggyBank, label: 'Caixa' },
    { to: '/barber/schedule', icon: Calendar, label: 'Agenda' },
    { to: '/barber/clients', icon: User, label: 'Clientes' },
    { to: '/barber/historico', icon: FileText, label: 'Histórico' },
    { to: '/barber/mensalistas', icon: CreditCard, label: 'Mensalistas' },
    { to: '/barber/shop', icon: ShoppingBag, label: 'Loja' },
  ];

  const links = role === 'admin' ? adminLinks : barberLinks;

  return (
    <>
      {/* 🔥 OVERLAY - MOBILE */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 🔥 SIDEBAR */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 z-40
          w-72 md:w-64 bg-[#060606] text-[#ada8a3] h-screen 
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* 🔥 BOTÃO FECHAR - MOBILE */}
        {isOpen && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:hidden text-[#7f7c7a] hover:text-[#ada8a3] transition p-2 rounded-lg hover:bg-[#7f7c7a]/10"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        )}

        {/* Cabeçalho */}
        <div className="p-4 border-b border-[#7f7c7a]/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpeg" 
              alt="Logo" 
              className="h-12 w-12 md:h-14 md:w-14 rounded-full object-cover border-2 border-[#9c7f64]/40 shadow-md" 
            />
            <div>
              <span className="font-serif text-base md:text-xl font-bold tracking-wider text-[#ada8a3]">
                MANNER HAUS
              </span>
              <p className="text-[8px] md:text-[10px] tracking-[0.2em] text-[#9c7f64] uppercase">Barber Club</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors text-sm md:text-base ${
                  isActive
                    ? 'bg-[#9c7f64]/20 text-[#ada8a3] font-medium'
                    : 'text-[#7f7c7a] hover:bg-[#7f7c7a]/10 hover:text-[#ada8a3]'
                }`
              }
            >
              <link.icon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="truncate">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Botão Sair */}
        <div className="p-3 md:p-4 border-t border-[#7f7c7a]/20 flex-shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm md:text-base"
          >
            <LogOut className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;