import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Database, 
  X, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Layers, 
  KeyRound, 
  ListFilter, 
  TableProperties, 
  FileCode2, 
  AlertTriangle,
  Settings2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';
import { generateSqlDdl, downloadSqlDdl, SqlDdlResponse, GenerateSqlDdlConfig } from '../../services/generatorService';
import toast from 'react-hot-toast';

interface SqlDdlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlDdlModal: React.FC<SqlDdlModalProps> = ({ isOpen, onClose }) => {
  const { project, nodes } = useDiagramStore();

  // Configuration options
  const [dropTables, setDropTables] = useState<boolean>(true);
  const [createIndexes, setCreateIndexes] = useState<boolean>(true);
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [includeForeignKeys, setIncludeForeignKeys] = useState<boolean>(true);
  const [schema, setSchema] = useState<string>('public');
  const [showOptions, setShowOptions] = useState<boolean>(false);

  // Generation state
  const [loading, setLoading] = useState<boolean>(false);
  const [ddlData, setDdlData] = useState<SqlDdlResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const isModelEmpty = !nodes || nodes.length === 0;

  const fetchDdl = useCallback(async () => {
    if (!project?.id || isModelEmpty) return;

    setLoading(true);
    try {
      const config: GenerateSqlDdlConfig = {
        dropTables,
        createIndexes,
        includeComments,
        includeForeignKeys,
        schema: schema.trim() || 'public',
      };

      const result = await generateSqlDdl(project.id, config);
      setDdlData(result);
    } catch (error: any) {
      console.error('Error al generar DDL SQL:', error);
      const msg = error.response?.data?.message || 'No se pudo generar el script DDL SQL';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [project?.id, isModelEmpty, dropTables, createIndexes, includeComments, includeForeignKeys, schema]);

  useEffect(() => {
    if (isOpen && project?.id && !isModelEmpty) {
      fetchDdl();
    }
  }, [isOpen, project?.id, isModelEmpty]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!ddlData?.sql) return;
    try {
      await navigator.clipboard.writeText(ddlData.sql);
      setCopied(true);
      toast.success('Script SQL copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleDownload = async () => {
    if (!project?.id) return;
    setDownloading(true);
    try {
      const config: GenerateSqlDdlConfig = {
        dropTables,
        createIndexes,
        includeComments,
        includeForeignKeys,
        schema: schema.trim() || 'public',
      };
      await downloadSqlDdl(project.id, project.name, config);
      toast.success('Script schema.sql descargado exitosamente');
    } catch (error: any) {
      console.error('Error al descargar schema.sql:', error);
      toast.error('Error al descargar el archivo SQL');
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
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                  Generar Esquema DDL SQL
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shrink-0">
                  PostgreSQL 17
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300 shrink-0">
                  Supabase Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {project?.name || 'Modelo UML'} • {nodes.length} {nodes.length === 1 ? 'clase modelada' : 'clases modeladas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                showOptions
                  ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
              title="Configuración avanzada de DDL"
            >
              <Settings2 size={15} />
              <span className="hidden md:inline">Opciones</span>
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

        {/* Configuration Drawer (Collapsible) */}
        {showOptions && (
          <div className="p-4 border-b border-slate-800 bg-slate-850/60 transition-all shrink-0 animate-fade-in">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings2 size={13} className="text-emerald-400" />
              Parámetros de Generación SQL
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Drop Tables */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dropTables}
                  onChange={(e) => setDropTables(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">DROP TABLE IF EXISTS</div>
                  <div className="text-[10px] text-slate-400">Limpieza con CASCADE</div>
                </div>
              </label>

              {/* Option 2: Foreign Key Constraints */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeForeignKeys}
                  onChange={(e) => setIncludeForeignKeys(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Claves Foráneas (FK)</div>
                  <div className="text-[10px] text-slate-400">Restricciones de integridad</div>
                </div>
              </label>

              {/* Option 3: Create Indexes */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createIndexes}
                  onChange={(e) => setCreateIndexes(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Índices B-Tree</div>
                  <div className="text-[10px] text-slate-400">Optimización de JOINs</div>
                </div>
              </label>

              {/* Option 4: Include Comments */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Comentarios Diccionario</div>
                  <div className="text-[10px] text-slate-400">COMMENT ON TABLE/COL</div>
                </div>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Esquema PostgreSQL:</span>
                <input
                  type="text"
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  placeholder="public"
                  className="px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono w-28"
                />
              </div>

              <button
                onClick={fetchDdl}
                disabled={loading || isModelEmpty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Regenerar Script
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
                Para generar un esquema DDL relacional formal, primero debes diseñar una o más entidades en el lienzo UML con sus correspondientes atributos y relaciones.
              </p>
            </div>
          ) : (
            <>
              {/* Metrics Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <TableProperties size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Total Tablas</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : ddlData?.totalTables ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Total Columnas</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : ddlData?.totalColumns ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <KeyRound size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Claves Foráneas</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : ddlData?.totalForeignKeys ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <ListFilter size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Índices B-Tree</div>
                    <div className="text-base font-bold text-white">
                      {loading ? '...' : ddlData?.totalIndexes ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Viewer Container */}
              <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                {/* Code Viewer Bar */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="font-mono text-slate-300 font-semibold truncate">
                      {ddlData?.fileName || 'schema.sql'}
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-500 bg-slate-800">
                      UTF-8
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      disabled={loading || !ddlData?.sql}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Copiar script SQL al portapapeles"
                    >
                      {copied ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copiar SQL</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownload}
                      disabled={downloading || loading || !ddlData?.sql}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs shadow-emerald-500/20"
                      title="Descargar archivo schema.sql"
                    >
                      {downloading ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Descargando...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Descargar .sql</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Preformatted SQL Output */}
                <div className="relative flex-1 overflow-auto p-4 font-mono text-[12px] sm:text-[13px] leading-relaxed text-slate-300 select-text max-h-[52vh]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-emerald-400" />
                      <span className="text-xs">Sintetizando esquema DDL para PostgreSQL 17...</span>
                    </div>
                  ) : ddlData?.sql ? (
                    <pre className="whitespace-pre font-mono selection:bg-emerald-500/30 selection:text-emerald-200">
                      {ddlData.sql}
                    </pre>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Presiona "Regenerar Script" para obtener el código SQL.
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
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">
              Script DDL 100% compatible con Supabase SQL Editor, psql y DBeaver
            </span>
            <span className="sm:hidden">
              Compatible con PostgreSQL 17
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
              disabled={downloading || loading || isModelEmpty || !ddlData?.sql}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer shadow-xs shadow-emerald-500/20"
            >
              <Download size={14} />
              <span>Descargar .sql</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
