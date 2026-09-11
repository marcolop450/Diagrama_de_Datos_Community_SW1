import React, { useState, useRef } from 'react';
import { Upload, FileCode, X, Layers, RefreshCw, FolderPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import { useDiagramStore } from '../../stores/diagramStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { project, loadDiagram } = useDiagramStore();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'new' | 'current'>(project?.id ? 'current' : 'new');
  const [projectName, setProjectName] = useState('');
  const [replaceCurrent, setReplaceCurrent] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selected: File) => {
    const name = selected.name.toLowerCase();
    if (!name.endsWith('.xmi') && !name.endsWith('.xml')) {
      toast.error('El archivo debe tener extensión .xmi o .xml');
      return;
    }

    if (selected.size > 25 * 1024 * 1024) {
      toast.error('El archivo supera el límite máximo permitido de 25 MB');
      return;
    }

    setFile(selected);
    setErrorMessage(null);

    // Suggest clean project name without extension
    const baseName = selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    if (!projectName) {
      setProjectName(baseName);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) {
      toast.error('Seleccione un archivo XMI para continuar.');
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      if (importMode === 'new' || !project?.id) {
        const response = await api.importProjectXmi(file, projectName.trim() || undefined);
        const data = response.data;

        toast.success(
          `Importación exitosa: ${data.classesCount} clases y ${data.relationshipsCount} relaciones reconstruidas.`
        );

        onClose();
        if (data.projectId) {
          localStorage.setItem('case_last_project_id', data.projectId);
          navigate(`/editor/${data.projectId}`);
          await loadDiagram(data.projectId);
        }
      } else {
        const response = await api.importIntoProjectXmi(project.id, file, replaceCurrent);
        const data = response.data;

        toast.success(
          `Modelo incorporado: ${data.classesCount} clases y ${data.relationshipsCount} relaciones actualizadas.`
        );

        onClose();
        await loadDiagram(project.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al procesar el archivo XMI.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div 
        className="border rounded-lg w-full max-w-xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Importar Modelo desde XMI
              </h2>
              <p className="text-xs text-slate-400">
                Interoperabilidad con ArchiTec, Enterprise Architect y StarUML (OMG XMI 2.1)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Drag and drop zone */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xmi,.xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
                <FileCode size={24} />
              </div>
              <p className="text-sm font-medium text-slate-200 text-center mb-1">
                Arrastra tu archivo XMI aquí o haz clic para examinar
              </p>
              <p className="text-xs text-slate-400 text-center">
                Formatos compatibles: .xmi, .xml (OMG UML 2.1 / 2.5) hasta 25 MB
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB — Especificación XML/XMI lista
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={isImporting}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-md transition-colors cursor-pointer shrink-0"
              >
                Cambiar archivo
              </button>
            </div>
          )}

          {/* Import options */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Destino de la Importación
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setImportMode('new')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  importMode === 'new'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/40'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FolderPlus size={18} className={importMode === 'new' ? 'text-blue-400 mt-0.5' : 'text-slate-500 mt-0.5'} />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Crear Nuevo Proyecto</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Genera un espacio de trabajo independiente con el modelo importado.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={!project?.id}
                onClick={() => setImportMode('current')}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  !project?.id
                    ? 'opacity-40 border-slate-800 bg-slate-900/20 text-slate-600 cursor-not-allowed'
                    : importMode === 'current'
                      ? 'border-blue-500 bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/40 cursor-pointer'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 cursor-pointer'
                }`}
              >
                <RefreshCw size={18} className={importMode === 'current' ? 'text-blue-400 mt-0.5' : 'text-slate-500 mt-0.5'} />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Proyecto Actual</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {project?.id ? `Cargar en "${project.name}"` : 'Requiere un modelo abierto'}
                  </p>
                </div>
              </button>
            </div>

            {/* Sub-options for new project */}
            {importMode === 'new' && (
              <div className="pt-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nombre del Proyecto (opcional):
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Nombre asignado al nuevo modelo UML"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Sub-options for current project */}
            {importMode === 'current' && project?.id && (
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceCurrent}
                    onChange={(e) => setReplaceCurrent(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Reemplazar clases y relaciones existentes en este proyecto</span>
                </label>
              </div>
            )}
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200">
                <p className="font-semibold">Error al importar XMI</p>
                <p className="text-rose-300/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-3.5 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
        >
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Layers size={13} className="text-blue-400" />
            <span>Auto-Layout jerárquico aplicado automáticamente</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!file || isImporting}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all ${
                !file || isImporting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-98 cursor-pointer'
              }`}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Procesando XMI...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Importar al Lienzo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
