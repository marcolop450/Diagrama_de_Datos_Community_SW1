import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useDiagramStore } from '../stores/diagramStore';
import { api } from '../services/api';
import { DiagramProject } from '../types/diagram';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Layers, 
  FolderPlus, 
  ArrowRight, 
  Crown, 
  Search, 
  Tag, 
  Copy, 
  Edit3, 
  Trash2, 
  GitFork, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle,
  FolderKanban,
  FileCode2,
  Share2,
  ChevronLeft,
  ChevronRight
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
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');

  // Modals State (CU03)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectVersion, setNewProjectVersion] = useState('v1.0.0');
  const [newProjectTags, setNewProjectTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [cloneModalProject, setCloneModalProject] = useState<DiagramProject | null>(null);
  const [cloneName, setCloneName] = useState('');

  const [editModalProject, setEditModalProject] = useState<DiagramProject | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVersion, setEditVersion] = useState('v1.0.0');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  const [deleteModalProject, setDeleteModalProject] = useState<DiagramProject | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

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
        const [metricsRes, projRes] = await Promise.all([
          api.getAdminMetrics(),
          api.getProjects()
        ]);
        if (metricsRes?.data) setMetrics(metricsRes.data);
        if (projRes?.data && Array.isArray(projRes.data)) {
          setProjects(projRes.data);
        }
      } else {
        const projRes = await api.getProjects();
        if (projRes?.data && Array.isArray(projRes.data)) {
          setProjects(projRes.data);
        } else {
          setProjects([]);
        }
      }
    } catch {
      toast.error('Error al cargar datos del Dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Espacio de trabajo sincronizado');
  };

  // Dynamic tags list extracted from real projects
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));

      const matchTag =
        selectedTag === 'ALL' ||
        (p.tags && p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

      return matchSearch && matchTag;
    });
  }, [projects, searchTerm, selectedTag]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 6;

  // Reset to page 1 whenever searchTerm or selectedTag changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE));

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const handleOpenProject = (id: string, name: string) => {
    loadDiagram(id);
    navigate(`/editor/${id}`);
    toast.success(`Abriendo proyecto: ${name}`);
  };

  // --- Handlers CU03 ---

  // 1. Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error('El nombre del proyecto es obligatorio');
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        version: newProjectVersion.trim() || 'v1.0.0',
        tags: newProjectTags,
      });

      toast.success(res.message || 'Proyecto creado exitosamente');
      setIsCreateModalOpen(false);
      resetCreateForm();
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear el proyecto');
    } finally {
      setSubmittingAction(false);
    }
  };

  const resetCreateForm = () => {
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectVersion('v1.0.0');
    setNewProjectTags([]);
    setTagInput('');
  };

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !newProjectTags.includes(val) && newProjectTags.length < 10) {
      setNewProjectTags([...newProjectTags, val]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewProjectTags(newProjectTags.filter((t) => t !== tag));
  };

  // 2. Clone Project (Deep Clone)
  const handleOpenCloneModal = (e: React.MouseEvent, p: DiagramProject) => {
    e.stopPropagation();
    setCloneModalProject(p);
    setCloneName(`${p.name} (Copia)`);
  };

  const handleConfirmClone = async () => {
    if (!cloneModalProject) return;
    if (!cloneName.trim()) {
      toast.error('El nombre del clon es obligatorio');
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.cloneProject(cloneModalProject.id, cloneName.trim());
      toast.success(res.message || 'Proyecto clonado exitosamente con todas sus clases y relaciones');
      setCloneModalProject(null);
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al clonar el proyecto');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. Edit Metadata
  const handleOpenEditModal = (e: React.MouseEvent, p: DiagramProject) => {
    e.stopPropagation();
    setEditModalProject(p);
    setEditName(p.name);
    setEditDesc(p.description || '');
    setEditVersion(p.version || 'v1.0.0');
    setEditTags(Array.isArray(p.tags) ? [...p.tags] : []);
    setEditTagInput('');
  };

  const handleConfirmEdit = async () => {
    if (!editModalProject) return;
    if (!editName.trim()) {
      toast.error('El nombre del proyecto es obligatorio');
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.updateProject(editModalProject.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        version: editVersion.trim() || 'v1.0.0',
        tags: editTags,
      });

      toast.success(res.message || 'Metadatos del proyecto actualizados');
      setEditModalProject(null);
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar metadatos');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddEditTag = () => {
    const val = editTagInput.trim();
    if (val && !editTags.includes(val) && editTags.length < 10) {
      setEditTags([...editTags, val]);
      setEditTagInput('');
    }
  };

  const handleRemoveEditTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  // 4. Soft Delete Project
  const handleOpenDeleteModal = (e: React.MouseEvent, p: DiagramProject) => {
    e.stopPropagation();
    setDeleteModalProject(p);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalProject) return;

    try {
      setSubmittingAction(true);
      const res = await api.deleteProject(deleteModalProject.id);
      toast.success(res.message || 'Proyecto eliminado exitosamente');
      setDeleteModalProject(null);
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar el proyecto');
    } finally {
      setSubmittingAction(false);
    }
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
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Bienvenido, {user?.fullName || user?.username || 'Usuario'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {isSuperAdmin
                  ? 'Panel de control y gobernanza de la plataforma CASE. Como Administrador Principal, supervisas la gestión de usuarios, asignación de roles RBAC, bitácora de seguridad y salud del sistema.'
                  : isColaborador
                    ? 'Entorno de co-diseño colaborativo en tiempo real. Tienes acceso a los diagramas UML compartidos y sesiones activas de trabajo en equipo.'
                    : 'Entorno de ingeniería CASE para modelado UML de clases y relaciones, validación de reglas de normalización (1NF a 3NF), gestión de proyectos y generación de código Spring Boot.'}
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-850 border border-slate-700/80 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Sincronizar proyectos"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-400' : 'text-blue-400'} />
                <span>{refreshing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>

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
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <FolderPlus size={16} />
                    <span>Nuevo Proyecto UML</span>
                  </button>

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

        {/* 1. SUPER_ADMIN METRICS SECTION */}
        {isSuperAdmin && (
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
        )}

        {/* 2. PROYECTOS Y ESPACIOS DE TRABAJO (CU03) */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
                <FolderKanban size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {isSuperAdmin ? 'Proyectos en la Plataforma (Supervisión Global)' : 'Proyectos y Espacios de Trabajo'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin
                    ? 'Supervisión y auditoría de todos los modelos UML diseñados en la plataforma.'
                    : 'Gestión integral del ciclo de vida, clonación profunda y metadatos de diagramas UML.'}
                </p>
              </div>
            </div>

            {!isSuperAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Nuevo Proyecto</span>
              </button>
            )}
          </div>

          {/* Search Bar & Tag Chips Filter */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar proyectos por nombre, descripción o etiquetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder:text-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors"
              />
            </div>

            {/* Tag Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0 mr-1">
                <Tag size={12} /> Tags:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedTag === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                Todos ({projects.length})
              </button>

              {availableTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors shrink-0 cursor-pointer ${
                    selectedTag.toLowerCase() === t.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-500 animate-pulse font-mono text-xs flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-blue-400" />
                <span>Cargando proyectos desde PostgreSQL...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center gap-3">
                <FolderKanban size={32} className="text-slate-600" />
                <p className="text-xs max-w-sm">
                  {searchTerm || selectedTag !== 'ALL'
                    ? 'No se encontraron proyectos coincidentes con los filtros aplicados.'
                    : isSuperAdmin
                      ? 'No hay proyectos registrados en la plataforma actualmente.'
                      : 'No tienes proyectos aún. Comienza creando un nuevo proyecto UML o clonando una arquitectura base.'}
                </p>
                {!isSuperAdmin && !searchTerm && selectedTag === 'ALL' && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold cursor-pointer transition-all mt-1"
                  >
                    <FolderPlus size={14} />
                    <span>Crear Mi Primer Proyecto</span>
                  </button>
                )}
              </div>
            ) : (
              paginatedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj.id, proj.name)}
                  className="group bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer relative overflow-hidden"
                >
                  {/* Top: Icon + Version + Fork Badge + Owner / Actions */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                          <Layers size={14} />
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/50 shrink-0">
                          {proj.version || 'v1.0.0'}
                        </span>
                        {proj.clonedFromId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-950/60 text-purple-300 border border-purple-800/50 shrink-0" title="Proyecto bifurcado mediante clonación profunda">
                            <GitFork size={10} />
                            Clon
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Clone, Edit, Delete) ONLY for non-superadmin */}
                      {!isSuperAdmin ? (
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenCloneModal(e, proj)}
                            title="Clonar proyecto"
                            className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-950/60 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-purple-800/50"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(e, proj)}
                            title="Editar metadatos y tags"
                            className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-800/50"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDeleteModal(e, proj)}
                            title="Eliminar proyecto"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-800/50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0 max-w-[130px]"
                          title={`Propietario: ${proj.ownerName || 'Arquitecto'}`}
                        >
                          <Users size={11} className="text-purple-400 shrink-0" />
                          <span className="truncate">{proj.ownerName || 'Arquitecto'}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-white group-hover:text-blue-200 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.description || 'Espacio de trabajo UML sin descripción detallada.'}
                    </p>

                    {/* Tag Chips */}
                    {Array.isArray(proj.tags) && proj.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {proj.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800"
                          >
                            #{tag}
                          </span>
                        ))}
                        {proj.tags.length > 4 && (
                          <span className="text-[10px] font-mono text-slate-500">
                            +{proj.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Stats & Open Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Nodos de clases UML">
                        <FileCode2 size={12} className="text-blue-400" />
                        {proj.nodeCount !== undefined ? proj.nodeCount : 0} clases
                      </span>
                      <span className="flex items-center gap-1" title="Relaciones y cardinalidades">
                        <Share2 size={12} className="text-purple-400" />
                        {proj.relationshipCount !== undefined ? proj.relationshipCount : 0} rels
                      </span>
                    </div>

                    <span className="group-hover:text-blue-400 transition-colors flex items-center gap-1 text-[11px]">
                      {isSuperAdmin ? 'Inspeccionar' : 'Abrir'} <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {filteredProjects.length > PROJECTS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 font-mono">
              <span>
                Mostrando{' '}
                <strong className="text-white">
                  {(currentPage - 1) * PROJECTS_PER_PAGE + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-white">
                  {Math.min(currentPage * PROJECTS_PER_PAGE, filteredProjects.length)}
                </strong>{' '}
                de <strong className="text-white">{filteredProjects.length}</strong> proyectos
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: CREAR NUEVO PROYECTO (CU03)                        */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus size={18} className="text-blue-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Crear Nuevo Proyecto UML
                </h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nombre del Proyecto <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Sistema de Facturación Electrónica"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder:text-slate-600 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Descripción del Proyecto
                </label>
                <textarea
                  rows={3}
                  placeholder="Especificación de dominio, módulos principales y objetivos de diseño..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder:text-slate-600 rounded-xl p-3 text-xs focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Versión Semántica
                  </label>
                  <input
                    type="text"
                    value={newProjectVersion}
                    onChange={(e) => setNewProjectVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder:text-slate-600 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Etiquetas de Dominio (Tags)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="ej. Finanzas"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder:text-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-2.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Tag Badges List */}
              {newProjectTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  {newProjectTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-blue-300 bg-blue-950/60 border border-blue-800/50"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Crear Proyecto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CLONAR PROYECTO ÍNTEGRO (CU03 - Deep Clone)         */}
      {/* ============================================================ */}
      {cloneModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Copy size={18} className="text-purple-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Clonación Profunda de Proyecto
                </h3>
              </div>
              <button 
                onClick={() => setCloneModalProject(null)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción creará una copia idéntica e independiente del proyecto <span className="font-semibold text-white">{cloneModalProject.name}</span>, replicando íntegramente todas sus clases y relaciones re-vinculadas.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Nombre del Proyecto Clonado
              </label>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Nombre para el nuevo proyecto"
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setCloneModalProject(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClone}
                disabled={submittingAction}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                <span>Confirmar Clonación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: EDITAR METADATOS DEL PROYECTO (CU03)                */}
      {/* ============================================================ */}
      {editModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-blue-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Editar Metadatos del Proyecto
                </h3>
              </div>
              <button 
                onClick={() => setEditModalProject(null)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl p-3 text-xs focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Versión Semántica
                  </label>
                  <input
                    type="text"
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Agregar Tag
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEditTag();
                        }
                      }}
                      placeholder="Nuevo tag"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddEditTag}
                      className="px-2.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Tag Chips List */}
              {editTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  {editTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-blue-300 bg-blue-950/60 border border-blue-800/50"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditTag(t)}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setEditModalProject(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEdit}
                  disabled={submittingAction}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: CONFIRMAR ELIMINACIÓN LÓGICA (CU03)                 */}
      {/* ============================================================ */}
      {deleteModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-white text-sm sm:text-base">
                ¿Eliminar Proyecto UML?
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar el proyecto <span className="font-semibold text-white">{deleteModalProject.name}</span>? El proyecto será retirado de tu espacio de trabajo de manera segura.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setDeleteModalProject(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingAction}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
