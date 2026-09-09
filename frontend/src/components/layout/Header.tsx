import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import { Logo } from '../common/Logo';
import { 
  LogOut, 
  Save, 
  FolderKanban,
  User,
  PanelLeft,
  Settings,
  ArrowLeft,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();
  const { toggleSidebar, sidebarOpen, openOnboarding } = useUiStore();
  const location = useLocation();

  const isEditor = location.pathname.startsWith('/editor');
  const isSubPage = location.pathname !== '/dashboard';

  const handleSave = async () => {
    if (!project?.id) {
      toast.error('No hay ningún proyecto activo para guardar');
      return;
    }
    try {
      await saveDiagram();
      toast.success('Diagrama guardado con éxito');
    } catch (err: any) {
      console.error('Error al guardar el diagrama:', err);
      const errMsg = err.response?.data?.message || err.message || 'Error al guardar el diagrama';
      toast.error(errMsg);
    }
  };

  return (
    <header 
      className="h-14 backdrop-blur-md text-white flex items-center justify-between px-3 md:px-5 border-b shadow-xs z-30 select-none relative transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Left side: Sidebar Toggle + Logo + Back Button + Active Project */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
            sidebarOpen 
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-slate-800'
          }`}
          title={sidebarOpen ? 'Cerrar barra lateral' : 'Abrir barra lateral'}
        >
          <PanelLeft size={16} />
        </button>

        {/* Project Logo */}
        <Link to="/dashboard" className="shrink-0 flex items-center hover:opacity-90 transition-opacity">
          <Logo size="sm" showText={false} className="sm:hidden" />
          <Logo size="sm" showText={true} className="hidden sm:flex" />
        </Link>

        {/* Back to Dashboard Button when on subpages */}
        {isSubPage && (
          <>
            <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
              title="Volver al Dashboard"
            >
              <ArrowLeft size={13} className="text-slate-400" />
              <span className="hidden lg:inline">Volver al Dashboard</span>
            </Link>
          </>
        )}

        {isEditor && (
          <>
            <div className="h-4 w-px bg-slate-800 shrink-0 hidden md:block" />
            {/* Active Project Indicator (visible on medium screens and up, zero bulk) */}
            <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[140px] lg:max-w-[240px]">
              <FolderKanban size={14} className={project?.id ? "text-blue-400 shrink-0" : "text-slate-500 shrink-0"} />
              {project?.id ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate" title={project.name}>
                    {project.name}
                  </span>
                  <span 
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 shrink-0" 
                    title="Diagrama sincronizado y guardado" 
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic truncate">
                  Sin modelo activo
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right side: Editor Tools (Guardar + Tutorial Bubble) & User Controls */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Editor Actions (visible only when in canvas and role != SUPER_ADMIN) */}
        {isEditor && user?.role !== 'SUPER_ADMIN' && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Save Diagram Button */}
            <button 
              onClick={handleSave}
              disabled={!project?.id}
              data-tour="header-save-button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 ${
                project?.id
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs shadow-blue-500/20 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-50'
              }`}
              title={project?.id ? "Guardar cambios del diagrama" : "Abre o crea un proyecto para guardar"}
            >
              <Save size={13} />
              <span className="hidden sm:inline">Guardar</span>
            </button>

            {/* Quick Guide Onboarding Bubble (?) */}
            <button 
              onClick={openOnboarding}
              data-tour="header-quick-guide"
              className="w-7 h-7 rounded-md bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-400 text-blue-400 hover:text-blue-300 flex items-center justify-center transition-all cursor-pointer shrink-0 relative group"
              title="Guía Rápida"
              aria-label="Guía Rápida"
            >
              <HelpCircle size={15} />
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-slate-200 text-[10px] font-medium rounded-md shadow-lg border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Guía Rápida
              </span>
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />

        {/* User Role Badge */}
        <span className={`hidden lg:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0 ${
          user?.role === 'SUPER_ADMIN'
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            : user?.role === 'COLABORADOR'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          {user?.role || 'ARQUITECTO'}
        </span>

        {/* Unified Profile & Settings & Logout */}
        <div className="flex items-center gap-1.5 pl-0.5">
          <Link 
            to="/settings"
            className="flex items-center gap-2 px-2 py-1 rounded-md bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
            title="Mi Perfil y Configuración"
          >
            <div className="w-5 h-5 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={12} />
              )}
            </div>
            <span className="text-xs font-medium text-slate-300 max-w-[90px] sm:max-w-[130px] truncate group-hover:text-white transition-colors">
              {user?.username || user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'dev'}
            </span>
            <Settings size={13} className="text-slate-500 group-hover:text-blue-400 group-hover:rotate-45 transition-all shrink-0 ml-0.5" />
          </Link>

          <button 
            onClick={() => logout()}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors border border-transparent hover:border-rose-900/50 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
