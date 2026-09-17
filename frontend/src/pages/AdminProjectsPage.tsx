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
  ChevronRight
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#242934] pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FolderKanban size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">
                  Proyectos en la Plataforma
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Supervisión global, auditoría y recuperación de todos los modelos UML diseñados en la plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#14171d] hover:bg-[#181c24] border border-[#242934] text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 font-sans"
              title="Actualizar proyectos"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
              <span>Actualizar</span>
            </button>
          </div>
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
            <span className="text-xs text-slate-400 font-sans">Cargando proyectos de la plataforma...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#14171d]/50 border border-dashed border-[#242934] rounded-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#181c24] border border-[#242934] flex items-center justify-center text-slate-500 mb-3 shadow-xs">
              <FolderKanban size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-display">
              {activeTab === 'active' ? 'No se encontraron proyectos activos' : 'La papelera de reciclaje está vacía'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 font-sans">
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
                className="flex flex-col justify-between bg-[#14171d]/90 hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/40 rounded-xl p-5 transition-all shadow-sm overflow-hidden"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shrink-0">
                        {proj.version || 'v1.0.0'}
                      </span>
                      {proj.isDeleted && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300 shrink-0">
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
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                          title="Restaurar proyecto a proyectos activos"
                        >
                          <RotateCcw size={12} className={restoringId === proj.id ? 'animate-spin' : ''} />
                          <span>Restaurar</span>
                        </button>
                      )}

                      {/* History Button (CU05) */}
                      <button
                        onClick={() => setHistoryModalProject(proj)}
                        className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430] rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Consultar historial y trazabilidad"
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 line-clamp-1 mb-1 font-sans">
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
