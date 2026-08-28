import { useAuth } from '../../contexts/AuthContext';
import { Menu } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  
  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* 🔥 BOTÃO DO MENU - SÓ APARECE NO MOBILE */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition text-[#060606] flex-shrink-0"
          aria-label="Abrir menu"
        >
          <Menu size={20} className="sm:w-[22px] sm:h-[22px]" />
        </button>
        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-[#060606] truncate">
          Bem-vindo, <span className="text-[#9c7f64]">{user?.name}</span>
        </h2>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
        <span className="text-xs sm:text-sm text-gray-600 truncate hidden sm:inline max-w-[120px] md:max-w-[200px]">
          {user?.email}
        </span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-[#9c7f64] flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};

export default Navbar;