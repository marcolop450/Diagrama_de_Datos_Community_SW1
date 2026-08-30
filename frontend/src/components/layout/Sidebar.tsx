import React, { useEffect, useState } from 'react';
import { 
  FolderPlus, 
  FolderGit2, 
  ChevronLeft, 
  Search, 
  Layers, 
  Database
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  updatedAt?: string;
}

const Sidebar: React.FC = () => {
  const { toggleSidebar, openModal } = useUiStore();
  const { project, loadDiagram } = useDiagramStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.getProjects();
      if (res && res.data && Array.isArray(res.data)) {
        setProjects(res.data);
        // If current project is not set, load the first one
        if (!project && res.data.length > 0) {
          loadDiagram(res.data[0].id);
        }
      }
    } catch {
      // Fallback default sample if backend is starting
      setProjects([
        { id: 'sample-1', name: 'Sistema de Gestión Académica', description: 'UML de entidades académicas universitarias' },
        { id: 'sample-2', name: 'Módulo de Facturación Electrónica', description: 'Modelo CASE con ventas y productos' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-full border-r border-slate-800/80 shadow-md select-none z-20">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-blue-400" />
          <h2 className="font-semibold text-xs text-slate-100 uppercase tracking-wider">Explorador</h2>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
          title="Ocultar barra lateral"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      
      <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Create Project Button */}
        <button 
          onClick={() => openModal('createProject')}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-3 rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-98"
        >
          <FolderPlus size={15} />
          <span>Nuevo Proyecto UML</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none transition-colors"
          />
        </div>
        
        {/* Projects List */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Mis Modelos</span>
            <span className="text-[10px] font-mono text-slate-400">{filteredProjects.length}</span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
              Cargando modelos...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
              No se encontraron proyectos
            </div>
          ) : (
            filteredProjects.map(proj => {
              const isSelected = project?.id === proj.id;
              return (
                <button 
                  key={proj.id}
                  onClick={() => {
                    loadDiagram(proj.id);
                    toast.success(`Cargado: ${proj.name}`);
                  }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left transition-all ${
                    isSelected 
                      ? 'bg-blue-600/15 border border-blue-500/40 text-blue-300 font-medium' 
                      : 'hover:bg-slate-900 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <FolderGit2 size={15} className={isSelected ? 'text-blue-400 mt-0.5 shrink-0' : 'text-slate-400 mt-0.5 shrink-0'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate leading-snug">{proj.name}</p>
                    {proj.description && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                        {proj.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Database size={13} className="text-emerald-400" />
          <span>Supabase PostgreSQL 17</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">SW1</span>
      </div>
    </aside>
  );
};

export default Sidebar;
