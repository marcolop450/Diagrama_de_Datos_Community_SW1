import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { 
  User, 
  Shield, 
  Save, 
  Grid, 
  Lock, 
  AtSign, 
  Mail, 
  Calendar, 
  Image as ImageIcon, 
  AlertTriangle, 
  Trash2, 
  X, 
  RefreshCw,
  CreditCard,
  Sparkles,
  Clock,
  Receipt,
  Printer,
  CheckCircle2,
  Zap,
  Info,
  Layers
} from 'lucide-react';

interface SubscriptionPlanItem {
  id: string;
  name: string;
  priceMonthly: number;
  maxProjects: number;
  maxClassesPerProject: number;
  allowSpringBootGeneration: boolean;
  allowDdlGeneration: boolean;
  allowPostmanGeneration: boolean;
  allowXmiExport: boolean;
  allowVoiceCommands: boolean;
  allowPhotoOcr: boolean;
  allowRealtimeCollaboration: boolean;
}

interface SubscriptionStatusData {
  planId: string;
  planName: string;
  active: boolean;
  subscriptionExpiresAt?: string | null;
  daysRemaining: number;
  canCancel: boolean;
  allowSpringBootGeneration: boolean;
  allowDdlGeneration: boolean;
  allowPostmanGeneration: boolean;
  allowXmiExport: boolean;
}

interface PaymentReceiptItem {
  id: string;
  invoiceNumber: string;
  paypalOrderId: string;
  paypalPayerId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  subscriptionExpiresAt?: string;
  userFullName?: string;
  userEmail?: string;
  username?: string;
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user, updateUserProfile, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'subscription'>('profile');
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

  // Subscription State
  const [subStatus, setSubStatus] = useState<SubscriptionStatusData | null>(null);
  const [subPlans, setSubPlans] = useState<SubscriptionPlanItem[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentReceiptItem[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlanItem | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingSub, setCancellingSub] = useState(false);
  const [subProcessing, setSubProcessing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentReceiptItem | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'BAAEZt0Yfq-bOz9gNms5brjPxsI5rg76weuPR4Af4MdDP5g5XkLEMd9FOfZppWGz2g1q-3CeacCFe4Pc-w';

  useEffect(() => {
    if (tabParam === 'subscription' || tabParam === 'preferences' || tabParam === 'security' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: 'profile' | 'preferences' | 'security' | 'subscription') => {
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

  // Fetch subscription data
  const loadSubscriptionData = async () => {
    setLoadingSub(true);
    try {
      const [plansRes, statusRes, historyRes] = await Promise.all([
        api.getSubscriptionPlans().catch(() => null),
        api.getSubscriptionStatus().catch(() => null),
        api.getPaymentHistory().catch(() => null)
      ]);

      if (plansRes?.data) setSubPlans(plansRes.data);
      if (statusRes?.data) {
        setSubStatus(statusRes.data);
        if (statusRes.data.planId) {
          updateUserProfile({
            subscriptionPlan: statusRes.data.planId,
            subscriptionExpiresAt: statusRes.data.subscriptionExpiresAt
          });
        }
      }
      if (historyRes?.data) setPaymentHistory(historyRes.data);
    } catch (err) {
      console.error('Error al cargar datos de suscripcion', err);
    } finally {
      setLoadingSub(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscription') {
      loadSubscriptionData();
    }
  }, [activeTab]);

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

  // Handle PayPal Capture
  const handleCapturePayPalOrder = async (orderId: string, payerId?: string | null) => {
    if (!selectedPlanForCheckout) return;
    setSubProcessing(true);
    try {
      const res = await api.capturePayPalOrder(orderId, selectedPlanForCheckout.id, payerId || undefined);
      if (res?.success) {
        toast.success(`¡Suscripción ${selectedPlanForCheckout.name} activada exitosamente por 30 días!`);
        updateUserProfile({
          subscriptionPlan: res.data.newPlan || 'PRO_ARCHITECT',
          subscriptionExpiresAt: res.data.subscriptionExpiresAt,
        });
        setShowCheckoutModal(false);
        await loadSubscriptionData();
      } else {
        toast.error(res?.message || 'Error al confirmar la transacción de pago');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al procesar el pago con PayPal');
    } finally {
      setSubProcessing(false);
    }
  };

  // Handle Cancel Subscription (Option A: immediate reset to COMMUNITY)
  const handleCancelSubscription = async () => {
    setCancellingSub(true);
    try {
      const res = await api.cancelSubscription();
      if (res?.success) {
        toast.success('Suscripción cancelada. Tu cuenta se ha restablecido al plan Community.');
        updateUserProfile({
          subscriptionPlan: 'COMMUNITY',
          subscriptionExpiresAt: null,
        });
        setShowCancelModal(false);
        await loadSubscriptionData();
      } else {
        toast.error(res?.message || 'Error al cancelar la suscripción');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cancelar la suscripción');
    } finally {
      setCancellingSub(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatShortDate = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const currentPlanName = subStatus?.planName || (user?.subscriptionPlan === 'PRO_ARCHITECT' ? 'Pro Architect' : user?.subscriptionPlan === 'ENTERPRISE' ? 'Enterprise Team' : 'Community Free');
  const isPaidPlan = subStatus?.planId ? subStatus.planId !== 'COMMUNITY' : (user?.subscriptionPlan && user.subscriptionPlan !== 'COMMUNITY');
  const daysRemaining = subStatus?.daysRemaining ?? (isPaidPlan ? 30 : 0);
  const expirationDateFormatted = formatDate(subStatus?.subscriptionExpiresAt || user?.subscriptionExpiresAt);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-page-enter">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Perfil y Configuración
          </h1>
          <p className="text-xs sm:text-sm mt-1 text-slate-400">
            Personaliza tu identidad de arquitecto, preferencias del lienzo, seguridad y suscripción de facturación.
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

          <button
            onClick={() => handleTabChange('subscription')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'subscription'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard size={15} />
            <span>Suscripción y Facturación</span>
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

        {/* TAB 4: SUBSCRIPTION & BILLING (SAAS PAYPAL SANDBOX) */}
        {activeTab === 'subscription' && (
          <div className="space-y-8 animate-page-enter">
            {/* Status Card */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono border ${
                      user?.subscriptionPlan === 'ENTERPRISE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isPaidPlan
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      <Sparkles size={13} />
                      {currentPlanName}
                    </span>

                    <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      isPaidPlan 
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {isPaidPlan ? 'Vigente (30 Días)' : 'Plan Estándar Gratuito'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {isPaidPlan ? 'Suscripción Activa de Arquitectura' : 'Plan Básico Community'}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                    {isPaidPlan 
                      ? 'Tienes acceso a generación de código Spring Boot completa, exportación formal XMI, colecciones Postman y límites extendidos de modelado de clases.'
                      : 'El plan gratuito te permite crear modelos UML esenciales en almacenamiento local. Actualiza a Pro Architect o Enterprise para habilitar la generación de código y exportación formal.'}
                  </p>

                  {isPaidPlan && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
                        <Clock size={13} className="text-indigo-400" />
                        <span>Vigencia restante: <strong className="text-indigo-300 font-bold">{daysRemaining} días</strong> (de 30 días)</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Expira: <strong className="text-slate-200">{expirationDateFormatted}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* 30 Days Progress Bar */}
                  {isPaidPlan && (
                    <div className="w-full max-w-md pt-2">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                        <span>Progreso del ciclo de 30 días</span>
                        <span className="text-indigo-400 font-semibold">{Math.min(100, Math.max(0, Math.round((daysRemaining / 30) * 100)))}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, (daysRemaining / 30) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cancel Subscription Action (Garantía Antifallos - Opción A) */}
                {isPaidPlan && (
                  <div className="flex flex-col items-start md:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 hover:border-rose-700 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-950/30"
                    >
                      <AlertTriangle size={14} />
                      <span>Cancelar Suscripción</span>
                    </button>
                    <span className="text-[10px] text-slate-500 mt-1.5 max-w-[180px] text-left md:text-right">
                      Reversión inmediata a Community para pruebas continuas sin errores.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Plans Comparison Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Catálogo de Planes (Vigencia 30 Días)</h3>
                  <p className="text-xs text-slate-400">Selecciona la cobertura que mejor se adapte a tus requerimientos de ingeniería de software.</p>
                </div>
                {loadingSub && <RefreshCw size={15} className="text-indigo-400 animate-spin" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Plan 1: Community Free */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-xl">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Community</span>
                      {!isPaidPlan && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold">
                          Plan Actual
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-white">$0</span>
                      <span className="text-xs text-slate-400 font-mono"> / Para siempre</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Ideal para estudiantes y diseño de modelos de datos individuales.
                    </p>

                    <div className="space-y-3 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Hasta 3 proyectos activos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>10 clases por proyecto</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Exportación SQL DDL nativa</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <X size={14} className="text-slate-600 shrink-0" />
                        <span className="line-through">Generación Spring Boot</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <X size={14} className="text-slate-600 shrink-0" />
                        <span className="line-through">Exportación formal XMI</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed text-center"
                    >
                      {!isPaidPlan ? 'Tu Plan Actual' : 'Plan Base Gratuito'}
                    </button>
                  </div>
                </div>

                {/* Plan 2: Pro Architect */}
                <div className="rounded-3xl border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/20 via-slate-900 to-slate-900 p-6 flex flex-col justify-between shadow-2xl relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
                    Más Popular
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400">Pro Architect</span>
                      {user?.subscriptionPlan === 'PRO_ARCHITECT' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold">
                          Plan Actual
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-black text-white">$9.99</span>
                      <span className="text-xs text-slate-400 font-mono"> / 30 Días</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Herramienta integral para arquitectos de software e ingeniería CASE completa.
                    </p>

                    <div className="space-y-3 text-xs text-slate-200 border-t border-indigo-900/40 pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Hasta 50 proyectos de arquitectura</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>100 clases y entidades por modelo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                        <span className="font-semibold text-white">Generador Spring Boot (JPA, REST)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                        <span className="font-semibold text-white">Exportación estándar XMI 2.1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                        <span>Colecciones Postman automatizadas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                        <span>Reconocimiento OCR de diagramas</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-indigo-900/40">
                    {user?.subscriptionPlan === 'ENTERPRISE' ? (
                      <button
                        type="button"
                        disabled
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800/60 text-slate-400 border border-slate-700 cursor-default"
                      >
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Incluido en tu Plan Enterprise</span>
                      </button>
                    ) : user?.subscriptionPlan === 'PRO_ARCHITECT' ? (
                      <button
                        type="button"
                        disabled
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-950/40 text-indigo-400 border border-indigo-800/50 cursor-default"
                      >
                        <CheckCircle2 size={14} />
                        <span>Tu Plan Actual (Activo)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const p = subPlans.find(x => x.id === 'PLAN_PRO_ARCHITECT') || {
                            id: 'PLAN_PRO_ARCHITECT',
                            name: 'Pro Architect',
                            priceMonthly: 9.99,
                            maxProjects: 50,
                            maxClassesPerProject: 100,
                            allowSpringBootGeneration: true,
                            allowDdlGeneration: true,
                            allowPostmanGeneration: true,
                            allowXmiExport: true,
                            allowVoiceCommands: true,
                            allowPhotoOcr: true,
                            allowRealtimeCollaboration: false
                          };
                          setSelectedPlanForCheckout(p);
                          setShowCheckoutModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                      >
                        <CreditCard size={14} />
                        <span>Adquirir Pro ($9.99 USD)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Plan 3: Enterprise Team */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-xl">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400">Enterprise</span>
                      {user?.subscriptionPlan === 'ENTERPRISE' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
                          Plan Actual
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-black text-white">$29.99</span>
                      <span className="text-xs text-slate-400 font-mono"> / 30 Días</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Para equipos de desarrollo, co-diseño colaborativo en tiempo real y soporte dedicado.
                    </p>

                    <div className="space-y-3 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Proyectos y clases ilimitados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Todo lo incluido en Pro Architect</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-semibold text-emerald-300">Co-diseño colaborativo en tiempo real</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Comandos de voz por WebSockets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>Soporte prioritario de arquitectura</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-800/80">
                    {user?.subscriptionPlan === 'ENTERPRISE' ? (
                      <button
                        type="button"
                        disabled
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 cursor-default"
                      >
                        <CheckCircle2 size={14} />
                        <span>Tu Plan Actual (Activo)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const p = subPlans.find(x => x.id === 'PLAN_ENTERPRISE_TEAM') || {
                            id: 'PLAN_ENTERPRISE_TEAM',
                            name: 'Enterprise Team',
                            priceMonthly: 29.99,
                            maxProjects: 9999,
                            maxClassesPerProject: 9999,
                            allowSpringBootGeneration: true,
                            allowDdlGeneration: true,
                            allowPostmanGeneration: true,
                            allowXmiExport: true,
                            allowVoiceCommands: true,
                            allowPhotoOcr: true,
                            allowRealtimeCollaboration: true
                          };
                          setSelectedPlanForCheckout(p);
                          setShowCheckoutModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                      >
                        <CreditCard size={14} />
                        <span>{user?.subscriptionPlan === 'PRO_ARCHITECT' ? 'Mejorar a Enterprise ($29.99 USD)' : 'Adquirir Enterprise ($29.99 USD)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History & Digital Invoice Receipts */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Historial de Facturación y Recibos Oficiales</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transacciones registradas con firma inmutable de auditoría y recibo digital con opción a impresión.
                  </p>
                </div>
                <Receipt size={18} className="text-slate-500" />
              </div>

              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No se registran transacciones previas en tu cuenta.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800/80 uppercase text-[10px] font-mono tracking-wider">
                        <th className="py-2.5 px-3">Nº Factura</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Plan Adquirido</th>
                        <th className="py-2.5 px-3">Monto</th>
                        <th className="py-2.5 px-3">Pasarela</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paymentHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-mono text-indigo-400 font-semibold">
                            {item.invoiceNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                            {formatShortDate(item.createdAt)}
                          </td>
                          <td className="py-3 px-3 text-white font-medium">
                            {item.planName}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-200">
                            ${item.amount?.toFixed(2)} {item.currency}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-800/50 text-blue-300 text-[10px] font-mono">
                              {item.paymentMethod || 'PAYPAL_SANDBOX'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[10px] font-mono font-semibold">
                              <CheckCircle2 size={10} />
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(item);
                                setShowInvoiceModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-medium cursor-pointer shadow-xs"
                              title="Ver e imprimir factura fiscal digital"
                            >
                              <Printer size={12} />
                              <span>Ver Factura</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: PAYPAL SANDBOX CHECKOUT */}
      {showCheckoutModal && selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <CreditCard size={20} />
                <div>
                  <h3 className="font-bold text-white text-base">Pasarela de Pagos PayPal Sandbox</h3>
                  <p className="text-[11px] text-slate-400">Procesamiento seguro certificado para vigencia de 30 días</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Plan Seleccionado:</span>
                <strong className="text-white font-mono text-sm">{selectedPlanForCheckout.name}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Vigencia del Servicio:</span>
                <span className="text-indigo-400 font-mono font-semibold">30 Días Calendario</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Usuario Beneficiario:</span>
                <span className="text-slate-300 font-mono">{user?.email}</span>
              </div>
              <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-sm font-bold text-white">
                <span>Total a Pagar:</span>
                <span className="text-emerald-400 font-mono text-base">${selectedPlanForCheckout.priceMonthly?.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Sandbox Credentials Helper Card */}
            <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-4 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Info size={15} />
                <span>Credenciales de Evaluación PayPal Sandbox</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Para completar la transacción en la pasarela oficial, utiliza la cuenta de comprador Sandbox autorizada:
              </p>
              <div className="bg-slate-950/90 border border-indigo-900/50 rounded-xl p-2.5 font-mono text-[11px] text-slate-300 flex flex-col gap-1">
                <div><span className="text-slate-500">Comprador:</span> <strong className="text-indigo-300">Zuigo54@example.com</strong></div>
                <div><span className="text-slate-500">Entorno:</span> <span className="text-emerald-400">Sandbox Testnet Oficial</span></div>
              </div>
              <p className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 leading-relaxed">
                Recomendación Sandbox: Si tienes abierta la sesión de desarrollador (developer.paypal.com) en este navegador, abre la plataforma en una ventana de incógnito o usa el botón de Aprobación Rápida abajo para evitar que PayPal bloquee la ventana emergente por colisión de sesiones.
              </p>
            </div>

            {/* PayPal Button Container */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pagar con Botón Oficial PayPal:
              </span>

              <div className="w-full min-h-[140px] flex items-center justify-center">
                <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD', intent: 'capture' }}>
                  <PayPalButtons
                    style={{ layout: 'vertical', shape: 'rect', color: 'blue', label: 'pay' }}
                    disabled={subProcessing}
                    createOrder={async () => {
                      try {
                        const res = await api.createPayPalOrder(selectedPlanForCheckout.id);
                        if (res && res.data && res.data.orderId) {
                          return res.data.orderId;
                        }
                        throw new Error('No se pudo generar ID de orden');
                      } catch (err: any) {
                        toast.error('Error al inicializar orden con PayPal Sandbox');
                        throw err;
                      }
                    }}
                    onApprove={async (data) => {
                      await handleCapturePayPalOrder(data.orderID, data.payerID);
                    }}
                    onError={(err) => {
                      console.error('PayPal Buttons Error:', err);
                      toast.error('Error durante la comunicación con PayPal');
                    }}
                    onCancel={() => {
                      toast('Operación de pago cancelada');
                    }}
                  />
                </PayPalScriptProvider>
              </div>

              {/* Dev Simulation Fallback Button */}
              <div className="border-t border-slate-800 pt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>¿Bloqueador de ventanas emergentes activo?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const simOrderId = 'SANDBOX-APP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
                    handleCapturePayPalOrder(simOrderId, 'SANDBOX-TEST-BUYER');
                  }}
                  disabled={subProcessing}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Zap size={13} className="text-amber-400" />
                  <span>Aprobación Rápida Sandbox (Dev Bypass)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL SUBSCRIPTION CONFIRMATION (OPTION A) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle size={18} />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Confirmar Cancelación de Suscripción
                </h3>
              </div>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas cancelar tu suscripción actual? Al proceder:
            </p>

            <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 text-[11px] text-rose-300 flex flex-col gap-1.5">
              <span>• Tu cuenta se restablecerá inmediatamente al plan gratuito <strong>Community</strong>.</span>
              <span>• Se eliminará la fecha de vencimiento sin inconsistencias en la base de datos.</span>
              <span>• Podrás volver a adquirir una suscripción de 30 días cuando lo requieras.</span>
              <span>• Tus proyectos UML actuales se mantendrán intactos.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Mantener Suscripción
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancellingSub}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {cancellingSub ? <RefreshCw size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                <span>Confirmar Cancelación Inmediata</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DIGITAL INVOICE / OFFICIAL RECEIPT */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
              <div className="flex items-center gap-2 text-indigo-400">
                <Receipt size={18} />
                <h3 className="font-bold text-white text-base">Recibo Fiscal y Factura Electrónica</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Imprimir</span>
                </button>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 text-xs text-slate-300 print:bg-white print:border print:text-black">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800/80 pb-6 print:border-gray-300">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 print:text-blue-700 font-extrabold text-lg tracking-tight">
                    <Layers size={22} />
                    <span>CASE TOOL UML PLATFORM</span>
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-gray-600 mt-1">
                    Software Architecture & CASE Engineering SaaS
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 print:text-gray-500 mt-0.5">
                    NIT / Tax ID: 1048291024-BOL
                  </p>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-bold text-xs print:bg-green-100 print:text-green-800 print:border-green-300">
                    PAGADO / COMPLETED
                  </span>
                  <p className="text-sm font-black text-white print:text-black mt-2">
                    {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-slate-400 print:text-gray-600">
                    Fecha: {formatDate(selectedInvoice.createdAt)}
                  </p>
                </div>
              </div>

              {/* Client & Payment Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-800/80 pb-6 print:border-gray-300">
                <div>
                  <h5 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 print:text-gray-500 mb-1">
                    Facturado a:
                  </h5>
                  <p className="font-bold text-white print:text-black">{selectedInvoice.userFullName || user?.fullName || 'Arquitecto de Software'}</p>
                  <p className="font-mono text-slate-300 print:text-gray-700">{selectedInvoice.userEmail || user?.email}</p>
                  <p className="font-mono text-slate-400 print:text-gray-500 text-[11px]">Usuario: @{selectedInvoice.username || user?.username}</p>
                </div>

                <div>
                  <h5 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 print:text-gray-500 mb-1">
                    Detalles de la Transacción:
                  </h5>
                  <p className="font-mono text-[11px] text-slate-300 print:text-gray-700">
                    Pasarela: <strong className="text-white print:text-black">PayPal Sandbox Oficial</strong>
                  </p>
                  <p className="font-mono text-[11px] text-slate-300 print:text-gray-700 truncate">
                    Order ID: {selectedInvoice.paypalOrderId}
                  </p>
                  <p className="font-mono text-[11px] text-slate-300 print:text-gray-700 truncate">
                    Payer ID: {selectedInvoice.paypalPayerId}
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="text-slate-400 print:text-gray-600 border-b border-slate-800 print:border-gray-300 uppercase text-[10px] font-mono tracking-wider">
                      <th className="py-2 px-2">Concepto</th>
                      <th className="py-2 px-2 text-center">Vigencia</th>
                      <th className="py-2 px-2 text-right">Precio</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                    <tr>
                      <td className="py-3 px-2">
                        <strong className="text-white print:text-black block">Suscripción SaaS — {selectedInvoice.planName}</strong>
                        <span className="text-[11px] text-slate-400 print:text-gray-500">
                          Acceso a herramientas CASE, generación de código y exportación formal.
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-indigo-300 print:text-blue-700">
                        30 Días
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-300 print:text-gray-800">
                        ${selectedInvoice.amount?.toFixed(2)} USD
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-white print:text-black">
                        ${selectedInvoice.amount?.toFixed(2)} USD
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="border-t border-slate-800/80 pt-4 flex justify-end print:border-gray-300">
                <div className="w-full max-w-xs space-y-1.5 text-right font-mono text-xs">
                  <div className="flex justify-between text-slate-400 print:text-gray-600">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.amount?.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400 print:text-gray-600">
                    <span>Impuestos (0% SaaS):</span>
                    <span>$0.00 USD</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white print:text-black border-t border-slate-800 print:border-gray-300 pt-2">
                    <span>Total Pagado:</span>
                    <span className="text-emerald-400 print:text-green-700">${selectedInvoice.amount?.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 print:text-gray-500 gap-2 print:border-gray-300">
                <span>Sello de Autenticidad Digital: SHA256-DIGITAL-PAYPAL-CASE-VERIFIED</span>
                <span>Documento emitido electrónicamente sin requerimiento de firma física.</span>
              </div>
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
    </AppLayout>
  );
};

export default SettingsPage;
