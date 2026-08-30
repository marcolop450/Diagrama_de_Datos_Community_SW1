import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { ClassNodeData, ClassAttribute, ClassMethod } from '../../types/diagram';
import { Box, Layers, Component } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';

const getVisibilityBadge = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return <span className="text-emerald-400 font-bold w-3.5 inline-block select-none">+</span>;
    case 'private':
      return <span className="text-rose-400 font-bold w-3.5 inline-block select-none">-</span>;
    case 'protected':
      return <span className="text-amber-400 font-bold w-3.5 inline-block select-none">#</span>;
    case 'package':
      return <span className="text-sky-400 font-bold w-3.5 inline-block select-none">~</span>;
    default:
      return <span className="text-emerald-400 font-bold w-3.5 inline-block select-none">+</span>;
  }
};

const getStereotypeHeaderStyle = (stereotype?: string, isAbstract?: boolean) => {
  if (isAbstract) return 'from-amber-950/70 to-slate-900 border-amber-800/40 text-amber-300';
  switch (stereotype?.toLowerCase()) {
    case 'interface':
      return 'from-indigo-950/70 to-slate-900 border-indigo-800/40 text-indigo-300';
    case 'service':
      return 'from-emerald-950/70 to-slate-900 border-emerald-800/40 text-emerald-300';
    case 'controller':
      return 'from-purple-950/70 to-slate-900 border-purple-800/40 text-purple-300';
    case 'repository':
      return 'from-cyan-950/70 to-slate-900 border-cyan-800/40 text-cyan-300';
    case 'entity':
    default:
      return 'from-blue-950/70 to-slate-900 border-blue-800/40 text-blue-300';
  }
};

type CustomNodeProps = NodeProps<Node<ClassNodeData>>;

const ClassNodeComponent = ({ data, selected }: CustomNodeProps) => {
  const { setSelectedNode } = useDiagramStore();
  const { setPropertiesPanelOpen } = useUiStore();

  const isInterface = data.stereotype?.toLowerCase() === 'interface';
  const isAbstract = data.isAbstract || data.stereotype?.toLowerCase() === 'abstract';
  const attributes: ClassAttribute[] = data.attributes || [];
  const methods: ClassMethod[] = data.methods || [];

  const handleDoubleClick = () => {
    setSelectedNode({ id: data.id, position: { x: 0, y: 0 }, data } as any);
    setPropertiesPanelOpen(true);
  };

  return (
    <div className="relative group" onDoubleClick={handleDoubleClick}>
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
          bg-slate-900/98 backdrop-blur-lg rounded-xl border shadow-2xl min-w-[240px] max-w-[340px] 
          font-mono text-xs overflow-hidden card-hover-effect animate-fade-in-up select-none
          ${selected 
            ? 'border-blue-400 ring-2 ring-blue-400/50 shadow-blue-500/30 scale-[1.02]' 
            : 'border-slate-700/80 hover:border-slate-500 hover:shadow-slate-900/60'
          }
        `}
      >
        {/* Compartment 1: UML Header */}
        <div className={`p-2.5 bg-gradient-to-b ${getStereotypeHeaderStyle(data.stereotype, isAbstract)} border-b border-slate-700/80 text-center`}>
          {data.stereotype && (
            <div className="mb-1 flex justify-center">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider rounded border border-current bg-slate-950/40">
                {isInterface && <Component size={10} />}
                {isAbstract && <Layers size={10} />}
                {!isInterface && !isAbstract && <Box size={10} />}
                &lt;&lt;{data.stereotype}&gt;&gt;
              </span>
            </div>
          )}

          <h3 className={`font-bold text-white text-sm tracking-wide ${isAbstract ? 'italic text-amber-200' : ''}`}>
            {data.name || 'ClaseSinNombre'}
          </h3>
        </div>

        {/* Compartment 2: UML Attributes */}
        <div className="p-2.5 border-b border-slate-800/80 space-y-1 bg-slate-950/50 min-h-[36px]">
          {attributes.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic">sin atributos</div>
          ) : (
            attributes.map((attr: ClassAttribute) => (
              <div 
                key={attr.id} 
                className={`flex items-center text-[11px] leading-relaxed text-slate-200 ${attr.isStatic ? 'underline decoration-slate-400 font-semibold' : ''}`}
              >
                {getVisibilityBadge(attr.visibility)}
                <span className="font-semibold text-slate-100 ml-1">{attr.name}</span>
                <span className="text-slate-400 mx-1">:</span>
                <span className="text-blue-300 font-medium">{attr.type}</span>
              </div>
            ))
          )}
        </div>

        {/* Compartment 3: UML Methods */}
        <div className="p-2.5 space-y-1 bg-slate-950/80 min-h-[36px]">
          {methods.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic">sin operaciones</div>
          ) : (
            methods.map((method: ClassMethod) => (
              <div 
                key={method.id} 
                className={`flex items-start text-[11px] leading-relaxed text-slate-200 ${
                  method.isStatic ? 'underline decoration-slate-400' : ''
                } ${method.isAbstract ? 'italic text-amber-200' : ''}`}
              >
                {getVisibilityBadge(method.visibility)}
                <div className="ml-1 min-w-0 flex-1">
                  <span className="font-semibold text-white">{method.name}</span>
                  <span className="text-slate-400">(</span>
                  <span className="text-slate-300">
                    {method.parameters?.map((p: { name: string; type: string }, i: number) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <span className="text-slate-200">{p.name}</span>
                        <span className="text-slate-400">:</span>
                        <span className="text-blue-300">{p.type}</span>
                      </span>
                    ))}
                  </span>
                  <span className="text-slate-400">):</span>
                  <span className="text-emerald-300 font-medium ml-1">{method.returnType}</span>
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
