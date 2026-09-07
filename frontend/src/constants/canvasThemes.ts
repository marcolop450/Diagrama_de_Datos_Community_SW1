export type CanvasThemeId = 'dark' | 'light' | 'blue' | 'cream';

export interface CanvasThemeConfig {
  id: CanvasThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    card: string;
    accent: string;
    border: string;
  };
  canvasBg: string;
  gridMinor: string;
  gridMajor: string;
  nodeBg: string;
  nodeHeaderBg: string;
  nodeBorder: string;
  nodeBorderHover: string;
  nodeBorderSelected: string;
  nodeShadowSelected: string;
  nodeText: string;
  nodeTextMuted: string;
  nodeStereotypeText: string;
  attrBg: string;
  methodsBg: string;
  divider: string;
  pkBg: string;
  pkText: string;
  pkBorder: string;
  edgeStroke: string;
  edgeStrokeSelected: string;
  edgeLabelBg: string;
  edgeLabelText: string;
  edgeMarkerFill: string;
  edgeMarkerStroke: string;
  handleBg: string;
  handleBorder: string;
}

export const CANVAS_THEMES: Record<CanvasThemeId, CanvasThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Oscuro (Pure Slate)',
    description: 'Modo nocturno de alto contraste con tonos pizarra profunda.',
    preview: {
      bg: '#020617',
      card: '#0f172a',
      accent: '#3b82f6',
      border: '#334155',
    },
    canvasBg: '#020617',
    gridMinor: 'rgba(30, 41, 59, 0.55)',
    gridMajor: 'rgba(51, 65, 85, 0.8)',
    nodeBg: '#090d16',
    nodeHeaderBg: 'rgba(15, 23, 42, 0.95)',
    nodeBorder: '#334155',
    nodeBorderHover: '#64748b',
    nodeBorderSelected: '#60a5fa',
    nodeShadowSelected: '0 0 0 2px rgba(96, 165, 250, 0.4), 0 10px 25px -5px rgba(15, 23, 42, 0.8)',
    nodeText: '#f8fafc',
    nodeTextMuted: '#94a3b8',
    nodeStereotypeText: '#60a5fa',
    attrBg: 'rgba(2, 6, 23, 0.75)',
    methodsBg: '#090d16',
    divider: 'rgba(30, 41, 59, 0.85)',
    pkBg: 'rgba(120, 53, 15, 0.6)',
    pkText: '#fcd34d',
    pkBorder: 'rgba(180, 83, 9, 0.6)',
    edgeStroke: '#94a3b8',
    edgeStrokeSelected: '#60a5fa',
    edgeLabelBg: 'rgba(2, 6, 23, 0.85)',
    edgeLabelText: '#cbd5e1',
    edgeMarkerFill: '#020617',
    edgeMarkerStroke: '#94a3b8',
    handleBg: '#3b82f6',
    handleBorder: '#020617',
  },
  light: {
    id: 'light',
    name: 'Claro (Técnico)',
    description: 'Estilo arquitectónico limpio con contraste neutro y fondo blanco técnico.',
    preview: {
      bg: '#f8fafc',
      card: '#ffffff',
      accent: '#2563eb',
      border: '#cbd5e1',
    },
    canvasBg: '#f8fafc',
    gridMinor: 'rgba(226, 232, 240, 0.9)',
    gridMajor: 'rgba(203, 213, 225, 0.95)',
    nodeBg: '#ffffff',
    nodeHeaderBg: '#f1f5f9',
    nodeBorder: '#cbd5e1',
    nodeBorderHover: '#94a3b8',
    nodeBorderSelected: '#2563eb',
    nodeShadowSelected: '0 0 0 2px rgba(37, 99, 235, 0.35), 0 10px 20px -5px rgba(15, 23, 42, 0.15)',
    nodeText: '#0f172a',
    nodeTextMuted: '#475569',
    nodeStereotypeText: '#2563eb',
    attrBg: '#ffffff',
    methodsBg: '#f8fafc',
    divider: '#e2e8f0',
    pkBg: '#fef3c7',
    pkText: '#b45309',
    pkBorder: '#f59e0b',
    edgeStroke: '#475569',
    edgeStrokeSelected: '#2563eb',
    edgeLabelBg: '#ffffff',
    edgeLabelText: '#1e293b',
    edgeMarkerFill: '#ffffff',
    edgeMarkerStroke: '#475569',
    handleBg: '#2563eb',
    handleBorder: '#ffffff',
  },
  blue: {
    id: 'blue',
    name: 'Azulado (Blueprint)',
    description: 'Inspirado en los planos arquitectónicos de cianotipo con tonos azul marino y cian.',
    preview: {
      bg: '#071527',
      card: '#0c2340',
      accent: '#38bdf8',
      border: '#19497d',
    },
    canvasBg: '#071527',
    gridMinor: 'rgba(14, 116, 144, 0.28)',
    gridMajor: 'rgba(6, 182, 212, 0.45)',
    nodeBg: '#0a1e36',
    nodeHeaderBg: '#0f2d52',
    nodeBorder: '#19497d',
    nodeBorderHover: '#38bdf8',
    nodeBorderSelected: '#38bdf8',
    nodeShadowSelected: '0 0 0 2px rgba(56, 189, 248, 0.4), 0 10px 25px -5px rgba(6, 182, 212, 0.25)',
    nodeText: '#f0f9ff',
    nodeTextMuted: '#93c5fd',
    nodeStereotypeText: '#38bdf8',
    attrBg: '#07182e',
    methodsBg: '#091d34',
    divider: '#163b63',
    pkBg: '#0e3a63',
    pkText: '#7dd3fc',
    pkBorder: '#38bdf8',
    edgeStroke: '#38bdf8',
    edgeStrokeSelected: '#7dd3fc',
    edgeLabelBg: '#0a1e36',
    edgeLabelText: '#bae6fd',
    edgeMarkerFill: '#0a1e36',
    edgeMarkerStroke: '#38bdf8',
    handleBg: '#38bdf8',
    handleBorder: '#071527',
  },
  cream: {
    id: 'cream',
    name: 'Crema (Pergamino)',
    description: 'Estilo cálido tipo papel calco sepia con tipografía oscura de alta legibilidad.',
    preview: {
      bg: '#f5efeb',
      card: '#fffdfa',
      accent: '#b45309',
      border: '#d4c6b8',
    },
    canvasBg: '#f5efeb',
    gridMinor: 'rgba(215, 203, 190, 0.75)',
    gridMajor: 'rgba(185, 170, 155, 0.9)',
    nodeBg: '#fffdfa',
    nodeHeaderBg: '#ede4dc',
    nodeBorder: '#d4c6b8',
    nodeBorderHover: '#a89989',
    nodeBorderSelected: '#b45309',
    nodeShadowSelected: '0 0 0 2px rgba(180, 83, 9, 0.35), 0 10px 20px -5px rgba(68, 64, 60, 0.15)',
    nodeText: '#292524',
    nodeTextMuted: '#78716c',
    nodeStereotypeText: '#b45309',
    attrBg: '#faf6f2',
    methodsBg: '#f7f2ed',
    divider: '#e5dacd',
    pkBg: '#fef3c7',
    pkText: '#92400e',
    pkBorder: '#d97706',
    edgeStroke: '#57534e',
    edgeStrokeSelected: '#b45309',
    edgeLabelBg: '#fffdfa',
    edgeLabelText: '#44403c',
    edgeMarkerFill: '#fffdfa',
    edgeMarkerStroke: '#57534e',
    handleBg: '#b45309',
    handleBorder: '#fffdfa',
  },
};

export const getCanvasTheme = (themeId?: string): CanvasThemeConfig => {
  if (themeId && themeId in CANVAS_THEMES) {
    return CANVAS_THEMES[themeId as CanvasThemeId];
  }
  return CANVAS_THEMES.dark;
};
