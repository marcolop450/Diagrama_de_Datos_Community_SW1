import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';

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
  };

  const [gridEnabled, setGridEnabled] = useState(currentPrefs.grid ?? true);
  const [snapEnabled, setSnapEnabled] = useState(currentPrefs.snapToGrid ?? true);
  const [autoSave, setAutoSave] = useState<number>(currentPrefs.autoSaveInterval ?? 30);
  const [defaultZoom, setDefaultZoom] = useState<number>(currentPrefs.defaultZoom ?? 1.0);

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
      const payload = {
        theme: 'dark' as const,
        grid: gridEnabled,
        snapToGrid: snapEnabled,
        autoSaveInterval: autoSave,
        defaultZoom: defaultZoom,
      };

      const res = await api.updatePreferences(payload);
      if (res.success && res.data) {
        updateUserProfile({ preferences: res.data.preferences });
        toast.success('Preferencias del editor guardadas con éxito');
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
            <Grid size={15} />
            <span>Preferencias del Editor</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Avatar & Summary Card */}
            <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl flex flex-col items-center text-center">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border-2 border-blue-500/40 p-1 flex items-center justify-center overflow-hidden shadow-lg">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-xl"
                      onError={() => toast.error('Error al cargar la imagen del avatar')}
                    />
                  ) : (
                    <User size={40} className="text-blue-400" />
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
                  <span className="flex items-center gap-1.5"><Shield size={13} /> Rol RBAC:</span>
                  <span className="font-mono text-blue-400 font-semibold">{user?.role}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Estado:</span>
                  <span className="font-mono text-emerald-400 font-semibold">Activo</span>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Edit Form */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl">
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
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
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
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none transition-colors"
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
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: CANVAS PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Preferencias del Editor CASE</h2>
              <p className="text-xs text-slate-400">
                Configuración del lienzo UML y comportamiento de autoguardado.
              </p>
            </div>

            <div className="space-y-4 divide-y divide-slate-800/80">
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Cuadrícula del Lienzo</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Muestra la rejilla milimétrica en el fondo de trabajo.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={gridEnabled} 
                    onChange={(e) => setGridEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Ajuste Magnético a la Cuadrícula</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Alinea automáticamente las clases UML al moverlas.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={snapEnabled} 
                    onChange={(e) => setSnapEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Frecuencia de Autoguardado</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Intervalo en segundos para guardar cambios automáticamente.</p>
                </div>
                <select
                  value={autoSave}
                  onChange={(e) => setAutoSave(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={15}>15 segundos</option>
                  <option value={30}>30 segundos</option>
                  <option value={60}>1 minuto</option>
                  <option value={120}>2 minutos</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Nivel de Zoom Inicial</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Escala porcentual al abrir un nuevo diagrama.</p>
                </div>
                <select
                  value={defaultZoom}
                  onChange={(e) => setDefaultZoom(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={0.75}>75%</option>
                  <option value={1.0}>100% (Normal)</option>
                  <option value={1.25}>125%</option>
                  <option value={1.5}>150%</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Guardar Preferencias</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY & ACCOUNT MANAGEMENT */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Password Change Box */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl">
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
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
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
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
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
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                    <span>Actualizar Credencial</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="p-6 sm:p-8 rounded-3xl border border-rose-900/40 bg-rose-950/10 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-900/30 text-rose-400 border border-rose-800/40">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-300">Zona Crítica: Eliminación de Cuenta</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Elimina de forma definitiva tu acceso y registros asociados a esta plataforma.
                  </p>
                </div>
              </div>

              <div className="border-t border-rose-900/30 pt-4 flex justify-between items-center">
                <div className="text-xs text-slate-400 max-w-sm">
                  Esta operación requiere confirmación de seguridad en 2 pasos y no podrá revertirse.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteText('');
                    setDeleteStep(1);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 hover:border-rose-700 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-900/20"
                >
                  <Trash2 size={15} />
                  <span>Eliminar mi Cuenta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2-STEP ACCOUNT DELETION MODAL */}
        {deleteStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle size={18} />
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {deleteStep === 1 ? 'Paso 1 de 2: Advertencia de Eliminación' : 'Paso 2 de 2: Confirmación Definitiva'}
                  </h3>
                </div>
                <button 
                  onClick={() => setDeleteStep(0)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* STEP 1: WARNING */}
              {deleteStep === 1 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ¿Estás seguro de que deseas iniciar el proceso de eliminación de tu cuenta? Esta acción es <strong className="text-rose-400 font-bold">estrictamente irreversible</strong>.
                  </p>
                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 text-[11px] text-rose-300 flex flex-col gap-1">
                    <span>• Se revocará de inmediato tu sesión volátil.</span>
                    <span>• Tu cuenta quedará desactivada en PostgreSQL.</span>
                    <span>• Se generará un evento inmutable de auditoría.</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      <span>Continuar al Paso 2</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONFIRMATION CHALLENGE */}
              {deleteStep === 2 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Para proceder con la eliminación permanente, por favor escribe la palabra <strong className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ELIMINAR</strong> en el siguiente campo:
                  </p>

                  <div>
                    <input
                      type="text"
                      value={confirmDeleteText}
                      onChange={(e) => setConfirmDeleteText(e.target.value)}
                      placeholder="Escribe ELIMINAR"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDeleteAccount}
                      disabled={confirmDeleteText.trim().toUpperCase() !== 'ELIMINAR' || deletingAccount}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingAccount ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      <span>Confirmar Eliminación Definitiva</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
