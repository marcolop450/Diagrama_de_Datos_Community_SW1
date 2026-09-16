import { memo } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { ClassNodeData, ClassAttribute, ClassMethod } from '../../types/diagram';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useAuthStore } from '../../stores/authStore';
import { useCollabStore } from '../../stores/collabStore';
import { getCanvasTheme } from '../../constants/canvasThemes';
import toast from 'react-hot-toast';

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

const ClassNodeComponent = ({ id, data, selected }: CustomNodeProps) => {
  const { setSelectedNode, isClassNameTaken } = useDiagramStore();
  const { setPropertiesPanelOpen } = useUiStore();
  const { user } = useAuthStore();
  const { locks, myParticipant, broadcastLock, isLive, isViewer } = useCollabStore();
  const viewerMode = isLive && isViewer();
  const theme = getCanvasTheme(user?.preferences?.canvasTheme);

  const lock = locks[data.id];
  const isLockedByOther = !!(lock && myParticipant && lock.lockedBy !== myParticipant.userId);

  const nodeId = id || (data as any)?.id;
  const isDuplicateName = isClassNameTaken(data.name, nodeId);
  const isAbstract = data.isAbstract || data.stereotype?.toLowerCase() === 'abstract';
  const attributes: ClassAttribute[] = data.attributes || [];
  const methods: ClassMethod[] = data.methods || [];

  const handleDoubleClick = () => {
    if (viewerMode) {
      toast('Modo Solo Lectura: No es posible editar atributos o métodos');
      return;
    }
    if (isLockedByOther) {
      toast.error(`Esta clase está siendo editada por ${lock.lockedByName}`);
      return;
    }
    if (isLive) {
      broadcastLock(data.id);
    }
    setSelectedNode({ id: data.id, position: { x: 0, y: 0 }, data } as any);
    setPropertiesPanelOpen(true);
  };

  return (
    <div 
      className="relative group cursor-pointer rounded-sm border min-w-[240px] max-w-[360px] font-mono text-xs select-none transition-all duration-150"
      style={{
        backgroundColor: theme.nodeBg,
        borderColor: isLockedByOther 
          ? (lock?.cursorColor || '#F59E0B')
          : selected ? theme.nodeBorderSelected : theme.nodeBorder,
        boxShadow: selected ? theme.nodeShadowSelected : '0 4px 14px rgba(0, 0, 0, 0.25)',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Optimistic Lock Visual Badge */}
      {lock && (
        <div 
          className="absolute -top-5 left-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold text-white shadow-md z-30 pointer-events-none animate-fade-in"
          style={{ backgroundColor: lock.cursorColor || '#10B981' }}
        >
          <Lock className="w-2.5 h-2.5" />
          <span>{isLockedByOther ? `Editando: ${lock.lockedByName}` : 'Bloqueado por ti'}</span>
        </div>
      )}
      {/* 4 Connection Magnetic Handles (UML Ports - precisely centered, full bidirectional connectivity) */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top" 
        isConnectable={!viewerMode}
        style={{ 
          top: 0, 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-3 !h-3 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/50 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        isConnectable={!viewerMode}
        style={{ 
          bottom: 0, 
          left: '50%', 
          transform: 'translate(-50%, 50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-3 !h-3 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/50 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        isConnectable={!viewerMode}
        style={{ 
          top: '50%', 
          left: 0, 
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-3 !h-3 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/50 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        isConnectable={!viewerMode}
        style={{ 
          top: '50%', 
          right: 0, 
          transform: 'translate(50%, -50%)',
          backgroundColor: theme.handleBg,
          borderColor: theme.handleBorder 
        }}
        className="!w-3 !h-3 !border-2 !rounded-full opacity-0 group-hover:opacity-100 hover:!ring-4 hover:!ring-blue-400/50 transition-all duration-150 shadow-md z-20 cursor-crosshair" 
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

        <div className="flex items-center justify-center gap-1.5 w-full">
          <h3 
            className={`font-sans font-bold text-[13px] tracking-tight truncate text-center ${isAbstract ? 'italic' : ''}`}
            style={{ color: theme.nodeText }}
          >
            {data.name || 'ClaseSinNombre'}
          </h3>
          {isDuplicateName && (
            <span 
              className="inline-flex items-center text-amber-400 shrink-0" 
              title="Nombre duplicado: Ya existe otra clase con este nombre en el proyecto"
            >
              <AlertTriangle size={13} />
            </span>
          )}
        </div>
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
              {(attr.isId || attr.isPrimaryKey) && (
                <span 
                  className="ml-1.5 px-1 py-0.2 text-[9px] font-bold rounded-xs border shadow-xs"
                  style={{ 
                    backgroundColor: theme.pkBg, 
                    color: theme.pkText, 
                    borderColor: theme.pkBorder 
                  }}
                  title="Clave Primaria (PK - NOT NULL)"
                >
                  &#123;PK&#125;
                </span>
              )}
              {attr.isNotNull && !attr.isId && !attr.isPrimaryKey && (
                <span 
                  className="ml-1 px-1 py-0.2 text-[9px] font-semibold rounded-xs border border-blue-500/40 bg-blue-500/15 text-blue-400 shadow-xs"
                  title="Campo Obligatorio (NOT NULL)"
                >
                  &#123;NN&#125;
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
