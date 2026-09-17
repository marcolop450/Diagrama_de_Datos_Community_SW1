import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  RefreshCw, 
  Edit3, 
  Power, 
  AlertTriangle, 
  Check, 
  X, 
  Crown, 
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminUserItem {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
}

interface AdminMetrics {
  totalUsers: number;
  totalSuperAdmins: number;
  totalArchitects: number;
  totalCollaborators: number;
  totalActiveUsers: number;
  totalInactiveUsers: number;
  totalProjects: number;
}

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('ARQUITECTO');
  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, metricsRes] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminMetrics()
      ]);

      if (usersRes?.data) {
        setUsers(usersRes.data);
      }
      if (metricsRes?.data) {
        setMetrics(metricsRes.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar usuarios y métricas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchRole = roleFilter === 'ALL' || u.role.toUpperCase() === roleFilter.toUpperCase();
      const matchStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && u.isActive) || 
        (statusFilter === 'INACTIVE' && !u.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleOpenRoleModal = (u: AdminUserItem) => {
    setRoleModalUser(u);
    setSelectedNewRole(u.role);
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    try {
      setSavingAction(true);
      const res = await api.updateUserRole(roleModalUser.id, selectedNewRole);
      toast.success(res.message || 'Rol actualizado exitosamente');
      setUsers(prev => prev.map(u => u.id === roleModalUser.id ? { ...u, role: selectedNewRole } : u));
      setRoleModalUser(null);
      // Refresh metrics
      const metricsRes = await api.getAdminMetrics();
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar rol');
    } finally {
      setSavingAction(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusModalUser) return;
    const newStatus = !statusModalUser.isActive;
    try {
      setSavingAction(true);
      const res = await api.updateUserStatus(statusModalUser.id, newStatus);
      toast.success(res.message || (newStatus ? 'Usuario reactivado' : 'Usuario suspendido'));
      setUsers(prev => prev.map(u => u.id === statusModalUser.id ? { ...u, isActive: newStatus } : u));
      setStatusModalUser(null);
      // Refresh metrics
      const metricsRes = await api.getAdminMetrics();
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al modificar estado');
    } finally {
      setSavingAction(false);
    }
  };

  const isSelfUser = (u: AdminUserItem): boolean => {
    if (!currentUser) return false;
    const matchUserId = Boolean(currentUser.userId && (currentUser.userId === u.userId || currentUser.userId === u.id));
    const matchEmail = Boolean(currentUser.email && currentUser.email.toLowerCase() === u.email.toLowerCase());
    const matchUsername = Boolean(currentUser.username && currentUser.username.toLowerCase() === u.username.toLowerCase());
    return matchUserId || matchEmail || matchUsername;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 flex flex-col gap-6 font-sans">
        {/* Title and Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242934] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xs">
                <ShieldAlert size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                Gestión de Usuarios y Roles
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Supervisión de cuentas registradas, administración de roles, estado de activación y gobernanza del sistema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#14171d] hover:bg-[#181c24] border border-[#242934] hover:border-[#2e3543] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : 'text-indigo-400'} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3.5 flex flex-col hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Usuarios</span>
              <Users size={15} className="text-slate-400" />
            </div>
            <span className="text-2xl font-bold font-display text-white">
              {metrics ? metrics.totalUsers : '-'}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">Registrados</span>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3.5 flex flex-col hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between text-indigo-300/80 mb-2">
              <span className="text-xs font-medium">Super Admins</span>
              <ShieldCheck size={15} className="text-indigo-400" />
            </div>
            <span className="text-2xl font-bold font-display text-indigo-200">
              {metrics ? metrics.totalSuperAdmins : '-'}
            </span>
            <span className="text-[10px] font-mono text-indigo-400/70 mt-1">Control Total</span>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3.5 flex flex-col hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between text-blue-300/80 mb-2">
              <span className="text-xs font-medium">Arquitectos</span>
              <Layers size={15} className="text-blue-400" />
            </div>
            <span className="text-2xl font-bold font-display text-blue-200">
              {metrics ? metrics.totalArchitects : '-'}
            </span>
            <span className="text-[10px] font-mono text-blue-400/70 mt-1">Modelado CASE</span>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3.5 flex flex-col hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between text-emerald-300/80 mb-2">
              <span className="text-xs font-medium">Colaboradores</span>
              <Users size={15} className="text-emerald-400" />
            </div>
            <span className="text-2xl font-bold font-display text-emerald-200">
              {metrics ? metrics.totalCollaborators : '-'}
            </span>
            <span className="text-[10px] font-mono text-emerald-400/70 mt-1">Co-diseño</span>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3.5 flex flex-col hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Cuentas Activas</span>
              <UserCheck size={15} className="text-emerald-400" />
            </div>
            <span className="text-2xl font-bold font-display text-emerald-400">
              {metrics ? metrics.totalActiveUsers : '-'}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">Habilitadas</span>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3.5 flex flex-col hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Suspendidos</span>
              <UserX size={15} className="text-rose-400" />
            </div>
            <span className="text-2xl font-bold font-display text-rose-400">
              {metrics ? metrics.totalInactiveUsers : '-'}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">Bloqueadas</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o correo electrónico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0f1115] border border-[#242934] focus:border-indigo-500 text-slate-100 placeholder:text-slate-500 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#0f1115] border border-[#242934] rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Filter size={13} className="text-slate-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#14171d] text-white">Todos los Roles</option>
                <option value="SUPER_ADMIN" className="bg-[#14171d] text-white">SUPER_ADMIN</option>
                <option value="ARQUITECTO" className="bg-[#14171d] text-white">ARQUITECTO</option>
                <option value="COLABORADOR" className="bg-[#14171d] text-white">COLABORADOR</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0f1115] border border-[#242934] rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#14171d] text-white">Todos los Estados</option>
                <option value="ACTIVE" className="bg-[#14171d] text-white">Solo Activos</option>
                <option value="INACTIVE" className="bg-[#14171d] text-white">Solo Suspendidos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#14171d] border border-[#242934] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0f1115] text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-[#242934]">
                  <th className="py-3.5 px-4 font-semibold">Usuario</th>
                  <th className="py-3.5 px-4 font-semibold">Correo Electrónico</th>
                  <th className="py-3.5 px-4 font-semibold">Rol Asignado</th>
                  <th className="py-3.5 px-4 font-semibold">Estado</th>
                  <th className="py-3.5 px-4 font-semibold">Fecha Alta</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242934]/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 animate-pulse font-mono">
                      Cargando directorio de usuarios...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      No se encontraron usuarios coincidentes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = isSelfUser(u);

                    return (
                      <tr 
                        key={u.id}
                        className={`transition-colors ${
                          isSelf ? 'bg-indigo-950/15 hover:bg-indigo-950/25' : 'hover:bg-[#181c24]'
                        }`}
                      >
                        {/* User info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#181c24] border border-[#2e3543] flex items-center justify-center font-bold text-slate-200 overflow-hidden shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-mono text-xs">{u.fullName?.charAt(0).toUpperCase() || 'U'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white truncate">{u.fullName}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                                    TÚ
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400 block truncate">
                                @{u.username || 'sin-username'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-300 font-mono">
                          {u.email}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                              : u.role === 'COLABORADOR'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          }`}>
                            {u.role === 'SUPER_ADMIN' ? <Crown size={11} /> : <ShieldCheck size={11} />}
                            {u.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Suspendido
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Reciente'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Change Role Button */}
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              disabled={isSelf}
                              title={isSelf ? "No puedes modificar tu propio rol" : "Modificar Rol RBAC"}
                              className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-[#242934] text-slate-600'
                                  : 'bg-[#181c24] hover:bg-[#1e232e] border-[#242934] hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 cursor-pointer'
                              }`}
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* Toggle Status Button */}
                            <button
                              onClick={() => setStatusModalUser(u)}
                              disabled={isSelf}
                              title={isSelf ? "No puedes suspender tu propia cuenta" : u.isActive ? "Suspender cuenta" : "Reactivar cuenta"}
                              className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-[#242934] text-slate-600'
                                  : u.isActive
                                    ? 'bg-[#181c24] hover:bg-rose-950/40 border-[#242934] hover:border-rose-500/40 text-rose-400 cursor-pointer'
                                    : 'bg-[#181c24] hover:bg-emerald-950/40 border-[#242934] hover:border-emerald-500/40 text-emerald-400 cursor-pointer'
                              }`}
                            >
                              <Power size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {roleModalUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#14171d] border border-[#242934] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#242934] pb-3">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-indigo-400" />
                <h3 className="font-bold text-white text-sm font-display">
                  Asignar Rol de Usuario
                </h3>
              </div>
              <button 
                onClick={() => setRoleModalUser(null)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Modificando privilegios para <span className="font-semibold text-white">{roleModalUser.fullName}</span> ({roleModalUser.email}).
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-300">Selecciona el nuevo rol:</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { 
                    role: 'SUPER_ADMIN', 
                    title: 'SUPER_ADMIN', 
                    desc: 'Acceso total a la gobernanza, supervisión de usuarios, auditoría y modelos.',
                    border: 'border-indigo-500/40 text-indigo-300'
                  },
                  { 
                    role: 'ARQUITECTO', 
                    title: 'ARQUITECTO', 
                    desc: 'Modelado CASE, generación de código Spring Boot, exportación XMI y diagramas propios.',
                    border: 'border-blue-500/40 text-blue-300'
                  },
                  { 
                    role: 'COLABORADOR', 
                    title: 'COLABORADOR', 
                    desc: 'Participación en diagramas asignados y sesiones de co-diseño colaborativo.',
                    border: 'border-emerald-500/40 text-emerald-300'
                  }
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedNewRole(item.role)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedNewRole === item.role
                        ? `bg-[#181c24] ${item.border} ring-1 ring-indigo-500/30`
                        : 'bg-[#0f1115] border-[#242934] hover:border-[#2e3543] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white font-mono">{item.title}</span>
                      {selectedNewRole === item.role && <Check size={14} className="text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#242934]">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-3.5 py-1.5 bg-[#181c24] hover:bg-[#1e232e] border border-[#242934] text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRole}
                disabled={savingAction}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingAction ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Guardar Rol</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Toggle Modal */}
      {statusModalUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#14171d] border border-[#242934] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-400 border-b border-[#242934] pb-3">
              <AlertTriangle size={18} />
              <h3 className="font-bold text-white text-sm sm:text-base font-display">
                {statusModalUser.isActive ? '¿Suspender Cuenta de Usuario?' : '¿Reactivar Cuenta de Usuario?'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {statusModalUser.isActive ? (
                <>
                  Al suspender la cuenta de <span className="font-semibold text-white">{statusModalUser.fullName}</span>, se revocará su capacidad de iniciar sesión en la plataforma de inmediato.
                </>
              ) : (
                <>
                  Al reactivar la cuenta de <span className="font-semibold text-white">{statusModalUser.fullName}</span>, el usuario podrá autenticarse nuevamente de manera normal.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#242934]">
              <button
                onClick={() => setStatusModalUser(null)}
                className="px-3.5 py-1.5 bg-[#181c24] hover:bg-[#1e232e] border border-[#242934] text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={savingAction}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
                  statusModalUser.isActive
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {savingAction ? <RefreshCw size={13} className="animate-spin" /> : <Power size={13} />}
                <span>{statusModalUser.isActive ? 'Confirmar Suspensión' : 'Confirmar Reactivación'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
};

export default AdminUsersPage;
