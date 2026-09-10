import React, { useState, useMemo } from 'react';
import { 
  MousePointer2, 
  Box, 
  Layers, 
  Component, 
  Mic, 
  Image as ImageIcon,
  ZoomIn, 
  ZoomOut, 
  Maximize,
  History,
  Code2,
  Database,
  Undo2,
  Redo2,
  ShieldCheck,
  Download
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useReactFlow } from '@xyflow/react';
import { ProjectHistoryModal } from '../history/ProjectHistoryModal';
import { NormalizationReportModal } from '../modals/NormalizationReportModal';
import { ExportModal } from '../modals/ExportModal';
import { analyzeDiagramNormalization } from '../../services/normalizationEngine';
import toast from 'react-hot-toast';

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useUiStore();
  const { project, nodes, edges, createNewClass, undo, redo, canUndo, canRedo } = useDiagramStore();
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNormalizationOpen, setIsNormalizationOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; top: number } | null>(null);

  const normReport = useMemo(() => {
    return analyzeDiagramNormalization(nodes, edges);
  }, [nodes, edges]);

  const showTip = (text: string) => (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverTooltip({ text, top: rect.top + rect.height / 2 });
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
      toast.error('Abre o crea un modelo para usar el dictado');
      return;
    }
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
    <aside 
      data-tour="toolbar-root"
      onScroll={hideTip}
      className="w-13 md:w-14 border-r flex flex-col items-center py-2.5 z-20 shadow-md select-none h-full max-h-screen overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex flex-col items-center gap-1.5 w-full min-h-max pb-4">
        {/* Selection pointer */}
        <button
          onClick={() => setActiveTool('pointer')}
          onMouseEnter={showTip('Modo Selección • V')}
          onMouseLeave={hideTip}
          className={`p-2 rounded-md transition-all cursor-pointer ${
            activeTool === 'pointer'
              ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Modo Selección"
        >
          <MousePointer2 size={16} />
        </button>

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
            onMouseEnter={showTip('Modelado por Voz')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-purple-400 hover:bg-slate-900 transition-all cursor-pointer"
            title="Modelado por Voz"
          >
            <Mic size={16} />
          </button>

          <button
            onClick={handlePhotoImport}
            onMouseEnter={showTip('Digitalizar Pizarra')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-all cursor-pointer"
            title="Digitalizar Pizarra"
          >
            <ImageIcon size={16} />
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

          {/* Exportar Modelo y Documentación Técnica (CU11) */}
          <button
            onClick={() => setIsExportOpen(true)}
            onMouseEnter={showTip('Exportar Modelo')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-950/30 transition-all cursor-pointer"
            title="Exportar Modelo y Documentación Técnica"
          >
            <Download size={16} />
          </button>

          {/* Generate Backend Spring Boot */}
          <button
            onClick={() => toast('Generador de Backend Spring Boot (4 Capas en ZIP) en preparación')}
            onMouseEnter={showTip('Generar Backend Spring Boot')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-950/30 transition-all cursor-pointer"
            title="Generar Backend Spring Boot"
          >
            <Code2 size={16} />
          </button>

          {/* Generate SQL DDL Script PostgreSQL 17 */}
          <button
            onClick={() => toast('Generador de Esquema DDL SQL para PostgreSQL 17 en preparación')}
            onMouseEnter={showTip('Generar Script SQL DDL')}
            onMouseLeave={hideTip}
            className="p-2 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer"
            title="Generar Script SQL DDL"
          >
            <Database size={16} />
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
          style={{ top: hoverTooltip.top }} 
          className="fixed left-14 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap pointer-events-none z-50 animate-fade-in"
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

      {/* Export Model & Documentation Modal (CU11) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </aside>
  );
};

export default Toolbar;
