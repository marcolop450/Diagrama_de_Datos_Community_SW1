import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import { useCollabStore } from '../../stores/collabStore';
import { Logo } from '../common/Logo';
import { 
  LogOut, 
  Save, 
  FolderKanban,
  User,
  PanelLeft,
  Settings,
  ArrowLeft,
  HelpCircle,
  Download,
  Upload
} from 'lucide-react';
import { ExportModal } from '../modals/ExportModal';
import { ImportModal } from '../modals/ImportModal';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();
  const { toggleSidebar, sidebarOpen, openOnboarding } = useUiStore();
  const { isLive, participants, setModalOpen } = useCollabStore();
  const location = useLocation();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

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
          <Logo size="sm" showText={false} className="lg:hidden" />
          <Logo size="sm" showText={true} className="hidden lg:flex" />
        </Link>

        {/* Back to Dashboard Button when on subpages */}
        {isSubPage && (
          <>
            <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
              title="Volver al Dashboard"
            >
              <ArrowLeft size={13} className="text-slate-400" />
              <span className="hidden xl:inline">Volver al Dashboard</span>
            </Link>
          </>
        )}

        {isEditor && (
          <>
            <div className="h-4 w-px bg-slate-800 shrink-0 hidden md:block" />
            {/* Active Project Indicator (visible on medium screens and up, zero bulk) */}
            <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[120px] lg:max-w-[200px]">
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
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Editor Actions (visible only when in canvas and role != SUPER_ADMIN) */}
        {isEditor && user?.role !== 'SUPER_ADMIN' && (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Live Collaboration Status Pill (CU18) */}
            {isLive && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all cursor-pointer animate-fade-in"
                title="Sesión colaborativa en tiempo real activa. Clic para ver detalles e invitar."
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="hidden md:inline">En Vivo</span>
                <span className="px-1.5 py-0.2 bg-rose-500/20 rounded-full text-[10px] font-mono text-rose-200">
                  {participants.length}
                </span>
              </button>
            )}

            {/* Import Model from XMI Button */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Importar modelo desde archivo XMI (ArchiTec / StarUML)"
            >
              <Upload size={13} className="text-emerald-400" />
              <span className="hidden xl:inline">Importar</span>
            </button>

            {/* Export Model Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!project?.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 ${
                project?.id
                  ? 'text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 active:scale-95 cursor-pointer'
                  : 'bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title={project?.id ? "Exportar modelo a XMI, PNG, PDF o Excel" : "Abre o crea un proyecto para exportar"}
            >
              <Download size={13} className={project?.id ? "text-blue-400" : "text-slate-600"} />
              <span className="hidden xl:inline">Exportar</span>
            </button>

            {/* Save Diagram Button */}
            <button 
              onClick={handleSave}
              disabled={!project?.id}
              data-tour="header-save-button"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 ${
                project?.id
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-500/20 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-50'
              }`}
              title={project?.id ? "Guardar cambios del diagrama" : "Abre o crea un proyecto para guardar"}
            >
              <Save size={13} />
              <span className="hidden lg:inline">Guardar</span>
            </button>

            {/* Quick Guide Onboarding Bubble (?) */}
            <button 
              onClick={openOnboarding}
              data-tour="header-quick-guide"
              className="w-7 h-7 rounded-md bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 hover:text-indigo-300 flex items-center justify-center transition-all cursor-pointer shrink-0 relative group"
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

      {/* Export Model & Documentation Modal (CU11) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Import Model from XMI Modal (CU12) */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </header>
  );
};

export default Header;
