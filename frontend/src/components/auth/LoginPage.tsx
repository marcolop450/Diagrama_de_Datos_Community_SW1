import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Logo } from '../common/Logo';
import { AuroraBackground } from '../common/AuroraBackground';
import toast from 'react-hot-toast';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  UserCheck, 
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
    if (!email || !password) {
      toast.error('Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        toast.success('Sesión volátil iniciada con éxito');
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Credenciales inválidas');
      }
    } catch (error: any) {
      toast.error('Error de conexión con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDemoUser = (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.success(`Credenciales de ${roleName} cargadas`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Aurora Ambient Background */}
      <AuroraBackground opacity={0.75} />

      {/* Login Card */}
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-2xl relative z-10 transition-all">
        
        {/* Back to landing */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al Inicio</span>
          </Link>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
            <ShieldCheck className="w-3 h-3" />
            <span>Sesión Volátil JWT</span>
          </div>
        </div>

        {/* Logo Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <Logo size="md" showText={true} className="mb-2" />
          <h2 className="text-xl font-bold text-white tracking-tight">Acceso a la Plataforma</h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa con tus credenciales de usuario o rol asignado
          </p>
        </div>

        {/* Fast Role Demo Switcher (Zero Emojis) */}
        <div className="mb-6 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Roles de Prueba Rápidos:</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleSetDemoUser('arquitecto@sw1.com', 'Arquitecto123!', 'Arquitecto (Pro)')}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-[10px] font-semibold text-blue-300 hover:text-blue-200 transition-all text-center"
            >
              Arquitecto
            </button>
            <button
              type="button"
              onClick={() => handleSetDemoUser('admin@sw1.com', 'Admin123!', 'Super Admin')}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-[10px] font-semibold text-purple-300 hover:text-purple-200 transition-all text-center"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleSetDemoUser('colaborador@sw1.com', 'Colaborador123!', 'Colaborador')}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 transition-all text-center"
            >
              Colaborador
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="off"
                spellCheck="false"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all"
                placeholder="usuario@dominio.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-mono"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Validando credenciales...</span>
              </div>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
