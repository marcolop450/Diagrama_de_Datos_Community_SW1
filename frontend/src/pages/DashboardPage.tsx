import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useDiagramStore } from '../stores/diagramStore';
import { api } from '../services/api';
import { DiagramProject } from '../types/diagram';
import { 
  ShieldCheck, 
  Users, 
  Layers, 
  FolderPlus, 
  ArrowRight, 
  Crown, 
  FolderKanban, 
  FileCode2, 
  RotateCcw, 
  History,
  Clock,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

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

  const [projects, setProjects] = useState<DiagramProject[]>([]);
  const [trashProjects, setTrashProjects] = useState<DiagramProject[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const role = user?.role || 'ARQUITECTO';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isColaborador = role === 'COLABORADOR';

  useEffect(() => {
    loadDashboardSummary();
  }, [role]);

  const loadDashboardSummary = async () => {
    try {
      setLoading(true);
      const [metricsRes, projRes, trashRes] = await Promise.all([
        isSuperAdmin ? api.getAdminMetrics() : Promise.resolve(null),
        api.getProjects(),
        api.getTrashProjects()
      ]);

      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (projRes?.data && Array.isArray(projRes.data)) {
        setProjects(projRes.data);
      } else {
        setProjects([]);
      }
      if (trashRes?.data && Array.isArray(trashRes.data)) {
        setTrashProjects(trashRes.data);
      } else {
        setTrashProjects([]);
      }
    } catch {
      toast.error('Error al cargar datos del Dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardSummary();
  };

  const handleOpenProject = (id: string, name: string) => {
    loadDiagram(id);
    navigate(`/editor/${id}`);
    toast.success(`Cargando modelo: ${name}`);
  };

  // Aggregated stats for Architect / Collaborator
  const totalClasses = projects.reduce((acc, p) => acc + (p.nodeCount || 0), 0);
  const totalRelations = projects.reduce((acc, p) => acc + (p.relationshipCount || 0), 0);
  const recentProjects = projects.slice(0, 4);

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-20">
        {/* Welcome Header */}
        <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 rounded-xl p-5 md:p-7 shadow-xs">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {isSuperAdmin ? <Crown size={12} className="text-purple-400" /> : <Sparkles size={12} />}
                  Rol: {role}
                </span>
                <span className="text-xs text-slate-500 font-mono">CASE Tool v1.0</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
                {isSuperAdmin 
                  ? 'Panel de Gobernanza y Supervisión Global'
                  : isColaborador 
                    ? `Bienvenido, ${user?.fullName || 'Colaborador'}` 
                    : `Bienvenido, ${user?.fullName || 'Arquitecto'}`}
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
                {isSuperAdmin 
                  ? 'Control centralizado de usuarios, supervisión global de modelos UML y auditoría de eventos de seguridad.'
                  : isColaborador 
                    ? 'Explora y co-diseña los diagramas de clases asignados a tu cuenta con persistencia y control de versiones.'
                    : 'Entorno de ingeniería CASE UML 2.5+: modelado de clases, trazabilidad histórica, validación de reglas TOM y generación de código Spring Boot.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Actualizar resumen"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-400' : ''} />
              </button>

              {!isSuperAdmin ? (
                <Link
                  to="/editor"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Layers size={14} />
                  <span>Abrir Lienzo CASE</span>
                </Link>
              ) : (
                <Link
                  to="/admin/audit"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-xs shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <History size={14} />
                  <span>Ver Bitácora Forense</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VISTA 1: SUPER_ADMIN RESUMEN DE GOBERNANZA                                */}
        {/* ========================================================================= */}
        {isSuperAdmin && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Link 
                to="/admin/users"
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 rounded-lg p-4 flex flex-col justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Usuarios Registrados</span>
                  <div className="w-7 h-7 rounded bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Users size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {metrics?.totalUsers ?? '...'}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {metrics?.totalActiveUsers ?? 0} activos
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-purple-300 transition-colors">
                  <span>Gestionar roles y cuentas</span>
                  <ChevronRight size={13} />
                </div>
              </Link>

              <Link 
                to="/admin/projects"
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 rounded-lg p-4 flex flex-col justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Modelos en Plataforma</span>
                  <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FolderKanban size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {projects.length}
                  </span>
                  <span className="text-[11px] text-blue-400 font-medium">
                    Activos
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-blue-300 transition-colors">
                  <span>Supervisar todos los proyectos</span>
                  <ChevronRight size={13} />
                </div>
              </Link>

              <Link 
                to="/admin/audit"
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 rounded-lg p-4 flex flex-col justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Bitácora Forense</span>
                  <div className="w-7 h-7 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <ShieldCheck size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-bold text-slate-100 font-mono">
                    Inmutable
                  </span>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    PostgreSQL
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-indigo-300 transition-colors">
                  <span>Consultar eventos y exportar</span>
                  <ChevronRight size={13} />
                </div>
              </Link>

              <Link 
                to="/admin/projects"
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 rounded-lg p-4 flex flex-col justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Papelera del Sistema</span>
                  <div className="w-7 h-7 rounded bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <RotateCcw size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {trashProjects.length}
                  </span>
                  <span className="text-[11px] text-rose-400 font-medium">
                    Recuperables
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-rose-300 transition-colors">
                  <span>Restaurar proyectos eliminados</span>
                  <ChevronRight size={13} />
                </div>
              </Link>
            </div>

            {/* Governance Direct Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-2">
              <Link
                to="/admin/projects"
                className="p-4 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-lg flex flex-col justify-between transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <FolderKanban size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Supervisión de Proyectos</h3>
                    <p className="text-xs text-slate-400">Auditoría y restauración de modelos</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Ver proyectos de la plataforma <ArrowRight size={13} />
                </span>
              </Link>

              <Link
                to="/admin/users"
                className="p-4 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-lg flex flex-col justify-between transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Gestión de Usuarios (RBAC)</h3>
                    <p className="text-xs text-slate-400">Roles, estados y accesos</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Administrar usuarios <ArrowRight size={13} />
                </span>
              </Link>

              <Link
                to="/admin/audit"
                className="p-4 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-lg flex flex-col justify-between transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Bitácora Global</h3>
                    <p className="text-xs text-slate-400">Filtros forenses y exportación Excel/CSV</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Ver registros de auditoría <ArrowRight size={13} />
                </span>
              </Link>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: ARQUITECTO & COLABORADOR RESUMEN DE MODELADO                     */}
        {/* ========================================================================= */}
        {!isSuperAdmin && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Link 
                to="/projects"
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 rounded-lg p-4 flex flex-col justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    {isColaborador ? 'Modelos Compartidos' : 'Mis Proyectos UML'}
                  </span>
                  <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FolderKanban size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {projects.length}
                  </span>
                  <span className="text-[11px] text-blue-400 font-medium">
                    Activos
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-blue-300 transition-colors">
                  <span>Gestionar todos los proyectos</span>
                  <ChevronRight size={13} />
                </div>
              </Link>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Clases Modeladas</span>
                  <div className="w-7 h-7 rounded bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Layers size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {totalClasses}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Entidades UML
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                  En todos tus proyectos
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Relaciones UML</span>
                  <div className="w-7 h-7 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <FileCode2 size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {totalRelations}
                  </span>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    Asociaciones
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                  Con cardinalidad y tipos
                </div>
              </div>

              <Link 
                to="/projects"
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/40 rounded-lg p-4 flex flex-col justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Papelera de Reciclaje</span>
                  <div className="w-7 h-7 rounded bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <RotateCcw size={15} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    {trashProjects.length}
                  </span>
                  <span className="text-[11px] text-rose-400 font-medium">
                    Recuperables
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-rose-300 transition-colors">
                  <span>Ver papelera</span>
                  <ChevronRight size={13} />
                </div>
              </Link>
            </div>

            {/* Quick Actions & Recent Projects Section */}
            <div className="flex flex-col gap-3.5 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Proyectos Recientes</h2>
                  <p className="text-xs text-slate-400">Últimos modelos de clases trabajados</p>
                </div>

                <Link
                  to="/projects"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <span>Ver todos ({projects.length})</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-blue-500" />
                  <span>Cargando modelos...</span>
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="p-7 bg-slate-900/30 border border-dashed border-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-400 mb-3">No tienes proyectos creados todavía.</p>
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <FolderPlus size={13} />
                    <span>Crear Proyecto en Proyectos UML</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {recentProjects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenProject(proj.id, proj.name)}
                      className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 rounded-lg flex flex-col justify-between transition-all cursor-pointer group shadow-xs overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 border border-blue-800/60 text-blue-300">
                            {proj.version || 'v1.0.0'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock size={11} />
                            {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'Reciente'}
                          </span>
                        </div>

                        <h3 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
                          {proj.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[30px] mb-2">
                          {proj.description || 'Sin descripción.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">{proj.nodeCount || 0} clases</span>
                        <span className="text-blue-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Abrir <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
