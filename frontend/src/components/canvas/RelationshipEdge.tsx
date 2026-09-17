import React from 'react';
import { 
  EdgeProps, 
  getSmoothStepPath,
  getStraightPath, 
  getBezierPath, 
  EdgeLabelRenderer, 
  BaseEdge, 
  Edge, 
  Position
} from '@xyflow/react';
import { RelationshipData, EdgeRoutingType } from '../../types/diagram';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { getCanvasTheme } from '../../constants/canvasThemes';

const getEndpointLabelPosition = (x: number, y: number, position: Position) => {
  switch (position) {
    case Position.Top:
      return { x: x + 20, y: y - 14 };
    case Position.Bottom:
      return { x: x + 20, y: y + 14 };
    case Position.Left:
      return { x: x - 24, y: y - 14 };
    case Position.Right:
      return { x: x + 24, y: y - 14 };
    default:
      return { x: x + 20, y: y - 14 };
  }
};

type CustomEdgeProps = EdgeProps<Edge<RelationshipData>>;

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
  data,
}: CustomEdgeProps) {
  const { user } = useAuthStore();
  const { updateRelationship } = useDiagramStore();
  const theme = getCanvasTheme(user?.preferences?.canvasTheme);

  const relData = data as RelationshipData | undefined;
  const routing: EdgeRoutingType = relData?.routing || 'smoothstep';

  // Detectar relaciones paralelas entre el mismo par de clases para trazar líneas distintas
  const edges = useDiagramStore((s) => s.edges);
  const currentEdge = edges.find((e) => e.id === id);
  const srcId = currentEdge?.source;
  const tgtId = currentEdge?.target;

  let parallelIndex = 0;
  let parallelCount = 1;

  if (srcId && tgtId) {
    const parallelEdges = edges.filter(
      (e) => (e.source === srcId && e.target === tgtId) || (e.source === tgtId && e.target === srcId)
    );
    parallelCount = parallelEdges.length;
    parallelIndex = parallelEdges.findIndex((e) => e.id === id);
    if (parallelIndex === -1) parallelIndex = 0;
  }

  // 1. Calculate Geometry & SVG Paths
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  const isSelfLoop = !!(srcId && tgtId && srcId === tgtId);
  const pathOffset = parallelCount > 1 ? 24 + parallelIndex * 28 : 20;

  if (isSelfLoop) {
    // Trazado reflexivo (auto-asociación) canónico en arco visible
    const loopSize = 45 + parallelIndex * 25;
    edgePath = `M ${sourceX} ${sourceY} C ${sourceX + loopSize} ${sourceY - loopSize}, ${targetX + loopSize} ${targetY + loopSize}, ${targetX} ${targetY}`;
    labelX = Math.max(sourceX, targetX) + loopSize * 0.7;
    labelY = (sourceY + targetY) / 2;
  } else if (routing === 'straight') {
    if (parallelCount > 1) {
      const curvature = 0.2 + parallelIndex * 0.22;
      [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature
      });
    } else {
      [edgePath, labelX, labelY] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      });
    }
  } else if (routing === 'bezier') {
    const curvature = 0.25 + parallelIndex * 0.22;
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature
    });
  } else if (routing === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
      offset: pathOffset
    });
  } else {
    // Default: 'smoothstep' (Ortogonal Suave)
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
      offset: pathOffset
    });
  }

  const handleSetRouting = (e: React.MouseEvent, newRouting: EdgeRoutingType) => {
    e.stopPropagation();
    updateRelationship(id, { routing: newRouting });
  };

  // 2. UML 2.5 Decoration & Type Properties
  const relType = (relData?.type || 'association').toLowerCase();
  const isDashed = relType === 'implementation' || relType === 'realization' || relType === 'dependency';
  const isInheritanceOrRealization = relType === 'inheritance' || relType === 'generalization' || relType === 'realization' || relType === 'implementation';
  const isDependency = relType === 'dependency';
  const hideCardinality = isInheritanceOrRealization || isDependency;

  let markerStart: string | undefined;
  let markerEnd: string | undefined;

  if (relType === 'composition') {
    markerStart = 'url(#uml-composition)';
  } else if (relType === 'aggregation') {
    markerStart = 'url(#uml-aggregation)';
  }

  if (relType === 'inheritance' || relType === 'generalization') {
    markerEnd = 'url(#uml-generalization)';
  } else if (relType === 'implementation' || relType === 'realization') {
    markerEnd = 'url(#uml-realization)';
  } else if (relType === 'dependency') {
    markerEnd = 'url(#uml-dependency)';
  } else if (relType === 'association') {
    if (relData?.isDirected !== false) {
      markerEnd = 'url(#uml-association)';
    }
  }

  // Offset endpoint labels cleanly based on handle orientation and parallel index
  const { x: rawSrcX, y: rawSrcY } = getEndpointLabelPosition(sourceX, sourceY, sourcePosition);
  const { x: rawTgtX, y: rawTgtY } = getEndpointLabelPosition(targetX, targetY, targetPosition);

  const labelShift = parallelCount > 1 ? (parallelIndex - (parallelCount - 1) / 2) * 14 : 0;
  const isSrcHorizontal = sourcePosition === Position.Left || sourcePosition === Position.Right;
  const isTgtHorizontal = targetPosition === Position.Left || targetPosition === Position.Right;

  const sourceCardX = isSrcHorizontal ? rawSrcX : rawSrcX + labelShift;
  const sourceCardY = isSrcHorizontal ? rawSrcY + labelShift : rawSrcY;
  const targetCardX = isTgtHorizontal ? rawTgtX : rawTgtX + labelShift;
  const targetCardY = isTgtHorizontal ? rawTgtY + labelShift : rawTgtY;

  const showSourceLabel = (!hideCardinality && !!relData?.sourceCardinality) || !!relData?.sourceRole;
  const showTargetLabel = (!hideCardinality && !!relData?.targetCardinality) || !!relData?.targetRole;

  return (
    <>
      {/* Hit area for selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="react-flow__edge-interaction cursor-pointer"
      />

      {/* Main Canonical UML Edge Line */}
      <BaseEdge 
        path={edgePath} 
        id={id} 
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...(style || {}),
          strokeWidth: selected ? 2 : 1.5,
          stroke: selected ? '#5c68e2' : theme.edgeStroke,
          strokeDasharray: isDashed ? '5,4' : 'none',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }} 
      />

      <EdgeLabelRenderer>
        {/* UML 2.5 Association Label (Centered along edge, clean badge) */}
        {relData?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: theme.edgeLabelBg,
              color: theme.edgeLabelText,
            }}
            className="nodrag nopan px-1.5 py-0.5 text-[11px] font-mono font-medium rounded-xs select-none cursor-pointer transition-colors shadow-xs"
          >
            {relData.label}
          </div>
        )}

        {/* Minimalist Floating Quick Routing Toolbar (Discreet CASE Tool Style) */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - (relData?.label ? 28 : 22)}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan flex items-center gap-0.5 p-1 bg-[#14171d]/95 border border-[#242934] rounded-xl shadow-2xl z-30 backdrop-blur-md ring-1 ring-white/5"
          >
            {/* SmoothStep (Ortogonal Suave) */}
            <button
              type="button"
              onClick={(e) => handleSetRouting(e, 'smoothstep')}
              title="Ortogonal Suave"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                routing === 'smoothstep'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 14V8a4 4 0 0 1 4-4h8" />
              </svg>
            </button>

            {/* Step (Ortogonal Recto 90°) */}
            <button
              type="button"
              onClick={(e) => handleSetRouting(e, 'step')}
              title="Ortogonal 90°"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                routing === 'step'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <path d="M2 14V4h12" />
              </svg>
            </button>

            {/* Straight (Línea Recta / Diagonal) */}
            <button
              type="button"
              onClick={(e) => handleSetRouting(e, 'straight')}
              title="Línea Recta / Diagonal"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                routing === 'straight'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="14" x2="14" y2="2" />
              </svg>
            </button>

            {/* Bezier (Curva Bézier / Curvear) */}
            <button
              type="button"
              onClick={(e) => handleSetRouting(e, 'bezier')}
              title="Curva Bézier"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                routing === 'bezier'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-[#1f2430]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 14C5 14 5 2 14 2" />
              </svg>
            </button>
          </div>
        )}

        {/* UML 2.5 Source Endpoint: Multiplicity & Role */}
        {showSourceLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceCardX}px, ${sourceCardY}px)`,
              pointerEvents: 'none',
              backgroundColor: theme.edgeLabelBg,
              color: theme.edgeLabelText,
            }}
            className="flex flex-col items-center px-1.5 py-0.5 rounded-[3px] select-none shadow-sm text-[10px] font-mono leading-tight border border-white/5"
          >
            {!hideCardinality && relData?.sourceCardinality && (
              <span className="font-bold text-[11px]">{relData.sourceCardinality}</span>
            )}
            {relData?.sourceRole && (
              <span className="text-slate-400 font-normal text-[10px] font-sans">{relData.sourceRole}</span>
            )}
          </div>
        )}

        {/* UML 2.5 Target Endpoint: Multiplicity & Role */}
        {showTargetLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetCardX}px, ${targetCardY}px)`,
              pointerEvents: 'none',
              backgroundColor: theme.edgeLabelBg,
              color: theme.edgeLabelText,
            }}
            className="flex flex-col items-center px-1.5 py-0.5 rounded-[3px] select-none shadow-sm text-[10px] font-mono leading-tight border border-white/5"
          >
            {!hideCardinality && relData?.targetCardinality && (
              <span className="font-bold text-[11px]">{relData.targetCardinality}</span>
            )}
            {relData?.targetRole && (
              <span className="text-slate-400 font-normal text-[10px] font-sans">{relData.targetRole}</span>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
