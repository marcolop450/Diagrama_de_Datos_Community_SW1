import React from 'react';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import { X } from 'lucide-react';

const PropertiesPanel: React.FC = () => {
  const { selectedNode, selectedEdge } = useDiagramStore();
  const { setPropertiesPanelOpen } = useUiStore();

  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="font-semibold text-gray-800">
          Propiedades {selectedNode ? 'de Clase' : 'de Relación'}
        </h2>
        <button 
          onClick={() => setPropertiesPanelOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input 
                type="text" 
                value={selectedNode.data.name} 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
            </div>
            
            <div className="flex items-center">
              <input type="checkbox" id="isAbstract" checked={selectedNode.data.isAbstract} readOnly className="mr-2" />
              <label htmlFor="isAbstract" className="text-sm text-gray-700">Es Abstracta</label>
            </div>
            
            {/* More fields would go here */}
            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
              Panel de propiedades en desarrollo...
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relación</label>
              <input 
                type="text" 
                value={selectedEdge.data?.type || 'association'} 
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                readOnly
              />
            </div>
            {/* More fields would go here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
