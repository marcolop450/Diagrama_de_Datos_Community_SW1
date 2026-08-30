import React from 'react';
import { 
  MousePointer2, 
  Box, 
  Layers, 
  Component, 
  Mic, 
  Image as ImageIcon,
  ZoomIn, 
  ZoomOut, 
  Maximize
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useReactFlow } from '@xyflow/react';
import toast from 'react-hot-toast';

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useUiStore();
  const { createNewClass } = useDiagramStore();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleAddEntityClass = () => {
    createNewClass('NuevaEntidad', 'entity', false);
    toast.success('Clase entidad añadida');
  };

  const handleAddInterface = () => {
    createNewClass('INuevoServicio', 'interface', false);
    toast.success('Interfaz añadida');
  };

  const handleAddAbstractClass = () => {
    createNewClass('ClaseBase', 'abstract', true);
    toast.success('Clase abstracta añadida');
  };

  const handleVoiceCommand = () => {
    toast('Asistente de voz disponible en Fase 3', { icon: '🎙️' });
  };

  const handlePhotoImport = () => {
    toast('Importador de foto de pizarra disponible en Fase 3', { icon: '📷' });
  };

  return (
    <aside className="w-14 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center py-3 gap-1 z-20 shadow-md select-none">
      {/* Selection pointer */}
      <button
        onClick={() => setActiveTool('pointer')}
        className={`p-2.5 rounded-xl transition-all ${
          activeTool === 'pointer'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
        title="Modo Selección (V)"
      >
        <MousePointer2 size={18} />
      </button>

      <div className="w-8 h-px bg-slate-800 my-1.5" />

      {/* UML Class Creation Tools */}
      <button
        onClick={handleAddEntityClass}
        className="p-2.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-900 transition-all group relative"
        title="Añadir Clase Entidad"
      >
        <Box size={18} />
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-lg border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Añadir Clase Entidad
        </span>
      </button>

      <button
        onClick={handleAddInterface}
        className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-all group relative"
        title="Añadir Interfaz"
      >
        <Component size={18} />
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-lg border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Añadir Interfaz &lt;&lt;interface&gt;&gt;
        </span>
      </button>

      <button
        onClick={handleAddAbstractClass}
        className="p-2.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-all group relative"
        title="Añadir Clase Abstracta"
      >
        <Layers size={18} />
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-lg border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Añadir Clase Abstracta
        </span>
      </button>

      <div className="w-8 h-px bg-slate-800 my-1.5" />

      {/* AI Tools */}
      <button
        onClick={handleVoiceCommand}
        className="p-2.5 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-slate-900 transition-all group relative"
        title="Dictado por Voz con IA"
      >
        <Mic size={18} />
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-lg border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Dictar Diagrama con Voz (IA)
        </span>
      </button>

      <button
        onClick={handlePhotoImport}
        className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-all group relative"
        title="Reconocimiento de Foto de Pizarra con IA"
      >
        <ImageIcon size={18} />
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-lg border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Foto de Pizarra a Diagrama (IA)
        </span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      <div className="w-8 h-px bg-slate-800 my-1.5" />

      {/* Canvas Viewport Controls */}
      <button
        onClick={() => zoomIn()}
        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
        title="Acercar (Zoom +)"
      >
        <ZoomIn size={16} />
      </button>

      <button
        onClick={() => zoomOut()}
        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
        title="Alejar (Zoom -)"
      >
        <ZoomOut size={16} />
      </button>

      <button
        onClick={() => fitView({ padding: 0.2 })}
        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
        title="Ajustar Vista (Fit)"
      >
        <Maximize size={16} />
      </button>
    </aside>
  );
};

export default Toolbar;
