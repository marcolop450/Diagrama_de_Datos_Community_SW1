import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, Edge } from '@xyflow/react';
import { RelationshipData } from '../../types/diagram';

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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8
  });

  const relData = data as RelationshipData | undefined;
  const relType = relData?.type || 'association';
  const isDashed = relType === 'implementation' || relType === 'dependency';

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
        style={{
          ...(style || {}),
          strokeWidth: selected ? 2.5 : 1.8,
          stroke: selected ? '#60A5FA' : '#64748B',
          strokeDasharray: isDashed ? '6,4' : 'none'
        }} 
      />

      <EdgeLabelRenderer>
        {/* Relationship Name / Verb Label (Middle) */}
        {relData?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan px-2 py-0.5 bg-slate-900/95 border border-slate-700/80 rounded-md text-[11px] font-mono font-medium text-slate-200 shadow-md backdrop-blur-sm select-none"
          >
            {relData.label}
          </div>
        )}

        {/* Source Cardinality Badge */}
        {relData?.sourceCardinality && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceCardX}px, ${sourceCardY}px)`,
              pointerEvents: 'none',
            }}
            className="px-1.5 py-0.2 bg-slate-900/90 border border-slate-800 rounded text-[10px] font-mono font-semibold text-blue-300 select-none shadow-sm"
          >
            {relData.sourceCardinality}
          </div>
        )}

        {/* Target Cardinality Badge */}
        {relData?.targetCardinality && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetCardX}px, ${targetCardY}px)`,
              pointerEvents: 'none',
            }}
            className="px-1.5 py-0.2 bg-slate-900/90 border border-slate-800 rounded text-[10px] font-mono font-semibold text-indigo-300 select-none shadow-sm"
          >
            {relData.targetCardinality}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
