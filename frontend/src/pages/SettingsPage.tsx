import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Shield, 
  Save, 
  Grid, 
  Lock, 
  AtSign, 
  Mail, 
  Image as ImageIcon, 
  AlertTriangle, 
  Trash2, 
  X, 
  RefreshCw,
  CheckCircle2,
  Palette,
  Check,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CANVAS_THEMES, CanvasThemeId, APP_PALETTES, AppPaletteId } from '../constants/canvasThemes';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user, updateUserProfile, logout } = useAuthStore();

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
    appPalette: 'warm-titanium' as AppPaletteId,
    autoSaveEnabled: true,
  };

  const [gridEnabled, setGridEnabled] = useState(currentPrefs.grid ?? true);
  const [snapEnabled, setSnapEnabled] = useState(currentPrefs.snapToGrid ?? true);
  const [autoSave, setAutoSave] = useState<number>(currentPrefs.autoSaveInterval ?? 30);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(currentPrefs.autoSaveEnabled ?? true);
  const [defaultZoom, setDefaultZoom] = useState<number>(currentPrefs.defaultZoom ?? 1.0);
  const [canvasTheme, setCanvasTheme] = useState<CanvasThemeId>((currentPrefs.canvasTheme as CanvasThemeId) || 'warm-titanium');
  const [appPalette, setAppPalette] = useState<AppPaletteId>((currentPrefs.appPalette as AppPaletteId) || 'warm-titanium');

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2-Step Account Deletion State
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (tabParam === 'preferences' || tabParam === 'security' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: 'profile' | 'preferences' | 'security') => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
      if (user.preferences) {
        setGridEnabled(user.preferences.grid ?? true);
        setSnapEnabled(user.preferences.snapToGrid ?? true);
        setAutoSave(user.preferences.autoSaveInterval ?? 30);
        if (user.preferences.autoSaveEnabled !== undefined) {
          setAutoSaveEnabled(user.preferences.autoSaveEnabled);
        }
        setDefaultZoom(user.preferences.defaultZoom ?? 1.0);
        if (user.preferences.canvasTheme) {
          setCanvasTheme(user.preferences.canvasTheme as CanvasThemeId);
        }
        if (user.preferences.appPalette) {
          setAppPalette(user.preferences.appPalette as AppPaletteId);
        }
      }
    }
  }, [user]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleSelectPalette = async (paletteId: AppPaletteId) => {
    setAppPalette(paletteId);
    document.documentElement.setAttribute('data-palette', paletteId);
    localStorage.setItem('case_app_palette', paletteId);
    if (user) {
      updateUserProfile({
        preferences: {
          ...(user.preferences || {}),
          appPalette: paletteId,
        }
      });
    }

    try {
      await api.updatePreferences({
        appPalette: paletteId,
      });
      toast.success(`Paleta ${APP_PALETTES[paletteId].name} aplicada`);
    } catch (err) {
      console.warn('Could not auto-save palette preference to backend:', err);
      toast.success(`Paleta ${APP_PALETTES[paletteId].name} activada`);
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('El nombre completo es obligatorio');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
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

  // Handle Preferences Update
  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const payload: any = {
        appPalette: appPalette,
      };

      if (!isSuperAdmin) {
        payload.theme = 'dark';
        payload.grid = gridEnabled;
        payload.snapToGrid = snapEnabled;
        payload.autoSaveInterval = autoSave;
        payload.autoSaveEnabled = autoSaveEnabled;
        payload.defaultZoom = defaultZoom;
        payload.canvasTheme = canvasTheme;
      }

      const res = await api.updatePreferences(payload);
      if (res.success && res.data) {
        updateUserProfile({ preferences: res.data.preferences });
        document.documentElement.setAttribute('data-palette', appPalette);
        localStorage.setItem('case_app_palette', appPalette);
        toast.success(isSuperAdmin ? 'Apariencia del sistema guardada con éxito' : 'Preferencias del editor guardadas con éxito');
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
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        toast.success('Contraseña actualizada correctamente');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || 'Error al cambiar la contraseña');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Contraseña actual incorrecta o error de servidor');
    } finally {
      setLoading(false);
    }
  };

  // Handle 2-Step Account Deletion Execution
  const handleExecuteDeleteAccount = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }

    setDeletingAccount(true);
    try {
      await api.deleteAccount();
      toast.success('Cuenta eliminada definitivamente. Sesión cerrada.');
      logout();
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar la cuenta');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-page-enter">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Perfil y Configuración
          </h1>
          <p className="text-xs sm:text-sm mt-1 text-slate-400">
            Personaliza tu identidad de arquitecto, preferencias del lienzo y seguridad de tu cuenta.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-1 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={15} />
            <span>Mi Perfil</span>
          </button>

          <button
            onClick={() => handleTabChange('preferences')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSuperAdmin ? <Palette size={15} /> : <Grid size={15} />}
            <span>{isSuperAdmin ? 'Identidad y Tema' : 'Preferencias del Editor'}</span>
          </button>

          <button
            onClick={() => handleTabChange('security')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={15} />
            <span>Seguridad</span>
          </button>
        </div>

        {/* TAB 1: PROFILE MANAGEMENT */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Avatar & Summary Card */}
            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50 shadow-xs flex flex-col items-center text-center">
              <div className="relative group mb-4">
                <div className="w-20 h-20 rounded-lg bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/40 p-1 flex items-center justify-center overflow-hidden shadow-xs">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-md"
                      onError={() => toast.error('Error al cargar la imagen del avatar')}
                    />
                  ) : (
                    <User size={36} className="text-blue-400" />
                  )}
                </div>
              </div>

              <h3 className="font-bold text-base text-white">{fullName || 'Usuario'}</h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">@{username || 'sin-usuario'}</p>

              <div className="w-full border-t border-slate-800/80 my-4 pt-4 flex flex-col gap-2.5 text-xs text-left">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5"><Mail size={13} /> Correo:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[140px]">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5"><Shield size={13} /> Rol:</span>
                  <span className="font-mono text-blue-400 font-semibold">{user?.role}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Estado:</span>
                  <span className="font-mono text-emerald-400 font-semibold">Activo</span>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Edit Form */}
            <div className="md:col-span-2 p-6 rounded-lg border border-slate-800 bg-slate-900/50 shadow-xs">
              <h2 className="text-base font-bold mb-1 text-white">Información Personal</h2>
              <p className="text-xs mb-6 text-slate-400">
                Modifica tus datos de perfil para el entorno colaborativo.
              </p>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej: Alejandro Morales"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-md pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Nombre de Usuario (Handle) *
                  </label>
                  <div className="relative">
                    <AtSign className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ej: amorales"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-md pl-10 pr-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Identificador único para menciones y sesiones colaborativas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    URL de Foto de Perfil
                  </label>
                  <div className="relative">
                    <ImageIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://ejemplo.com/mi-avatar.jpg"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-md pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enlace HTTPS directo a una imagen PNG o JPG.
                  </p>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: CANVAS & SYSTEM PREFERENCES (IHC) */}
        {activeTab === 'preferences' && (
          <div className="max-w-2xl mx-auto p-6 rounded-lg border border-slate-800/90 bg-slate-900/70 backdrop-blur-md shadow-xl space-y-6 animate-fade-in-up">
            <div>
              <h2 className="text-base font-bold text-white mb-1">
                {isSuperAdmin ? 'Identidad Visual y Apariencia del Sistema' : 'Preferencias del Sistema y Editor CASE'}
              </h2>
              <p className="text-xs text-slate-400">
                {isSuperAdmin
                  ? 'Personaliza la atmósfera cromática global de la plataforma para tu panel de administración.'
                  : 'Personaliza la identidad visual cromática, el modo de persistencia y el entorno de modelado.'}
              </p>
            </div>

            {/* SECTION 1: 2 APP PALETTES (TITANIO CÁLIDO & GRAFITO OBSIDIANA) */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white">Paleta de Identidad Visual del Sistema</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-3.5">
                Selecciona la atmósfera cromática global de la plataforma: interfaces, aurora luminosa, cursor reactivo y componentes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Titanio Cálido */}
                <div
                  onClick={() => handleSelectPalette('warm-titanium')}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    appPalette === 'warm-titanium'
                      ? 'border-amber-500/80 bg-zinc-900/90 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" />
                        <span className="text-xs font-bold text-zinc-100">Titanio Cálido</span>
                      </div>
                      {appPalette === 'warm-titanium' ? (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> Activo
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Seleccionar</span>
                      )}
                    </div>

                    {/* Color Swatch Previews */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="h-6 flex-1 rounded bg-[#18181b] border border-zinc-700/60 flex items-center justify-center text-[9px] text-zinc-400 font-mono">
                        Base
                      </div>
                      <div className="h-6 flex-1 rounded bg-[#27272a] border border-zinc-700/60 flex items-center justify-center text-[9px] text-zinc-300 font-mono">
                        Panel
                      </div>
                      <div className="h-6 flex-1 rounded bg-amber-500 flex items-center justify-center text-[9px] text-zinc-950 font-mono font-bold">
                        Ámbar
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Carbón antracita con acentos ámbar dorado, bronce y calidez orgánica. Diseñado para reducir fatiga visual en sesiones prolongadas de arquitectura.
                    </p>
                  </div>
                </div>

                {/* 2. Grafito Obsidiana */}
                <div
                  onClick={() => handleSelectPalette('obsidian-graphite')}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    appPalette === 'obsidian-graphite'
                      ? 'border-indigo-500/80 bg-slate-900/90 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-xs shadow-indigo-500/50" />
                        <span className="text-xs font-bold text-slate-100">Grafito Obsidiana</span>
                      </div>
                      {appPalette === 'obsidian-graphite' ? (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full font-bold flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> Activo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Seleccionar</span>
                      )}
                    </div>

                    {/* Color Swatch Previews */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="h-6 flex-1 rounded bg-[#121316] border border-slate-700/60 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                        Base
                      </div>
                      <div className="h-6 flex-1 rounded bg-[#1a1d24] border border-slate-700/60 flex items-center justify-center text-[9px] text-slate-300 font-mono">
                        Panel
                      </div>
                      <div className="h-6 flex-1 rounded bg-indigo-500 flex items-center justify-center text-[9px] text-white font-mono font-bold">
                        Índigo
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Grafito neutro de alta precisión con acentos índigo y zafiro cósmico. Inspirado en herramientas de ingeniería de software de clase mundial.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTIONS 2, 3 & 4: CASE CANVAS PREFERENCES (ONLY FOR ARCHITECT & COLLABORATOR) */}
            {!isSuperAdmin && (
              <>
                {/* SECTION 2: AUTO-SAVE CONTROLS & MANUAL SAVE SWITCH (IHC) */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Save size={15} className="text-blue-400" />
                    <h3 className="text-xs font-bold text-white">Control de Guardado y Persistencia</h3>
                  </div>

              {/* Master Switch: Auto-Save vs Manual Exclusivo */}
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>Guardado Automático Continuo</span>
                    {autoSaveEnabled ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium font-mono">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium font-mono">
                        Guardado Manual Exclusivo
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sincroniza y almacena periódicamente el diagrama en segundo plano en la base de datos PostgreSQL Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSaveEnabled}
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoSaveEnabled ? 'bg-blue-600' : 'bg-slate-800'
                  }`}
                  title={autoSaveEnabled ? 'Desactivar guardado automático' : 'Activar guardado automático'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      autoSaveEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Informative Banner when Manual Save is active */}
              {!autoSaveEnabled ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed animate-fade-in-up">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Modo de Guardado Manual Exclusivo:</strong>
                    El lienzo NO realizará llamadas automáticas en segundo plano. El modelo se guardará exclusivamente cuando presiones el botón <span className="font-semibold text-white underline">Guardar</span> en el encabezado del editor, previniendo mutaciones periódicas innecesarias en la bitácora e historial de trazabilidad.
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Frecuencia de Autoguardado</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Intervalo en segundos para sincronizar cambios automáticamente.</p>
                  </div>
                  <select
                    value={autoSave}
                    onChange={(e) => setAutoSave(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 text-xs text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={15}>15 segundos</option>
                    <option value={30}>30 segundos (Recomendado)</option>
                    <option value={60}>1 minuto</option>
                    <option value={120}>2 minutos</option>
                  </select>
                </div>
              )}
            </div>

            {/* SECTION 3: CANVAS GRID & MAGNITUDE CONTROLS */}
            <div className="space-y-4 divide-y divide-slate-800/80 pt-2 border-t border-slate-800/80">
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Cuadrícula del Lienzo</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Muestra la rejilla milimétrica en el fondo de trabajo.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={gridEnabled}
                  onClick={() => setGridEnabled(!gridEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    gridEnabled ? 'bg-blue-600' : 'bg-slate-800'
                  }`}
                  title={gridEnabled ? 'Desactivar cuadrícula' : 'Activar cuadrícula'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      gridEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Ajuste Magnético a la Cuadrícula</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Alinea automáticamente las clases UML al moverlas.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={snapEnabled}
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    snapEnabled ? 'bg-blue-600' : 'bg-slate-800'
                  }`}
                  title={snapEnabled ? 'Desactivar ajuste magnético' : 'Activar ajuste magnético'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      snapEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Nivel de Zoom Inicial</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Escala porcentual al abrir un nuevo diagrama.</p>
                </div>
                <select
                  value={defaultZoom}
                  onChange={(e) => setDefaultZoom(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={0.75}>75%</option>
                  <option value={1.0}>100%</option>
                  <option value={1.25}>125%</option>
                  <option value={1.5}>150%</option>
                </select>
              </div>
            </div>

            {/* 4 Selectable Canvas Themes */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 mb-1.5">
                <Palette size={15} className="text-blue-400" />
                <h3 className="text-xs font-bold text-white">Tema Visual del Lienzo CASE</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Personaliza la apariencia estética y de contraste del diagramador UML.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.values(CANVAS_THEMES).map((theme) => {
                  const isSelected = canvasTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => {
                        setCanvasTheme(theme.id);
                        updateUserProfile({
                          preferences: {
                            ...(user?.preferences || {
                              theme: 'dark',
                              grid: gridEnabled,
                              snapToGrid: snapEnabled,
                              autoSaveInterval: autoSave,
                              defaultZoom: defaultZoom,
                            }),
                            canvasTheme: theme.id,
                          },
                        });
                      }}
                      className={`group relative p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        isSelected
                          ? 'border-blue-500 bg-slate-950 ring-1 ring-blue-500/40 shadow-xs'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                      }`}
                    >
                      {/* Theme preview swatch */}
                      <div 
                        className="w-full h-18 rounded-md border mb-3 relative overflow-hidden flex items-center justify-center p-2 shadow-inner"
                        style={{ backgroundColor: theme.canvasBg, borderColor: theme.preview.border }}
                      >
                        {/* Simulated Grid Lines in Preview */}
                        <div 
                          className="absolute inset-0 opacity-40 pointer-events-none" 
                          style={{
                            backgroundImage: `linear-gradient(to right, ${theme.gridMinor} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridMinor} 1px, transparent 1px)`,
                            backgroundSize: '12px 12px'
                          }}
                        />

                        {/* Mini Node Simulation */}
                        <div 
                          className="w-28 rounded-xs border shadow-xs flex flex-col overflow-hidden text-[8px] font-mono relative z-10"
                          style={{ backgroundColor: theme.nodeBg, borderColor: theme.nodeBorder }}
                        >
                          <div 
                            className="px-1.5 py-0.5 border-b font-bold truncate text-center"
                            style={{ backgroundColor: theme.nodeHeaderBg, color: theme.nodeText, borderColor: theme.divider }}
                          >
                            Usuario
                          </div>
                          <div 
                            className="px-1.5 py-0.5 truncate flex items-center justify-between"
                            style={{ backgroundColor: theme.attrBg, color: theme.nodeTextMuted }}
                          >
                            <span>+ id: Long</span>
                            <span 
                              className="px-0.5 text-[6px] rounded-xs font-bold"
                              style={{ backgroundColor: theme.pkBg, color: theme.pkText }}
                            >
                              PK
                            </span>
                          </div>
                        </div>

                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs z-20">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Name & Description */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                            {theme.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                              Activo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {theme.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{isSuperAdmin ? 'Guardar Apariencia' : 'Guardar Preferencias'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY & ACCOUNT MANAGEMENT */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Password Change Box */}
            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50 shadow-xs">
              <h2 className="text-base font-bold text-white mb-1">Cambiar Contraseña</h2>
              <p className="text-xs text-slate-400 mb-6">
                Actualiza tus credenciales periódicamente para proteger tus proyectos de arquitectura.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-md pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Al menos 6 caracteres"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-md pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-md pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                    <span>Actualizar Credencial</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="p-6 rounded-lg border border-rose-900/30 bg-rose-950/10 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-rose-900/30 text-rose-400 border border-rose-800/40">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-300">Zona Crítica: Eliminación de Cuenta</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Elimina de forma definitiva tu acceso y registros asociados a esta plataforma.
                  </p>
                </div>
              </div>

              <div className="border-t border-rose-900/30 pt-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="text-xs text-slate-400 max-w-sm">
                  Esta operación requiere confirmación de seguridad en 2 pasos y no podrá revertirse.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteText('');
                    setDeleteStep(1);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 hover:border-rose-700 text-rose-300 hover:text-white rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <Trash2 size={14} />
                  <span>Eliminar mi Cuenta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2-STEP ACCOUNT DELETION MODAL */}
        {deleteStep > 0 && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle size={18} />
                  <h3 className="font-bold text-white text-sm">
                    {deleteStep === 1 ? 'Paso 1 de 2: Advertencia de Eliminación' : 'Paso 2 de 2: Confirmación Definitiva'}
                  </h3>
                </div>
                <button 
                  onClick={() => setDeleteStep(0)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* STEP 1: WARNING */}
              {deleteStep === 1 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Estás a punto de solicitar la <span className="font-bold text-rose-400">eliminación total e irreversible</span> de tu cuenta.
                  </p>
                  
                  <div className="bg-rose-950/40 border border-rose-900/50 rounded-md p-3 text-xs text-rose-200 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-rose-300">
                      <ShieldAlert size={14} /> Consecuencias directas:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-300/90">
                      <li>Perderás acceso inmediato a todos tus diagramas y modelos CASE.</li>
                      <li>Tus roles y permisos serán irrevocablemente removidos.</li>
                      <li>Se registrará el evento de baja definitiva en la bitácora de seguridad.</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <span>Entendido, Continuar al Paso 2</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONFIRMATION BY TYPING */}
              {deleteStep === 2 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Para confirmar la eliminación, escribe la palabra <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ELIMINAR</span> a continuación:
                  </p>

                  <div>
                    <input
                      type="text"
                      value={confirmDeleteText}
                      onChange={(e) => setConfirmDeleteText(e.target.value)}
                      placeholder="Escribe ELIMINAR"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDeleteAccount}
                      disabled={confirmDeleteText.trim().toUpperCase() !== 'ELIMINAR' || deletingAccount}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingAccount ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      <span>Confirmar Eliminación Definitiva</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
