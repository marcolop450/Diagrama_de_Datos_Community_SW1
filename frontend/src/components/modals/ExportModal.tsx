import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  FileCode2, 
  Image as ImageIcon, 
  FileText, 
  FileSpreadsheet, 
  X, 
  Loader2, 
  AlertTriangle,
  Layers,
  Settings2,
  TableProperties,
  Database,
  Send
} from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';
import { 
  exportDiagramXmi, 
  exportDiagramPng, 
  exportDiagramExcel, 
  exportDiagramPdf 
} from '../../services/exportService';
import { downloadSqlDdl, downloadPostmanCollection } from '../../services/generatorService';
import toast from 'react-hot-toast';

export type ExportFormat = 'XMI' | 'PNG' | 'PDF' | 'EXCEL' | 'SQL' | 'POSTMAN';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project, nodes } = useDiagramStore();
  
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  const [pngScale, setPngScale] = useState<number>(2);
  const [pngBg, setPngBg] = useState<string>('#0b0f17');
  
  const [pdfIncludeImage, setPdfIncludeImage] = useState<boolean>(true);
  const [pdfIncludeDictionary, setPdfIncludeDictionary] = useState<boolean>(true);
  const [pdfIncludeRelationships, setPdfIncludeRelationships] = useState<boolean>(true);
  
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const isModelEmpty = !nodes || nodes.length === 0;

  const handleExport = async () => {
    if (isModelEmpty) {
      toast.error('No es posible exportar un modelo sin clases definidas.');
      return;
    }

    if (!project?.id) {
      toast.error('El proyecto debe estar guardado para exportar su especificación.');
      return;
    }

    setIsExporting(true);
    try {
      if (selectedFormat === 'XMI') {
        await exportDiagramXmi(project.id, project.name, project.version || '1.0.0');
        toast.success('Modelo OMG XMI 2.1 exportado exitosamente');
      } else if (selectedFormat === 'PNG') {
        await exportDiagramPng(nodes, project.name, {
          scale: pngScale,
          backgroundColor: pngBg,
        });
        toast.success(`Diagrama PNG (${pngScale}x) exportado exitosamente`);
      } else if (selectedFormat === 'EXCEL') {
        await exportDiagramExcel(project.id, project.name);
        toast.success('Diccionario de datos Excel (.xlsx) generado exitosamente');
      } else if (selectedFormat === 'PDF') {
        await exportDiagramPdf(project.id, project.name, nodes, {
          includeImage: pdfIncludeImage,
          includeDictionary: pdfIncludeDictionary,
          includeRelationships: pdfIncludeRelationships,
        });
        toast.success('Memoria técnica PDF generada exitosamente');
      } else if (selectedFormat === 'SQL') {
        await downloadSqlDdl(project.id, project.name);
        toast.success('Esquema DDL SQL (PostgreSQL 17) exportado exitosamente');
      } else if (selectedFormat === 'POSTMAN') {
        await downloadPostmanCollection(project.id, project.name);
        toast.success('Colección Postman v2.1 exportada exitosamente');
      }
      onClose();
    } catch (err: any) {
      let errorMsg = 'Error al exportar el archivo.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMsg = json.message || errorMsg;
        } catch {
          // ignore parsing error
        }
      } else {
        errorMsg = err.response?.data?.message || err.message || errorMsg;
      }
      toast.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="border border-[#242934] bg-[#14171d] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#242934] flex items-center justify-between bg-[#11141a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-display flex items-center gap-2">
                Exportar Modelo y Documentación Técnica
              </h2>
              <p className="text-xs text-slate-400">
                Formatos canónicos de intercambio CASE, artefactos gráficos y memorias técnicas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Empty Model Warning Guard */}
        {isModelEmpty && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-semibold mb-0.5">Modelo vacío sin clases</p>
              <p className="text-amber-300/80">
                El espacio de trabajo actual no contiene entidades modeladas. Agregue clases al diagrama para habilitar la generación técnica de artefactos.
              </p>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Format Selection Cards (4 Grid) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2.5">
              Formato de Exportación
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: OMG XMI 2.1 */}
              <button
                type="button"
                onClick={() => setSelectedFormat('XMI')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedFormat === 'XMI'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/40'
                    : 'border-[#242934] bg-[#181c24] hover:bg-[#1f2430] hover:border-indigo-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedFormat === 'XMI' ? 'bg-indigo-600 text-white' : 'bg-[#0f1115] text-slate-400 border border-[#242934]'
                }`}>
                  <FileCode2 size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">OMG XMI 2.1</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono">UML 2.1</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Intercambio estándar XML compatible con StarUML, ArchiTec y modeladores CASE.
                  </p>
                </div>
              </button>

              {/* Option 2: PNG High Res */}
              <button
                type="button"
                onClick={() => setSelectedFormat('PNG')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedFormat === 'PNG'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/40'
                    : 'border-[#242934] bg-[#181c24] hover:bg-[#1f2430] hover:border-indigo-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedFormat === 'PNG' ? 'bg-indigo-600 text-white' : 'bg-[#0f1115] text-slate-400 border border-[#242934]'
                }`}>
                  <ImageIcon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Diagrama PNG</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">Alta Res.</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Captura rasterizada nítida para presentaciones ejecutivas e informes.
                  </p>
                </div>
              </button>

              {/* Option 3: Technical PDF */}
              <button
                type="button"
                onClick={() => setSelectedFormat('PDF')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedFormat === 'PDF'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/40'
                    : 'border-[#242934] bg-[#181c24] hover:bg-[#1f2430] hover:border-indigo-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedFormat === 'PDF' ? 'bg-indigo-600 text-white' : 'bg-[#0f1115] text-slate-400 border border-[#242934]'
                }`}>
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Memoria Técnica</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono">PDF</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Documento formal con carátula, métricas, diagrama y catálogo de clases.
                  </p>
                </div>
              </button>

              {/* Option 4: Excel Data Dictionary */}
              <button
                type="button"
                onClick={() => setSelectedFormat('EXCEL')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedFormat === 'EXCEL'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/40'
                    : 'border-[#242934] bg-[#181c24] hover:bg-[#1f2430] hover:border-indigo-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedFormat === 'EXCEL' ? 'bg-indigo-600 text-white' : 'bg-[#0f1115] text-slate-400 border border-[#242934]'
                }`}>
                  <FileSpreadsheet size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Diccionario de Datos</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">.xlsx</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Libro de 3 hojas con mapeo a PostgreSQL 17, Java 21 JPA y relaciones.
                  </p>
                </div>
              </button>

              {/* Option 5: PostgreSQL 17 SQL DDL */}
              <button
                type="button"
                onClick={() => setSelectedFormat('SQL')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedFormat === 'SQL'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/40'
                    : 'border-[#242934] bg-[#181c24] hover:bg-[#1f2430] hover:border-emerald-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedFormat === 'SQL' ? 'bg-emerald-600 text-white' : 'bg-[#0f1115] text-slate-400 border border-[#242934]'
                }`}>
                  <Database size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Esquema DDL SQL</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">Postgres 17</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Script SQL completo con sentencias CREATE TABLE, IDENTITY, claves foráneas e índices.
                  </p>
                </div>
              </button>

              {/* Option 6: Postman Collection v2.1 */}
              <button
                type="button"
                onClick={() => setSelectedFormat('POSTMAN')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedFormat === 'POSTMAN'
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/40'
                    : 'border-[#242934] bg-[#181c24] hover:bg-[#1f2430] hover:border-amber-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedFormat === 'POSTMAN' ? 'bg-amber-600 text-white' : 'bg-[#0f1115] text-slate-400 border border-[#242934]'
                }`}>
                  <Send size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Colección Postman</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono">v2.1</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Suite JSON con 5 requests CRUD por entidad, scripts pm.test y payloads mock simulados.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Contextual Options based on selected format */}
          <div className="p-4 rounded-xl border border-[#242934] bg-[#0f1115]">
            {selectedFormat === 'PNG' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Settings2 size={14} className="text-indigo-400" />
                  <span>Configuración de Exportación Gráfica</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Resolution scale */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Resolución y Calidad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1x Estándar', val: 1 },
                        { label: '2x Nítida', val: 2 },
                        { label: '3x Ultra HD', val: 3 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setPngScale(item.val)}
                          className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                            pngScale === item.val
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-[#181c24] text-slate-300 border-[#242934] hover:bg-[#1f2430]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Color de Fondo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Oscuro', val: '#0b0f17' },
                        { label: 'Blanco', val: '#ffffff' },
                        { label: 'Transparente', val: 'transparent' },
                      ].map((bgItem) => (
                        <button
                          key={bgItem.val}
                          type="button"
                          onClick={() => setPngBg(bgItem.val)}
                          className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                            pngBg === bgItem.val
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-[#181c24] text-slate-300 border-[#242934] hover:bg-[#1f2430]'
                          }`}
                        >
                          {bgItem.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedFormat === 'PDF' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <TableProperties size={14} className="text-purple-400" />
                  <span>Secciones de la Memoria Técnica</span>
                </div>
                
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pdfIncludeImage}
                      onChange={(e) => setPdfIncludeImage(e.target.checked)}
                      className="w-4 h-4 rounded border-[#242934] text-indigo-600 focus:ring-indigo-500 bg-[#181c24]"
                    />
                    <span>Incluir captura gráfica del diagrama de clases en alta resolución</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pdfIncludeDictionary}
                      onChange={(e) => setPdfIncludeDictionary(e.target.checked)}
                      className="w-4 h-4 rounded border-[#242934] text-indigo-600 focus:ring-indigo-500 bg-[#181c24]"
                    />
                    <span>Incluir catálogo de clases, atributos tipados, claves primarias y métodos</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pdfIncludeRelationships}
                      onChange={(e) => setPdfIncludeRelationships(e.target.checked)}
                      className="w-4 h-4 rounded border-[#242934] text-indigo-600 focus:ring-indigo-500 bg-[#181c24]"
                    />
                    <span>Incluir matriz de relaciones, roles y multiplicidades</span>
                  </label>
                </div>
              </div>
            )}

            {selectedFormat === 'EXCEL' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Layers size={14} className="text-emerald-400" />
                  <span>Estructura del Libro Excel</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#181c24] border border-[#242934] text-xs">
                    <p className="font-semibold text-slate-200 mb-0.5">1. Resumen</p>
                    <p className="text-[11px] text-slate-400">Metadatos del proyecto y conteo de entidades</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181c24] border border-[#242934] text-xs">
                    <p className="font-semibold text-slate-200 mb-0.5">2. Diccionario</p>
                    <p className="text-[11px] text-slate-400">Tipos UML, PostgreSQL 17 y Java 21 JPA</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181c24] border border-[#242934] text-xs">
                    <p className="font-semibold text-slate-200 mb-0.5">3. Relaciones</p>
                    <p className="text-[11px] text-slate-400">Matriz de cardinalidades y asociaciones</p>
                  </div>
                </div>
              </div>
            )}

            {selectedFormat === 'XMI' && (
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold">
                  <FileCode2 size={14} className="text-indigo-400" />
                  <span>Especificación OMG XMI 2.1</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Estructura XML estándar bajo el metamodelo OMG UML 2.1 con empaquetado de clases, comentarios para claves primarias y asociaciones con multiplicidades.
                </p>
              </div>
            )}

            {selectedFormat === 'SQL' && (
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold">
                  <Database size={14} className="text-emerald-400" />
                  <span>Especificación DDL PostgreSQL 17 (Supabase)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Genera el archivo <span className="text-emerald-300 font-mono">schema.sql</span> con sentencias DDL nativas de PostgreSQL 17: identidades estándar SQL:2008+, tablas intermedias para relaciones N:N, claves foráneas con ON DELETE CASCADE e índices B-Tree.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                  Tip: Para previsualizar el código SQL generado, copiarlo al portapapeles o ajustar opciones avanzadas, usa la herramienta SQL en la barra lateral del lienzo.
                </div>
              </div>
            )}

            {selectedFormat === 'POSTMAN' && (
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold">
                  <Send size={14} className="text-amber-400" />
                  <span>Colección Automatizada Postman v2.1.0</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Genera el archivo <span className="text-amber-300 font-mono">postman-collection.json</span> con endpoints CRUD estructurados en carpetas por entidad, variable <span className="text-amber-300 font-mono">{"{{baseUrl}}"}</span> y aserciones de prueba automáticas para Postman Runner o Newman.
                </p>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                  Tip: Para previsualizar el código JSON generado, copiarlo al portapapeles o ajustar la URL base, usa la herramienta Postman en la barra lateral del lienzo.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#242934] flex items-center justify-between bg-[#11141a]">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Proyecto:</span>
            <span className="font-semibold text-slate-200">{project?.name || 'Modelo UML'}</span>
            <span className="text-slate-500">•</span>
            <span>v{project?.version || '1.0.0'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#181c24] hover:bg-[#1f2430] border border-[#242934] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isModelEmpty}
              className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isExporting || isModelEmpty
                  ? 'bg-[#181c24] text-slate-500 cursor-not-allowed border border-[#242934]'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Procesando exportación...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Descargar Archivo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
