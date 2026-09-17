import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useDiagramStore } from '../stores/diagramStore';
import { api } from '../services/api';
import { DiagramProject } from '../types/diagram';
import { 
  FolderKanban, 
  FolderPlus, 
  Search, 
  Tag, 
  RefreshCw, 
  RotateCcw, 
  History,
  Layers, 
  FileCode2,
  Copy,
  Edit3,
  Trash2,
  GitFork,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Radio,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectHistoryModal } from '../components/history/ProjectHistoryModal';
import CreateProjectModal from '../components/modals/CreateProjectModal';
import { ImportModal } from '../components/modals/ImportModal';
import { useCollabStore } from '../stores/collabStore';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { project, loadDiagram, resetDiagram } = useDiagramStore();
  const { joinSession } = useCollabStore();
  const navigate = useNavigate();

  const [collabRoomCode, setCollabRoomCode] = useState('');
  const [isJoiningCollab, setIsJoiningCollab] = useState(false);

  const [projects, setProjects] = useState<DiagramProject[]>([]);
  const [trashProjects, setTrashProjects] = useState<DiagramProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  // Trash & History State (CU05)
  const [historyModalProject, setHistoryModalProject] = useState<DiagramProject | null>(null);
  const [purgeModalProject, setPurgeModalProject] = useState<DiagramProject | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const role = user?.role || 'ARQUITECTO';
  const isColaborador = role === 'COLABORADOR';

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const [projRes, trashRes] = await Promise.all([
        api.getProjects(),
        api.getTrashProjects()
      ]);

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
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  // Open in editor
  const handleOpenProject = (id: string, name: string) => {
    loadDiagram(id);
    navigate(`/editor/${id}`);
    toast.success(`Cargando proyecto: ${name}`);
  };

  // Join live collaboration directly
  const handleJoinCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabRoomCode.trim()) {
      toast.error('Ingresa el código de sala (ej. SW1-902)');
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

  // Edit Project
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalProject || !editName.trim()) return;

    try {
      setSubmittingAction(true);
      await api.updateProject(editModalProject.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        version: editVersion.trim(),
        tags: editTags
      });

      toast.success('Metadatos actualizados');
      setEditModalProject(null);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el proyecto');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Clone Project
  const handleCloneProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneModalProject || !cloneName.trim()) return;

    try {
      setSubmittingAction(true);
      const res = await api.cloneProject(cloneModalProject.id, cloneName.trim());

      toast.success(`Proyecto "${cloneName}" clonado exitosamente`);
      setCloneModalProject(null);
      setCloneName('');
      await loadProjects();

      if (res?.data?.id) {
        handleOpenProject(res.data.id, res.data.name);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al clonar el proyecto');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Soft Delete Project (Move to Trash)
  const handleDeleteProject = async () => {
    if (!deleteModalProject) return;

    try {
      setSubmittingAction(true);
      await api.deleteProject(deleteModalProject.id);
      if (localStorage.getItem('case_last_project_id') === deleteModalProject.id) {
        localStorage.removeItem('case_last_project_id');
      }
      if (project?.id === deleteModalProject.id) {
        resetDiagram();
      }
      toast.success(`Proyecto "${deleteModalProject.name}" movido a la papelera`);
      setDeleteModalProject(null);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar el proyecto');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Restore Project from Trash
  const handleRestoreProject = async (id: string, name: string) => {
    try {
      setRestoringId(id);
      await api.restoreProject(id);
      toast.success(`Proyecto "${name}" restaurado exitosamente`);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al restaurar el proyecto');
    } finally {
      setRestoringId(null);
    }
  };

  // Hard Delete Project (Physical Purge in PostgreSQL)
  const handlePurgeProject = async () => {
    if (!purgeModalProject) return;

    try {
      setSubmittingAction(true);
      await api.purgeProject(purgeModalProject.id);
      if (localStorage.getItem('case_last_project_id') === purgeModalProject.id) {
        localStorage.removeItem('case_last_project_id');
      }
      if (project?.id === purgeModalProject.id) {
        resetDiagram();
      }
      toast.success(`Proyecto "${purgeModalProject.name}" eliminado permanentemente`);
      setPurgeModalProject(null);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar definitivamente el proyecto');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Tags helpers
  const handleAddEditTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editTagInput.trim()) {
      e.preventDefault();
      const clean = editTagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (clean && !editTags.includes(clean)) {
        setEditTags([...editTags, clean]);
      }
      setEditTagInput('');
    }
  };

  // Available tags
  const currentList = activeTab === 'active' ? projects : trashProjects;

  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    currentList.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (t && typeof t === 'string' && t.trim().length > 0) {
            tagsSet.add(t.trim());
          }
        });
      }
    });
    return Array.from(tagsSet);
  }, [currentList]);

  // Filtered list
  const filteredProjects = useMemo(() => {
    return currentList.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesTag = selectedTag === 'ALL' || (Array.isArray(p.tags) && p.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [currentList, searchTerm, selectedTag]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-20">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#242934] pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FolderKanban size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">
                  {isColaborador ? 'Modelos UML Compartidos y Práctica' : 'Mis Proyectos UML'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  {role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                {isColaborador 
                  ? 'Modelos de práctica propios y diagramas de clases compartidos para co-diseño en equipo.' 
                  : 'Gestión integral de modelos UML, control de versiones semánticas y trazabilidad histórica.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#14171d] hover:bg-[#181c24] border border-[#242934] text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 font-sans"
              title="Actualizar proyectos"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
              <span>Actualizar</span>
            </button>

            {!isColaborador && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#14171d] hover:bg-[#181c24] text-slate-200 border border-[#242934] hover:border-emerald-500/40 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer font-sans"
                title="Importar modelo desde archivo OMG XMI 2.1 (ArchiTec, StarUML, EA)"
              >
                <Upload size={14} className="text-emerald-400" />
                <span>Importar XMI</span>
              </button>
            )}

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer font-sans"
              title={isColaborador ? 'Crear modelo UML para práctica' : 'Crear nuevo proyecto UML'}
            >
              <FolderPlus size={14} />
              <span>{isColaborador ? 'Nuevo Proyecto (Práctica)' : 'Nuevo Proyecto UML'}</span>
            </button>
          </div>
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
                  Unirse a Pizarra Compartida en Vivo
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                  WSS Activo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                Ingresa el código de sesión (ej. SW1-902) para conectarte en vivo a la pizarra UML con chat y sincronización en tiempo real.
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

        {/* Tab Switcher: Proyectos Activos vs Papelera de Reciclaje */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setActiveTab('active');
              setCurrentPage(1);
              setSelectedTag('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border font-sans ${
              activeTab === 'active'
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#14171d] border-[#242934]'
            }`}
          >
            <FolderKanban size={14} />
            <span>Proyectos Activos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181c24] border border-[#242934] text-slate-300">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('trash');
              setCurrentPage(1);
              setSelectedTag('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border font-sans ${
              activeTab === 'trash'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#14171d] border-[#242934]'
            }`}
          >
            <RotateCcw size={14} />
            <span>Papelera de Reciclaje</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181c24] border border-[#242934] text-slate-300">
              {trashProjects.length}
            </span>
          </button>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 bg-[#14171d]/90 border border-[#242934] p-3.5 rounded-xl shadow-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar proyectos por nombre, descripción o etiquetas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#0f1115] border border-[#242934] text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 rounded-lg pl-9 pr-3.5 py-2 text-xs focus:outline-none transition-colors font-sans"
            />
          </div>

          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <Tag size={13} className="text-slate-500 shrink-0 ml-1" />
              <button
                onClick={() => {
                  setSelectedTag('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer font-sans ${
                  selectedTag === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#0f1115] text-slate-400 hover:text-slate-200 border border-[#242934]'
                }`}
              >
                Todos ({currentList.length})
              </button>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[#0f1115] text-slate-400 hover:text-slate-200 border border-[#242934]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <span className="text-xs text-slate-400 font-sans">Cargando proyectos...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#14171d]/50 border border-dashed border-[#242934] rounded-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#181c24] border border-[#242934] flex items-center justify-center text-slate-500 mb-3">
              <FolderKanban size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-display">
              {activeTab === 'active' ? 'No se encontraron proyectos activos' : 'La papelera de reciclaje está vacía'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 font-sans">
              {searchTerm || selectedTag !== 'ALL'
                ? 'Prueba modificando tus términos de búsqueda o etiquetas filtradas.'
                : activeTab === 'active'
                  ? 'Comienza creando un nuevo proyecto UML con metadatos personalizados.'
                  : 'No existen proyectos eliminados en la papelera de reciclaje.'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md font-sans"
              >
                <FolderPlus size={14} />
                <span>{isColaborador ? 'Crear Modelo de Práctica' : 'Crear Primer Proyecto'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProjects.map(proj => (
              <div 
                key={proj.id}
                className="flex flex-col justify-between bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl p-5 transition-all shadow-sm group overflow-hidden"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shrink-0">
                        {proj.version || 'v1.0.0'}
                      </span>
                      {proj.clonedFromId && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 shrink-0">
                          <GitFork size={10} />
                          Fork
                        </span>
                      )}
                      {proj.isDeleted && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300 shrink-0">
                          En Papelera
                        </span>
                      )}
                      {proj.ownerName && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 font-sans ${
                          proj.ownerId === user?.userId
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                            : 'bg-[#181c24] border border-[#242934] text-slate-300'
                        }`}>
                          {proj.ownerId === user?.userId ? 'Anfitrión (Tú)' : `Host: ${proj.ownerName}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      {activeTab === 'active' ? (
                        <>
                          <button
                            onClick={() => {
                              setCloneModalProject(proj);
                              setCloneName(`${proj.name} Copia`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430] rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Clonar proyecto"
                          >
                            <Copy size={13} />
                          </button>
                          
                          {(proj.ownerId ? proj.ownerId === user?.userId : !isColaborador) && (
                            <button
                              onClick={() => {
                                setEditModalProject(proj);
                                setEditName(proj.name);
                                setEditDesc(proj.description || '');
                                setEditVersion(proj.version || 'v1.0.0');
                                setEditTags(Array.isArray(proj.tags) ? [...proj.tags] : []);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-[#1f2430] rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Editar metadatos"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => setHistoryModalProject(proj)}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430] rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Consultar historial y trazabilidad"
                          >
                            <History size={13} />
                          </button>

                          {(proj.ownerId ? proj.ownerId === user?.userId : !isColaborador) && (
                            <button
                              onClick={() => setDeleteModalProject(proj)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1f2430] rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Mover a papelera de reciclaje"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {(proj.ownerId ? proj.ownerId === user?.userId : !isColaborador) && (
                            <button
                              onClick={() => handleRestoreProject(proj.id, proj.name)}
                              disabled={restoringId === proj.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                              title="Restaurar proyecto"
                            >
                              <RotateCcw size={12} className={restoringId === proj.id ? 'animate-spin' : ''} />
                              <span>Restaurar</span>
                            </button>
                          )}

                          <button
                            onClick={() => setHistoryModalProject(proj)}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430] rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Consultar historial y trazabilidad"
                          >
                            <History size={13} />
                          </button>

                          {(proj.ownerId ? proj.ownerId === user?.userId : !isColaborador) && (
                            <button
                              onClick={() => setPurgeModalProject(proj)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Eliminar definitivamente"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <h3 
                    onClick={() => activeTab === 'active' && handleOpenProject(proj.id, proj.name)}
                    className={`text-sm font-bold text-slate-100 line-clamp-1 mb-1 font-sans ${activeTab === 'active' ? 'cursor-pointer hover:text-indigo-400 transition-colors' : ''}`}
                  >
                    {proj.name}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-3 leading-relaxed font-sans">
                    {proj.description || 'Sin descripción detallada para este modelo.'}
                  </p>

                  {/* Tags */}
                  {Array.isArray(proj.tags) && proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {proj.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0f1115] text-slate-400 border border-[#242934]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-[#242934]/70 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Layers size={13} className="text-indigo-400" />
                      {proj.nodeCount ?? 0} clases
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <FileCode2 size={13} className="text-indigo-400" />
                      {proj.relationshipCount ?? 0} rels
                    </span>
                  </div>

                  {activeTab === 'active' && (
                    <button
                      onClick={() => handleOpenProject(proj.id, proj.name)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Abrir</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
            <div className="text-xs text-slate-400 font-mono">
              Página {currentPage} de {totalPages} ({filteredProjects.length} proyectos)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* MODAL 1: Crear Proyecto desde Plantilla Base */}
        <CreateProjectModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={loadProjects} 
        />

        {/* MODAL 2: Editar Metadatos */}
        {editModalProject && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-[#14171d] border border-[#242934] rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-[#242934] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Edit3 size={16} />
                  </div>
                  <h2 className="text-base font-bold text-white font-display">Editar Metadatos del Proyecto</h2>
                </div>
                <button 
                  onClick={() => setEditModalProject(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditProject} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#0f1115] border border-[#242934] text-white focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none transition-colors font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-[#0f1115] border border-[#242934] text-white focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none resize-none transition-colors font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">
                      Versión Semántica
                    </label>
                    <input
                      type="text"
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      className="w-full bg-[#0f1115] border border-[#242934] text-white focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">
                      Añadir Etiqueta
                    </label>
                    <input
                      type="text"
                      placeholder="Presiona Enter"
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={handleAddEditTag}
                      className="w-full bg-[#0f1115] border border-[#242934] text-white focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#0f1115] border border-[#242934] rounded-xl">
                    {editTags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        #{t}
                        <button
                          type="button"
                          onClick={() => setEditTags(editTags.filter(x => x !== t))}
                          className="hover:text-rose-400 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#242934] mt-2">
                  <button
                    type="button"
                    onClick={() => setEditModalProject(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer font-sans"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer active:scale-98 font-sans"
                  >
                    {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 3: Clonación Profunda */}
        {cloneModalProject && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-[#14171d] border border-[#242934] rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-[#242934] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Copy size={16} />
                  </div>
                  <h2 className="text-base font-bold text-white font-display">Clonar Proyecto</h2>
                </div>
                <button 
                  onClick={() => setCloneModalProject(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCloneProject} className="flex flex-col gap-4">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Se realizará una bifurcación profunda del modelo <span className="text-white font-semibold">{cloneModalProject.name}</span>, duplicando atómicamente todas sus clases, atributos y relaciones relinkeadas con nuevos identificadores.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">
                    Nombre del Nuevo Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    className="w-full bg-[#0f1115] border border-[#242934] text-white focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none transition-colors font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#242934] mt-2">
                  <button
                    type="button"
                    onClick={() => setCloneModalProject(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer font-sans"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer active:scale-98 font-sans"
                  >
                    {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Confirmar y Abrir Copia</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 4: Eliminar Proyecto (Mover a la Papelera) */}
        {deleteModalProject && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-[#14171d] border border-[#242934] rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-display">Mover a la Papelera</h2>
                  <p className="text-xs text-slate-400 font-sans">Eliminación lógica reversible</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-5 font-sans">
                ¿Estás seguro de que deseas enviar el proyecto <span className="font-semibold text-white">"{deleteModalProject.name}"</span> a la papelera? Podrás restaurarlo en cualquier momento desde la pestaña "Papelera de Reciclaje".
              </p>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#242934]">
                <button
                  type="button"
                  onClick={() => setDeleteModalProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={submittingAction}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer active:scale-98 font-sans"
                >
                  {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>Mover a Papelera</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 5: Purga Definitiva */}
        {purgeModalProject && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-[#14171d] border border-rose-800/60 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-rose-200 font-display">Eliminación Física Definitiva</h2>
                  <p className="text-xs text-rose-400/90 font-medium font-sans">Esta acción es irreversible</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-5 font-sans">
                Estás a punto de <span className="text-rose-400 font-bold">purgar definitivamente</span> el proyecto <span className="font-semibold text-white">"{purgeModalProject.name}"</span>.
                Se eliminarán de forma física e irrecuperable en PostgreSQL todas sus clases, relaciones y registros de historial.
              </p>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#242934]">
                <button
                  type="button"
                  onClick={() => setPurgeModalProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePurgeProject}
                  disabled={submittingAction}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer active:scale-98 font-sans"
                >
                  {submittingAction ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>Sí, Eliminar Definitivamente</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* History Modal (CU05) */}
        {historyModalProject && (
          <ProjectHistoryModal
            isOpen={!!historyModalProject}
            onClose={() => setHistoryModalProject(null)}
            projectId={historyModalProject.id}
            projectName={historyModalProject.name}
          />
        )}

        {/* Import XMI Modal (CU12) */}
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            loadProjects();
          }}
        />
      </div>
    </AppLayout>
  );
};

export default ProjectsPage;
