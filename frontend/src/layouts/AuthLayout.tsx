import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[#060606]">
      <Outlet />
    </div>
  );
};

export default AuthLayout;