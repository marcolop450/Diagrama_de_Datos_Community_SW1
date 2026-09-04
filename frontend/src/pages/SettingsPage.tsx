import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Shield, 
  ArrowLeft, 
  Save, 
  Grid, 
  Lock, 
  AtSign,
  Mail,
  ShieldCheck,
  Calendar,
  Image as ImageIcon,
  AlertTriangle,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0 = closed, 1 = warning, 2 = confirm challenge
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

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
    if (!currentPassword || !newPassword) {
      toast.error('Por favor completa todos los campos de contraseña');
      return;
    }
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

  // Handle 2-Step Account Deletion Execution
  const handleExecuteDeleteAccount = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'ELIMINAR') {
      toast.error('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    try {
      setDeletingAccount(true);
      await api.deleteAccount();
      toast.success('Tu cuenta ha sido eliminada con éxito');
      setDeleteStep(0);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Perfil y Configuración
            </h1>
            <p className="text-xs sm:text-sm mt-1 text-slate-400">
              Personaliza tu identidad de arquitecto, preferencias del lienzo y credenciales.
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft size={14} className="text-slate-400" />
            <span>Volver</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={15} />
            <span>Mi Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid size={15} />
            <span>Preferencias del Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
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
                  <span className="flex items-center gap-1.5"><Calendar size={13} /> Plan:</span>
                  <span className="font-mono text-purple-400 font-semibold">{user?.subscriptionPlan}</span>
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
                      required 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      className="w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors" 
                      placeholder="Ej. Ing. Marco López" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Nombre de Usuario (@username) *
                  </label>
                  <div className="relative">
                    <AtSign className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      required 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      className="w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors font-mono" 
                      placeholder="Ej. m_ale" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    URL de Foto de Perfil (Avatar)
                  </label>
                  <div className="relative">
                    <ImageIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="url" 
                      value={avatarUrl} 
                      onChange={(e) => setAvatarUrl(e.target.value)} 
                      className="w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors" 
                      placeholder="https://images.unsplash.com/photo-..." 
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={15} />
                    <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: EDITOR PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl max-w-2xl">
            <h2 className="text-base font-bold mb-1 text-white">Preferencias del Entorno CASE</h2>
            <p className="text-xs mb-6 text-slate-400">
              Personaliza el comportamiento del lienzo interactivo React Flow.
            </p>

            <div className="space-y-4">
              {/* Grid Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-950/50 border-slate-800/90">
                <div>
                  <span className="text-xs font-semibold block text-slate-100">Cuadrícula del Lienzo</span>
                  <span className="text-[11px] text-slate-400">Mostrar matriz de puntos guía en el fondo del modelador.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGridEnabled(!gridEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    gridEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${gridEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Snap-to-Grid Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-950/50 border-slate-800/90">
                <div>
                  <span className="text-xs font-semibold block text-slate-100">Alineación Magnética (Snap to Grid)</span>
                  <span className="text-[11px] text-slate-400">Alinear automáticamente las clases a la cuadrícula.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    snapEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${snapEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Auto-save Interval */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border bg-slate-950/50 border-slate-800/90">
                <div>
                  <span className="text-xs font-semibold block text-slate-100">Intervalo de Guardado Automático</span>
                  <span className="text-[11px] text-slate-400">Frecuencia de persistencia automática en PostgreSQL.</span>
                </div>
                <select 
                  value={autoSave} 
                  onChange={(e) => setAutoSave(Number(e.target.value))} 
                  className="px-3 py-1.5 rounded-xl text-xs border bg-slate-900 border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={5}>Cada 5 segundos</option>
                  <option value={15}>Cada 15 segundos</option>
                  <option value={30}>Cada 30 segundos (Recomendado)</option>
                  <option value={60}>Cada 1 minuto</option>
                  <option value={0}>Manual únicamente</option>
                </select>
              </div>

              {/* Default Zoom */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border bg-slate-950/50 border-slate-800/90">
                <div>
                  <span className="text-xs font-semibold block text-slate-100">Nivel de Zoom por Defecto</span>
                  <span className="text-[11px] text-slate-400">Escala de visión inicial al abrir cualquier diagrama.</span>
                </div>
                <select 
                  value={defaultZoom} 
                  onChange={(e) => setDefaultZoom(Number(e.target.value))} 
                  className="px-3 py-1.5 rounded-xl text-xs border bg-slate-900 border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={0.75}>75% (Vista Panorámica)</option>
                  <option value={1.0}>100% (Estándar)</option>
                  <option value={1.25}>125% (Detallado)</option>
                  <option value={1.5}>150% (Alto Enfoque)</option>
                </select>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{loading ? 'Guardando...' : 'Guardar Preferencias'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNT SECURITY & DANGER ZONE */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-8 max-w-2xl">
            {/* Password Change Form */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl">
              <h2 className="text-base font-bold mb-1 flex items-center gap-2 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Cambio de Contraseña</span>
              </h2>
              <p className="text-xs mb-6 text-slate-400">
                Actualiza tu clave de acceso asegurando un hash BCrypt de alta seguridad.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Contraseña Actual *
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      required 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      className="w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors font-mono" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Nueva Contraseña (mínimo 6 caracteres) *
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      required 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors font-mono" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      required 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="w-full rounded-xl pl-10 pr-3 py-2.5 text-xs border bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors font-mono" 
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

            {/* DANGER ZONE: 2-STEP ACCOUNT DELETION */}
            <div className="p-6 sm:p-8 rounded-3xl border border-rose-900/40 bg-rose-950/10 shadow-2xl">
              <div className="flex items-center gap-2.5 text-rose-400 mb-2">
                <AlertTriangle size={18} />
                <h3 className="text-base font-bold text-rose-300">
                  Zona de Peligro: Eliminar Cuenta
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Al eliminar tu cuenta, tu acceso a la plataforma quedará inhabilitado de forma permanente. Todos tus datos y diagramas asociados dejarán de estar accesibles.
              </p>

              <button
                type="button"
                onClick={() => {
                  setDeleteStep(1);
                  setConfirmDeleteText('');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 hover:border-rose-700 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-900/20"
              >
                <Trash2 size={15} />
                <span>Eliminar mi Cuenta</span>
              </button>
            </div>
          </div>
        )}
      </div>

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
                className="text-slate-500 hover:text-white transition-colors"
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
    </AppLayout>
  );
};

export default SettingsPage;
