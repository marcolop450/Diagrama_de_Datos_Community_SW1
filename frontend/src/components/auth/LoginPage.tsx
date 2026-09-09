import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Logo } from '../common/Logo';
import { AuroraBackground } from '../common/AuroraBackground';
import { AppPaletteId, APP_PALETTES } from '../../constants/canvasThemes';
import toast from 'react-hot-toast';
import { 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ShieldCheck, 
  Compass,
  Shield,
  Users,
  Sparkles,
  Check
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);
  
  const [currentPalette, setCurrentPalette] = useState<AppPaletteId>(() => {
    return (localStorage.getItem('case_app_palette') as AppPaletteId) || 'warm-titanium';
  });

  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', currentPalette);
    localStorage.setItem('case_app_palette', currentPalette);
  }, [currentPalette]);

  const togglePalette = () => {
    const next: AppPaletteId = currentPalette === 'warm-titanium' ? 'obsidian-graphite' : 'warm-titanium';
    setCurrentPalette(next);
    toast.success(`Paleta ${APP_PALETTES[next].name} activada`);
  };

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
    } catch (error: any) {
      toast.error('Error de conexión con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDemoUser = (demoIdentifier: string, demoPass: string, roleKey: string, roleName: string) => {
    setEmail(demoIdentifier);
    setPassword(demoPass);
    setSelectedDemoRole(roleKey);
    toast.success(`Credenciales de ${roleName} cargadas`);
  };

  const isWarm = currentPalette === 'warm-titanium';

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Aurora Ambient Background */}
      <AuroraBackground opacity={0.8} />

      {/* Login Card */}
      <div className={`max-w-lg w-full rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-2xl relative z-10 transition-all duration-300 border ${
        isWarm 
          ? 'bg-zinc-900/90 border-zinc-700/80 shadow-zinc-950/60' 
          : 'bg-[#181a20]/90 border-[#2b2f3a]/90 shadow-black/70'
      }`}>
        
        {/* Top bar: Back Link + Volatile Session Badge + Palette Toggle */}
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
              <span>Sesión Volátil</span>
            </div>
          </div>
        </div>

        {/* Logo Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <Logo size="md" showText={true} className="mb-2" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Acceso a la Plataforma CASE
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa tus credenciales o selecciona un perfil de prueba rápida
          </p>
        </div>

        {/* Fast Role Selection (Human IHC Cards, Zero Emojis) */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Perfiles de Prueba Asistidos:
            </span>
            <span className="text-[10px] text-slate-500">Un clic para cargar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. Arquitecto */}
            <button
              type="button"
              onClick={() => handleSetDemoUser('arquitecto@sw1.com', 'Arquitecto123!', 'arquitecto', 'Arquitecto')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                selectedDemoRole === 'arquitecto'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/40 shadow-sm'
                  : 'bg-slate-950/50 hover:bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Compass size={14} />
                </div>
                {selectedDemoRole === 'arquitecto' && <Check size={12} className="text-amber-400" />}
              </div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Arquitecto
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Modelado UML y Scaffolding
              </div>
            </button>

            {/* 2. Super Admin */}
            <button
              type="button"
              onClick={() => handleSetDemoUser('admin@sw1.com', 'Admin123!', 'admin', 'Super Admin')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                selectedDemoRole === 'admin'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-200 ring-1 ring-purple-500/40 shadow-sm'
                  : 'bg-slate-950/50 hover:bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Shield size={14} />
                </div>
                {selectedDemoRole === 'admin' && <Check size={12} className="text-purple-400" />}
              </div>
              <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                Super Admin
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Gobernanza y Bitácora
              </div>
            </button>

            {/* 3. Colaborador */}
            <button
              type="button"
              onClick={() => handleSetDemoUser('colaborador@sw1.com', 'Colaborador123!', 'colaborador', 'Colaborador')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                selectedDemoRole === 'colaborador'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/50 hover:bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Users size={14} />
                </div>
                {selectedDemoRole === 'colaborador' && <Check size={12} className="text-emerald-400" />}
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Colaborador
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Edición y Trazabilidad
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
              Correo o Nombre de Usuario
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="username"
                id="login-username"
                required
                autoComplete="username"
                spellCheck="false"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedDemoRole(null);
                }}
                className={`w-full bg-slate-950/90 border text-slate-100 placeholder:text-slate-500 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none transition-all ${
                  isWarm
                    ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                }`}
                placeholder="correo@dominio.com o nombre_usuario"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="login-password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedDemoRole(null);
                }}
                className={`w-full bg-slate-950/90 border text-slate-100 placeholder:text-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none transition-all font-mono ${
                  isWarm
                    ? 'border-zinc-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 font-semibold py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.99] cursor-pointer ${
              isWarm
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold shadow-amber-500/20'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Autenticando credenciales...</span>
              </div>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            ¿Aún no tienes una cuenta?{' '}
            <Link 
              to="/register" 
              className={`font-semibold transition-colors ${
                isWarm ? 'text-amber-400 hover:text-amber-300' : 'text-indigo-400 hover:text-indigo-300'
              }`}
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
