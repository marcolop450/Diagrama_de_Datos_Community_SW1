import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { ClassNodeData, ClassAttribute, ClassMethod } from '../../types/diagram';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useAuthStore } from '../../stores/authStore';
import { getCanvasTheme } from '../../constants/canvasThemes';

const getVisibilitySymbol = (visibility: string) => {
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

type CustomNodeProps = NodeProps<Node<ClassNodeData>>;

const ClassNodeComponent = ({ data, selected }: CustomNodeProps) => {
  const { setSelectedNode } = useDiagramStore();
  const { setPropertiesPanelOpen } = useUiStore();
  const { user } = useAuthStore();
  const theme = getCanvasTheme(user?.preferences?.canvasTheme);

  const isAbstract = data.isAbstract || data.stereotype?.toLowerCase() === 'abstract';
  const attributes: ClassAttribute[] = data.attributes || [];
  const methods: ClassMethod[] = data.methods || [];

  const handleDoubleClick = () => {
    setSelectedNode({ id: data.id, position: { x: 0, y: 0 }, data } as any);
    setPropertiesPanelOpen(true);
  };

  return (
    <div 
      className="relative group cursor-pointer rounded-sm border min-w-[240px] max-w-[360px] font-mono text-xs select-none transition-all duration-150"
      style={{
        backgroundColor: theme.nodeBg,
        borderColor: selected ? theme.nodeBorderSelected : theme.nodeBorder,
        boxShadow: selected ? theme.nodeShadowSelected : '0 4px 14px rgba(0, 0, 0, 0.25)',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 4 Connection Magnetic Handles (UML Ports - precisely centered, zero hover displacement) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        style={{ 
          top: 0, 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-2.5 !h-2.5 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/40 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ 
          bottom: 0, 
          left: '50%', 
          transform: 'translate(-50%, 50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-2.5 !h-2.5 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/40 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        style={{ 
          top: '50%', 
          left: 0, 
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-2.5 !h-2.5 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/40 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ 
          top: '50%', 
          right: 0, 
          transform: 'translate(50%, -50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-2.5 !h-2.5 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/40 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />

      {/* Compartment 1: UML Header (Stereotype + Class Name) */}
      <div 
        className="pt-4 pb-2.5 px-4 border-b flex flex-col items-center justify-center text-center transition-colors"
        style={{
          backgroundColor: theme.nodeHeaderBg,
          borderColor: theme.divider,
        }}
      >
        {data.stereotype && (
          <div 
            className="text-[10px] font-mono tracking-normal mb-0.5 select-none text-center font-semibold"
            style={{ color: theme.nodeStereotypeText }}
          >
            &laquo;{data.stereotype}&raquo;
          </div>
        )}

        <h3 
          className={`font-sans font-bold text-[13px] tracking-tight truncate text-center w-full ${isAbstract ? 'italic' : ''}`}
          style={{ color: theme.nodeText }}
        >
          {data.name || 'ClaseSinNombre'}
        </h3>
      </div>

      {/* Compartment 2: UML Attributes (Vis + Name : Type {PK}) */}
      <div 
        className="px-3 py-2 border-b space-y-1 min-h-[32px] transition-colors"
        style={{
          backgroundColor: theme.attrBg,
          borderColor: theme.divider,
        }}
      >
        {attributes.length === 0 ? (
          <div className="text-[10px] italic py-0.5" style={{ color: theme.nodeTextMuted }}>
            sin atributos
          </div>
        ) : (
          attributes.map((attr: ClassAttribute) => (
            <div 
              key={attr.id} 
              className={`flex items-center text-[11px] leading-tight ${attr.isStatic ? 'underline font-semibold' : ''}`}
              style={{ color: theme.nodeText }}
            >
              {getVisibilitySymbol(attr.visibility)}
              <span className="font-medium ml-1" style={{ color: theme.nodeText }}>{attr.name}</span>
              <span className="mx-1" style={{ color: theme.nodeTextMuted }}>:</span>
              <span className="font-medium" style={{ color: theme.nodeStereotypeText }}>{attr.type}</span>
              {attr.isId && (
                <span 
                  className="ml-1.5 px-1 py-0.2 text-[9px] font-bold rounded-xs border shadow-xs"
                  style={{ 
                    backgroundColor: theme.pkBg, 
                    color: theme.pkText, 
                    borderColor: theme.pkBorder 
                  }}
                >
                  &#123;PK&#125;
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Compartment 3: UML Operations/Methods */}
      <div 
        className="px-3 py-2 space-y-1 min-h-[32px] transition-colors"
        style={{ backgroundColor: theme.methodsBg }}
      >
        {methods.length === 0 ? (
          <div className="text-[10px] italic py-0.5" style={{ color: theme.nodeTextMuted }}>
            sin operaciones
          </div>
        ) : (
          methods.map((method: ClassMethod) => (
            <div 
              key={method.id} 
              className={`flex items-start text-[11px] leading-tight ${
                method.isStatic ? 'underline' : ''
              } ${method.isAbstract ? 'italic' : ''}`}
              style={{ color: theme.nodeText }}
            >
              {getVisibilitySymbol(method.visibility)}
              <div className="ml-1 min-w-0 flex-1 truncate">
                <span className="font-medium" style={{ color: theme.nodeText }}>{method.name}</span>
                <span style={{ color: theme.nodeTextMuted }}>(</span>
                <span>
                  {method.parameters?.map((p: { name: string; type: string }, i: number) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <span style={{ color: theme.nodeText }}>{p.name}</span>
                      <span style={{ color: theme.nodeTextMuted }}>:</span>
                      <span style={{ color: theme.nodeStereotypeText }}>{p.type}</span>
                    </span>
                  ))}
                </span>
                <span style={{ color: theme.nodeTextMuted }}>):</span>
                <span className="font-medium ml-1" style={{ color: theme.nodeStereotypeText }}>{method.returnType}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(ClassNodeComponent);
