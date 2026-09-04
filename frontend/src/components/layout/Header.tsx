import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import { Logo } from '../common/Logo';
import { 
  LogOut, 
  Save, 
  Code2, 
  Download, 
  Upload, 
  Share2, 
  FolderKanban,
  CheckCircle2,
  User,
  PanelLeft,
  Settings,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();
  const { toggleSidebar, sidebarOpen } = useUiStore();
  const location = useLocation();

  const isEditor = location.pathname.startsWith('/editor');
  const isSubPage = location.pathname !== '/dashboard';

  const handleSave = async () => {
    try {
      await saveDiagram();
      toast.success('Diagrama guardado con éxito');
    } catch {
      toast.error('Error al guardar el diagrama');
    }
  };

  return (
    <header className="h-14 bg-slate-950 text-white flex items-center justify-between px-3 md:px-4 border-b border-slate-800/80 shadow-md z-30 select-none relative">
      {/* Left side: Sidebar Toggle + Logo + Back Button */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors cursor-pointer border ${
            sidebarOpen 
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-slate-800'
          }`}
          title={sidebarOpen ? 'Cerrar barra lateral' : 'Abrir barra lateral'}
        >
          <PanelLeft size={17} />
        </button>

        {/* Project Logo */}
        <Link to="/dashboard" className="shrink-0 flex items-center hover:opacity-90 transition-opacity">
          <Logo size="sm" showText={false} className="sm:hidden" />
          <Logo size="sm" showText={true} className="hidden sm:flex" />
        </Link>

        {/* Back to Dashboard Button when on subpages */}
        {isSubPage && (
          <>
            <div className="h-5 w-px bg-slate-800 shrink-0 hidden sm:block" />
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Volver al Dashboard"
            >
              <ArrowLeft size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Volver al Dashboard</span>
            </Link>
          </>
        )}

        {isEditor && (
          <>
            <div className="h-5 w-px bg-slate-800 shrink-0 hidden lg:block" />
            {/* Active Project Indicator (visible in editor mode) */}
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <FolderKanban size={15} className="text-blue-400 shrink-0" />
              {project ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[200px]">
                    {project.name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-md shrink-0">
                    <CheckCircle2 size={10} />
                    Guardado
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic truncate">
                  Sin proyecto
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right side: Editor tools (if editor) & User Controls */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Editor Actions (visible only when in canvas and role != SUPER_ADMIN) */}
        {isEditor && user?.role !== 'SUPER_ADMIN' && (
          <>
            <button 
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Guardar cambios"
            >
              <Save size={14} className="text-blue-400" />
              <span className="hidden sm:inline">Guardar</span>
            </button>

            <button 
              onClick={() => toast('Generador de código Spring Boot activo en Fase 4')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Code2 size={14} />
              <span className="hidden md:inline">Generar Backend</span>
            </button>

            {/* Desktop Secondary Actions */}
            <div className="hidden xl:flex items-center gap-1.5">
              <button 
                onClick={() => toast('Exportar a XMI / DDL / PNG')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                title="Exportar diagrama"
              >
                <Download size={14} />
                <span>Exportar</span>
              </button>

              <button 
                onClick={() => toast('Importar archivo XMI / JSON')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                title="Importar diagrama"
              >
                <Upload size={14} />
                <span>Importar</span>
              </button>

              <button 
                onClick={() => toast('Sesión colaborativa')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-indigo-400 transition-colors cursor-pointer"
                title="Invitar colaboradores"
              >
                <Share2 size={14} />
                <span>Colaborar</span>
              </button>
            </div>
          </>
        )}

        <div className="h-5 w-px bg-slate-800 shrink-0" />

        {/* User Role Badge */}
        <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
          user?.role === 'SUPER_ADMIN'
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            : user?.role === 'COLABORADOR'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          {user?.role || 'ARQUITECTO'}
        </span>

        {/* User Profile & Settings & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5">
          <Link 
            to="/settings"
            className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group"
            title="Mi Perfil y Configuración"
          >
            <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={13} />
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-300 max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline group-hover:text-white">
              {user?.username || user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'dev'}
            </span>
          </Link>

          <Link
            to="/settings"
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
            title="Configuración de Usuario"
          >
            <Settings size={16} />
          </Link>

          <button 
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-900/50 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
