import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Logo } from '../common/Logo';
import { AuroraBackground } from '../common/AuroraBackground';
import { AppPaletteId, APP_PALETTES } from '../../constants/canvasThemes';
import toast from 'react-hot-toast';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ShieldCheck,
  AtSign,
  Sparkles
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentPalette, setCurrentPalette] = useState<AppPaletteId>(() => {
    return (localStorage.getItem('case_app_palette') as AppPaletteId) || 'warm-titanium';
  });

  const navigate = useNavigate();
  const { register } = useAuthStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', currentPalette);
    localStorage.setItem('case_app_palette', currentPalette);
  }, [currentPalette]);

  const togglePalette = () => {
    const next: AppPaletteId = currentPalette === 'warm-titanium' ? 'obsidian-graphite' : 'warm-titanium';
    setCurrentPalette(next);
    toast.success(`Paleta ${APP_PALETTES[next].name} activada`);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (username.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password
      });

      if (result.success) {
        toast.success('Cuenta creada exitosamente. Bienvenido a la plataforma.');
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Error al registrar la cuenta');
      }
    } catch (error: any) {
      toast.error('Error de conexión con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  const isWarm = currentPalette === 'warm-titanium';

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Aurora Ambient Background */}
      <AuroraBackground opacity={0.8} />

      {/* Register Card */}
      <div className={`max-w-lg w-full rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-2xl relative z-10 transition-all duration-300 border animate-page-enter ${
        isWarm 
          ? 'bg-zinc-900/90 border-zinc-700/80 shadow-zinc-950/60' 
          : 'bg-[#181a20]/90 border-[#2b2f3a]/90 shadow-black/70'
      }`}>
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al Inicio</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick Palette Switcher */}
            <button
              type="button"
              onClick={togglePalette}
              title={`Cambiar a ${isWarm ? 'Grafito Obsidiana' : 'Titanio Cálido'}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                isWarm
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
              }`}
            >
              <Sparkles size={12} className={isWarm ? 'text-amber-400' : 'text-indigo-400'} />
              <span>{isWarm ? 'Titanio Cálido' : 'Grafito Obsidiana'}</span>
            </button>

            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>Herramienta CASE</span>
            </div>
          </div>
        </div>

        {/* Logo Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <Logo size="md" showText={true} className="mb-2" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Crear Cuenta de Arquitecto
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comienza a modelar diagramas UML y generar código en 4 capas
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5" autoComplete="off">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="name"
                id="register-name"
                required
                autoComplete="name"
                spellCheck="false"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full bg-slate-950/90 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
                  isWarm
                    ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                }`}
                placeholder="Ing. Marco Lopez"
              />
            </div>
          </div>

          {/* Username & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nombre de Usuario *
              </label>
              <div className="relative">
                <AtSign className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="username"
                  id="register-username"
                  required
                  autoComplete="nickname"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-slate-950/90 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
                    isWarm
                      ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                      : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                  }`}
                  placeholder="m_ale"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  id="register-email"
                  required
                  autoComplete="email"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-slate-950/90 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
                    isWarm
                      ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                      : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                  }`}
                  placeholder="marco@correo.com"
                />
              </div>
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="register-password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-950/90 border rounded-xl pl-10 pr-8 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-mono ${
                    isWarm
                      ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                      : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirmar *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  id="register-confirmPassword"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-slate-950/90 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-mono ${
                    isWarm
                      ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                      : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                  }`}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-3 font-semibold py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.99] cursor-pointer ${
              isWarm
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold shadow-amber-500/20'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Creando cuenta de usuario...</span>
              </div>
            ) : (
              <>
                <span>Registrarse y Acceder</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            ¿Ya tienes una cuenta registrada?{' '}
            <Link 
              to="/login" 
              className={`font-semibold transition-colors ${
                isWarm ? 'text-amber-400 hover:text-amber-300' : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
