import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { ClassNodeData, ClassAttribute, ClassMethod } from '../../types/diagram';
import { Box, Layers, Component } from 'lucide-react';

const getVisibilityBadge = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return <span className="text-emerald-400 font-bold w-3 inline-block select-none">+</span>;
    case 'private':
      return <span className="text-rose-400 font-bold w-3 inline-block select-none">-</span>;
    case 'protected':
      return <span className="text-amber-400 font-bold w-3 inline-block select-none">#</span>;
    case 'package':
      return <span className="text-sky-400 font-bold w-3 inline-block select-none">~</span>;
    default:
      return <span className="text-emerald-400 font-bold w-3 inline-block select-none">+</span>;
  }
};

const getStereotypeColor = (stereotype?: string) => {
  switch (stereotype?.toLowerCase()) {
    case 'entity':
      return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
    case 'interface':
      return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
    case 'service':
      return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
    case 'controller':
      return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
    case 'repository':
      return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
    default:
      return 'bg-slate-900 text-slate-300 border-slate-700';
  }
};

type CustomNodeProps = NodeProps<Node<ClassNodeData>>;

const ClassNodeComponent = ({ data, selected }: CustomNodeProps) => {
  const isInterface = data.stereotype?.toLowerCase() === 'interface';
  const isAbstract = data.isAbstract || data.stereotype?.toLowerCase() === 'abstract';
  const attributes: ClassAttribute[] = data.attributes || [];
  const methods: ClassMethod[] = data.methods || [];

  return (
    <div className="relative group">
      {/* 4 Connection Magnetic Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950 hover:!bg-blue-400 !transition-all" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-slate-950 hover:!bg-indigo-400 !transition-all" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950 hover:!bg-blue-400 !transition-all" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-slate-950 hover:!bg-indigo-400 !transition-all" 
      />

      {/* UML Class Card Container */}
      <div 
        className={`
          bg-slate-900/95 backdrop-blur-md rounded-xl border shadow-xl min-w-[230px] max-w-[320px] 
          font-mono text-xs overflow-hidden transition-all duration-150 select-none
          ${selected 
            ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/10' 
            : 'border-slate-700/80 hover:border-slate-600'
          }
        `}
      >
        {/* Compartment 1: UML Header (Stereotype + Class Name) */}
        <div className="p-2.5 bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-b border-slate-700/80 text-center">
          {data.stereotype && (
            <div className="mb-1 flex justify-center">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider rounded border ${getStereotypeColor(data.stereotype)}`}>
                {isInterface && <Component size={10} />}
                {isAbstract && <Layers size={10} />}
                {!isInterface && !isAbstract && <Box size={10} />}
                &lt;&lt;{data.stereotype}&gt;&gt;
              </span>
            </div>
          )}

          <h3 className={`font-bold text-slate-100 text-sm tracking-wide ${isAbstract ? 'italic text-indigo-300' : ''}`}>
            {data.name || 'ClaseSinNombre'}
          </h3>
        </div>

        {/* Compartment 2: UML Attributes */}
        <div className="p-2.5 border-b border-slate-800/80 space-y-1 bg-slate-950/40 min-h-[36px]">
          {attributes.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic">sin atributos</div>
          ) : (
            attributes.map((attr: ClassAttribute) => (
              <div 
                key={attr.id} 
                className={`flex items-center text-[11px] leading-relaxed text-slate-300 ${attr.isStatic ? 'underline decoration-slate-400' : ''}`}
              >
                {getVisibilityBadge(attr.visibility)}
                <span className="font-semibold text-slate-200 ml-1">{attr.name}</span>
                <span className="text-slate-400">:</span>
                <span className="text-blue-400 font-medium ml-1.5">{attr.type}</span>
              </div>
            ))
          )}
        </div>

        {/* Compartment 3: UML Methods */}
        <div className="p-2.5 space-y-1 bg-slate-950/60 min-h-[36px]">
          {methods.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic">sin operaciones</div>
          ) : (
            methods.map((method: ClassMethod) => (
              <div 
                key={method.id} 
                className={`flex items-start text-[11px] leading-relaxed text-slate-300 ${
                  method.isStatic ? 'underline decoration-slate-400' : ''
                } ${method.isAbstract ? 'italic text-indigo-300' : ''}`}
              >
                {getVisibilityBadge(method.visibility)}
                <div className="ml-1 min-w-0 flex-1">
                  <span className="font-semibold text-slate-100">{method.name}</span>
                  <span className="text-slate-400">(</span>
                  <span className="text-slate-400">
                    {method.parameters?.map((p: { name: string; type: string }, i: number) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <span className="text-slate-300">{p.name}</span>
                        <span className="text-slate-400">:</span>
                        <span className="text-blue-400">{p.type}</span>
                      </span>
                    ))}
                  </span>
                  <span className="text-slate-400">):</span>
                  <span className="text-emerald-400 font-medium ml-1">{method.returnType}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ClassNodeComponent);
