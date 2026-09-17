import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Collaborator, CreateCollaboratorData } from '../types/collaborator';
import { 
  Users2, 
  UserPlus, 
  UserCheck, 
  Search, 
  RefreshCw, 
  Power, 
  Mail, 
  Radio, 
  Copy, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Key, 
  Shield, 
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CollaboratorsPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateCollaboratorData>({
    fullName: '',
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const res = await api.getArchitectCollaborators();
      if (res?.data && Array.isArray(res.data)) {
        setCollaborators(res.data);
      } else {
        setCollaborators([]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar los colaboradores de tu equipo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCollaborators();
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
    setShowPassword(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (formData.username.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createArchitectCollaborator({
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (res?.data) {
        toast.success(`Colaborador ${res.data.fullName} registrado con éxito en tu equipo`);
        setCollaborators(prev => [res.data, ...prev]);
        setIsCreateModalOpen(false);
        setFormData({ fullName: '', username: '', email: '', password: '' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar colaborador');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (collab: Collaborator) => {
    try {
      setActionInProgressId(collab.id);
      const res = await api.toggleCollaboratorStatus(collab.id);
      if (res?.data) {
        setCollaborators(prev => prev.map(c => c.id === collab.id ? res.data : c));
        toast.success(
          res.data.isActive 
            ? `Colaborador ${collab.fullName} reactivado` 
            : `Colaborador ${collab.fullName} suspendido temporalmente`
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al modificar estado del colaborador');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCopyCredentials = (collab: Collaborator) => {
    const text = `Credenciales de acceso a CASE Tool UML:\nURL: ${window.location.origin}/login\nUsuario: ${collab.username}\nCorreo: ${collab.email}`;
    navigator.clipboard.writeText(text);
    setCopiedId(collab.id);
    toast.success('Datos de acceso copiados al portapapeles');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = collaborators.length;
    const active = collaborators.filter(c => c.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [collaborators]);

  // Filtered list
  const filtered = useMemo(() => {
    return collaborators.filter(c => {
      if (statusFilter === 'ACTIVE' && !c.isActive) return false;
      if (statusFilter === 'INACTIVE' && c.isActive) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = c.fullName?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchUser = c.username?.toLowerCase().includes(q);
        return matchName || matchEmail || matchUser;
      }
      return true;
    });
  }, [collaborators, search, statusFilter]);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-7xl mx-auto flex flex-col gap-6 select-none font-sans">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#242934] pb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
                Gestión de Colaboradores
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Shield size={12} />
                <span>Equipo de {currentUser?.fullName || 'Arquitecto'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registra a los ingenieros colaboradores de tu equipo, supervisa sus accesos y asígnalos a sesiones de modelado concurrente.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171d] hover:bg-[#181c24] border border-[#242934] hover:border-[#2e3543] text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Actualizar colaboradores"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Registrar Colaborador</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl border border-[#242934] bg-[#14171d] flex items-center justify-between transition-all hover:border-[#2e3543]">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Total Colaboradores
              </span>
              <h3 className="text-2xl font-bold font-display text-white mt-0.5">
                {metrics.total}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Miembros en tu equipo</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users2 size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#242934] bg-[#14171d] flex items-center justify-between transition-all hover:border-[#2e3543]">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                Colaboradores Activos
              </span>
              <h3 className="text-2xl font-bold font-display text-emerald-300 mt-0.5">
                {metrics.active}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Con acceso al sistema</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#242934] bg-[#14171d] flex items-center justify-between transition-all hover:border-[#2e3543]">
            <div>
              <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">
                Salas en Vivo
              </span>
              <h3 className="text-2xl font-bold font-display text-indigo-300 mt-0.5">
                WSS STOMP
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Sincronización en tiempo real</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Radio size={20} className="animate-pulse" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 rounded-2xl border border-[#242934] bg-[#14171d] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, usuario o email..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#0f1115] border border-[#242934] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto w-full sm:w-auto">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Estado:</span>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  statusFilter === tab
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c24] border-[#242934]'
                }`}
              >
                {tab === 'ALL' ? 'Todos' : tab === 'ACTIVE' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>

        {/* Collaborators Table & Cards */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3 font-mono">
            <RefreshCw size={24} className="animate-spin text-indigo-400" />
            <span>Cargando colaboradores de tu equipo...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-4 rounded-2xl border border-dashed border-[#242934] bg-[#14171d] text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#0f1115] border border-[#242934] flex items-center justify-center text-slate-500 mb-1">
              <Users2 size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 font-display">
              No se encontraron colaboradores
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {search 
                ? 'Ningún colaborador coincide con tus términos de búsqueda.' 
                : 'Aún no has registrado colaboradores en tu equipo. Haz clic en el botón superior para agregar a tu primer ingeniero colaborador.'}
            </p>
            {!search && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Registrar Primer Colaborador</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#242934] bg-[#14171d] overflow-hidden shadow-xs">
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#242934] bg-[#0f1115] text-slate-400 uppercase tracking-wider font-mono font-semibold text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">Colaborador</th>
                    <th className="py-3.5 px-4 font-semibold">Correo Electrónico</th>
                    <th className="py-3.5 px-4 font-semibold">Arquitecto</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 px-4 font-semibold">Fecha de Registro</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242934]/60">
                  {filtered.map(collab => (
                    <tr 
                      key={collab.id}
                      className="hover:bg-[#181c24] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#181c24] border border-[#2e3543] flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 font-mono">
                            {collab.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate">
                              {collab.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              @{collab.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Mail size={12} className="text-slate-500 shrink-0" />
                          <span className="truncate">{collab.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-[10px]">
                          {collab.architectName || 'Tú'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                          collab.isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${collab.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {collab.isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(collab.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy credentials button */}
                          <button
                            onClick={() => handleCopyCredentials(collab)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-[#181c24] border border-transparent hover:border-[#242934] transition-colors cursor-pointer"
                            title="Copiar datos de acceso para el colaborador"
                          >
                            {copiedId === collab.id ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          {/* Toggle Active status */}
                          <button
                            onClick={() => handleToggleStatus(collab)}
                            disabled={actionInProgressId === collab.id}
                            className={`p-1.5 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#242934] ${
                              collab.isActive 
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30' 
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                            }`}
                            title={collab.isActive ? 'Suspender acceso temporalmente' : 'Reactivar acceso al colaborador'}
                          >
                            {actionInProgressId === collab.id ? (
                              <Loader2 size={14} className="animate-spin text-indigo-400" />
                            ) : (
                              <Power size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Registrar Nuevo Colaborador */}
        {isCreateModalOpen && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="max-w-md w-full rounded-2xl border border-[#242934] bg-[#14171d] shadow-2xl p-6 relative flex flex-col gap-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#242934]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">
                      Registrar Nuevo Colaborador
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Asigna credenciales a un ingeniero de tu equipo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181c24] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Ej. Ing. Carlos Mendoza"
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1115] border border-[#242934] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre de Usuario *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">@</span>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                      placeholder="cmendoza"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0f1115] border border-[#242934] text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="carlos.mendoza@empresa.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1115] border border-[#242934] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Password with generator & reveal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Contraseña Inicial *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Key size={11} />
                      <span>Generar segura</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 pr-10 py-2 rounded-xl bg-[#0f1115] border border-[#242934] text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Role Confirmation Note */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2 mt-1">
                  <Shield size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    El colaborador quedará automáticamente vinculado a tu cuenta como Arquitecto responsable y con permisos de modelado ágil.
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242934]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-[#181c24] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} />
                        <span>Crear Cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </AppLayout>
  );
};

export default CollaboratorsPage;
