import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Code2, 
  Download, 
  X, 
  Loader2, 
  Database, 
  FileCode, 
  FolderTree, 
  Settings2,
  AlertTriangle,
  Terminal
} from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';
import { 
  getBackendPreview, 
  downloadBackendZip, 
  GenerateBackendConfig, 
  GenerationPreviewResponse 
} from '../../services/generatorService';
import toast from 'react-hot-toast';

interface GenerateBackendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateBackendModal: React.FC<GenerateBackendModalProps> = ({ isOpen, onClose }) => {
  const { project, nodes } = useDiagramStore();

  const [packageName, setPackageName] = useState('com.sw1.generated');
  const [groupId, setGroupId] = useState('com.sw1');
  const [artifactId, setArtifactId] = useState('');
  const [javaVersion] = useState('21');
  const [includeMavenWrapper, setIncludeMavenWrapper] = useState(true);
  const [includeSwagger, setIncludeSwagger] = useState(true);

  const [preview, setPreview] = useState<GenerationPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isModelEmpty = !nodes || nodes.length === 0;

  useEffect(() => {
    if (project?.name && !artifactId) {
      const slug = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      setArtifactId(slug || 'backend-service');
    }
  }, [project, artifactId]);

  // Fetch file tree preview whenever modal opens or package name changes
  useEffect(() => {
    if (!isOpen || !project?.id || isModelEmpty) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const config: GenerateBackendConfig = {
          packageName,
          groupId,
          artifactId: artifactId || 'backend-service',
          javaVersion,
          includeMavenWrapper,
          includeSwagger,
        };
        const data = await getBackendPreview(project.id, config);
        setPreview(data);
      } catch (err: any) {
        // Fallback silently if preview fails
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 250);
    return () => clearTimeout(timer);
  }, [isOpen, project?.id, packageName, groupId, artifactId, includeMavenWrapper, includeSwagger, isModelEmpty]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (isModelEmpty) {
      toast.error('No es posible generar código para un modelo sin clases (Regla E1).');
      return;
    }

    if (!project?.id) {
      toast.error('El proyecto debe estar guardado para generar su código backend.');
      return;
    }

    setIsGenerating(true);
    try {
      const config: GenerateBackendConfig = {
        packageName: packageName.trim(),
        groupId: groupId.trim(),
        artifactId: artifactId.trim(),
        javaVersion,
        includeMavenWrapper,
        includeSwagger,
      };

      await downloadBackendZip(project.id, project.name, config);
      toast.success('Proyecto Spring Boot generado y descargado exitosamente');
      onClose();
    } catch (err: any) {
      let errorMsg = 'Error al generar el archivo ZIP del backend.';
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
      setIsGenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div 
        className="border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
              <Code2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Generar Backend Spring Boot (4 Capas en ZIP)
              </h2>
              <p className="text-xs text-slate-400">
                Arquitectura empresarial desacoplada en Java 21 LTS lista para ejecución inmediata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isModelEmpty ? (
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex items-start gap-3.5">
              <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-300">Modelo sin clases definidas</h4>
                <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                  Para compilar y empaquetar un backend Spring Boot, debes modelar al menos una clase con atributos en el lienzo.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Configuration Form */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Settings2 size={15} className="text-blue-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Configuración del Proyecto Maven
                </span>
              </div>

              {/* Package Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Paquete Base (Root Package)
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="com.empresa.sistema"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="text-[11px] text-slate-500">
                  Estructura de paquetes base para controllers, services, repositories y entities.
                </span>
              </div>

              {/* Group ID & Artifact ID */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Group ID
                  </label>
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="com.sw1"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Artifact ID
                  </label>
                  <input
                    type="text"
                    value={artifactId}
                    onChange={(e) => setArtifactId(e.target.value)}
                    placeholder="servicio-api"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Java Version & Target Database */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Versión Java LTS</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 font-mono">Java 21 LTS</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Oficial
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Base de Datos</span>
                  <div className="flex items-center gap-1.5">
                    <Database size={13} className="text-sky-400" />
                    <span className="text-xs font-bold text-slate-200">H2 dev + Postgres prod</span>
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeMavenWrapper}
                    onChange={(e) => setIncludeMavenWrapper(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span>Incluir Maven Wrapper (<code>./mvnw</code> ejecutable sin instalar Maven)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeSwagger}
                    onChange={(e) => setIncludeSwagger(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span>Incluir OpenAPI 3.0 / Swagger UI (<code>/swagger-ui.html</code>)</span>
                </label>
              </div>

              {/* Immediate Execution Banner */}
              <div className="p-3 bg-blue-950/25 border border-blue-800/40 rounded-lg text-blue-200 text-xs flex items-start gap-2.5">
                <Terminal size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-300">Ejecución en 1 comando:</span>
                  <p className="mt-0.5 text-blue-200/80 font-mono text-[11px]">
                    ./mvnw spring-boot:run
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Architecture & File Tree Preview */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FolderTree size={15} className="text-purple-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Estructura en 4 Capas Generada
                  </span>
                </div>
                {preview ? (
                  <span className="text-[11px] font-mono text-slate-400">
                    {preview.totalFiles} archivos
                  </span>
                ) : null}
              </div>

              {/* 4 Layers Badges */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/50">
                  <span className="text-[10px] font-mono text-blue-400 block font-bold">@Entity</span>
                  <span className="text-xs text-slate-200">{nodes.length} tablas</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/50">
                  <span className="text-[10px] font-mono text-amber-400 block font-bold">@Repository</span>
                  <span className="text-xs text-slate-200">{nodes.length} repos</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
                  <span className="text-[10px] font-mono text-emerald-400 block font-bold">@Service</span>
                  <span className="text-xs text-slate-200">{nodes.length} servs</span>
                </div>
                <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/50">
                  <span className="text-[10px] font-mono text-purple-400 block font-bold">@Controller</span>
                  <span className="text-xs text-slate-200">{nodes.length} APIs</span>
                </div>
              </div>

              {/* File Tree List */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg max-h-64 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {isLoadingPreview ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 size={18} className="animate-spin text-blue-400" />
                    <span>Calculando árbol de código fuente...</span>
                  </div>
                ) : preview && preview.fileTree.length > 0 ? (
                  preview.fileTree.map((filePath, idx) => {
                    const isYml = filePath.endsWith('.yml');
                    const isXml = filePath.endsWith('.xml');
                    const isMd = filePath.endsWith('.md');
                    const isWrapper = filePath.includes('mvnw');

                    let badgeColor = 'text-slate-400';
                    if (filePath.includes('/entity/')) badgeColor = 'text-blue-400';
                    else if (filePath.includes('/repository/')) badgeColor = 'text-amber-400';
                    else if (filePath.includes('/service/')) badgeColor = 'text-emerald-400';
                    else if (filePath.includes('/controller/')) badgeColor = 'text-purple-400';
                    else if (filePath.includes('/dto/')) badgeColor = 'text-sky-400';
                    else if (isYml) badgeColor = 'text-rose-400';
                    else if (isXml) badgeColor = 'text-teal-400';
                    else if (isMd) badgeColor = 'text-indigo-400';
                    else if (isWrapper) badgeColor = 'text-amber-300';

                    return (
                      <div key={idx} className="flex items-center gap-2 hover:bg-slate-900/60 px-1.5 py-0.5 rounded transition-colors">
                        <FileCode size={12} className={badgeColor} />
                        <span className={`truncate ${badgeColor}`}>{filePath}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-500">
                    Agrega clases al diagrama para previsualizar el código
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating || isModelEmpty}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
              isGenerating || isModelEmpty
                ? 'bg-slate-700 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Empaquetando en ZIP...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Generar y Descargar ZIP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
