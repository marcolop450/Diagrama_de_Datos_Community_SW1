import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, 
  X, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  FolderGit2, 
  CheckCircle2, 
  PlaySquare, 
  FileCode2, 
  AlertTriangle,
  Settings2,
  HelpCircle,
  Loader2,
  Terminal
} from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';
import { generatePostmanCollection, downloadPostmanCollection, PostmanResponse, GeneratePostmanConfig } from '../../services/generatorService';
import toast from 'react-hot-toast';

interface PostmanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PostmanModal: React.FC<PostmanModalProps> = ({ isOpen, onClose }) => {
  const { project, nodes } = useDiagramStore();

  // Configuration state
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:8081');
  const [includeTests, setIncludeTests] = useState<boolean>(true);
  const [includeMockData, setIncludeMockData] = useState<boolean>(true);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Response state
  const [loading, setLoading] = useState<boolean>(false);
  const [postmanData, setPostmanData] = useState<PostmanResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const isModelEmpty = !nodes || nodes.length === 0;

  const fetchCollection = useCallback(async () => {
    if (!project?.id || isModelEmpty) return;

    setLoading(true);
    try {
      const config: GeneratePostmanConfig = {
        baseUrl: baseUrl.trim() || 'http://localhost:8081',
        includeTests,
        includeMockData,
      };

      const result = await generatePostmanCollection(project.id, config);
      setPostmanData(result);
    } catch (error: any) {
      console.error('Error al generar colección Postman:', error);
      const msg = error.response?.data?.message || 'No se pudo generar la colección de Postman';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [project?.id, isModelEmpty, baseUrl, includeTests, includeMockData]);

  useEffect(() => {
    if (isOpen && project?.id && !isModelEmpty) {
      fetchCollection();
    }
  }, [isOpen, project?.id, isModelEmpty]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!postmanData?.json) return;
    try {
      await navigator.clipboard.writeText(postmanData.json);
      setCopied(true);
      toast.success('Colección JSON copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleDownload = async () => {
    if (!project?.id) return;
    setDownloading(true);
    try {
      const config: GeneratePostmanConfig = {
        baseUrl: baseUrl.trim() || 'http://localhost:8081',
        includeTests,
        includeMockData,
      };
      await downloadPostmanCollection(project.id, project.name, config);
      toast.success('Colección postman-collection.json descargada');
    } catch (error: any) {
      console.error('Error al descargar colección Postman:', error);
      toast.error('Error al descargar la colección Postman');
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Send size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                  Generar Colección de Pruebas Postman
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                  Postman v2.1
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300 shrink-0">
                  CRUD Automation
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {project?.name || 'Modelo UML'} • 5 operaciones REST por entidad con scripts pm.test
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                showHelp
                  ? 'bg-blue-600/15 text-blue-400 border-blue-500/30'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
              title="Guía de importación en Postman"
            >
              <HelpCircle size={15} />
              <span className="hidden md:inline">Guía Runner</span>
            </button>

            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                showOptions
                  ? 'bg-amber-600/15 text-amber-400 border-amber-500/30'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
              title="Configuración de variables y tests"
            >
              <Settings2 size={15} />
              <span className="hidden md:inline">Configuración</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Help Guide Banner (Collapsible) */}
        {showHelp && (
          <div className="p-4 border-b border-slate-800 bg-blue-950/20 text-xs text-slate-300 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2 font-semibold text-blue-300 mb-2">
              <PlaySquare size={15} />
              <span>Cómo ejecutar pruebas automáticas con Postman Collection Runner</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-white block mb-0.5">1. Importar JSON</span>
                <span className="text-slate-400 text-[11px]">
                  Abre Postman, haz clic en <strong>Import</strong> y arrastra el archivo <code className="text-blue-300">.json</code> generado.
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-white block mb-0.5">2. Verificar Backend</span>
                <span className="text-slate-400 text-[11px]">
                  Inicia tu backend Spring Boot en el puerto configurado (ej: <code className="text-blue-300">localhost:8081</code>).
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-white block mb-0.5">3. Ejecutar Runner</span>
                <span className="text-slate-400 text-[11px]">
                  Selecciona la colección y pulsa <strong>Run Collection</strong> para ejecutar todas las pruebas en lote con aserciones en verde.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Drawer (Collapsible) */}
        {showOptions && (
          <div className="p-4 border-b border-slate-800 bg-slate-850/60 transition-all shrink-0 animate-fade-in">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings2 size={13} className="text-amber-400" />
              Parámetros de la Suite de Pruebas
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Base URL */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-center">
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  Variable de Entorno <code className="text-amber-300">{"{{baseUrl}}"}</code>
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:8081"
                  className="px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Option 2: Automatic Tests */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTests}
                  onChange={(e) => setIncludeTests(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Aserciones de Test (pm.test)</div>
                  <div className="text-[10px] text-slate-400">Status 200, 201 y tiempos &lt; 1000ms</div>
                </div>
              </label>

              {/* Option 3: Mock Payloads */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMockData}
                  onChange={(e) => setIncludeMockData(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Datos Mock Inteligentes</div>
                  <div className="text-[10px] text-slate-400">Payloads realistas en POST y PUT</div>
                </div>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
              <button
                onClick={fetchCollection}
                disabled={loading || isModelEmpty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer shadow-xs shadow-amber-500/20"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Regenerar Colección
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 min-h-0">
          {/* Empty Model Warning */}
          {isModelEmpty ? (
            <div className="p-6 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center flex flex-col items-center justify-center my-auto">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Modelo sin clases definidas
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Para generar una suite de pruebas en Postman, primero debes diseñar una o más entidades en el lienzo UML.
              </p>
            </div>
          ) : (
            <>
              {/* Metrics Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <FolderGit2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Carpetas Entidad</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : postmanData?.totalFolders ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Send size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Total Requests CRUD</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : postmanData?.totalRequests ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Aserciones de Test</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : postmanData?.totalTests ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Terminal size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Estándar Schema</div>
                    <div className="text-base font-bold text-white">
                      v2.1.0
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Viewer Container */}
              <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                {/* Code Viewer Bar */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode2 size={14} className="text-amber-400 shrink-0" />
                    <span className="font-mono text-slate-300 font-semibold truncate">
                      {postmanData?.fileName || 'collection.json'}
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-500 bg-slate-800">
                      Postman Collection v2.1
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      disabled={loading || !postmanData?.json}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Copiar JSON al portapapeles"
                    >
                      {copied ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copiar JSON</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownload}
                      disabled={downloading || loading || !postmanData?.json}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs shadow-amber-500/20"
                      title="Descargar colección en formato JSON"
                    >
                      {downloading ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Descargando...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Descargar .json</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Preformatted JSON Output */}
                <div className="relative flex-1 overflow-auto p-4 font-mono text-[12px] sm:text-[13px] leading-relaxed text-slate-300 select-text max-h-[52vh]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-amber-400" />
                      <span className="text-xs">Estructurando colección Postman v2.1 con scripts de prueba...</span>
                    </div>
                  ) : postmanData?.json ? (
                    <pre className="whitespace-pre font-mono selection:bg-amber-500/30 selection:text-amber-200">
                      {postmanData.json}
                    </pre>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Presiona "Regenerar Colección" para obtener el código JSON.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-amber-400" />
            <span className="hidden sm:inline">
              Listo para importar en Postman Desktop, Postman Web o pipelines CI/CD con Newman
            </span>
            <span className="sm:hidden">
              Compatible con Postman y Newman
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading || loading || isModelEmpty || !postmanData?.json}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer shadow-xs shadow-amber-500/20"
            >
              <Download size={14} />
              <span>Descargar .json</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
