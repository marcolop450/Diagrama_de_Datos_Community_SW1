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
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import ClassNodeComponent from './ClassNodeComponent';
import RelationshipEdge from './RelationshipEdge';
import { ClassNodeData, RelationshipData } from '../../types/diagram';
import { getCanvasTheme } from '../../constants/canvasThemes';
import { Info, MousePointerClick, X } from 'lucide-react';
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
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setSelectedNode, 
    setSelectedEdge,
    createNewClass
  } = useDiagramStore();
  
  const { activeTool, setActiveTool, setPropertiesPanelOpen } = useUiStore();
  const { user } = useAuthStore();
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

  // Listen to Escape key to cancel placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacementMode) {
        setActiveTool('pointer');
        toast('Colocación cancelada');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacementMode, setActiveTool]);

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

  return (
    <div 
      data-tour="diagram-canvas"
      className={`w-full h-full relative select-none transition-colors duration-200 ${isPlacementMode ? 'cursor-crosshair' : ''}`} 
      style={{ backgroundColor: currentTheme.canvasBg }}
      ref={reactFlowWrapper}
    >
      {/* UML 2.5 Standard SVG Marker Definitions */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          {/* Composition: Filled Diamond at source */}
          <marker id="uml-composition" viewBox="0 0 20 20" refX="10" refY="10" markerWidth="14" markerHeight="14" orient="auto">
            <polygon points="10,3 17,10 10,17 3,10" fill={currentTheme.edgeMarkerStroke} stroke={currentTheme.edgeMarkerFill} strokeWidth="1.5" />
          </marker>

          {/* Aggregation: Hollow Diamond at source */}
          <marker id="uml-aggregation" viewBox="0 0 20 20" refX="10" refY="10" markerWidth="14" markerHeight="14" orient="auto">
            <polygon points="10,3 17,10 10,17 3,10" fill={currentTheme.edgeMarkerFill} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" />
          </marker>

          {/* Generalization / Inheritance: Hollow Closed Triangle at target */}
          <marker id="uml-generalization" viewBox="0 0 20 20" refX="16" refY="10" markerWidth="14" markerHeight="14" orient="auto">
            <polygon points="4,4 16,10 4,16" fill={currentTheme.edgeMarkerFill} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" />
          </marker>

          {/* Realization / Implementation: Hollow Closed Triangle at target */}
          <marker id="uml-realization" viewBox="0 0 20 20" refX="16" refY="10" markerWidth="14" markerHeight="14" orient="auto">
            <polygon points="4,4 16,10 4,16" fill={currentTheme.edgeMarkerFill} stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" />
          </marker>

          {/* Dependency: Open Arrow at target */}
          <marker id="uml-dependency" viewBox="0 0 20 20" refX="15" refY="10" markerWidth="12" markerHeight="12" orient="auto">
            <polyline points="5,4 15,10 5,16" fill="none" stroke={currentTheme.edgeMarkerStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
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
              <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 border border-blue-400/50 text-blue-100 rounded-xl text-xs font-mono shadow-2xl backdrop-blur-md animate-bounce">
                <MousePointerClick size={15} className="text-blue-300 animate-pulse" />
                <span>Haz clic en el lienzo para colocar la {activeTool === 'add-interface' ? 'Interfaz' : activeTool === 'add-abstract' ? 'Clase Abstracta' : 'Clase'}</span>
                <button 
                  onClick={() => setActiveTool('pointer')}
                  className="p-1 hover:bg-white/10 rounded ml-1 cursor-pointer"
                  title="Cancelar (Esc)"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 border border-slate-800/80 text-slate-300 rounded-xl text-xs font-mono shadow-lg backdrop-blur-md animate-fade-in">
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
