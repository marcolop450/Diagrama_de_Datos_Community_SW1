import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';
import { Logo } from '../common/Logo';
import { AuroraBackground } from '../common/AuroraBackground';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowRight, UserCheck, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { initialize } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      await initialize();
      toast.success('Sesión iniciada correctamente');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTestUser = () => {
    setEmail('sw1.casetool.demo@gmail.com');
    setPassword('TestPassword123!');
    toast.success('Credenciales de prueba cargadas');
  };

  return (
    <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Animated Glowing Aurora Canvas Background */}
      <AuroraBackground opacity={0.7} />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/70 rounded-2xl shadow-2xl p-8 backdrop-blur-xl relative z-10 animate-fade-in-up">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <Logo size="lg" showText={true} className="mb-3" />
          <p className="text-xs text-slate-300 font-sans mt-1">
            Herramienta CASE Colaborativa con Inteligencia Artificial
          </p>
        </div>

        {/* Quick Test User Helper Card */}
        <div className="mb-6 p-3 bg-blue-950/50 border border-blue-700/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck size={16} className="text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-200">Usuario de Prueba Activo</p>
              <p className="text-[10px] font-mono text-blue-300">sw1.casetool.demo@gmail.com</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickTestUser}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Autocompletar
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors"
                placeholder="usuario@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors font-mono"
                placeholder="••••••••"
              />
              {/* Show / Hide Password Toggle */}
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
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            ¿Nuevo en la plataforma?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
