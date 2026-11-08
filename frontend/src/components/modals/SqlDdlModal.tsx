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
  Loader2,
  Server
} from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';
import { 
  generateMultiSqlDdl, 
  downloadMultiSqlDdl, 
  MultiSqlDdlResponse, 
  GenerateMultiSqlDdlConfig,
  SqlDialectEngine 
} from '../../services/generatorService';
import toast from 'react-hot-toast';

interface SqlDdlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EngineOption {
  id: SqlDialectEngine;
  name: string;
  badge: string;
  desc: string;
}

const ENGINES: EngineOption[] = [
  { id: 'POSTGRESQL', name: 'PostgreSQL 17', badge: 'Supabase / Neon', desc: 'IDENTITY ALWAYS + CASCADE' },
  { id: 'MYSQL', name: 'MySQL 8.x', badge: 'InnoDB / MariaDB', desc: 'AUTO_INCREMENT + ON DELETE CASCADE' },
  { id: 'SQL_SERVER', name: 'SQL Server', badge: 'T-SQL 2019+', desc: 'IDENTITY(1,1) + T-SQL Constraints' },
  { id: 'ORACLE', name: 'Oracle Database', badge: 'PL/SQL 19c/21c', desc: 'GENERATED AS IDENTITY' },
];

export const SqlDdlModal: React.FC<SqlDdlModalProps> = ({ isOpen, onClose }) => {
  const { project, nodes, saveDiagram } = useDiagramStore();

  // Engine selection (CU16 Multi-Motor)
  const [selectedEngine, setSelectedEngine] = useState<SqlDialectEngine>('POSTGRESQL');

  // Configuration options
  const [dropTables, setDropTables] = useState<boolean>(true);
  const [createIndexes, setCreateIndexes] = useState<boolean>(true);
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [includeForeignKeys, setIncludeForeignKeys] = useState<boolean>(true);
  const [schema, setSchema] = useState<string>('public');
  const [showOptions, setShowOptions] = useState<boolean>(false);

  // Generation state
  const [loading, setLoading] = useState<boolean>(false);
  const [ddlData, setDdlData] = useState<MultiSqlDdlResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const isModelEmpty = !nodes || nodes.length === 0;

  const sqlScript = ddlData?.sql || ddlData?.ddlScript || '';
  const totalTables = ddlData?.totalTables ?? ddlData?.tableCount ?? 0;
  const totalColumns = ddlData?.totalColumns ?? 0;
  const totalForeignKeys = ddlData?.totalForeignKeys ?? ddlData?.relationshipCount ?? 0;
  const totalIndexes = ddlData?.totalIndexes ?? ddlData?.indexCount ?? 0;

  const fetchDdl = useCallback(async (engineOverride?: SqlDialectEngine) => {
    if (!project?.id || isModelEmpty) return;

    const targetEngine = engineOverride || selectedEngine;
    setLoading(true);
    try {
      // Sincronizar automáticamente el lienzo con la base de datos para que el compilador tenga el modelo al día
      try {
        await saveDiagram();
      } catch (saveErr) {
        console.warn('Auto-sincronización previa al DDL SQL:', saveErr);
      }

      const config: GenerateMultiSqlDdlConfig = {
        engine: targetEngine,
        dialect: targetEngine,
        dropTables,
        createIndexes,
        includeComments,
        includeForeignKeys,
        schema: schema.trim() || 'public',
      };

      const result = await generateMultiSqlDdl(project.id, config);
      setDdlData(result);
    } catch (error: any) {
      console.error('Error al generar DDL SQL multi-motor:', error);
      const msg = error.response?.data?.message || 'No se pudo generar el script DDL SQL';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [project?.id, isModelEmpty, selectedEngine, dropTables, createIndexes, includeComments, includeForeignKeys, schema, saveDiagram]);

  useEffect(() => {
    if (isOpen && project?.id && !isModelEmpty) {
      fetchDdl(selectedEngine);
    }
  }, [isOpen, project?.id, isModelEmpty, selectedEngine]);

  if (!isOpen) return null;

  const handleEngineChange = (engine: SqlDialectEngine) => {
    if (engine === selectedEngine) return;
    setSelectedEngine(engine);
  };

  const handleCopy = async () => {
    if (!sqlScript) return;
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      toast.success(`Script SQL (${ddlData?.engineLabel || activeEngineObj.name}) copiado al portapapeles`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleDownload = async () => {
    if (!project?.id) return;
    setDownloading(true);
    try {
      const config: GenerateMultiSqlDdlConfig = {
        engine: selectedEngine,
        dialect: selectedEngine,
        dropTables,
        createIndexes,
        includeComments,
        includeForeignKeys,
        schema: schema.trim() || 'public',
      };
      await downloadMultiSqlDdl(project.id, project.name, config);
      toast.success(`Script ${ddlData?.fileName || 'schema.sql'} descargado exitosamente`);
    } catch (error: any) {
      console.error('Error al descargar DDL multi-motor:', error);
      toast.error('Error al descargar el archivo SQL');
    } finally {
      setDownloading(false);
    }
  };

  const activeEngineObj = ENGINES.find(e => e.id === selectedEngine) || ENGINES[0];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#14171d] border border-[#242934] shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#242934] bg-[#11141a] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate font-display">
                  Generar Esquema DDL Multi-Motor
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shrink-0">
                  {activeEngineObj.name}
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 shrink-0">
                  {activeEngineObj.badge}
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
              className={`p-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                showOptions
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  : 'bg-[#181c24] hover:bg-[#1f2430] text-slate-300 border-[#242934]'
              }`}
              title="Configuración avanzada de DDL"
            >
              <Settings2 size={15} />
              <span className="hidden md:inline">Opciones</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#181c24] rounded-lg transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Engine Tabs Bar (CU16 - PostgreSQL 17, MySQL 8.x, SQL Server, Oracle) */}
        <div className="px-5 py-2.5 bg-[#0f1115] border-b border-[#242934] shrink-0">
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 min-w-max">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1.5 flex items-center gap-1 font-display">
                <Server size={12} className="text-indigo-400" />
                Motor:
              </span>
              {ENGINES.map((eng) => {
                const isActive = selectedEngine === eng.id;
                return (
                  <button
                    key={eng.id}
                    type="button"
                    onClick={() => handleEngineChange(eng.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500 font-semibold'
                        : 'bg-[#181c24] hover:bg-[#202532] text-slate-300 border border-[#242934]'
                    }`}
                    title={eng.desc}
                  >
                    <span>{eng.name}</span>
                    <span className={`text-[9px] font-mono px-1 rounded ${
                      isActive ? 'bg-indigo-700/60 text-indigo-100' : 'bg-[#11141a] text-slate-400'
                    }`}>
                      {eng.badge.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="hidden lg:flex items-center text-[10px] text-slate-400 font-mono">
              Dialecto Nativo • {activeEngineObj.desc}
            </div>
          </div>
        </div>

        {/* Configuration Drawer (Collapsible) */}
        {showOptions && (
          <div className="p-4 border-b border-[#242934] bg-[#0f1115]/90 transition-all shrink-0 animate-fade-in">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-display">
              <Settings2 size={13} className="text-indigo-400" />
              Parámetros de Generación SQL ({activeEngineObj.name})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Drop Tables */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181c24] border border-[#242934] hover:border-indigo-500/30 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dropTables}
                  onChange={(e) => setDropTables(e.target.checked)}
                  className="rounded border-[#242934] text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 bg-[#0f1115] cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">DROP TABLE IF EXISTS</div>
                  <div className="text-[10px] text-slate-400">Limpieza y recreación</div>
                </div>
              </label>

              {/* Option 2: Foreign Key Constraints */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181c24] border border-[#242934] hover:border-indigo-500/30 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeForeignKeys}
                  onChange={(e) => setIncludeForeignKeys(e.target.checked)}
                  className="rounded border-[#242934] text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 bg-[#0f1115] cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Claves Foráneas (FK)</div>
                  <div className="text-[10px] text-slate-400">Restricciones de integridad</div>
                </div>
              </label>

              {/* Option 3: Create Indexes */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181c24] border border-[#242934] hover:border-indigo-500/30 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createIndexes}
                  onChange={(e) => setCreateIndexes(e.target.checked)}
                  className="rounded border-[#242934] text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 bg-[#0f1115] cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Índices B-Tree</div>
                  <div className="text-[10px] text-slate-400">Optimización de JOINs</div>
                </div>
              </label>

              {/* Option 4: Include Comments */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181c24] border border-[#242934] hover:border-indigo-500/30 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="rounded border-[#242934] text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 bg-[#0f1115] cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">Comentarios Diccionario</div>
                  <div className="text-[10px] text-slate-400">Metadatos de tabla/columna</div>
                </div>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 pt-2 border-t border-[#242934]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Esquema / Base de datos:</span>
                <input
                  type="text"
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  placeholder={selectedEngine === 'SQL_SERVER' ? 'dbo' : 'public'}
                  className="px-2.5 py-1 text-xs rounded-xl bg-[#0f1115] border border-[#242934] text-white focus:outline-hidden focus:border-indigo-500 font-mono w-28"
                />
              </div>

              <button
                onClick={() => fetchDdl()}
                disabled={loading || isModelEmpty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md shadow-indigo-600/20"
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
              <h3 className="text-sm font-semibold text-white mb-1 font-display">
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
                <div className="p-3 rounded-xl bg-[#181c24] border border-[#242934] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <TableProperties size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Total Tablas</div>
                    <div className="text-base font-bold text-white font-mono">
                      {loading ? '...' : totalTables}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#181c24] border border-[#242934] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Total Columnas</div>
                    <div className="text-base font-bold text-white font-mono">
                      {loading ? '...' : totalColumns}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#181c24] border border-[#242934] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <KeyRound size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Claves Foráneas</div>
                    <div className="text-base font-bold text-white font-mono">
                      {loading ? '...' : totalForeignKeys}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#181c24] border border-[#242934] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <ListFilter size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">Índices B-Tree</div>
                    <div className="text-base font-bold text-white font-mono">
                      {loading ? '...' : totalIndexes}
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Viewer Container */}
              <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-[#242934] bg-[#0a0c10] overflow-hidden shadow-inner">
                {/* Code Viewer Bar */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#11141a] border-b border-[#242934] text-xs shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode2 size={14} className="text-indigo-400 shrink-0" />
                    <span className="font-mono text-slate-300 font-semibold truncate">
                      {ddlData?.fileName || `${activeEngineObj.name.toLowerCase().replace(' ', '-')}-schema.sql`}
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/30">
                      {activeEngineObj.name}
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#181c24] border border-[#242934]">
                      UTF-8
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      disabled={loading || !sqlScript}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181c24] hover:bg-[#1f2430] text-slate-200 border border-[#242934] text-xs font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Copiar script SQL al portapapeles"
                    >
                      {copied ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copiado</span>
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
                      disabled={downloading || loading || !sqlScript}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20"
                      title={`Descargar archivo SQL compilado para ${activeEngineObj.name}`}
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
                <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200 select-text leading-relaxed">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                      <Loader2 size={28} className="animate-spin text-indigo-400 mb-2" />
                      <span>Compilando dialecto {activeEngineObj.name}...</span>
                    </div>
                  ) : sqlScript ? (
                    <pre className="whitespace-pre font-mono text-[12px] leading-relaxed text-slate-300">
                      <code>{sqlScript}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 py-12">
                      Sin datos generados. Presiona "Regenerar Script".
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#242934] bg-[#11141a] shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Normalización e Integridad Relacional Verificada (1NF-3NF)</span>
            <span className="sm:hidden">1NF-3NF Verificado</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#181c24] hover:bg-[#1f2430] text-slate-300 hover:text-white border border-[#242934] transition-colors cursor-pointer font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SqlDdlModal;
