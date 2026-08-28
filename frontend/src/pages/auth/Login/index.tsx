import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'barber') {
        navigate('/barber');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#060606]">
      {/* Background - Responsivo */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2070&auto=format&fit=crop')" }}
      />
      
      {/* Card - Responsivo */}
      <div className="relative z-10 w-full max-w-md bg-[#060606]/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-[#7f7c7a]/20">
        {/* Logo - Responsivo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col items-center">
            <img 
              src="/logo.png" 
              alt="Manner Haus" 
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain mb-2 sm:mb-3"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/112x112/9c7f64/ffffff?text=MH';
              }}
            />
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-wider text-[#ada8a3]">
              M<span className="text-[#9c7f64]">Ä</span>NNER HAUS
            </h1>
          </div>
          <p className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] text-[#9c7f64] uppercase mt-1">
            Barber Club
          </p>
          <div className="w-12 sm:w-16 h-0.5 bg-[#9c7f64] mx-auto mt-3 sm:mt-4" />
        </div>

        <p className="text-center text-xs sm:text-sm text-[#7f7c7a] mb-4 sm:mb-6">
          Acesse o painel de gestão
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#ada8a3] mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#9c7f64]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-[#060606]/60 border border-[#7f7c7a]/40 rounded-lg text-[#ada8a3] text-sm sm:text-base placeholder-[#7f7c7a]/60 focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent transition outline-none"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#ada8a3] mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#9c7f64]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 bg-[#060606]/60 border border-[#7f7c7a]/40 rounded-lg text-[#ada8a3] text-sm sm:text-base placeholder-[#7f7c7a]/60 focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent transition outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7c7a] hover:text-[#ada8a3] transition"
              >
                {showPassword ? <EyeOff size={18} className="sm:w-[20px] sm:h-[20px]" /> : <Eye size={18} className="sm:w-[20px] sm:h-[20px]" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-[#9c7f64] hover:bg-[#544941] text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              <><LogIn size={16} className="sm:w-[18px] sm:h-[18px]" /> Entrar</>
            )}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#7f7c7a]/20">
          <p className="text-[10px] sm:text-xs text-[#7f7c7a]/40 text-center">
            © 2026 Manner Haus Barber Club
          </p>
        </div>
      </div>

      <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 text-center text-[10px] sm:text-[11px] text-[#7f7c7a]/30 z-10">
        &copy; 2026 Manner Haus Barber Club
      </div>
    </div>
  );
};

export default Login;