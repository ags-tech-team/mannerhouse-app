import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f5f0e8] overflow-hidden">
      {/* Sidebar - Responsivo com toggle */}
      <Sidebar 
        role="admin" 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar com botão do menu */}
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Conteúdo principal com padding responsivo */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;