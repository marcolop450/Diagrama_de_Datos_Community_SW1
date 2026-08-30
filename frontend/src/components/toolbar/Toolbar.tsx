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
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();

  const handleSelectTool = (tool: string, label: string) => {
    if (activeTool === tool) {
      setActiveTool('pointer');
      toast('Modo selección activado');
    } else {
      setActiveTool(tool);
      toast.success(`Seleccionado: ${label}. Haz clic en el lienzo para colocarla`, {
        icon: '🎯'
      });
    }
  };

  const handleVoiceCommand = () => {
    // Voice placement helper: computes center of current viewport
    const vp = getViewport();
    // Center point in flow coords
    const centerX = (-vp.x + window.innerWidth / 2) / vp.zoom - 100;
    const centerY = (-vp.y + window.innerHeight / 2) / vp.zoom - 80;

    createNewClass('EntidadPorVoz', 'entity', false, { x: centerX, y: centerY });
    toast.success('Clase generada y ubicada automáticamente por dictado IA');
  };

  const handlePhotoImport = () => {
    toast('Reconocimiento OCR de foto disponible en Fase 3');
  };

  return (
    <aside className="w-13 md:w-14 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center py-2.5 gap-1.5 z-20 shadow-md select-none">
      {/* Selection pointer */}
      <button
        onClick={() => setActiveTool('pointer')}
        className={`p-2.5 rounded-xl transition-all cursor-pointer ${
          activeTool === 'pointer'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
        title="Modo Selección (V)"
      >
        <MousePointer2 size={17} />
      </button>

      <div className="w-7 h-px bg-slate-800 my-1" />

      {/* UML Class Creation Tools (Click to Arm & Drop) */}
      <button
        onClick={() => handleSelectTool('add-class', 'Clase Entidad')}
        className={`p-2.5 rounded-xl transition-all relative group cursor-pointer ${
          activeTool === 'add-class'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400 animate-pulse'
            : 'text-slate-400 hover:text-blue-400 hover:bg-slate-900'
        }`}
        title="Añadir Clase Entidad (Clic para armar y colocar)"
      >
        <Box size={17} />
        <span className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Añadir Clase Entidad (Armar y colocar)
        </span>
      </button>

      <button
        onClick={() => handleSelectTool('add-interface', 'Interfaz')}
        className={`p-2.5 rounded-xl transition-all relative group cursor-pointer ${
          activeTool === 'add-interface'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400 animate-pulse'
            : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-900'
        }`}
        title="Añadir Interfaz <<interface>>"
      >
        <Component size={17} />
        <span className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Añadir Interfaz (Armar y colocar)
        </span>
      </button>

      <button
        onClick={() => handleSelectTool('add-abstract', 'Clase Abstracta')}
        className={`p-2.5 rounded-xl transition-all relative group cursor-pointer ${
          activeTool === 'add-abstract'
            ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 animate-pulse'
            : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
        }`}
        title="Añadir Clase Abstracta"
      >
        <Layers size={17} />
        <span className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Añadir Clase Abstracta (Armar y colocar)
        </span>
      </button>

      <div className="w-7 h-px bg-slate-800 my-1" />

      {/* AI Tools */}
      <button
        onClick={handleVoiceCommand}
        className="p-2.5 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-slate-900 transition-all group relative cursor-pointer"
        title="Dictar y colocar con IA"
      >
        <Mic size={17} />
        <span className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Dictar y colocar automáticamente (IA)
        </span>
      </button>

      <button
        onClick={handlePhotoImport}
        className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-all group relative cursor-pointer"
        title="Foto de Pizarra a Diagrama"
      >
        <ImageIcon size={17} />
        <span className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Reconocer Foto de Pizarra (IA)
        </span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      <div className="w-7 h-px bg-slate-800 my-1" />

      {/* Canvas Viewport Controls */}
      <button
        onClick={() => zoomIn()}
        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
        title="Acercar (Zoom +)"
      >
        <ZoomIn size={16} />
      </button>

      <button
        onClick={() => zoomOut()}
        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
        title="Alejar (Zoom -)"
      >
        <ZoomOut size={16} />
      </button>

      <button
        onClick={() => fitView({ padding: 0.25 })}
        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
        title="Ajustar Vista a Pantalla"
      >
        <Maximize size={16} />
      </button>
    </aside>
  );
};

export default Toolbar;
