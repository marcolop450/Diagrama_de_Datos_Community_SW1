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
  Send,
  Users
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useCollabStore } from '../../stores/collabStore';
import { useAuthStore } from '../../stores/authStore';
import { useReactFlow } from '@xyflow/react';
import { ProjectHistoryModal } from '../history/ProjectHistoryModal';
import { NormalizationReportModal } from '../modals/NormalizationReportModal';
import { GenerateBackendModal } from '../modals/GenerateBackendModal';
import { SqlDdlModal } from '../modals/SqlDdlModal';
import { PostmanModal } from '../modals/PostmanModal';
import { VoiceModelingModal } from '../voice/VoiceModelingModal';
import { WhiteboardVisionModal } from '../vision/WhiteboardVisionModal';
import { LiveCollabModal } from '../collab/LiveCollabModal';
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

  const { user } = useAuthStore();
  const isArchitect = user?.role === 'ARQUITECTO' || user?.role === 'SUPER_ADMIN';
  const { isLive, participants, setModalOpen, isViewer, role: collabRole } = useCollabStore();
  const viewerMode = isLive && isViewer();
  const isHost = Boolean(
    (project?.ownerId && user?.userId && project.ownerId === user.userId) ||
    collabRole === 'host'
  );

  const handleSelectTool = (tool: string, label: string) => {
    if (!project) {
      toast.error('Abre o crea un modelo para usar las herramientas');
      return;
    }
    if (viewerMode) {
      toast.error('Modo Solo Lectura: No tienes permisos de edición en esta sala colaborativa');
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
    if (viewerMode) {
      toast.error('Modo Solo Lectura: No puedes realizar modificaciones por voz en esta sala');
      return;
    }
    setIsVoiceModalOpen((prev) => !prev);
  };

  const handlePhotoImport = () => {
    if (!project) {
      toast.error('Abre o crea un modelo para digitalizar una pizarra');
      return;
    }
    if (viewerMode) {
      toast.error('Modo Solo Lectura: No puedes importar ni digitalizar pizarras en esta sala');
      return;
    }
    setIsVisionModalOpen(true);
  };

  const handleLiveCollab = () => {
    if (!project?.id) {
      toast.error('Abre o crea un modelo para acceder al menú colaborativo');
      return;
    }
    setModalOpen(true);
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
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'pointer'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                : 'text-slate-400 hover:text-white hover:bg-[#1a1f2b]'
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
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'select-area'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                : 'text-slate-400 hover:text-indigo-400 hover:bg-[#1a1f2b]'
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
            disabled={!canUndo || viewerMode}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              canUndo && !viewerMode
                ? 'text-slate-300 hover:text-white hover:bg-[#1a1f2b] active:scale-95'
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
            disabled={!canRedo || viewerMode}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              canRedo && !viewerMode
                ? 'text-slate-300 hover:text-white hover:bg-[#1a1f2b] active:scale-95'
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
            disabled={!hasSelection || viewerMode}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              hasSelection && !viewerMode
                ? 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 active:scale-95 ring-1 ring-rose-500/30'
                : 'text-slate-600 cursor-not-allowed opacity-35'
            }`}
            title="Eliminar Selección"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="w-7 h-px bg-[#242934] my-1" />

        {/* UML Class Creation Tools (Click to Arm & Drop) */}
        <div data-tour="toolbar-classes" className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => handleSelectTool('add-class', 'Clase Entidad')}
            onMouseEnter={showTip('Clase Entidad')}
            onMouseLeave={hideTip}
            disabled={viewerMode}
            className={`p-2 rounded-lg transition-all ${
              viewerMode
                ? 'text-slate-600 cursor-not-allowed opacity-35'
                : activeTool === 'add-class'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50 cursor-pointer'
                : 'text-slate-400 hover:text-indigo-400 hover:bg-[#1a1f2b] cursor-pointer'
            }`}
            title="Añadir Clase Entidad"
          >
            <Box size={16} />
          </button>

          <button
            onClick={() => handleSelectTool('add-interface', 'Interfaz')}
            onMouseEnter={showTip('Interfaz')}
            onMouseLeave={hideTip}
            disabled={viewerMode}
            className={`p-2 rounded-lg transition-all ${
              viewerMode
                ? 'text-slate-600 cursor-not-allowed opacity-35'
                : activeTool === 'add-interface'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50 cursor-pointer'
                : 'text-slate-400 hover:text-indigo-400 hover:bg-[#1a1f2b] cursor-pointer'
            }`}
            title="Añadir Interfaz"
          >
            <Component size={16} />
          </button>

          <button
            onClick={() => handleSelectTool('add-abstract', 'Clase Abstracta')}
            onMouseEnter={showTip('Clase Abstracta')}
            onMouseLeave={hideTip}
            disabled={viewerMode}
            className={`p-2 rounded-lg transition-all ${
              viewerMode
                ? 'text-slate-600 cursor-not-allowed opacity-35'
                : activeTool === 'add-abstract'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/50 cursor-pointer'
                : 'text-slate-400 hover:text-amber-400 hover:bg-[#1a1f2b] cursor-pointer'
            }`}
            title="Añadir Clase Abstracta"
          >
            <Layers size={16} />
          </button>
        </div>

        <div className="w-7 h-px bg-[#242934] my-1" />

        {/* AI Tools */}
        <div data-tour="toolbar-ai-tools" className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleVoiceCommand}
            onMouseEnter={showTip('Modelar por Voz (PLN)')}
            onMouseLeave={hideTip}
            disabled={viewerMode}
            className={`p-2 rounded-lg transition-all ${
              viewerMode
                ? 'text-slate-600 cursor-not-allowed opacity-35'
                : isVoiceModalOpen
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400 cursor-pointer'
                : 'text-slate-400 hover:text-purple-400 hover:bg-[#181c24] cursor-pointer'
            }`}
            title="Modelar por Voz (PLN)"
          >
            <Mic size={16} />
          </button>

          {isArchitect && (
            <button
              onClick={handlePhotoImport}
              onMouseEnter={showTip('Digitalizar Foto de Pizarra')}
              onMouseLeave={hideTip}
              disabled={viewerMode}
              className={`p-2 rounded-lg transition-all ${
                viewerMode
                  ? 'text-slate-600 cursor-not-allowed opacity-35'
                : isVisionModalOpen
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400 cursor-pointer'
                : 'text-slate-400 hover:text-amber-400 hover:bg-[#181c24] cursor-pointer'
              }`}
              title="Digitalizar Foto de Pizarra"
            >
              <Camera size={16} />
            </button>
          )}
        </div>

        <div className="w-7 h-px bg-[#242934] my-1" />

        {/* CASE Architecture, Generation & History Tools */}
        <div data-tour="toolbar-case-tools" className="flex flex-col items-center gap-1.5">
          {/* Validar Normalización Lógica */}
          <button
            onClick={() => setIsNormalizationOpen(true)}
            onMouseEnter={showTip('Validar Normalización')}
            onMouseLeave={hideTip}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer"
            title="Validar Normalización"
          >
            <div className="relative">
              <ShieldCheck size={16} />
              <span 
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-[#0f1115] ${
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
            className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30 transition-all cursor-pointer"
            title="Consultar Historial y Trazabilidad"
          >
            <History size={16} />
          </button>

          {/* Deliverables de Producción (Exclusivo Arquitecto) */}
          {isArchitect && (
            <>
              {/* Generate Backend Spring Boot */}
              <button
                onClick={() => setIsGenerateBackendOpen(true)}
                onMouseEnter={showTip('Generar Backend Spring Boot')}
                onMouseLeave={hideTip}
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30 transition-all cursor-pointer"
                title="Generar Backend Spring Boot (4 Capas en ZIP)"
              >
                <Code2 size={16} />
              </button>

              {/* Generate SQL DDL Script PostgreSQL 17 */}
              <button
                onClick={() => setIsSqlDdlOpen(true)}
                onMouseEnter={showTip('Generar Script SQL DDL')}
                onMouseLeave={hideTip}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer"
                title="Generar Script SQL DDL (PostgreSQL 17)"
              >
                <Database size={16} />
              </button>

              {/* Generate Postman Collection v2.1 */}
              <button
                onClick={() => setIsPostmanOpen(true)}
                onMouseEnter={showTip('Generar Colección Postman')}
                onMouseLeave={hideTip}
                className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 transition-all cursor-pointer"
                title="Generar Colección Postman v2.1"
              >
                <Send size={16} />
              </button>
            </>
          )}

          {/* Espacio Colaborativo & Ajustes de Proyecto (Solo visible para Anfitrión) */}
          {isHost && (
            <button
              onClick={handleLiveCollab}
              onMouseEnter={showTip(
                !isLive
                  ? 'Espacio Colaborativo & Ajustes'
                  : participants.length <= 1
                  ? 'Sala en Reposo (1 participante)'
                  : `Sala Colaborativa Activa (${participants.length} conectados)`
              )}
              onMouseLeave={hideTip}
              className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                isLive
                  ? participants.length <= 1
                    ? 'bg-amber-600/20 text-amber-400 ring-1 ring-amber-500/50 hover:bg-amber-600/30'
                    : 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/50 hover:bg-emerald-600/30'
                  : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30'
              }`}
              title="Espacio Colaborativo & Ajustes"
            >
              <div className="relative">
                <Users
                  size={16}
                  className={
                    isLive
                      ? participants.length <= 1
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                      : ''
                  }
                />
                {isLive && (
                  <span
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                      participants.length <= 1
                        ? 'bg-amber-500 ring-1 ring-amber-400/50'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                )}
              </div>
            </button>
          )}
        </div>

        <div className="w-7 h-px bg-[#242934] my-1" />

        {/* Canvas Viewport Controls */}
        <button
          onClick={() => zoomIn()}
          onMouseEnter={showTip('Acercar Zoom')}
          onMouseLeave={hideTip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#181c24] rounded-lg transition-colors cursor-pointer"
          title="Acercar Zoom"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={() => zoomOut()}
          onMouseEnter={showTip('Alejar Zoom')}
          onMouseLeave={hideTip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#181c24] rounded-lg transition-colors cursor-pointer"
          title="Alejar Zoom"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={() => fitView({ padding: 0.25 })}
          onMouseEnter={showTip('Ajustar Vista')}
          onMouseLeave={hideTip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#181c24] rounded-lg transition-colors cursor-pointer"
          title="Ajustar Vista"
        >
          <Maximize size={15} />
        </button>
      </div>

      {/* Floating tooltip outside the scroll container */}
      {hoverTooltip && (
        <div 
          style={{ top: hoverTooltip.top, left: hoverTooltip.left }} 
          className="fixed -translate-y-1/2 px-3 py-1.5 bg-[#14171d] text-slate-100 text-[11px] font-medium font-sans rounded-lg shadow-2xl border border-[#242934] whitespace-nowrap pointer-events-none z-50 animate-fade-in"
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

      {/* Live Collaboration Modal (CU18) */}
      <LiveCollabModal />
    </aside>
  );
};

export default Toolbar;
