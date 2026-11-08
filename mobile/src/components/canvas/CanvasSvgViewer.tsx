import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  PanResponder, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  Platform 
} from 'react-native';
import Svg, { 
  G, 
  Rect, 
  Text as SvgText, 
  Line, 
  Path, 
  Circle,
  Polygon 
} from 'react-native-svg';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  Lock 
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { useMobileProjectStore } from '../../stores/projectStore';
import { useMobileCollabStore } from '../../stores/collabStore';
import { MobileClassNode, ClassNodeData } from '../../types/diagram';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NODE_WIDTH = 190;
const HEADER_HEIGHT = 38;
const ROW_HEIGHT = 18;

export const CanvasSvgViewer: React.FC = () => {
  const { nodes, edges, selectClass } = useMobileProjectStore();
  const { activeLocks } = useMobileCollabStore();

  const [translateX, setTranslateX] = useState(20);
  const [translateY, setTranslateY] = useState(40);
  const [scale, setScale] = useState(0.85);

  const lastPanRef = useRef({ x: 20, y: 40 });
  const lastScaleRef = useRef(0.85);
  const initialDistanceRef = useRef<number | null>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const currentTranslateRef = useRef({ x: 20, y: 40 });
  currentTranslateRef.current = { x: translateX, y: translateY };
  const currentScaleRef = useRef(0.85);
  currentScaleRef.current = scale;

  // PanResponder para gestos de arrastre táctil y pinch-to-zoom nativo
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,

      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          const t1 = evt.nativeEvent.touches[0];
          const t2 = evt.nativeEvent.touches[1];
          const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          initialDistanceRef.current = dist;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2 && initialDistanceRef.current) {
          // Gesto Pinch-to-zoom
          const t1 = evt.nativeEvent.touches[0];
          const t2 = evt.nativeEvent.touches[1];
          const currentDist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          const factor = currentDist / initialDistanceRef.current;
          const newScale = Math.min(Math.max(lastScaleRef.current * factor, 0.3), 2.5);
          setScale(newScale);
        } else if (evt.nativeEvent.touches.length === 1) {
          // Gesto de Paneo suave
          setTranslateX(lastPanRef.current.x + gestureState.dx);
          setTranslateY(lastPanRef.current.y + gestureState.dy);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const isTap = Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8;
        if (isTap) {
          const locX = evt.nativeEvent.locationX;
          const locY = evt.nativeEvent.locationY;
          const tx = currentTranslateRef.current.x;
          const ty = currentTranslateRef.current.y;
          const sc = currentScaleRef.current;

          const canvasX = (locX - tx) / sc;
          const canvasY = (locY - ty) / sc;

          const hitNode = nodesRef.current.find((n) => {
            const attrCount = n.data.attributes?.length || 0;
            const methodCount = n.data.methods?.length || 0;
            const attrsH = Math.max(attrCount * ROW_HEIGHT + 10, 24);
            const methodsH = Math.max(methodCount * ROW_HEIGHT + 10, 24);
            const totalH = HEADER_HEIGHT + attrsH + methodsH;
            return (
              canvasX >= n.position.x &&
              canvasX <= n.position.x + NODE_WIDTH &&
              canvasY >= n.position.y &&
              canvasY <= n.position.y + totalH
            );
          });

          if (hitNode) {
            selectClass(hitNode.data);
          }
        }

        lastPanRef.current = {
          x: lastPanRef.current.x + gestureState.dx,
          y: lastPanRef.current.y + gestureState.dy,
        };
        lastScaleRef.current = scale;
        initialDistanceRef.current = null;
      },
    })
  ).current;

  const handleZoomIn = () => {
    const next = Math.min(scale + 0.2, 2.5);
    setScale(next);
    lastScaleRef.current = next;
  };

  const handleZoomOut = () => {
    const next = Math.max(scale - 0.2, 0.3);
    setScale(next);
    lastScaleRef.current = next;
  };

  const handleResetView = () => {
    setTranslateX(20);
    setTranslateY(40);
    setScale(0.85);
    lastPanRef.current = { x: 20, y: 40 };
    lastScaleRef.current = 0.85;
  };

  // Cálculo de dimensiones de nodo de clase
  const getNodeDimensions = (node: MobileClassNode) => {
    const attrCount = node.data.attributes?.length || 0;
    const methodCount = node.data.methods?.length || 0;
    const attrsHeight = Math.max(attrCount * ROW_HEIGHT + 10, 24);
    const methodsHeight = Math.max(methodCount * ROW_HEIGHT + 10, 24);
    const totalHeight = HEADER_HEIGHT + attrsHeight + methodsHeight;
    return { width: NODE_WIDTH, totalHeight, attrsHeight, methodsHeight };
  };

  // Cálculo de puertos magnéticos UML (top, bottom, left, right)
  const getHandlePoint = (
    node: MobileClassNode,
    dim: { width: number; totalHeight: number },
    handle?: string,
    targetNode?: MobileClassNode,
    targetDim?: { width: number; totalHeight: number }
  ): { x: number; y: number; handle: 'top' | 'bottom' | 'left' | 'right' } => {
    const norm = (handle || '').toLowerCase();
    if (norm === 'top') {
      return { x: node.position.x + dim.width / 2, y: node.position.y, handle: 'top' };
    }
    if (norm === 'bottom') {
      return { x: node.position.x + dim.width / 2, y: node.position.y + dim.totalHeight, handle: 'bottom' };
    }
    if (norm === 'left') {
      return { x: node.position.x, y: node.position.y + dim.totalHeight / 2, handle: 'left' };
    }
    if (norm === 'right') {
      return { x: node.position.x + dim.width, y: node.position.y + dim.totalHeight / 2, handle: 'right' };
    }

    if (targetNode && targetDim) {
      const cx1 = node.position.x + dim.width / 2;
      const cy1 = node.position.y + dim.totalHeight / 2;
      const cx2 = targetNode.position.x + targetDim.width / 2;
      const cy2 = targetNode.position.y + targetDim.totalHeight / 2;
      const dx = cx2 - cx1;
      const dy = cy2 - cy1;

      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) return { x: node.position.x + dim.width, y: cy1, handle: 'right' };
        return { x: node.position.x, y: cy1, handle: 'left' };
      } else {
        if (dy > 0) return { x: cx1, y: node.position.y + dim.totalHeight, handle: 'bottom' };
        return { x: cx1, y: node.position.y, handle: 'top' };
      }
    }

    return { x: node.position.x + dim.width, y: node.position.y + dim.totalHeight / 2, handle: 'right' };
  };

  // Generador de trayectorias ortogonales en ángulo recto
  const computeOrthogonalPath = (
    p1: { x: number; y: number; handle: string },
    p2: { x: number; y: number; handle: string }
  ): { path: string; midPoint: { x: number; y: number } } => {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;

    if ((p1.handle === 'left' || p1.handle === 'right') && (p2.handle === 'top' || p2.handle === 'bottom')) {
      return {
        path: `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`,
        midPoint: { x: x2, y: (y1 + y2) / 2 }
      };
    }

    if ((p1.handle === 'top' || p1.handle === 'bottom') && (p2.handle === 'left' || p2.handle === 'right')) {
      return {
        path: `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`,
        midPoint: { x: (x1 + x2) / 2, y: y2 }
      };
    }

    if (p1.handle === 'left' || p1.handle === 'right') {
      const midX = (x1 + x2) / 2;
      return {
        path: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
        midPoint: { x: midX, y: (y1 + y2) / 2 }
      };
    }

    const midY = (y1 + y2) / 2;
    return {
      path: `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`,
      midPoint: { x: (x1 + x2) / 2, y: midY }
    };
  };

  // Renderizado vectorial de puntas de flecha UML estándar
  const renderArrowHead = (
    p2: { x: number; y: number; handle: string },
    relType: string = 'association'
  ) => {
    const { x, y, handle } = p2;
    const t = relType.toLowerCase();

    let rot = 0;
    if (handle === 'bottom') rot = 0;    // Apunta hacia arriba (entra por abajo)
    if (handle === 'top') rot = 180;     // Apunta hacia abajo (entra por arriba)
    if (handle === 'left') rot = 90;     // Apunta hacia la derecha (entra por izquierda)
    if (handle === 'right') rot = 270;   // Apunta hacia la izquierda (entra por derecha)

    if (t === 'inheritance' || t === 'generalization') {
      return (
        <G transform={`translate(${x}, ${y}) rotate(${rot})`}>
          <Polygon
            points="0,0 -7,12 7,12"
            fill="#0F172A"
            stroke={THEME.colors.textPrimary}
            strokeWidth="1.5"
          />
        </G>
      );
    }

    if (t === 'composition') {
      return (
        <G transform={`translate(${x}, ${y}) rotate(${rot})`}>
          <Polygon
            points="0,0 -5,7 0,14 5,7"
            fill={THEME.colors.textPrimary}
            stroke={THEME.colors.textPrimary}
            strokeWidth="1"
          />
        </G>
      );
    }

    if (t === 'aggregation') {
      return (
        <G transform={`translate(${x}, ${y}) rotate(${rot})`}>
          <Polygon
            points="0,0 -5,7 0,14 5,7"
            fill="#0F172A"
            stroke={THEME.colors.textPrimary}
            strokeWidth="1.5"
          />
        </G>
      );
    }

    // Por defecto (association / directed / dependency): Punta en V abierta
    return (
      <G transform={`translate(${x}, ${y}) rotate(${rot})`}>
        <Path
          d="M -5 9 L 0 0 L 5 9"
          stroke={THEME.colors.textPrimary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    );
  };

  const getCardinalityPosition = (
    point: { x: number; y: number; handle: string },
    isTarget: boolean
  ): { x: number; y: number } => {
    const { x, y, handle } = point;
    if (handle === 'bottom') return { x: x + 8, y: y + (isTarget ? 16 : 14) };
    if (handle === 'top') return { x: x + 8, y: y - (isTarget ? 14 : 8) };
    if (handle === 'left') return { x: x - (isTarget ? 24 : 18), y: y - 6 };
    return { x: x + (isTarget ? 10 : 8), y: y - 6 };
  };

  return (
    <View style={styles.container}>
      {/* Controles flotantes de Zoom e Inercia */}
      <View style={styles.zoomDock}>
        <TouchableOpacity style={styles.dockBtn} onPress={handleZoomIn} activeOpacity={0.7}>
          <Plus size={16} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockBtn} onPress={handleZoomOut} activeOpacity={0.7}>
          <Minus size={16} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockBtn} onPress={handleResetView} activeOpacity={0.7}>
          <Maximize2 size={16} color={THEME.colors.accentPrimaryLight} />
        </TouchableOpacity>
        <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
      </View>

      {/* Lienzo SVG reactivo con soporte gestual */}
      <View style={styles.canvasArea} {...panResponder.panHandlers}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}>
          <G transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
            {/* 1. LÍNEAS DE RELACIÓN ORTOGONAL ENTRE CLASES */}
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const srcDim = getNodeDimensions(srcNode);
              const tgtDim = getNodeDimensions(tgtNode);

              if (edge.source === edge.target) {
                const loopStartX = srcNode.position.x + srcDim.width - 20;
                const loopStartY = srcNode.position.y;
                const loopPath = `M ${loopStartX} ${loopStartY} C ${loopStartX + 45} ${loopStartY - 35}, ${loopStartX + 45} ${loopStartY + 35}, ${srcNode.position.x + srcDim.width} ${loopStartY + 20}`;
                return (
                  <G key={`path-${edge.id}`}>
                    <Path
                      d={loopPath}
                      stroke={THEME.colors.borderLight}
                      strokeWidth="2"
                      fill="none"
                    />
                  </G>
                );
              }

              const p1 = getHandlePoint(srcNode, srcDim, edge.sourceHandle, tgtNode, tgtDim);
              const p2 = getHandlePoint(tgtNode, tgtDim, edge.targetHandle, srcNode, srcDim);
              const { path } = computeOrthogonalPath(p1, p2);
              const isDependency = edge.type?.toLowerCase() === 'dependency';

              return (
                <G key={`path-${edge.id}`}>
                  <Path
                    d={path}
                    stroke="#475569"
                    strokeWidth="2"
                    strokeDasharray={isDependency ? '5,4' : undefined}
                    fill="none"
                  />
                </G>
              );
            })}

            {/* 3. CAPA SUPERIOR: PUNTAS DE FLECHA, CARDINALIDADES Y ETIQUETAS DE RELACIÓN */}
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const srcDim = getNodeDimensions(srcNode);
              const tgtDim = getNodeDimensions(tgtNode);

              if (edge.source === edge.target) return null;

              const p1 = getHandlePoint(srcNode, srcDim, edge.sourceHandle, tgtNode, tgtDim);
              const p2 = getHandlePoint(tgtNode, tgtDim, edge.targetHandle, srcNode, srcDim);
              const { midPoint } = computeOrthogonalPath(p1, p2);
              const pos1 = getCardinalityPosition(p1, false);
              const pos2 = getCardinalityPosition(p2, true);

              const srcCard = edge.sourceCardinality || '1';
              const tgtCard = edge.targetCardinality || '*';
              const label = edge.label?.trim() || '';

              const srcCardWidth = Math.max(srcCard.length * 7 + 8, 16);
              const tgtCardWidth = Math.max(tgtCard.length * 7 + 8, 16);
              const labelWidth = label ? label.length * 7 + 14 : 0;

              return (
                <G key={`overlay-${edge.id}`}>
                  {/* Punta de Flecha UML Orientada en el Destino */}
                  {renderArrowHead(p2, edge.type)}

                  {/* Etiqueta / Nombre de la Relación (Centrado) */}
                  {label ? (
                    <G>
                      <Rect
                        x={midPoint.x - labelWidth / 2}
                        y={midPoint.y - 9}
                        width={labelWidth}
                        height={18}
                        rx="4"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <SvgText
                        x={midPoint.x}
                        y={midPoint.y + 4}
                        fill="#cbd5e1"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily={THEME.typography.fontFamilyMono}
                        textAnchor="middle"
                      >
                        {label}
                      </SvgText>
                    </G>
                  ) : null}

                  {/* Cardinalidad en Origen */}
                  <G>
                    <Rect
                      x={pos1.x - srcCardWidth / 2}
                      y={pos1.y - 8}
                      width={srcCardWidth}
                      height={16}
                      rx="3"
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <SvgText
                      x={pos1.x}
                      y={pos1.y + 4}
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily={THEME.typography.fontFamilyMono}
                      textAnchor="middle"
                    >
                      {srcCard}
                    </SvgText>
                  </G>

                  {/* Cardinalidad en Destino */}
                  <G>
                    <Rect
                      x={pos2.x - tgtCardWidth / 2}
                      y={pos2.y - 8}
                      width={tgtCardWidth}
                      height={16}
                      rx="3"
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <SvgText
                      x={pos2.x}
                      y={pos2.y + 4}
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily={THEME.typography.fontFamilyMono}
                      textAnchor="middle"
                    >
                      {tgtCard}
                    </SvgText>
                  </G>
                </G>
              );
            })}

            {/* NODOS DE CLASE UML (3 COMPARTIMENTOS ESTÁNDAR) */}
            {nodes.map((node) => {
              const { width, totalHeight, attrsHeight, methodsHeight } = getNodeDimensions(node);
              const isLocked = Boolean(activeLocks[node.id]);
              const lockHolder = activeLocks[node.id];

              return (
                <G
                  key={node.id}
                  transform={`translate(${node.position.x}, ${node.position.y})`}
                  onPress={() => selectClass(node.data)}
                >
                  {/* Aro de Candado Concurrente en Vivo */}
                  {isLocked && (
                    <Rect
                      x="-4"
                      y="-4"
                      width={width + 8}
                      height={totalHeight + 8}
                      rx="12"
                      ry="12"
                      fill="none"
                      stroke={THEME.colors.accentDanger}
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                    />
                  )}

                  {/* Contenedor Base de la Clase */}
                  <Rect
                    x="0"
                    y="0"
                    width={width}
                    height={totalHeight}
                    rx="8"
                    ry="8"
                    fill={THEME.colors.bgCard}
                    stroke={isLocked ? THEME.colors.accentDanger : THEME.colors.borderSubtle}
                    strokeWidth="1.5"
                  />

                  {/* 1. Compartimento Superior: Encabezado */}
                  <Rect
                    x="0"
                    y="0"
                    width={width}
                    height={HEADER_HEIGHT}
                    rx="8"
                    ry="8"
                    fill="#1e222e"
                  />
                  <Rect
                    x="0"
                    y={HEADER_HEIGHT - 8}
                    width={width}
                    height="8"
                    fill="#1e222e"
                  />

                  {node.data.stereotype ? (
                    <SvgText
                      x={width / 2}
                      y="14"
                      textAnchor="middle"
                      fill={THEME.colors.accentPrimaryLight}
                      fontSize="9"
                      fontFamily={THEME.typography.fontFamilyMono}
                    >
                      «{node.data.stereotype}»
                    </SvgText>
                  ) : null}

                  <SvgText
                    x={width / 2}
                    y={node.data.stereotype ? '28' : '23'}
                    textAnchor="middle"
                    fill={THEME.colors.textPrimary}
                    fontSize="12"
                    fontWeight="bold"
                    fontStyle={node.data.isAbstract ? 'italic' : 'normal'}
                  >
                    {node.data.name}
                  </SvgText>

                  {/* Línea divisoria encabezado / atributos */}
                  <Line
                    x1="0"
                    y1={HEADER_HEIGHT}
                    x2={width}
                    y2={HEADER_HEIGHT}
                    stroke={THEME.colors.borderSubtle}
                    strokeWidth="1"
                  />

                  {/* 2. Compartimento Central: Atributos Tipados */}
                  {(node.data.attributes || []).slice(0, 5).map((attr, idx) => {
                    const rowY = HEADER_HEIGHT + 14 + idx * ROW_HEIGHT;
                    return (
                      <G key={idx}>
                        <SvgText
                          x="10"
                          y={rowY}
                          fill={attr.isPrimaryKey ? THEME.colors.badgePkText : THEME.colors.textSecondary}
                          fontSize="10"
                          fontFamily={THEME.typography.fontFamilyMono}
                          fontWeight={attr.isPrimaryKey ? 'bold' : 'normal'}
                        >
                          {attr.isPrimaryKey ? '🔑 ' : attr.visibility === 'private' ? '- ' : '+ '}
                          {attr.name} : {attr.type || 'String'}
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* Línea divisoria atributos / métodos */}
                  <Line
                    x1="0"
                    y1={HEADER_HEIGHT + attrsHeight}
                    x2={width}
                    y2={HEADER_HEIGHT + attrsHeight}
                    stroke={THEME.colors.borderSubtle}
                    strokeWidth="1"
                  />

                  {/* 3. Compartimento Inferior: Métodos */}
                  {(node.data.methods || []).slice(0, 3).map((m, idx) => {
                    const rowY = HEADER_HEIGHT + attrsHeight + 14 + idx * ROW_HEIGHT;
                    return (
                      <SvgText
                        key={idx}
                        x="10"
                        y={rowY}
                        fill={THEME.colors.accentSuccessLight}
                        fontSize="9"
                        fontFamily={THEME.typography.fontFamilyMono}
                      >
                        + {m.name}(): {m.returnType || 'void'}
                      </SvgText>
                    );
                  })}
                </G>
              );
            })}

            {/* CAPA DE ETIQUETAS, MULTIPLICIDADES Y ROLES EN ALTO CONTRASTE (SOBREPUESTOS) */}
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const srcDim = getNodeDimensions(srcNode);
              const tgtDim = getNodeDimensions(tgtNode);

              if (edge.source === edge.target) {
                const loopStartX = srcNode.position.x + srcDim.width - 20;
                const loopStartY = srcNode.position.y;
                return (
                  <G key={`label-${edge.id}`}>
                    <Rect
                      x={loopStartX + 18}
                      y={loopStartY - 24}
                      width={38}
                      height={14}
                      rx={3}
                      fill="#0F172A"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <SvgText
                      x={loopStartX + 37}
                      y={loopStartY - 14}
                      fill={THEME.colors.accentWarning}
                      fontSize="9"
                      fontFamily={THEME.typography.fontFamilyMono}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {edge.sourceCardinality || '1'}..{edge.targetCardinality || '*'}
                    </SvgText>
                  </G>
                );
              }

              const p1 = getHandlePoint(srcNode, srcDim, edge.sourceHandle, tgtNode, tgtDim);
              const p2 = getHandlePoint(tgtNode, tgtDim, edge.targetHandle, srcNode, srcDim);
              const { midPoint } = computeOrthogonalPath(p1, p2);

              const srcCard = edge.sourceCardinality || '1';
              const tgtCard = edge.targetCardinality || '*';
              const pSrcCard = getCardinalityPosition(p1, false);
              const pTgtCard = getCardinalityPosition(p2, true);

              const roleText = edge.label || edge.targetRole || edge.sourceRole || '';

              return (
                <G key={`label-${edge.id}`}>
                  {/* Multiplicidad Origen con fondo protector */}
                  <Rect
                    x={pSrcCard.x - 3}
                    y={pSrcCard.y - 10}
                    width={Math.max(srcCard.length * 7 + 8, 16)}
                    height={13}
                    rx={3}
                    fill="#0F172ACC"
                    stroke="#334155"
                    strokeWidth="0.8"
                  />
                  <SvgText
                    x={pSrcCard.x + Math.max(srcCard.length * 7 + 8, 16) / 2 - 3}
                    y={pSrcCard.y}
                    fill={THEME.colors.accentWarning}
                    fontSize="9"
                    fontFamily={THEME.typography.fontFamilyMono}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {srcCard}
                  </SvgText>

                  {/* Multiplicidad Destino con fondo protector */}
                  <Rect
                    x={pTgtCard.x - 3}
                    y={pTgtCard.y - 10}
                    width={Math.max(tgtCard.length * 7 + 8, 16)}
                    height={13}
                    rx={3}
                    fill="#0F172ACC"
                    stroke="#334155"
                    strokeWidth="0.8"
                  />
                  <SvgText
                    x={pTgtCard.x + Math.max(tgtCard.length * 7 + 8, 16) / 2 - 3}
                    y={pTgtCard.y}
                    fill={THEME.colors.accentWarning}
                    fontSize="9"
                    fontFamily={THEME.typography.fontFamilyMono}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {tgtCard}
                  </SvgText>

                  {/* Etiqueta / Rol de la Relación en el Punto Medio */}
                  {roleText ? (
                    <G>
                      <Rect
                        x={midPoint.x - (roleText.length * 6 + 10) / 2}
                        y={midPoint.y - 14}
                        width={roleText.length * 6 + 10}
                        height={14}
                        rx={3}
                        fill="#0F172AEE"
                        stroke={THEME.colors.accentPrimary + '80'}
                        strokeWidth="1"
                      />
                      <SvgText
                        x={midPoint.x}
                        y={midPoint.y - 3}
                        fill={THEME.colors.textPrimary}
                        fontSize="9"
                        fontFamily={THEME.typography.fontFamilyMono}
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {roleText}
                      </SvgText>
                    </G>
                  ) : null}
                </G>
              );
            })}
          </G>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  canvasArea: {
    flex: 1,
  },
  zoomDock: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 96 : 32,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(22, 25, 34, 0.92)',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    padding: 6,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  dockBtn: {
    width: 34,
    height: 34,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.bgSurface,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    paddingVertical: 2,
  },
});
