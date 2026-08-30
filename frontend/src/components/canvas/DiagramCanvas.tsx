import React, { useCallback, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  BackgroundVariant,
  MiniMap,
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
import ClassNodeComponent from './ClassNodeComponent';
import RelationshipEdge from './RelationshipEdge';
import { ClassNodeData, RelationshipData } from '../../types/diagram';
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
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

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
      className={`w-full h-full bg-transparent relative select-none ${isPlacementMode ? 'cursor-crosshair' : ''}`} 
      ref={reactFlowWrapper}
    >
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
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: 'umlEdge',
          animated: false,
        }}
      >
        <Background 
          gap={26} 
          size={1.6}
          color="#1E293B" 
          variant={BackgroundVariant.Dots} 
        />

        {/* Custom MiniMap: hidden on very small viewports */}
        <MiniMap 
          zoomable 
          pannable 
          nodeColor="#1E293B" 
          nodeStrokeColor="#3B82F6"
          nodeStrokeWidth={2}
          maskColor="rgba(11, 15, 25, 0.8)"
          className="!bg-slate-950/90 !border !border-slate-800 !rounded-xl !shadow-2xl overflow-hidden !m-3 hidden md:block"
        />

        {/* Top Info Banner / Placement Banner */}
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800/80 text-slate-300 rounded-lg text-xs font-mono shadow-lg backdrop-blur-md">
              <Info size={13} className="text-blue-400" />
              <span className="hidden sm:inline">Haz clic en una clase para editarla o selecciona una herramienta para colocar</span>
              <span className="sm:hidden">Toca una clase para editar</span>
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}
