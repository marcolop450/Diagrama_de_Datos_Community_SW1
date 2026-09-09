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
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectHistoryModal } from '../components/history/ProjectHistoryModal';
import CreateProjectModal from '../components/modals/CreateProjectModal';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { project, loadDiagram, resetDiagram } = useDiagramStore();
  const navigate = useNavigate();

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <FolderKanban size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
                  {isColaborador ? 'Modelos UML Compartidos' : 'Mis Proyectos UML'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-950/60 border border-blue-800 text-blue-300">
                  {role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isColaborador 
                  ? 'Explora, audita y co-diseña los diagramas de clases asignados a tu cuenta.' 
                  : 'Gestión integral de modelos UML, control de versiones semánticas y trazabilidad histórica.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Actualizar proyectos"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
              <span>Actualizar</span>
            </button>

            {!isColaborador && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Nuevo Proyecto UML</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher: Proyectos Activos vs Papelera de Reciclaje */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('active');
              setCurrentPage(1);
              setSelectedTag('ALL');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'active'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-slate-800'
            }`}
          >
            <FolderKanban size={14} />
            <span>Proyectos Activos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('trash');
              setCurrentPage(1);
              setSelectedTag('ALL');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'trash'
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-slate-800'
            }`}
          >
            <RotateCcw size={14} />
            <span>Papelera de Reciclaje</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {trashProjects.length}
            </span>
          </button>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="flex flex-col md:flex-row gap-2.5 bg-slate-900/50 border border-slate-800/80 p-3 rounded-lg">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar proyectos por nombre, descripción o etiquetas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 rounded-md pl-8.5 pr-3 py-1.5 text-xs focus:outline-none transition-colors"
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
                className={`px-2 py-1 rounded text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTag === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
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
                  className={`px-2 py-1 rounded text-xs font-mono transition-all shrink-0 cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
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
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs text-slate-400">Cargando proyectos...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <FolderKanban size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">
              {activeTab === 'active' ? 'No se encontraron proyectos activos' : 'La papelera de reciclaje está vacía'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchTerm || selectedTag !== 'ALL'
                ? 'Prueba modificando tus términos de búsqueda o etiquetas filtradas.'
                : activeTab === 'active'
                  ? 'Comienza creando un nuevo proyecto UML con metadatos personalizados.'
                  : 'No existen proyectos eliminados en la papelera de reciclaje.'}
            </p>
            {activeTab === 'active' && !isColaborador && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Crear Primer Proyecto</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedProjects.map(proj => (
              <div 
                key={proj.id}
                className="flex flex-col justify-between bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-lg p-4 transition-all shadow-xs group overflow-hidden"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/60 border border-blue-800/60 text-blue-300 shrink-0">
                        {proj.version || 'v1.0.0'}
                      </span>
                      {proj.clonedFromId && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 border border-purple-800/60 text-purple-300 shrink-0">
                          <GitFork size={10} />
                          Fork
                        </span>
                      )}
                      {proj.isDeleted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950/60 border border-rose-800 text-rose-300 shrink-0">
                          En Papelera
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
                            className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                            title="Clonar proyecto"
                          >
                            <Copy size={13} />
                          </button>
                          
                          {!isColaborador && (
                            <button
                              onClick={() => {
                                setEditModalProject(proj);
                                setEditName(proj.name);
                                setEditDesc(proj.description || '');
                                setEditVersion(proj.version || 'v1.0.0');
                                setEditTags(Array.isArray(proj.tags) ? [...proj.tags] : []);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                              title="Editar metadatos"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => setHistoryModalProject(proj)}
                            className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                            title="Consultar historial y trazabilidad"
                          >
                            <History size={13} />
                          </button>

                          {!isColaborador && (
                            <button
                              onClick={() => setDeleteModalProject(proj)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                              title="Mover a papelera de reciclaje"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestoreProject(proj.id, proj.name)}
                            disabled={restoringId === proj.id}
                            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/80 rounded text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                            title="Restaurar proyecto"
                          >
                            <RotateCcw size={12} className={restoringId === proj.id ? 'animate-spin' : ''} />
                            <span>Restaurar</span>
                          </button>

                          <button
                            onClick={() => setHistoryModalProject(proj)}
                            className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                            title="Consultar historial y trazabilidad"
                          >
                            <History size={13} />
                          </button>

                          {!isColaborador && (
                            <button
                              onClick={() => setPurgeModalProject(proj)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer shrink-0"
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
                    className={`text-xs font-semibold text-slate-100 line-clamp-1 mb-1 ${activeTab === 'active' ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
                  >
                    {proj.name}
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[30px] mb-2.5 leading-relaxed">
                    {proj.description || 'Sin descripción detallada para este modelo.'}
                  </p>

                  {/* Tags */}
                  {Array.isArray(proj.tags) && proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {proj.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Layers size={12} className="text-blue-400" />
                      {proj.nodeCount ?? 0} clases
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <FileCode2 size={12} className="text-indigo-400" />
                      {proj.relationshipCount ?? 0} rels
                    </span>
                  </div>

                  {activeTab === 'active' && (
                    <button
                      onClick={() => handleOpenProject(proj.id, proj.name)}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Abrir</span>
                      <ChevronRight size={12} />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-5 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-100">Editar Metadatos del Proyecto</h2>
                </div>
                <button 
                  onClick={() => setEditModalProject(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleEditProject} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Versión Semántica
                    </label>
                    <input
                      type="text"
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Añadir Etiqueta
                    </label>
                    <input
                      type="text"
                      placeholder="Presiona Enter"
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={handleAddEditTag}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-md">
                    {editTags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                        #{t}
                        <button
                          type="button"
                          onClick={() => setEditTags(editTags.filter(x => x !== t))}
                          className="hover:text-rose-400 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditModalProject(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-5 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Copy size={16} className="text-blue-400" />
                  <h2 className="text-sm font-bold text-slate-100">Clonar Proyecto</h2>
                </div>
                <button 
                  onClick={() => setCloneModalProject(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCloneProject} className="flex flex-col gap-3.5">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Se realizará una bifurcación profunda del modelo <span className="text-slate-200 font-semibold">{cloneModalProject.name}</span>, duplicando atómicamente todas sus clases, atributos y relaciones relinkeadas con nuevos identificadores.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Nuevo Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setCloneModalProject(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-5 shadow-xl animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Mover a la Papelera</h2>
                  <p className="text-xs text-slate-400">Eliminación lógica y segura</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                ¿Estás seguro de que deseas enviar el proyecto <span className="font-semibold text-white">"{deleteModalProject.name}"</span> a la papelera? Podrás restaurarlo en cualquier momento desde la pestaña "Papelera de Reciclaje".
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteModalProject(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={submittingAction}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-rose-800/80 rounded-lg w-full max-w-md p-5 shadow-xl animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-rose-200">Eliminación Física Definitiva</h2>
                  <p className="text-xs text-rose-400 font-medium">Esta acción es irreversible</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Estás a punto de <span className="text-rose-400 font-bold">purgar definitivamente</span> el proyecto <span className="font-semibold text-white">"{purgeModalProject.name}"</span>.
                Se eliminarán de forma física e irrecuperable en PostgreSQL todas sus clases, relaciones y registros de historial.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPurgeModalProject(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePurgeProject}
                  disabled={submittingAction}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
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
      </div>
    </AppLayout>
  );
};

export default ProjectsPage;
