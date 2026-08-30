import React, { useState } from 'react';
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
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();
  const { toggleSidebar, sidebarOpen } = useUiStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Left side: Sidebar Toggle + Logo + Project Name */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            sidebarOpen 
              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
          }`}
          title={sidebarOpen ? 'Cerrar panel de proyectos' : 'Abrir panel de proyectos'}
        >
          <PanelLeft size={17} />
        </button>

        {/* Project Logo */}
        <div className="shrink-0 flex items-center">
          <Logo size="sm" showText={false} className="sm:hidden" />
          <Logo size="sm" showText={true} className="hidden sm:flex" />
        </div>

        <div className="h-5 w-px bg-slate-800 shrink-0 hidden sm:block" />

        {/* Active Project Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <FolderKanban size={15} className="text-blue-400 shrink-0 hidden md:block" />
          {project ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs md:text-sm font-medium text-slate-200 truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">
                {project.name}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-md shrink-0">
                <CheckCircle2 size={10} />
                Guardado
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic truncate">
              Sin proyecto
            </span>
          )}
        </div>
      </div>

      {/* Right side: Actions & User Controls (Responsive) */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Save Button (Always visible) */}
        <button 
          onClick={handleSave}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Guardar cambios"
        >
          <Save size={14} className="text-blue-400" />
          <span className="hidden sm:inline">Guardar</span>
        </button>

        {/* Generate Backend Button */}
        <button 
          onClick={() => toast('Generador de código Spring Boot activo en Fase 4')}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Code2 size={14} />
          <span className="hidden md:inline">Generar Backend</span>
        </button>

        {/* Secondary Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5">
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

        {/* Mobile/Tablet More Dropdown Button */}
        <div className="relative lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            title="Más opciones"
          >
            <MoreVertical size={16} />
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-medium text-slate-300">
              <button
                onClick={() => { toast('Exportar a XMI / DDL / PNG'); setMobileMenuOpen(false); }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
              >
                <Download size={14} className="text-blue-400" />
                <span>Exportar Diagrama</span>
              </button>
              <button
                onClick={() => { toast('Importar archivo XMI / JSON'); setMobileMenuOpen(false); }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
              >
                <Upload size={14} className="text-indigo-400" />
                <span>Importar Diagrama</span>
              </button>
              <button
                onClick={() => { toast('Sesión colaborativa'); setMobileMenuOpen(false); }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
              >
                <Share2 size={14} className="text-purple-400" />
                <span>Colaborar en Vivo</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-800 shrink-0" />

        {/* User Profile & Logout (Always visible) */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5">
          <div 
            className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800"
            title={user?.email || 'Usuario'}
          >
            <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
              <User size={13} />
            </div>
            <span className="text-[11px] font-mono text-slate-300 max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">
              {user?.email?.split('@')[0] || 'dev'}
            </span>
          </div>

          <button 
            onClick={() => signOut()}
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
