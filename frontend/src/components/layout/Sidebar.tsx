import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FolderPlus, 
  FolderGit2, 
  ChevronLeft, 
  Search, 
  Layers, 
  Database,
  LayoutDashboard,
  ShieldAlert,
  History,
  Users2,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useAuthStore } from '../../stores/authStore';
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
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || 'ARQUITECTO';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isColaborador = role === 'COLABORADOR';

  useEffect(() => {
    // Only fetch projects if the user is an Architect or Collaborator (Admin does not model UML)
    if (!isSuperAdmin) {
      fetchProjects();
    }
  }, [isSuperAdmin]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.getProjects();
      if (res && res.data && Array.isArray(res.data)) {
        setProjects(res.data);
        if (!project && res.data.length > 0 && location.pathname.startsWith('/editor')) {
          loadDiagram(res.data[0].id);
        }
      }
    } catch {
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
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-full border-r border-slate-800/80 shadow-md select-none z-20 font-sans">
      {/* Role-adaptive Sidebar Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <ShieldAlert size={16} />
            </div>
          ) : isColaborador ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Users2 size={16} />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Layers size={16} />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-xs text-slate-100 uppercase tracking-wider leading-none">
              {isSuperAdmin ? 'Gobernanza' : isColaborador ? 'Co-Diseño' : 'Arquitectura'}
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              {role}
            </span>
          </div>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
          title="Ocultar barra lateral"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Role-based Navigation Links */}
      <div className="p-3 border-b border-slate-800/60 flex flex-col gap-1">
        {/* 1. SUPER_ADMIN NAV */}
        {isSuperAdmin ? (
          <>
            <Link
              to="/dashboard"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/dashboard'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <LayoutDashboard size={15} className="shrink-0 text-purple-400" />
              <span>Dashboard General</span>
            </Link>

            <Link
              to="/admin/users"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/admin/users'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <ShieldCheck size={15} className="text-purple-400 shrink-0" />
              <span>Gestión de Usuarios (RBAC)</span>
            </Link>

            <button
              onClick={() => toast('Módulo de Auditoría Global activo en CU04')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors text-left cursor-pointer border border-transparent"
            >
              <History size={15} className="shrink-0 text-slate-500" />
              <span>Bitácora de Auditoría</span>
            </button>
          </>
        ) : (
          /* 2. ARQUITECTO & COLABORADOR NAV */
          <>
            <Link
              to="/dashboard"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/dashboard'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <LayoutDashboard size={15} className="shrink-0 text-blue-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/editor"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname.startsWith('/editor')
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Layers size={15} className="shrink-0 text-blue-400" />
              <span>Lienzo CASE</span>
            </Link>
          </>
        )}
      </div>
      
      {/* Center Section:
          - For SUPER_ADMIN: Governance & Security info
          - For ARQUITECTO / COLABORADOR: UML Projects list & Create Project */}
      {isSuperAdmin ? (
        <div className="p-4 flex-1 flex flex-col gap-3">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-purple-400">
              <Server size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Infraestructura</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Consola central de supervisión. Las herramientas de modelado y dibujo UML están reservadas para los roles de Arquitecto y Colaborador.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">
          {/* Create Project Button (Architect only) */}
          {!isColaborador && (
            <button 
              onClick={() => openModal('createProject')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-3 rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-98 cursor-pointer"
            >
              <FolderPlus size={15} />
              <span>Nuevo Proyecto UML</span>
            </button>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar modelos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 rounded-xl pl-8 pr-2.5 py-1.5 text-xs focus:outline-none transition-colors"
            />
          </div>
          
          {/* Projects List */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {isColaborador ? 'Modelos Compartidos' : 'Mis Modelos UML'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredProjects.length}
              </span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                Cargando modelos...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-xs border border-dashed border-slate-800 text-slate-500 rounded-xl">
                No se encontraron proyectos
              </div>
            ) : (
              filteredProjects.map(proj => {
                const isSelected = project?.id === proj.id && location.pathname.startsWith('/editor');
                return (
                  <button 
                    key={proj.id}
                    onClick={() => {
                      loadDiagram(proj.id);
                      if (!location.pathname.startsWith('/editor')) {
                        navigate(`/editor/${proj.id}`);
                      }
                      toast.success(`Cargado: ${proj.name}`);
                    }}
                    className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/15 border border-blue-500/40 text-blue-300 font-medium' 
                        : 'hover:bg-slate-900 text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <FolderGit2 size={15} className={isSelected ? 'text-blue-400 mt-0.5 shrink-0' : 'text-slate-500 mt-0.5 shrink-0'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate leading-snug">{proj.name}</p>
                      {proj.description && (
                        <p className="text-[10px] truncate mt-0.5 font-normal text-slate-400">
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
      )}
      
      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 text-slate-400 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Database size={13} className="text-emerald-500" />
          <span>PostgreSQL 17</span>
        </div>
        <span className="font-mono text-[10px]">CASE v1.0</span>
      </div>
    </aside>
  );
};

export default Sidebar;
