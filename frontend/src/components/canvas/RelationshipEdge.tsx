import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { RelationshipData } from '../../types/diagram';

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<RelationshipData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isDashed = data?.type === 'implementation' || data?.type === 'dependency';

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        id={id} 
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#1f2937',
          strokeDasharray: isDashed ? '5,5' : 'none'
        }} 
        markerEnd={markerEnd} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'white',
            padding: '2px 4px',
            borderRadius: 3,
            fontSize: 12,
            fontWeight: 500,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {data?.label}
        </div>
        {/* Multiplicities could be added near source/target coords */}
        {data?.sourceCardinality && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + (targetX > sourceX ? 20 : -20)}px, ${sourceY + (targetY > sourceY ? 20 : -20)}px)`,
              fontSize: 12,
              background: 'white'
            }}
          >
            {data.sourceCardinality}
          </div>
        )}
        {data?.targetCardinality && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX + (sourceX > targetX ? 20 : -20)}px, ${targetY + (sourceY > targetY ? 20 : -20)}px)`,
              fontSize: 12,
              background: 'white'
            }}
          >
            {data.targetCardinality}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
