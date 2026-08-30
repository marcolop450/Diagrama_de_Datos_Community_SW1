import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, Save, Code, Download, Upload } from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();

  return (
    <header className="h-14 bg-gray-900 text-white flex items-center justify-between px-4 border-b border-gray-800">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-blue-400">CASE Tool</h1>
        {project && (
          <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded">
            {project.name}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={() => saveDiagram()}
          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
        >
          <Save size={16} />
          <span>Guardar</span>
        </button>
        <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
          <Code size={16} />
          <span>Generar Código</span>
        </button>
        <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
          <Download size={16} />
          <span>Exportar</span>
        </button>
        <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
          <Upload size={16} />
          <span>Importar</span>
        </button>
        
        <div className="h-6 w-px bg-gray-700 mx-2"></div>
        
        <div className="flex items-center space-x-3 ml-2">
          <span className="text-sm text-gray-300">{user?.email}</span>
          <button 
            onClick={() => signOut()}
            className="p-1.5 hover:bg-gray-800 rounded text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
