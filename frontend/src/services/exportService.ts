import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds, Node } from '@xyflow/react';
import { api } from './api';

export interface ExportPngOptions {
  scale?: number; // 1, 2, 3
  backgroundColor?: string;
}

export interface ExportPdfOptions {
  includeImage?: boolean;
  includeDictionary?: boolean;
  includeRelationships?: boolean;
  scale?: number;
  backgroundColor?: string;
}

/**
 * Sanitizes project name to safe file name without special characters
 */
export function sanitizeFileName(name?: string, fallback = 'ModeloUML'): string {
  if (!name || !name.trim()) return fallback;
  return name.trim().replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
}

/**
 * Native browser download trigger for Blobs
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Captures the React Flow canvas to a PNG Base64 Data URL
 */
export async function captureDiagramCanvas(
  nodes: Node[],
  options?: ExportPngOptions
): Promise<string> {
  if (!nodes || nodes.length === 0) {
    throw new Error('El modelo no contiene clases para capturar en imagen.');
  }

  const viewportElement = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportElement) {
    throw new Error('No se encontró el lienzo interactivo de React Flow.');
  }

  const nodesBounds = getNodesBounds(nodes);
  const padding = 60;
  const imageWidth = Math.max(Math.ceil(nodesBounds.width + padding * 2), 400);
  const imageHeight = Math.max(Math.ceil(nodesBounds.height + padding * 2), 300);

  const viewport = getViewportForBounds(
    nodesBounds,
    imageWidth,
    imageHeight,
    0.1,
    2,
    0.05
  );

  const scale = options?.scale || 2;
  const bg = options?.backgroundColor || '#0b0f17';

  return await toPng(viewportElement, {
    backgroundColor: bg,
    width: imageWidth,
    height: imageHeight,
    pixelRatio: scale,
    skipFonts: true,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
}

/**
 * CU11 - Export to High-Resolution PNG
 */
export async function exportDiagramPng(
  nodes: Node[],
  projectName?: string,
  options?: ExportPngOptions
): Promise<void> {
  const dataUrl = await captureDiagramCanvas(nodes, options);
  const safeName = sanitizeFileName(projectName);
  const filename = `${safeName}_Diagrama_UML.png`;

  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * CU11 - Export to OMG XMI 2.1
 */
export async function exportDiagramXmi(
  projectId: string,
  projectName?: string,
  version = '1.0.0'
): Promise<void> {
  const blob = await api.exportProjectXmi(projectId);
  const safeName = sanitizeFileName(projectName);
  const filename = `${safeName}_v${version}.xmi`;
  triggerBlobDownload(blob, filename);
}

/**
 * CU11 - Export to Excel .xlsx (Data Dictionary & Relationships)
 */
export async function exportDiagramExcel(
  projectId: string,
  projectName?: string
): Promise<void> {
  const blob = await api.exportProjectExcel(projectId);
  const safeName = sanitizeFileName(projectName);
  const filename = `${safeName}_DiccionarioDatos.xlsx`;
  triggerBlobDownload(blob, filename);
}

/**
 * CU11 - Export to Technical PDF Specification
 */
export async function exportDiagramPdf(
  projectId: string,
  projectName: string | undefined,
  nodes: Node[],
  options?: ExportPdfOptions
): Promise<void> {
  let imageBase64: string | undefined;

  const includeImg = options?.includeImage ?? true;
  if (includeImg && nodes && nodes.length > 0) {
    try {
      const capturePromise = captureDiagramCanvas(nodes, {
        scale: options?.scale || 1.2,
        backgroundColor: options?.backgroundColor || '#ffffff',
      });
      const timeoutPromise = new Promise<string | undefined>((resolve) => 
        setTimeout(() => resolve(undefined), 4000)
      );
      imageBase64 = await Promise.race([capturePromise, timeoutPromise]);
    } catch {
      // If canvas capture fails or not mounted, continue without image
      imageBase64 = undefined;
    }
  }

  const blob = await api.exportProjectPdf(projectId, {
    imageBase64,
    includeDictionary: options?.includeDictionary ?? true,
    includeRelationships: options?.includeRelationships ?? true,
  });

  const safeName = sanitizeFileName(projectName);
  const filename = `${safeName}_MemoriaTecnica.pdf`;
  triggerBlobDownload(blob, filename);
}
