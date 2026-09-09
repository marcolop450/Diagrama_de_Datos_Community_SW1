import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  BackgroundVariant,
  Panel,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  ConnectionMode,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import ClassNodeComponent from './ClassNodeComponent';
import RelationshipEdge from './RelationshipEdge';
import { ClassNodeData, RelationshipData } from '../../types/diagram';
import { getCanvasTheme } from '../../constants/canvasThemes';
import { Info, MousePointerClick, X, FolderKanban, FolderPlus, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const nodeTypes: NodeTypes = {
  classNode: ClassNodeComponent as any,
};

const edgeTypes: EdgeTypes = {
  umlEdge: RelationshipEdge as any,
  relationship: RelationshipEdge as any,
};

export default function DiagramCanvas() {
  const { 
    project,
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    onNodeDragStart,
    selectedNode,
    selectedEdge,
    setSelectedNode, 
    setSelectedEdge,
    deleteClassNode,
    deleteRelationship,
    reconnectRelationship,
    createNewClass,
    cloneClassNode,
    copyClassNode,
    pasteClassNode,
    undo,
    redo,
    canUndo,
    canRedo
  } = useDiagramStore();
  
  const { activeTool, setActiveTool, setPropertiesPanelOpen, openModal } = useUiStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { screenToFlowPosition, zoomTo } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [showBanner, setShowBanner] = useState(true);
  const initialZoomAppliedRef = useRef(false);

  const currentTheme = getCanvasTheme(user?.preferences?.canvasTheme);

  // Apply user's default zoom preference on mount or when changed
  useEffect(() => {
    if (nodes.length > 0 && !initialZoomAppliedRef.current) {
      initialZoomAppliedRef.current = true;
      const targetZoom = user?.preferences?.defaultZoom ?? 1.0;
      const timer = setTimeout(() => {
        zoomTo(targetZoom, { duration: 250 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, user?.preferences?.defaultZoom, zoomTo]);

  useEffect(() => {
    if (initialZoomAppliedRef.current && user?.preferences?.defaultZoom) {
      zoomTo(user.preferences.defaultZoom, { duration: 200 });
    }
  }, [user?.preferences?.defaultZoom, zoomTo]);

  const isPlacementMode = activeTool === 'add-class' || activeTool === 'add-interface' || activeTool === 'add-abstract';

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, Delete, Escape) with input immunity
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        (activeEl as HTMLElement).isContentEditable
      );
      if (isInputActive) return;

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
        return;
      }

      // Ctrl+C: Copy selected class
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedNode) {
          e.preventDefault();
          copyClassNode(selectedNode.id);
        }
        return;
      }

      // Ctrl+V: Paste copied class
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        pasteClassNode();
        return;
      }

      // Ctrl+D: Duplicate selected class immediately
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedNode) {
          e.preventDefault();
          cloneClassNode(selectedNode.id);
          toast.success(`Clase '${selectedNode.data.name}' duplicada`);
        }
        return;
      }

      // Delete / Backspace: Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          e.preventDefault();
          deleteClassNode(selectedNode.id);
          toast.success(`Clase '${selectedNode.data.name}' eliminada`);
        } else if (selectedEdge) {
          e.preventDefault();
          deleteRelationship(selectedEdge.id);
          toast.success('Relación eliminada');
        }
        return;
      }

      // Escape: Cancel placement or deselect
      if (e.key === 'Escape') {
        if (isPlacementMode) {
          setActiveTool('pointer');
          toast('Colocación cancelada');
        } else if (selectedNode || selectedEdge) {
          setSelectedNode(null);
          setSelectedEdge(null);
          setPropertiesPanelOpen(false);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canUndo, 
    canRedo, 
    undo, 
    redo, 
    selectedNode, 
    selectedEdge, 
    deleteClassNode, 
    deleteRelationship, 
    cloneClassNode,
    copyClassNode,
    pasteClassNode,
    isPlacementMode, 
    setActiveTool, 
    setSelectedNode, 
    setSelectedEdge, 
    setPropertiesPanelOpen
  ]);

  // Click on Canvas Pane
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (isPlacementMode) {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (activeTool === 'add-class') {
        createNewClass('NuevaEntidad', 'entity', false, position);
        toast.success('Clase entidad colocada');
      } else if (activeTool === 'add-interface') {
        createNewClass('INuevoServicio', 'interface', false, position);
        toast.success('Interfaz colocada');
      } else if (activeTool === 'add-abstract') {
        createNewClass('ClaseBase', 'abstract', true, position);
        toast.success('Clase abstracta colocada');
      }

      setActiveTool('pointer');
      return;
    }

    setSelectedNode(null);
    setSelectedEdge(null);
    setPropertiesPanelOpen(false);
  }, [isPlacementMode, activeTool, screenToFlowPosition, createNewClass, setActiveTool, setSelectedNode, setSelectedEdge, setPropertiesPanelOpen]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ClassNodeData>) => {
    if (isPlacementMode) return;
    setSelectedNode(node);
    setPropertiesPanelOpen(true);
  }, [isPlacementMode, setSelectedNode, setPropertiesPanelOpen]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge<RelationshipData>) => {
    if (isPlacementMode) return;
    setSelectedEdge(edge);
    setPropertiesPanelOpen(true);
  }, [isPlacementMode, setSelectedEdge, setPropertiesPanelOpen]);

  const handleReconnect = useCallback((oldEdge: Edge<RelationshipData>, newConnection: Connection) => {
    reconnectRelationship(oldEdge, newConnection);
  }, [reconnectRelationship]);

  if (!project) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none"
        style={{ backgroundColor: currentTheme.canvasBg }}
      >
        <div className="max-w-md w-full p-8 bg-slate-900/70 border border-slate-800/90 rounded-lg shadow-2xl backdrop-blur-xs flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-md bg-blue-600/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-inner">
            <Layers size={30} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              Ningún modelo UML abierto
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Selecciona un modelo desde tus proyectos o crea uno nuevo para comenzar a modelar clases y relaciones en el editor CASE.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-2">
            <button
              onClick={() => navigate('/projects')}
              className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <FolderKanban size={15} />
              <span>Mis Proyectos</span>
            </button>
            <button
              onClick={() => openModal('createProject')}
              className="w-full sm:flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/70 rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <FolderPlus size={15} className="text-blue-400" />
              <span>Crear Modelo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-tour="diagram-canvas"
      className={`w-full h-full relative select-none transition-colors duration-200 ${isPlacementMode ? 'cursor-crosshair' : ''}`} 
      style={{ backgroundColor: currentTheme.canvasBg }}
      ref={reactFlowWrapper}
    >
      {/* UML 2.5 Standard SVG Marker Definitions (Guaranteed non-zero bounding box for zero-gap tip contact) */}
      <svg 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          overflow: 'visible',
          zIndex: 0
        }} 
        aria-hidden="true"
      >
        <defs>
          {/* Association: Open Arrow at target (zero-gap tip contact) */}
          <marker id="uml-association" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="11" markerHeight="11" orient="auto">
            <polyline points="3,3 15,8 3,13" fill="none" stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>

          {/* Composition: Filled Diamond at source (zero-gap tip contact) */}
          <marker id="uml-composition" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="13" markerHeight="13" orient="auto">
            <polygon points="1,8 8,3 15,8 8,13" fill={currentTheme.edgeMarkerStroke} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.5" />
          </marker>

          {/* Aggregation: Hollow Diamond at source (zero-gap tip contact) */}
          <marker id="uml-aggregation" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="13" markerHeight="13" orient="auto">
            <polygon points="1,8 8,3 15,8 8,13" fill={currentTheme.edgeMarkerFill} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" />
          </marker>

          {/* Generalization / Inheritance: Hollow Closed Triangle at target */}
          <marker id="uml-generalization" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="13" markerHeight="13" orient="auto">
            <polygon points="2,3 15,8 2,13" fill={currentTheme.edgeMarkerFill} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" strokeLinejoin="round" />
          </marker>

          {/* Realization / Implementation: Hollow Closed Triangle at target */}
          <marker id="uml-realization" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="13" markerHeight="13" orient="auto">
            <polygon points="2,3 15,8 2,13" fill={currentTheme.edgeMarkerFill} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" />
          </marker>

          {/* Dependency: Open Arrow at target */}
          <marker id="uml-dependency" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="11" markerHeight="11" orient="auto">
            <polyline points="3,3 15,8 3,13" fill="none" stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable={true}
        reconnectRadius={24}
        onReconnect={handleReconnect}
        minZoom={0.15}
        maxZoom={2.5}
        snapToGrid={user?.preferences?.snapToGrid ?? true}
        snapGrid={[16, 16]}
        defaultViewport={{ x: 0, y: 0, zoom: user?.preferences?.defaultZoom ?? 1.0 }}
        defaultEdgeOptions={{
          type: 'umlEdge',
          animated: false,
        }}
      >
        {/* Engineering Millimeter Grid (Rejilla Milimétrica Profesional UML) */}
        {user?.preferences?.grid !== false && (
          <>
            {/* Minor grid lines (16px aligned with snapGrid) */}
            <Background 
              id="grid-minor"
              gap={16} 
              size={1}
              color={currentTheme.gridMinor} 
              variant={BackgroundVariant.Lines} 
            />
            {/* Major grid lines (80px = 5x16px for architectural rhythm) */}
            <Background 
              id="grid-major"
              gap={80} 
              size={1.2}
              color={currentTheme.gridMajor} 
              variant={BackgroundVariant.Lines} 
            />
          </>
        )}

        {/* Top Info Banner / Placement Banner */}
        {(isPlacementMode || showBanner) && (
          <Panel position="top-center" className="!m-3">
            {isPlacementMode ? (
              <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 border border-blue-400/50 text-blue-100 rounded-md text-xs font-mono shadow-2xl backdrop-blur-md animate-bounce">
                <MousePointerClick size={15} className="text-blue-300 animate-pulse" />
                <span>Haz clic en el lienzo para colocar la {activeTool === 'add-interface' ? 'Interfaz' : activeTool === 'add-abstract' ? 'Clase Abstracta' : 'Clase'}</span>
                <button 
                  onClick={() => setActiveTool('pointer')}
                  className="p-1 hover:bg-white/10 rounded ml-1 cursor-pointer"
                  title="Cancelar • Esc"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 border border-slate-800/80 text-slate-300 rounded-md text-xs font-mono shadow-lg backdrop-blur-md animate-fade-in">
                <Info size={13} className="text-blue-400 shrink-0" />
                <span className="hidden sm:inline">Haz clic en una clase para editarla o selecciona una herramienta para colocar</span>
                <span className="sm:hidden">Toca una clase para editar</span>
                <button
                  type="button"
                  onClick={() => setShowBanner(false)}
                  className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer ml-1"
                  title="Cerrar mensaje"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
