import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
const [email, setEmail] = useState('admin@mannerhaus.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (email.includes('admin')) navigate('/admin');
      else navigate('/barber');
    } catch {
      setError('E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#060606]">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2070&auto=format&fit=crop')" }}
      />
      
      <div className="relative z-10 w-full max-w-md bg-[#060606]/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-[#7f7c7a]/20">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center">
            <img 
              src="/logo.png" 
              alt="Manner Haus" 
              className="w-28 h-28 object-contain mb-3"
            />
            <h1 className="font-serif text-4xl font-bold tracking-wider text-[#ada8a3]">
              M<span className="text-[#9c7f64]">Ä</span>NNER HAUS
            </h1>
          </div>
          <p className="text-sm tracking-[0.3em] text-[#9c7f64] uppercase mt-1">
            Barber Club
          </p>
          <div className="w-16 h-0.5 bg-[#9c7f64] mx-auto mt-4" />
        </div>

        <p className="text-center text-sm text-[#7f7c7a] mb-6">
          Acesse o painel de gestão
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#ada8a3] mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9c7f64]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-[#060606]/60 border border-[#7f7c7a]/40 rounded-lg text-[#ada8a3] placeholder-[#7f7c7a]/60 focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent transition outline-none"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ada8a3] mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9c7f64]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[#060606]/60 border border-[#7f7c7a]/40 rounded-lg text-[#ada8a3] placeholder-[#7f7c7a]/60 focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent transition outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7c7a] hover:text-[#ada8a3] transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#9c7f64] hover:bg-[#544941] text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60"
          >
            {loading ? 'Entrando...' : <><LogIn size={18} /> Entrar</>}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#7f7c7a]/20">
          <div className="flex flex-wrap justify-center gap-2 text-[10px] text-[#7f7c7a]/70">
            <span className="bg-[#060606]/40 px-2 py-0.5 rounded">admin@barbearia.com</span>
            <span className="bg-[#060606]/40 px-2 py-0.5 rounded">barber@barbearia.com</span>
            <span className="bg-[#060606]/40 px-2 py-0.5 rounded">senha: 123456</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-[#7f7c7a]/30 z-10">
        &copy; 2026 Manner Haus Barber Club
      </div>
    </div>
  );
};

export default Login;