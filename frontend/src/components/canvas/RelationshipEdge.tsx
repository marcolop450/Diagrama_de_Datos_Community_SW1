import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, Edge } from '@xyflow/react';
import { RelationshipData } from '../../types/diagram';
import { useAuthStore } from '../../stores/authStore';
import { getCanvasTheme } from '../../constants/canvasThemes';

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
  const theme = getCanvasTheme(user?.preferences?.canvasTheme);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6
  });

  const relData = data as RelationshipData | undefined;
  const relType = (relData?.type || 'association').toLowerCase();
  const isDashed = relType === 'implementation' || relType === 'realization' || relType === 'dependency';

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
  }

  // Offset cardinalities slightly from endpoints
  const sourceCardX = sourceX + (targetX >= sourceX ? 24 : -24);
  const sourceCardY = sourceY + (targetY >= sourceY ? 16 : -16);
  const targetCardX = targetX + (sourceX >= targetX ? 24 : -24);
  const targetCardY = targetY + (sourceY >= targetY ? 16 : -16);

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        id={id} 
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...(style || {}),
          strokeWidth: selected ? 2.4 : 1.6,
          stroke: selected ? theme.edgeStrokeSelected : theme.edgeStroke,
          strokeDasharray: isDashed ? '6,4' : 'none'
        }} 
      />

      <EdgeLabelRenderer>
        {/* UML 2.5 Association Label (Pure text along connection, never a box/card) */}
        {relData?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: theme.edgeLabelBg,
              color: theme.edgeLabelText,
            }}
            className="nodrag nopan px-1 py-0.5 text-[11px] font-mono font-medium rounded-xs select-none cursor-pointer transition-colors shadow-xs"
          >
            {relData.label}
          </div>
        )}

        {/* UML 2.5 Source Multiplicity / Cardinality (Text at endpoint, no card border) */}
        {relData?.sourceCardinality && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceCardX}px, ${sourceCardY}px)`,
              pointerEvents: 'none',
              backgroundColor: theme.edgeLabelBg,
              color: theme.edgeLabelText,
            }}
            className="px-1 text-[11px] font-mono font-bold rounded-xs select-none shadow-xs"
          >
            {relData.sourceCardinality}
          </div>
        )}

        {/* UML 2.5 Target Multiplicity / Cardinality (Text at endpoint, no card border) */}
        {relData?.targetCardinality && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetCardX}px, ${targetCardY}px)`,
              pointerEvents: 'none',
              backgroundColor: theme.edgeLabelBg,
              color: theme.edgeLabelText,
            }}
            className="px-1 text-[11px] font-mono font-bold rounded-xs select-none shadow-xs"
          >
            {relData.targetCardinality}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
