import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Layers, 
  Database,
  LayoutDashboard,
  ShieldAlert,
  History,
  Users2,
  Server,
  FolderKanban
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useAuthStore } from '../../stores/authStore';

const Sidebar: React.FC = () => {
  const { toggleSidebar } = useUiStore();
  const { project } = useDiagramStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || 'ARQUITECTO';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isColaborador = role === 'COLABORADOR';

  return (
    <div 
      className="w-64 text-slate-300 flex flex-col h-full border-r shadow-md select-none z-20 font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Role-adaptive Sidebar Header */}
      <div 
        className="p-3.5 border-b flex justify-between items-center transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                location.pathname === '/dashboard'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <LayoutDashboard size={15} className="shrink-0 text-purple-400" />
              <span>Dashboard General</span>
            </Link>

            <Link
              to="/admin/projects"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                location.pathname === '/admin/projects'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <FolderKanban size={15} className="shrink-0 text-purple-400" />
              <span>Supervisión de Proyectos</span>
            </Link>

            <Link
              to="/admin/users"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                location.pathname === '/admin/users'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Users2 size={15} className="shrink-0 text-purple-400" />
              <span>Usuarios y Roles</span>
            </Link>

            <Link
              to="/admin/audit"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                location.pathname === '/admin/audit'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <History size={15} className="shrink-0 text-purple-400" />
              <span>Bitácora de Auditoría</span>
            </Link>
          </>
        ) : (
          /* 2. ARCHITECT / COLLABORATOR NAV */
          <>
            <Link
              to="/dashboard"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                location.pathname === '/dashboard'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <LayoutDashboard size={15} className="shrink-0 text-blue-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/projects"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                location.pathname === '/projects'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <FolderKanban size={15} className="shrink-0 text-blue-400" />
              <span>{isColaborador ? 'Modelos Compartidos' : 'Mis Proyectos UML'}</span>
            </Link>

            {/* Contextual Active Editor Link (Only when an active project is selected) */}
            {project?.id && (
              <Link
                to={`/editor/${project.id}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                  location.pathname.startsWith('/editor')
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Layers size={15} className="shrink-0 text-emerald-400" />
                <span className="truncate">Lienzo: {project.name}</span>
              </Link>
            )}
          </>
        )}
      </div>
      
      {/* Center Section: Contextual Space */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {isSuperAdmin ? (
          <div 
            className="border rounded-lg p-3 flex flex-col gap-2 transition-colors duration-200"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 text-purple-400">
              <Server size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Infraestructura</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Consola central de supervisión. Las herramientas de modelado y dibujo UML están reservadas para los roles de Arquitecto y Colaborador.
            </p>
          </div>
        ) : (
          <div 
            className="border rounded-lg p-3 flex flex-col gap-2.5 transition-colors duration-200"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 text-blue-400">
              <Layers size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Espacio CASE UML</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gestiona tus diagramas desde <strong className="text-slate-200">Mis Proyectos UML</strong>. Abre cualquier modelo para ingresar a su lienzo de ingeniería.
            </p>
            {project?.id ? (
              <div 
                className="pt-2 border-t flex flex-col gap-1.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-500">Modelo Activo</span>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 shrink-0" />
                  <span className="truncate">{project.name || 'Sin nombre'}</span>
                </div>
                <button
                  onClick={() => navigate(`/editor/${project.id}`)}
                  className="mt-1 w-full text-center py-1.5 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Abrir en el Lienzo
                </button>
              </div>
            ) : (
              <div 
                className="pt-2 border-t flex flex-col gap-1.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-500">Modelo Activo</span>
                <span className="text-xs text-slate-500 italic">Ningún modelo activo</span>
                <button
                  onClick={() => navigate('/projects')}
                  className="mt-1 w-full text-center py-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Ver Mis Proyectos
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div 
        className="p-3 border-t text-slate-400 text-[11px] flex items-center justify-between transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5">
          <Database size={13} className="text-emerald-500" />
          <span>PostgreSQL 17</span>
        </div>
        <span className="font-mono text-[10px]">CASE v1.0</span>
      </div>
    </div>
  );
};

export default Sidebar;
