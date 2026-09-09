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

  // 1. Calculate Geometry & SVG Paths
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (routing === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  } else if (routing === 'bezier') {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
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

  // Offset endpoint labels cleanly based on handle orientation
  const { x: sourceCardX, y: sourceCardY } = getEndpointLabelPosition(sourceX, sourceY, sourcePosition);
  const { x: targetCardX, y: targetCardY } = getEndpointLabelPosition(targetX, targetY, targetPosition);

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
          stroke: selected ? '#3b82f6' : theme.edgeStroke,
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
            className="nodrag nopan flex items-center gap-0.5 p-0.5 bg-slate-900/95 border border-slate-700/80 rounded-lg shadow-lg z-30 backdrop-blur-xs"
          >
            {/* SmoothStep (Ortogonal Suave) */}
            <button
              type="button"
              onClick={(e) => handleSetRouting(e, 'smoothstep')}
              title="Ortogonal Suave"
              className={`p-1 rounded-sm transition-all cursor-pointer ${
                routing === 'smoothstep'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className={`p-1 rounded-sm transition-all cursor-pointer ${
                routing === 'step'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className={`p-1 rounded-sm transition-all cursor-pointer ${
                routing === 'straight'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className={`p-1 rounded-sm transition-all cursor-pointer ${
                routing === 'bezier'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
            className="flex flex-col items-center px-1 py-0.5 rounded-xs select-none shadow-xs text-[10px] font-mono leading-tight"
          >
            {!hideCardinality && relData?.sourceCardinality && (
              <span className="font-bold text-[11px]">{relData.sourceCardinality}</span>
            )}
            {relData?.sourceRole && (
              <span className="text-slate-400 font-normal text-[10px]">{relData.sourceRole}</span>
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
            className="flex flex-col items-center px-1 py-0.5 rounded-xs select-none shadow-xs text-[10px] font-mono leading-tight"
          >
            {!hideCardinality && relData?.targetCardinality && (
              <span className="font-bold text-[11px]">{relData.targetCardinality}</span>
            )}
            {relData?.targetRole && (
              <span className="text-slate-400 font-normal text-[10px]">{relData.targetRole}</span>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
