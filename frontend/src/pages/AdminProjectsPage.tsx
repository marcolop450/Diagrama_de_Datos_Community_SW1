import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { api } from '../services/api';
import { DiagramProject } from '../types/diagram';
import { 
  FolderKanban, 
  Search, 
  Tag, 
  RefreshCw, 
  RotateCcw, 
  History,
  Clock,
  Layers,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectHistoryModal } from '../components/history/ProjectHistoryModal';

export const AdminProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<DiagramProject[]>([]);
  const [trashProjects, setTrashProjects] = useState<DiagramProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  // Modal & Action State
  const [historyModalProject, setHistoryModalProject] = useState<DiagramProject | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

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
      toast.error('Error al cargar proyectos de la plataforma');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
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
            <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 shadow-xs">
              <FolderKanban size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
                  Proyectos en la Plataforma
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-950/60 border border-purple-800 text-purple-300">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Supervisión global, auditoría y recuperación de todos los modelos UML diseñados en la plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Actualizar proyectos"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-purple-400' : 'text-slate-400'} />
              <span>Actualizar</span>
            </button>
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
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-xs'
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
        <div className="flex flex-col md:flex-row gap-3 bg-slate-900/40 border border-slate-800/80 p-3 rounded-lg">
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
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 rounded-md pl-9 pr-3 py-1.5 text-xs focus:outline-none transition-colors"
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
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedTag === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
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
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informative Governance Alert */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 text-slate-400 rounded-lg text-xs">
          <ShieldAlert size={15} className="text-purple-400 shrink-0" />
          <span>
            {activeTab === 'active'
              ? 'Como Administrador Principal, puedes auditar cualquier proyecto y consultar su historial completo de mutaciones.'
              : 'En la papelera de reciclaje, el Administrador tiene autorización exclusiva para restaurar proyectos; la purga física definitiva está restringida al propietario.'}
          </span>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={24} className="animate-spin text-purple-400" />
            <span className="text-xs text-slate-400">Cargando proyectos de la plataforma...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-900/20 border border-dashed border-slate-800 rounded-lg text-center">
            <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-xs">
              <FolderKanban size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">
              {activeTab === 'active' ? 'No se encontraron proyectos activos' : 'La papelera de reciclaje está vacía'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchTerm || selectedTag !== 'ALL'
                ? 'Prueba modificando tus términos de búsqueda o etiquetas filtradas.'
                : activeTab === 'active'
                  ? 'No hay modelos UML registrados actualmente en la base de datos.'
                  : 'No existen proyectos marcados como eliminados en la plataforma.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProjects.map(proj => (
              <div 
                key={proj.id}
                className="flex flex-col justify-between bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-lg p-4 transition-all shadow-xs overflow-hidden"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-purple-950/60 border border-purple-800/60 text-purple-300 shrink-0">
                        {proj.version || 'v1.0.0'}
                      </span>
                      {proj.isDeleted && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-950/60 border border-rose-800 text-rose-300 shrink-0">
                          En Papelera
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      {/* Restore Button (Available in Trash) */}
                      {activeTab === 'trash' && (
                        <button
                          onClick={() => handleRestoreProject(proj.id, proj.name)}
                          disabled={restoringId === proj.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/80 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                          title="Restaurar proyecto a proyectos activos"
                        >
                          <RotateCcw size={12} className={restoringId === proj.id ? 'animate-spin' : ''} />
                          <span>Restaurar</span>
                        </button>
                      )}

                      {/* History Button (CU05) */}
                      <button
                        onClick={() => setHistoryModalProject(proj)}
                        className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Consultar historial y trazabilidad"
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-1">
                    {proj.name}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-3">
                    {proj.description || 'Sin descripción detallada para este modelo.'}
                  </p>

                  {/* Tags */}
                  {Array.isArray(proj.tags) && proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {proj.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
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

                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                    <Clock size={11} />
                    <span>{proj.ownerName || 'Usuario'}</span>
                  </div>
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

export default AdminProjectsPage;
