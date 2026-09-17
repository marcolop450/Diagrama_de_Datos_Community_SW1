import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Logo } from '../common/Logo';
import { AuroraBackground } from '../common/AuroraBackground';
import toast from 'react-hot-toast';
import { 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ArrowLeft 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        toast.success('Sesión iniciada correctamente');
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Credenciales inválidas');
      }
    } catch {
      toast.error('Error de conexión con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Aurora Ambient Background */}
      <AuroraBackground opacity={0.65} />

      {/* Login Card */}
      <div className="max-w-md w-full rounded-2xl p-6 sm:p-8 backdrop-blur-2xl relative z-10 border border-[#242938] bg-[#141721]/95 shadow-2xl shadow-black/80 animate-page-enter">
        
        {/* Top bar: Clean Back Link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al Inicio</span>
          </Link>
        </div>

        {/* Logo Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <Logo size="md" showText={true} className="mb-3" />
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">
            Acceso a la Plataforma
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Ingresa tus credenciales para acceder a tus modelos y colaborar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300 font-sans">
              Correo o Nombre de Usuario
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                name="username"
                id="login-username"
                required
                autoComplete="username"
                spellCheck="false"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0d0f14]/90 border border-[#242938] text-slate-100 placeholder:text-slate-500 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all font-sans"
                placeholder="correo@dominio.com o nombre_usuario"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300 font-sans">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="login-password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d0f14]/90 border border-[#242938] text-slate-100 placeholder:text-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 font-sans font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-[0.98] cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:brightness-110 text-white border border-indigo-400/30"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Autenticando credenciales...</span>
              </div>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#242938] text-center">
          <p className="text-xs text-slate-400 font-sans">
            ¿Aún no tienes una cuenta?{' '}
            <Link 
              to="/register" 
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Registrarse gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
