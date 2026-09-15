import React, { useState, useMemo } from 'react';
import { 
  MousePointer2, 
  BoxSelect,
  Box, 
  Layers, 
  Component, 
  Mic, 
  Camera,
  ZoomIn, 
  ZoomOut, 
  Maximize,
  History,
  Code2,
  Database,
  Undo2,
  Redo2,
  Trash2,
  ShieldCheck,
  Send
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useReactFlow } from '@xyflow/react';
import { ProjectHistoryModal } from '../history/ProjectHistoryModal';
import { NormalizationReportModal } from '../modals/NormalizationReportModal';
import { GenerateBackendModal } from '../modals/GenerateBackendModal';
import { SqlDdlModal } from '../modals/SqlDdlModal';
import { PostmanModal } from '../modals/PostmanModal';
import { VoiceModelingModal } from '../voice/VoiceModelingModal';
import { WhiteboardVisionModal } from '../vision/WhiteboardVisionModal';
import { analyzeDiagramNormalization } from '../../services/normalizationEngine';
import toast from 'react-hot-toast';

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useUiStore();
  const { 
    project, 
    nodes, 
    edges, 
    selectedNode, 
    selectedEdge, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    deleteSelectedElements 
  } = useDiagramStore();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const hasSelection = useMemo(() => {
    return nodes.some(n => n.selected) || edges.some(e => e.selected) || !!selectedNode || !!selectedEdge;
  }, [nodes, edges, selectedNode, selectedEdge]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNormalizationOpen, setIsNormalizationOpen] = useState(false);
  const [isGenerateBackendOpen, setIsGenerateBackendOpen] = useState(false);
  const [isSqlDdlOpen, setIsSqlDdlOpen] = useState(false);
  const [isPostmanOpen, setIsPostmanOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; top: number; left: number } | null>(null);

  const normReport = useMemo(() => {
    return analyzeDiagramNormalization(nodes, edges);
  }, [nodes, edges]);

  const showTip = (text: string) => (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverTooltip({ 
      text, 
      top: rect.top + rect.height / 2,
      left: rect.right + 10 
    });
  };

  const hideTip = () => {
    setHoverTooltip(null);
  };

  const handleSelectTool = (tool: string, label: string) => {
    if (!project) {
      toast.error('Abre o crea un modelo para usar las herramientas');
      return;
    }
    if (activeTool === tool) {
      setActiveTool('pointer');
      toast('Modo selección activado');
    } else {
      setActiveTool(tool);
      toast.success(`Seleccionado: ${label}. Haz clic en el lienzo para colocarla`);
    }
  };

  const handleVoiceCommand = () => {
    if (!project) {
      toast.error('Abre o crea un modelo para usar el dictado de voz');
      return;
    }
    setIsVoiceModalOpen((prev) => !prev);
  };

  const handlePhotoImport = () => {
    if (!project) {
      toast.error('Abre o crea un modelo para digitalizar una pizarra');
      return;
    }
    setIsVisionModalOpen(true);
  };

  return (
    <aside 
      data-tour="toolbar-root"
      onScroll={hideTip}
      className="w-13 md:w-14 border-r flex flex-col items-center py-2.5 z-20 shadow-md select-none h-full max-h-screen overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex flex-col items-center gap-1.5 w-full min-h-max pb-4">
        {/* Selection & Navigation tools */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => {
              setActiveTool('pointer');
              toast('Modo Puntero activo');
            }}
            onMouseEnter={showTip('Puntero de Navegación • V')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              activeTool === 'pointer'
                ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Puntero de Navegación"
          >
            <MousePointer2 size={16} />
          </button>

          <button
            onClick={() => {
              if (activeTool === 'select-area') {
                setActiveTool('pointer');
                toast('Modo Puntero activo');
              } else {
                setActiveTool('select-area');
                toast.success('Selección por Área activa: arrastra en el lienzo para seleccionar');
              }
            }}
            onMouseEnter={showTip('Selección por Área • S')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              activeTool === 'select-area'
                ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-900'
            }`}
            title="Seleccionar con Mouse en Área"
          >
            <BoxSelect size={16} />
          </button>
        </div>

        {/* Undo & Redo Controls */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => undo()}
            onMouseEnter={showTip('Deshacer • Ctrl+Z')}
            onMouseLeave={hideTip}
            disabled={!canUndo}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-900 active:scale-95'
                : 'text-slate-600 cursor-not-allowed opacity-35'
            }`}
            title="Deshacer"
          >
            <Undo2 size={15} />
          </button>

          <button
            onClick={() => redo()}
            onMouseEnter={showTip('Rehacer • Ctrl+Y')}
            onMouseLeave={hideTip}
            disabled={!canRedo}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-900 active:scale-95'
                : 'text-slate-600 cursor-not-allowed opacity-35'
            }`}
            title="Rehacer"
          >
            <Redo2 size={15} />
          </button>

          <button
            onClick={() => deleteSelectedElements()}
            onMouseEnter={showTip('Eliminar Selección • Supr')}
            onMouseLeave={hideTip}
            disabled={!hasSelection}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              hasSelection
                ? 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 active:scale-95 ring-1 ring-rose-500/30'
                : 'text-slate-600 cursor-not-allowed opacity-35'
            }`}
            title="Eliminar Selección"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="w-7 h-px bg-slate-800 my-1" />

        {/* UML Class Creation Tools (Click to Arm & Drop) */}
        <div data-tour="toolbar-classes" className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => handleSelectTool('add-class', 'Clase Entidad')}
            onMouseEnter={showTip('Clase Entidad')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              activeTool === 'add-class'
                ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-900'
            }`}
            title="Añadir Clase Entidad"
          >
            <Box size={16} />
          </button>

          <button
            onClick={() => handleSelectTool('add-interface', 'Interfaz')}
            onMouseEnter={showTip('Interfaz')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              activeTool === 'add-interface'
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-900'
            }`}
            title="Añadir Interfaz"
          >
            <Component size={16} />
          </button>

          <button
            onClick={() => handleSelectTool('add-abstract', 'Clase Abstracta')}
            onMouseEnter={showTip('Clase Abstracta')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              activeTool === 'add-abstract'
                ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
            }`}
            title="Añadir Clase Abstracta"
          >
            <Layers size={16} />
          </button>
        </div>

        <div className="w-7 h-px bg-slate-800 my-1" />

        {/* AI Tools */}
        <div data-tour="toolbar-ai-tools" className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleVoiceCommand}
            onMouseEnter={showTip('Modelar por Voz (PLN)')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              isVoiceModalOpen
                ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-purple-400 hover:bg-slate-900'
            }`}
            title="Modelar por Voz (PLN)"
          >
            <Mic size={16} />
          </button>

          <button
            onClick={handlePhotoImport}
            onMouseEnter={showTip('Digitalizar Foto de Pizarra')}
            onMouseLeave={hideTip}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              isVisionModalOpen
                ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
            }`}
            title="Digitalizar Foto de Pizarra"
          >
            <Camera size={16} />
          </button>
        </div>

        <div className="w-7 h-px bg-slate-800 my-1" />

        {/* CASE Architecture, Generation & History Tools */}
        <div data-tour="toolbar-case-tools" className="flex flex-col items-center gap-1.5">
          {/* Validar Normalización Lógica */}
          <button
            onClick={() => setIsNormalizationOpen(true)}
            onMouseEnter={showTip('Validar Normalización')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer"
            title="Validar Normalización"
          >
            <div className="relative">
              <ShieldCheck size={16} />
              <span 
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-slate-950 ${
                  normReport.status === 'COMPLIANT'
                    ? 'bg-emerald-400'
                    : normReport.status === 'WARNINGS'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
            </div>
          </button>

          {/* Project History */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            onMouseEnter={showTip('Historial y Trazabilidad')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-purple-400 hover:bg-purple-950/30 transition-all cursor-pointer"
            title="Consultar Historial y Trazabilidad"
          >
            <History size={16} />
          </button>

          {/* Generate Backend Spring Boot (CU13) */}
          <button
            onClick={() => setIsGenerateBackendOpen(true)}
            onMouseEnter={showTip('Generar Backend Spring Boot')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-950/30 transition-all cursor-pointer"
            title="Generar Backend Spring Boot (4 Capas en ZIP)"
          >
            <Code2 size={16} />
          </button>

          {/* Generate SQL DDL Script PostgreSQL 17 (CU14) */}
          <button
            onClick={() => setIsSqlDdlOpen(true)}
            onMouseEnter={showTip('Generar Script SQL DDL')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer"
            title="Generar Script SQL DDL (PostgreSQL 17)"
          >
            <Database size={16} />
          </button>

          {/* Generate Postman Collection v2.1 (CU15) */}
          <button
            onClick={() => setIsPostmanOpen(true)}
            onMouseEnter={showTip('Generar Colección Postman')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 transition-all cursor-pointer"
            title="Generar Colección Postman v2.1"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="w-7 h-px bg-slate-800 my-1" />

        {/* Canvas Viewport Controls */}
        <button
          onClick={() => zoomIn()}
          onMouseEnter={showTip('Acercar Zoom')}
          onMouseLeave={hideTip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
          title="Acercar Zoom"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={() => zoomOut()}
          onMouseEnter={showTip('Alejar Zoom')}
          onMouseLeave={hideTip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
          title="Alejar Zoom"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={() => fitView({ padding: 0.25 })}
          onMouseEnter={showTip('Ajustar Vista')}
          onMouseLeave={hideTip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
          title="Ajustar Vista"
        >
          <Maximize size={15} />
        </button>
      </div>

      {/* Floating tooltip outside the scroll container */}
      {hoverTooltip && (
        <div 
          style={{ top: hoverTooltip.top, left: hoverTooltip.left }} 
          className="fixed -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap pointer-events-none z-50 animate-fade-in"
        >
          {hoverTooltip.text}
        </div>
      )}

      {/* Project History Modal */}
      {project && (
        <ProjectHistoryModal
          isOpen={isHistoryOpen}
          projectId={project.id}
          projectName={project.name}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Normalization Report Modal (CU10) */}
      <NormalizationReportModal
        isOpen={isNormalizationOpen}
        onClose={() => setIsNormalizationOpen(false)}
      />

      {/* Generate Backend Spring Boot Modal (CU13) */}
      <GenerateBackendModal
        isOpen={isGenerateBackendOpen}
        onClose={() => setIsGenerateBackendOpen(false)}
      />

      {/* Generate SQL DDL Modal (CU14) */}
      <SqlDdlModal
        isOpen={isSqlDdlOpen}
        onClose={() => setIsSqlDdlOpen(false)}
      />

      {/* Generate Postman Collection Modal (CU15) */}
      <PostmanModal
        isOpen={isPostmanOpen}
        onClose={() => setIsPostmanOpen(false)}
      />

      {/* Voice Modeling Modal (CU16) */}
      <VoiceModelingModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Whiteboard Vision Modal (CU17) */}
      <WhiteboardVisionModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        onApplied={() => fitView({ padding: 0.25 })}
      />
    </aside>
  );
};

export default Toolbar;
