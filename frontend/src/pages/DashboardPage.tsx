import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useDiagramStore } from '../stores/diagramStore';
import { api } from '../services/api';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Layers, 
  FolderPlus, 
  ArrowRight, 
  Crown, 
  Clock, 
  CheckCircle2,
  FolderGit2,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  updatedAt?: string;
}

interface AdminUserItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
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

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { loadDiagram } = useDiagramStore();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role || 'ARQUITECTO';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isColaborador = role === 'COLABORADOR';

  useEffect(() => {
    loadDashboardData();
  }, [role]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (isSuperAdmin) {
        // SuperAdmin: Load Governance metrics and users
        const [metricsRes, usersRes] = await Promise.all([
          api.getAdminMetrics(),
          api.getAdminUsers()
        ]);
        if (metricsRes?.data) setMetrics(metricsRes.data);
        if (usersRes?.data) setAdminUsers(usersRes.data.slice(0, 5));
      } else {
        // Architect or Collaborator: Load UML projects
        const projRes = await api.getProjects();
        if (projRes?.data && Array.isArray(projRes.data)) {
          setProjects(projRes.data);
        } else {
          setProjects([
            { id: 'sample-1', name: 'Sistema de Gestión Académica', description: 'UML de entidades académicas universitarias' },
            { id: 'sample-2', name: 'Módulo de Facturación Electrónica', description: 'Modelo CASE con ventas y productos' },
          ]);
        }
      }
    } catch {
      if (!isSuperAdmin) {
        setProjects([
          { id: 'sample-1', name: 'Sistema de Gestión Académica', description: 'UML de entidades académicas universitarias' },
          { id: 'sample-2', name: 'Módulo de Facturación Electrónica', description: 'Modelo CASE con ventas y productos' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = (id: string, name: string) => {
    loadDiagram(id);
    navigate(`/editor/${id}`);
    toast.success(`Abriendo proyecto: ${name}`);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        {/* Welcome & Role Capabilities Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800/80 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border ${
                  isSuperAdmin
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : isColaborador
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}>
                  {isSuperAdmin ? <Crown size={12} /> : <ShieldCheck size={12} />}
                  Espacio: {role}
                </span>

                <Link
                  to="/settings?tab=subscription"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group"
                  title="Gestionar suscripción y facturación"
                >
                  <Sparkles size={11} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
                  <span>Plan: {user?.subscriptionPlan || 'COMMUNITY'}</span>
                </Link>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Bienvenido, {user?.fullName || user?.username || 'Usuario'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {isSuperAdmin
                  ? 'Panel de control y gobernanza de la plataforma CASE. Como Administrador Principal, supervisas la gestión de usuarios, asignación de roles RBAC, bitácora de seguridad y salud del sistema.'
                  : isColaborador
                    ? 'Entorno de co-diseño colaborativo en tiempo real. Tienes acceso a los diagramas UML compartidos y sesiones activas de trabajo en equipo.'
                    : 'Entorno de ingeniería CASE para modelado UML de clases y relaciones, validación de reglas de normalización (1NF a 3NF) y generación de código Spring Boot.'}
              </p>
            </div>

            {/* Quick Actions (Strictly filtered by role) */}
            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin ? (
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <ShieldAlert size={16} />
                  <span>Gestionar Usuarios (RBAC)</span>
                </Link>
              ) : (
                <>
                  {!isColaborador && (
                    <button
                      onClick={() => navigate('/editor')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <FolderPlus size={16} />
                      <span>Nuevo Proyecto UML</span>
                    </button>
                  )}

                  <Link
                    to="/editor"
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  >
                    <Layers size={16} className="text-blue-400" />
                    <span>Abrir Lienzo CASE</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 1. SUPER_ADMIN CONTENT: GOVERNANCE METRICS + USER PREVIEW + SYSTEM HEALTH */}
        {isSuperAdmin && (
          <>
            {/* Global Metrics Cards */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-purple-400" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Métricas de Gobernanza y Usuarios
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col">
                  <span className="text-xs font-medium text-slate-400">Total Usuarios</span>
                  <span className="text-2xl font-bold font-mono text-white mt-2">
                    {metrics ? metrics.totalUsers : '-'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Registrados en PostgreSQL</span>
                </div>

                <div className="bg-slate-900/40 border border-purple-900/40 rounded-2xl p-4 flex flex-col">
                  <span className="text-xs font-medium text-purple-300">Super Admins</span>
                  <span className="text-2xl font-bold font-mono text-purple-200 mt-2">
                    {metrics ? metrics.totalSuperAdmins : '-'}
                  </span>
                  <span className="text-[10px] text-purple-400/70 mt-1">Control RBAC</span>
                </div>

                <div className="bg-slate-900/40 border border-blue-900/40 rounded-2xl p-4 flex flex-col">
                  <span className="text-xs font-medium text-blue-300">Arquitectos</span>
                  <span className="text-2xl font-bold font-mono text-blue-200 mt-2">
                    {metrics ? metrics.totalArchitects : '-'}
                  </span>
                  <span className="text-[10px] text-blue-400/70 mt-1">Modelado CASE</span>
                </div>

                <div className="bg-slate-900/40 border border-emerald-900/40 rounded-2xl p-4 flex flex-col">
                  <span className="text-xs font-medium text-emerald-300">Colaboradores</span>
                  <span className="text-2xl font-bold font-mono text-emerald-200 mt-2">
                    {metrics ? metrics.totalCollaborators : '-'}
                  </span>
                  <span className="text-[10px] text-emerald-400/70 mt-1">Co-diseñadores</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col">
                  <span className="text-xs font-medium text-slate-400">Cuentas Activas</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                    {metrics ? metrics.totalActiveUsers : '-'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Acceso Permitido</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col">
                  <span className="text-xs font-medium text-slate-400">Suspendidos</span>
                  <span className="text-2xl font-bold font-mono text-rose-400 mt-2">
                    {metrics ? metrics.totalInactiveUsers : '-'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Bloqueados</span>
                </div>
              </div>
            </section>

            {/* Quick User Directory Preview */}
            <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Directorio Rápido de Usuarios
                  </h3>
                </div>
                <Link
                  to="/admin/users"
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 group transition-colors"
                >
                  <span>Ver directorio completo</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 font-mono text-[11px] uppercase border-b border-slate-800/60 pb-2">
                      <th className="py-2">Nombre Completo</th>
                      <th className="py-2">Usuario</th>
                      <th className="py-2">Correo</th>
                      <th className="py-2">Rol RBAC</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {adminUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-850/40">
                        <td className="py-2.5 text-white font-medium">{u.fullName}</td>
                        <td className="py-2.5 font-mono text-slate-400">@{u.username}</td>
                        <td className="py-2.5 text-slate-300 font-mono">{u.email}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                              : u.role === 'COLABORADOR'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {u.isActive ? (
                            <span className="text-emerald-400 text-[11px] font-mono">Activo</span>
                          ) : (
                            <span className="text-rose-400 text-[11px] font-mono">Suspendido</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* 2. ARQUITECTO & COLABORADOR: UML PROJECTS GALLERY */}
        {!isSuperAdmin && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 size={18} className="text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isColaborador ? 'Modelos Compartidos Conmigo' : 'Mis Modelos UML Recientes'}
                </h2>
              </div>

              <Link
                to="/editor"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>Ir al Lienzo CASE</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full py-12 text-center text-slate-500 animate-pulse font-mono text-xs">
                  Cargando proyectos desde PostgreSQL...
                </div>
              ) : projects.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No hay proyectos registrados aún. Comienza creando un nuevo proyecto UML.
                </div>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj.id, proj.name)}
                    className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                          <Layers size={16} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-400 flex items-center gap-1">
                          Abrir <ArrowRight size={11} />
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-white group-hover:text-blue-200 transition-colors line-clamp-1 mt-1">
                        {proj.name}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {proj.description || 'Modelo de clases UML para persistencia y arquitectura de software.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'Activo'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={11} />
                        Sincronizado
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* 3. CAPABILITIES & PRIVILEGES SUMMARY TABLE */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-white">
                Matriz de Permisos RBAC de la Cuenta
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Rol asignado: <strong className="text-white">{role}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className={`p-4 rounded-xl border ${
              isSuperAdmin ? 'bg-purple-950/20 border-purple-800/50 text-purple-200' : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <Crown size={14} className={isSuperAdmin ? 'text-purple-400' : 'text-slate-600'} />
                <span>SUPER_ADMIN</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Gobernanza de la plataforma, control de usuarios, asignación de roles RBAC, suspensión de accesos y auditoría de eventos.
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${
              !isSuperAdmin && !isColaborador ? 'bg-blue-950/20 border-blue-800/50 text-blue-200' : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <Layers size={14} className={!isSuperAdmin && !isColaborador ? 'text-blue-400' : 'text-slate-600'} />
                <span>ARQUITECTO</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Diseño de diagramas de clases UML, validación de normalización 1NF a 3NF, generación de código Spring Boot y exportación XMI.
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${
              isColaborador ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200' : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <Users size={14} className={isColaborador ? 'text-emerald-400' : 'text-slate-600'} />
                <span>COLABORADOR</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Participación en diagramas compartidos, edición colaborativa en tiempo real mediante WebSockets y co-diseño de arquitectura.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
