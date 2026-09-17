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
  Sparkles,
  Radio,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollabStore } from '../stores/collabStore';

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
  const { joinSession } = useCollabStore();
  const navigate = useNavigate();

  const [collabRoomCode, setCollabRoomCode] = useState('');
  const [isJoiningCollab, setIsJoiningCollab] = useState(false);

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

  const handleJoinCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabRoomCode.trim()) {
      toast.error('Por favor ingresa el código de sala (ej. SW1-902)');
      return;
    }
    const cleanCode = collabRoomCode.trim().toUpperCase();
    setIsJoiningCollab(true);
    try {
      const success = await joinSession(cleanCode);
      if (success) {
        const activeSession = useCollabStore.getState().session;
        if (activeSession?.projectId) {
          navigate(`/editor/${activeSession.projectId}`);
        } else {
          navigate('/editor');
        }
      }
    } finally {
      setIsJoiningCollab(false);
    }
  };

  // Aggregated stats for Architect / Collaborator
  const totalClasses = projects.reduce((acc, p) => acc + (p.nodeCount || 0), 0);
  const totalRelations = projects.reduce((acc, p) => acc + (p.relationshipCount || 0), 0);
  const recentProjects = projects.slice(0, 4);

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-20">
        {/* Welcome Header */}
        <div className="relative overflow-hidden bg-[#141721]/90 border border-[#242938] rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {isSuperAdmin ? <Crown size={12} className="text-purple-400" /> : <Sparkles size={12} />}
                  Rol: {role}
                </span>
                <span className="text-xs text-slate-500 font-mono">CASE Studio</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">
                {isSuperAdmin 
                  ? 'Panel de Gobernanza y Supervisión Global'
                  : isColaborador 
                    ? `Bienvenido, ${user?.fullName || 'Colaborador'}` 
                    : `Bienvenido, ${user?.fullName || 'Arquitecto'}`}
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed font-sans">
                {isSuperAdmin 
                  ? 'Control centralizado de usuarios, supervisión global de modelos UML y auditoría de eventos de seguridad.'
                  : isColaborador 
                    ? 'Explora y co-diseña los diagramas de clases asignados a tu cuenta con persistencia y control de versiones.'
                    : 'Entorno de ingeniería CASE UML 2.5+: modelado de clases, trazabilidad histórica, validación relacional y generación de código Spring Boot.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-[#141721] hover:bg-[#1a1e2b] border border-[#242938] text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Actualizar resumen"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
              </button>

              {!isSuperAdmin ? (
                <Link
                  to="/editor"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:brightness-110 shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer font-sans"
                >
                  <Layers size={15} />
                  <span>Abrir Lienzo CASE</span>
                </Link>
              ) : (
                <Link
                  to="/admin/audit"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:brightness-110 shadow-lg shadow-purple-600/25 transition-all active:scale-95 cursor-pointer font-sans"
                >
                  <History size={15} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                to="/admin/users"
                className="bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Usuarios Registrados</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {metrics?.totalUsers ?? '...'}
                  </span>
                  <span className="text-[11px] text-emerald-400/90 font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {metrics?.totalActiveUsers ?? 0} activos
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors font-sans">
                  <span>Gestionar roles y cuentas</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              <Link 
                to="/admin/projects"
                className="bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Modelos en Plataforma</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FolderKanban size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {projects.length}
                  </span>
                  <span className="text-[11px] text-indigo-300 font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    Activos
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors font-sans">
                  <span>Supervisar todos los proyectos</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              <Link 
                to="/admin/audit"
                className="bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Bitácora Forense</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-white font-display">
                    Inmutable
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    PostgreSQL
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors font-sans">
                  <span>Consultar eventos y exportar</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              <Link 
                to="/admin/projects"
                className="bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-rose-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Papelera del Sistema</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <RotateCcw size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {trashProjects.length}
                  </span>
                  <span className="text-[11px] text-rose-400 font-mono font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    Recuperables
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-rose-300 transition-colors font-sans">
                  <span>Restaurar proyectos eliminados</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </div>

            {/* Governance Direct Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <Link
                to="/admin/projects"
                className="p-5 bg-[#14171d]/80 hover:bg-[#181c24] border border-[#242934] hover:border-[#373e4f] rounded-xl flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <FolderKanban size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">Supervisión de Proyectos</h3>
                    <p className="text-xs text-slate-400 font-sans">Auditoría y restauración de modelos</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-sans">
                  Ver proyectos de la plataforma <ArrowRight size={13} />
                </span>
              </Link>

              <Link
                to="/admin/users"
                className="p-5 bg-[#14171d]/80 hover:bg-[#181c24] border border-[#242934] hover:border-[#373e4f] rounded-xl flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">Gestión de Usuarios (RBAC)</h3>
                    <p className="text-xs text-slate-400 font-sans">Roles, estados y accesos</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-sans">
                  Administrar usuarios <ArrowRight size={13} />
                </span>
              </Link>

              <Link
                to="/admin/audit"
                className="p-5 bg-[#14171d]/80 hover:bg-[#181c24] border border-[#242934] hover:border-[#373e4f] rounded-xl flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">Bitácora Global</h3>
                    <p className="text-xs text-slate-400 font-sans">Filtros forenses y exportación inmutable</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-sans">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                to="/projects"
                className="bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">
                    {isColaborador ? 'Modelos Compartidos' : 'Mis Proyectos UML'}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FolderKanban size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {projects.length}
                  </span>
                  <span className="text-[11px] text-indigo-300 font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    Activos
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors font-sans">
                  <span>Gestionar todos los proyectos</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              <div className="bg-[#14171d]/90 border border-[#242934] rounded-xl p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Clases Modeladas</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {totalClasses}
                  </span>
                  <span className="text-[11px] text-emerald-400/90 font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    Entidades UML
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 text-[11px] text-slate-500 font-sans">
                  En todos tus proyectos
                </div>
              </div>

              <div className="bg-[#14171d]/90 border border-[#242934] rounded-xl p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Relaciones UML</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FileCode2 size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {totalRelations}
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    Asociaciones
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 text-[11px] text-slate-500 font-sans">
                  Con cardinalidad y tipos
                </div>
              </div>

              <Link 
                to="/projects"
                className="bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-rose-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 font-sans">Papelera de Reciclaje</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <RotateCcw size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-white font-display">
                    {trashProjects.length}
                  </span>
                  <span className="text-[11px] text-rose-400 font-mono font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    Recuperables
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-rose-300 transition-colors font-sans">
                  <span>Ver papelera</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </div>

            {/* Live Collaboration Quick Join Card (CU18) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#14171d]/90 border border-[#242934] shadow-xl relative overflow-hidden flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shadow-inner shrink-0">
                  <Radio className="w-5 h-5 animate-pulse text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-bold text-white tracking-wide font-display">
                      Unirse a Sala Colaborativa en Vivo
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                      WSS Activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                    Ingresa el código de sesión (ej. SW1-902) proporcionado por el Arquitecto para sincronizarte en tiempo real con bloqueo optimista y chat en vivo.
                  </p>
                </div>
              </div>

              <form 
                onSubmit={handleJoinCollabSubmit}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto shrink-0"
              >
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    value={collabRoomCode}
                    onChange={(e) => setCollabRoomCode(e.target.value.toUpperCase())}
                    placeholder="SW1-XXX"
                    maxLength={10}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0f1115] border border-[#242934] text-white placeholder-slate-500 font-mono text-center text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 transition-all shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoiningCollab}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/90 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 active:scale-98 font-sans"
                >
                  {isJoiningCollab ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Radio className="w-4 h-4" />
                  )}
                  <span>{isJoiningCollab ? 'Conectando...' : 'Unirse a la Sala'}</span>
                </button>
              </form>
            </div>

            {/* Quick Actions & Recent Projects Section */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white font-display">Proyectos Recientes</h2>
                  <p className="text-xs text-slate-400 font-sans">Últimos modelos de clases trabajados</p>
                </div>

                <Link
                  to="/projects"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-sans"
                >
                  <span>Ver todos ({projects.length})</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="py-14 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-sans">
                  <RefreshCw size={15} className="animate-spin text-indigo-500" />
                  <span>Cargando modelos...</span>
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="p-8 bg-[#14171d]/60 border border-dashed border-[#242934] rounded-2xl text-center">
                  <p className="text-xs text-slate-400 mb-4 font-sans">No tienes proyectos creados todavía.</p>
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-98 cursor-pointer font-sans"
                  >
                    <FolderPlus size={14} />
                    <span>Crear Proyecto en Proyectos UML</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recentProjects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenProject(proj.id, proj.name)}
                      className="p-4 bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl flex flex-col justify-between transition-all cursor-pointer group shadow-sm overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                            {proj.version || 'v1.0.0'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock size={11} />
                            {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'Reciente'}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1 font-sans">
                          {proj.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[32px] mb-3 leading-relaxed font-sans">
                          {proj.description || 'Sin descripción.'}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                        <span className="font-mono text-slate-400">{proj.nodeCount || 0} clases</span>
                        <span className="text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
