import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
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
  User
} from 'lucide-react';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();

  const handleSave = async () => {
    try {
      await saveDiagram();
      toast.success('Diagrama guardado con éxito');
    } catch {
      toast.error('Error al guardar el diagrama');
    }
  };

  return (
    <header className="h-14 bg-slate-950 text-white flex items-center justify-between px-5 border-b border-slate-800/80 shadow-sm z-30 select-none">
      {/* Left side: Logo & Project context */}
      <div className="flex items-center gap-6">
        <Logo size="sm" showText={true} />

        <div className="h-5 w-px bg-slate-800" />

        <div className="flex items-center gap-2.5">
          <FolderKanban size={16} className="text-blue-400" />
          {project ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">
                {project.name}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-full">
                <CheckCircle2 size={10} />
                Guardado
              </span>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">
              Sin proyecto seleccionado
            </span>
          )}
        </div>
      </div>

      {/* Right side: Action Bar & User Menu */}
      <div className="flex items-center gap-2">
        {/* Action: Save */}
        <button 
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-all active:scale-95"
          title="Guardar cambios (Ctrl+S)"
        >
          <Save size={14} className="text-blue-400" />
          <span>Guardar</span>
        </button>

        {/* Action: Generate Spring Boot Code */}
        <button 
          onClick={() => toast('Generador de código Spring Boot activo en Fase 4', { icon: '⚙️' })}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
        >
          <Code2 size={14} />
          <span>Generar Backend</span>
        </button>

        {/* Action: Export & Import */}
        <button 
          onClick={() => toast('Exportar a XMI / DDL / PNG')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors"
          title="Exportar diagrama"
        >
          <Download size={14} />
          <span>Exportar</span>
        </button>

        <button 
          onClick={() => toast('Importar archivo XMI / JSON')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors"
          title="Importar diagrama"
        >
          <Upload size={14} />
          <span>Importar</span>
        </button>

        {/* Action: Share / Live session */}
        <button 
          onClick={() => toast('Sesión colaborativa')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-indigo-400 transition-colors"
          title="Invitar colaboradores"
        >
          <Share2 size={14} />
          <span>Colaborar</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1.5" />

        {/* User profile & Logout */}
        <div className="flex items-center gap-3 pl-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User size={14} />
            </div>
            <span className="text-xs font-medium text-slate-300 max-w-[150px] truncate">
              {user?.email || 'Usuario'}
            </span>
          </div>

          <button 
            onClick={() => signOut()}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
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
