import React from 'react';
import { 
  Square, GripHorizontal, ArrowRight, CornerDownRight, 
  Share2, ArrowUpCircle, MousePointer2, ZoomIn, 
  ZoomOut, Maximize, Undo, Redo, Mic, Image as ImageIcon
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useUiStore();

  const tools = [
    { id: 'pointer', icon: MousePointer2, title: 'Seleccionar' },
    { divider: true },
    { id: 'class', icon: Square, title: 'Añadir Clase' },
    { id: 'interface', icon: Square, title: 'Añadir Interfaz' },
    { divider: true },
    { id: 'association', icon: ArrowRight, title: 'Asociación' },
    { id: 'aggregation', icon: GripHorizontal, title: 'Agregación' },
    { id: 'composition', icon: GripHorizontal, title: 'Composición' },
    { id: 'inheritance', icon: ArrowUpCircle, title: 'Herencia' },
    { id: 'implementation', icon: ArrowUpCircle, title: 'Implementación' },
    { id: 'dependency', icon: CornerDownRight, title: 'Dependencia' },
    { divider: true },
    { id: 'voice', icon: Mic, title: 'Comando de Voz (AI)' },
    { id: 'photo', icon: ImageIcon, title: 'Importar Foto (AI)' },
  ];

  return (
    <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-2 z-10 shadow-sm">
      {tools.map((tool, idx) => {
        if (tool.divider) {
          return <div key={`div-${idx}`} className="w-8 h-px bg-gray-200 my-2" />;
        }
        const Icon = tool.icon!;
        const isActive = activeTool === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-2 mb-1 rounded-lg transition-colors ${
              isActive 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={tool.title}
          >
            <Icon size={20} />
          </button>
        );
      })}
      
      <div className="flex-1" />
      
      <div className="w-8 h-px bg-gray-200 my-2" />
      <button className="p-2 mb-1 rounded-lg text-gray-600 hover:bg-gray-100" title="Deshacer"><Undo size={20} /></button>
      <button className="p-2 mb-1 rounded-lg text-gray-600 hover:bg-gray-100" title="Rehacer"><Redo size={20} /></button>
      <button className="p-2 mb-1 rounded-lg text-gray-600 hover:bg-gray-100" title="Zoom In"><ZoomIn size={20} /></button>
      <button className="p-2 mb-1 rounded-lg text-gray-600 hover:bg-gray-100" title="Zoom Out"><ZoomOut size={20} /></button>
      <button className="p-2 mb-1 rounded-lg text-gray-600 hover:bg-gray-100" title="Ajustar"><Maximize size={20} /></button>
    </div>
  );
};

export default Toolbar;
