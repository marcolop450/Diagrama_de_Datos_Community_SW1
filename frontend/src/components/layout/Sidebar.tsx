import React from 'react';
import { FolderPlus, FolderOpen, ChevronLeft } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

const Sidebar: React.FC = () => {
  const { toggleSidebar, openModal } = useUiStore();
  
  // Mock projects for now
  const projects = [
    { id: '1', name: 'Sistema de Ventas' },
    { id: '2', name: 'Gestión de Inventario' },
  ];

  return (
    <div className="w-64 bg-gray-800 text-gray-300 flex flex-col h-full border-r border-gray-700">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold text-white">Proyectos</h2>
        <button onClick={toggleSidebar} className="hover:text-white">
          <ChevronLeft size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <button 
          onClick={() => openModal('createProject')}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors mb-4"
        >
          <FolderPlus size={18} />
          <span>Nuevo Proyecto</span>
        </button>
        
        <div className="space-y-1 mt-4">
          <p className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2">Recientes</p>
          {projects.map(proj => (
            <button 
              key={proj.id}
              className="w-full flex items-center space-x-2 px-2 py-2 hover:bg-gray-700 rounded text-sm text-left transition-colors"
            >
              <FolderOpen size={16} className="text-gray-400" />
              <span>{proj.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
