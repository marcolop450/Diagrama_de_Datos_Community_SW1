import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Logo } from '../components/common/Logo';
import { AuroraBackground } from '../components/common/AuroraBackground';
import toast from 'react-hot-toast';
import { 
  User, 
  Palette, 
  Shield, 
  ArrowLeft, 
  Save, 
  Sun, 
  Moon, 
  Grid, 
  Lock, 
  CheckCircle2, 
  AtSign,
  Mail,
  ShieldCheck,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, theme, setTheme } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Preferences Form State
  const currentPrefs = user?.preferences || {
    theme: 'dark',
    grid: true,
    snapToGrid: true,
    autoSaveInterval: 30,
    defaultZoom: 1.0,
  };

  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(currentPrefs.theme || theme || 'dark');
  const [gridEnabled, setGridEnabled] = useState(currentPrefs.grid ?? true);
  const [snapEnabled, setSnapEnabled] = useState(currentPrefs.snapToGrid ?? true);
  const [autoSave, setAutoSave] = useState<number>(currentPrefs.autoSaveInterval ?? 30);
  const [defaultZoom, setDefaultZoom] = useState<number>(currentPrefs.defaultZoom ?? 1.0);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
      if (user.preferences) {
        setSelectedTheme(user.preferences.theme || 'dark');
        setGridEnabled(user.preferences.grid ?? true);
        setSnapEnabled(user.preferences.snapToGrid ?? true);
        setAutoSave(user.preferences.autoSaveInterval ?? 30);
        setDefaultZoom(user.preferences.defaultZoom ?? 1.0);
      }
    }
  }, [user]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('El nombre completo es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        username: username.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (res.success && res.data) {
        updateUserProfile({
          fullName: res.data.fullName,
          username: res.data.username,
          avatarUrl: res.data.avatarUrl,
        });
        toast.success('Perfil actualizado correctamente');
      } else {
        toast.error(res.message || 'Error al actualizar el perfil');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Handle Preferences & Theme Update
  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      // Apply theme immediately to DOM and Store
      setTheme(selectedTheme);

      const payload = {
        theme: selectedTheme,
        grid: gridEnabled,
        snapToGrid: snapEnabled,
        autoSaveInterval: autoSave,
        defaultZoom: defaultZoom,
      };

      const res = await api.updatePreferences(payload);
      if (res.success && res.data) {
        updateUserProfile({
          preferences: res.data.preferences,
        });
        toast.success('Preferencias y tema guardados en Supabase');
      } else {
        toast.error('Error al guardar preferencias');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar preferencias');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Por favor completa todos los campos de contraseña');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('La confirmación no coincide con la nueva contraseña');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        toast.success('Contraseña actualizada con éxito');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || 'Error al actualizar contraseña');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Contraseña actual incorrecta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${selectedTheme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} transition-colors duration-300 relative select-none font-sans`}>
      {/* Background ambient light */}
      <AuroraBackground opacity={selectedTheme === 'light' ? 0.35 : 0.65} />

      {/* Top Navigation Bar */}
      <header className={`h-16 ${selectedTheme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/80 border-slate-800'} backdrop-blur-xl border-b sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              selectedTheme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <ArrowLeft size={14} />
            <span>Volver al Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-700/50 hidden sm:block" />
          <Logo size="sm" showText={true} />
        </div>

        {/* User Role & Plan Badges */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-mono font-semibold">
            {user?.role || 'ARQUITECTO'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-mono font-semibold hidden sm:inline">
            {user?.subscriptionPlan || 'COMMUNITY'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Perfil y Configuración</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personaliza tu identidad, preferencias del lienzo CASE y seguridad de acceso
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={16} />
            <span>Mi Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette size={16} />
            <span>Configuración & Tema</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={16} />
            <span>Seguridad</span>
          </button>
        </div>

        {/* TAB 1: USER PROFILE */}
        {activeTab === 'profile' && (
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
            selectedTheme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800/80">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20 overflow-hidden shrink-0 border-2 border-slate-700">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(fullName || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    URL de Avatar (Opcional)
                  </label>
                  <div className="relative">
                    <ImageIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://ejemplo.com/mi-avatar.png"
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border focus:outline-none transition-colors ${
                        selectedTheme === 'light'
                          ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                          : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ingresa un enlace directo a tu fotografía de perfil o avatar profesional.
                  </p>
                </div>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border focus:outline-none transition-colors ${
                        selectedTheme === 'light'
                          ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                          : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      }`}
                      placeholder="Nombre y Apellido"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Nombre de Usuario
                  </label>
                  <div className="relative">
                    <AtSign className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border focus:outline-none transition-colors ${
                        selectedTheme === 'light'
                          ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                          : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      }`}
                      placeholder="usuario"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Correo Electrónico (Solo Lectura)
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border opacity-70 cursor-not-allowed ${
                        selectedTheme === 'light'
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Vigencia del Plan SaaS
                  </label>
                  <div className="relative">
                    <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled
                      value={
                        user?.subscriptionExpiresAt
                          ? `Activo hasta ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}`
                          : 'Plan Community Ilimitado'
                      }
                      className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border opacity-70 cursor-not-allowed ${
                        selectedTheme === 'light'
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{loading ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: PREFERENCES & DARK/LIGHT THEME */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Theme Selector */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              selectedTheme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-400" />
                <span>Tema Visual de la Plataforma</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Selecciona la apariencia general para el editor, barras de herramientas y paneles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('dark')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                    selectedTheme === 'dark'
                      ? 'border-blue-500 bg-slate-950 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-semibold text-xs text-white">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Modo Oscuro (Dark Mode)</span>
                    </div>
                    {selectedTheme === 'dark' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="h-16 rounded-xl bg-slate-900 border border-slate-800 p-2 flex items-center gap-2">
                    <div className="w-8 h-10 rounded-md bg-slate-800 border border-slate-700"></div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2 w-16 bg-blue-500/40 rounded"></div>
                      <div className="h-2 w-24 bg-slate-700 rounded"></div>
                    </div>
                  </div>
                </button>

                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('light')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                    selectedTheme === 'light'
                      ? 'border-blue-500 bg-slate-100 shadow-lg shadow-blue-500/10'
                      : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Modo Claro (Light Mode)</span>
                    </div>
                    {selectedTheme === 'light' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="h-16 rounded-xl bg-white border border-slate-300 p-2 flex items-center gap-2">
                    <div className="w-8 h-10 rounded-md bg-slate-100 border border-slate-300"></div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2 w-16 bg-blue-500/40 rounded"></div>
                      <div className="h-2 w-24 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Canvas Preferences */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              selectedTheme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-400" />
                <span>Preferencias del Editor CASE</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Configura el comportamiento del lienzo interactivo de diagramas de clases UML.
              </p>

              <div className="space-y-4">
                {/* Grid Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                  <div>
                    <span className="text-xs font-semibold block">Cuadrícula del Lienzo</span>
                    <span className="text-[11px] text-slate-400">Muestra la matriz de puntos de fondo en el editor.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGridEnabled(!gridEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      gridEnabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      gridEnabled ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Snap To Grid Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                  <div>
                    <span className="text-xs font-semibold block">Alineación Magnética (Snap to Grid)</span>
                    <span className="text-[11px] text-slate-400">Ajusta automáticamente las clases a la cuadrícula al moverlas.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSnapEnabled(!snapEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      snapEnabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      snapEnabled ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Auto-save Interval */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 gap-3">
                  <div>
                    <span className="text-xs font-semibold block">Intervalo de Guardado Automático</span>
                    <span className="text-[11px] text-slate-400">Frecuencia de persistencia en Supabase.</span>
                  </div>
                  <select
                    value={autoSave}
                    onChange={(e) => setAutoSave(Number(e.target.value))}
                    className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      selectedTheme === 'light'
                        ? 'bg-white border-slate-300 text-slate-800'
                        : 'bg-slate-900 border-slate-700 text-slate-200'
                    }`}
                  >
                    <option value={5}>Cada 5 segundos</option>
                    <option value={15}>Cada 15 segundos</option>
                    <option value={30}>Cada 30 segundos (Recomendado)</option>
                    <option value={60}>Cada 1 minuto</option>
                    <option value={0}>Manual únicamente</option>
                  </select>
                </div>

                {/* Default Zoom */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 gap-3">
                  <div>
                    <span className="text-xs font-semibold block">Nivel de Zoom por Defecto</span>
                    <span className="text-[11px] text-slate-400">Escala de visión inicial al abrir un proyecto.</span>
                  </div>
                  <select
                    value={defaultZoom}
                    onChange={(e) => setDefaultZoom(Number(e.target.value))}
                    className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      selectedTheme === 'light'
                        ? 'bg-white border-slate-300 text-slate-800'
                        : 'bg-slate-900 border-slate-700 text-slate-200'
                    }`}
                  >
                    <option value={0.75}>75% (Vista Panorámica)</option>
                    <option value={1.0}>100% (Estándar)</option>
                    <option value={1.25}>125% (Detallado)</option>
                    <option value={1.5}>150% (Alto Contraste)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{loading ? 'Guardando...' : 'Aplicar Preferencias y Tema'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNT SECURITY */}
        {activeTab === 'security' && (
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl max-w-xl ${
            selectedTheme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cambio de Contraseña</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Actualiza tu clave de acceso asegurando un hash BCrypt de alta seguridad.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border focus:outline-none transition-colors font-mono ${
                      selectedTheme === 'light'
                        ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                        : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Nueva Contraseña (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border focus:outline-none transition-colors font-mono ${
                      selectedTheme === 'light'
                        ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                        : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border focus:outline-none transition-colors font-mono ${
                      selectedTheme === 'light'
                        ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                        : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsPage;
