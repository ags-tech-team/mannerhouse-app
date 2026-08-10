import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('admin@mannerhouse.com');
  const [password, setPassword] = useState('manner123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 🔥 VERSÃO CORRIGIDA - Garantindo que o preventDefault funciona
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // 🔥 IMPEDE O COMPORTAMENTO PADRÃO DO FORM (RECARREGAR)
    e.preventDefault();
    e.stopPropagation(); // 🔥 TAMBÉM IMPEDE PROPAGAÇÃO
    
    // Limpar erro anterior
    setError('');
    setLoading(true);

    console.log('🔐 Tentando login com:', { email });

    try {
      const user = await login(email, password);
      
      if (!user) {
        setError('Erro ao fazer login. Tente novamente.');
        setLoading(false);
        return;
      }

      console.log('✅ Login bem-sucedido!');
      
      // Redirecionar baseado na role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'barber') {
        navigate('/barber');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      console.error('❌ Erro no login:', err);
      setError(err.message || 'E-mail ou senha inválidos');
      setLoading(false);
    }
  };

  const fillCredentials = (type: 'admin' | 'barber') => {
    if (type === 'admin') {
      setEmail('admin@mannerhouse.com');
      setPassword('manner123');
    } else {
      setEmail('barbearia@mannerhouse.com');
      setPassword('manner123');
    }
    setError('');
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
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/112x112/9c7f64/ffffff?text=MH';
              }}
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
          <div className="mb-4 p-3 bg-red-500/20 border-2 border-red-500/50 text-red-200 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 🔥 FORMULÁRIO COM onSubmit CORRETO */}
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
                disabled={loading}
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
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7c7a] hover:text-[#ada8a3] transition"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#9c7f64] hover:bg-[#544941] text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              <><LogIn size={18} /> Entrar</>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#7f7c7a]/20">
          <p className="text-xs text-[#7f7c7a]/60 text-center mb-2">
            Clique para preencher automaticamente
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin')}
              className="text-[10px] bg-[#060606]/40 hover:bg-[#060606]/60 px-3 py-1 rounded border border-[#9c7f64]/30 text-[#9c7f64] transition"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('barber')}
              className="text-[10px] bg-[#060606]/40 hover:bg-[#060606]/60 px-3 py-1 rounded border border-[#7f7c7a]/30 text-[#7f7c7a] transition"
            >
              ✂️ Barbearia
            </button>
          </div>
          <p className="text-[10px] text-[#7f7c7a]/40 text-center mt-2">
            Senha padrão: <span className="font-mono">manner123</span>
          </p>
        </div>

        {error && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setError('')}
              className="text-xs text-[#7f7c7a]/40 hover:text-[#7f7c7a] transition underline"
            >
              ✕ Limpar mensagem de erro
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-[#7f7c7a]/30 z-10">
        &copy; 2026 Manner Haus Barber Club
      </div>
    </div>
  );
};

export default Login;