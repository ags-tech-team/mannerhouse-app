import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/client';
import { Scissors, Lock, Mail } from 'lucide-react';

const MobileLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/mobile/login', { email, password });
      const { token, user } = response.data;
      // 🔥 Salvar diretamente no localStorage (sem usar o contexto)
      localStorage.setItem('@mannerhouse:token', token);
      localStorage.setItem('@mannerhouse:user', JSON.stringify(user));
      navigate('/mobile/agenda');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <Scissors size={48} className="mx-auto text-[#9c7f64]" />
          <h1 className="text-2xl font-bold text-[#060606]">Acesso Barbeiro</h1>
          <p className="text-sm text-[#7f7c7a]">Gerencie sua agenda pelo celular</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#060606]">E-mail</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#060606]">Senha</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          {error && (
            <div className="bg-red-50 text-red-700 p-2 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MobileLogin;