import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ClassNodeData } from '../../types/diagram';

const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'public': return '+';
    case 'private': return '-';
    case 'protected': return '#';
    case 'package': return '~';
    default: return '+';
  }
};

const ClassNodeComponent = ({ data, selected }: NodeProps<ClassNodeData>) => {
  return (
    <>
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-blue-500 rounded-full" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-blue-500 rounded-full" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-blue-500 rounded-full" />
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-blue-500 rounded-full" />

      {/* Class Box */}
      <div className={`
        bg-[#fefce8] border-2 rounded shadow-sm min-w-[160px] text-sm text-gray-900 font-mono
        ${selected ? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]' : 'border-yellow-500'}
      `}>
        {/* Header */}
        <div className="text-center p-2 border-b-2 border-yellow-500 bg-yellow-50 font-bold">
          {data.stereotype && (
            <div className="text-xs text-gray-600 font-normal">
              &lt;&lt;{data.stereotype}&gt;&gt;
            </div>
          )}
          <div className={data.isAbstract ? 'italic' : ''}>
            {data.name}
          </div>
        </div>

        {/* Attributes */}
        <div className="p-2 border-b-2 border-yellow-500 min-h-[30px]">
          {data.attributes?.map((attr) => (
            <div key={attr.id} className={attr.isStatic ? 'underline' : ''}>
              {getVisibilityIcon(attr.visibility)} {attr.name}: {attr.type}
            </div>
          ))}
        </div>

        {/* Methods */}
        <div className="p-2 min-h-[30px]">
          {data.methods?.map((method) => (
            <div 
              key={method.id} 
              className={`
                ${method.isStatic ? 'underline' : ''} 
                ${method.isAbstract ? 'italic' : ''}
              `}
            >
              {getVisibilityIcon(method.visibility)} {method.name}(
                {method.parameters?.map(p => `${p.name}: ${p.type}`).join(', ')}
              ): {method.returnType}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default memo(ClassNodeComponent);
