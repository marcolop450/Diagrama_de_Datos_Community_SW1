import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { api } from '../../services/api';
import { DomainTemplate } from '../../types/template';
import { 
  X, 
  FolderPlus, 
  Layers, 
  GraduationCap, 
  HeartPulse, 
  Receipt, 
  Check, 
  Sparkles,
  Tag,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateProjectModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

const DEFAULT_FALLBACK_TEMPLATES: DomainTemplate[] = [
  {
    id: 'TEMPLATE_BLANK',
    name: 'Lienzo en Blanco',
    category: 'General',
    description: 'Espacio limpio para modelado arquitectónico de clases y relaciones desde cero.',
    nodeCount: 0,
    edgeCount: 0
  },
  {
    id: 'TEMPLATE_COLEGIO',
    name: 'Sistema Académico Universitario',
    category: 'Educación',
    description: 'Modelo con Estudiantes, Docentes, Materias, Inscripciones y Carreras.',
    nodeCount: 5,
    edgeCount: 4
  },
  {
    id: 'TEMPLATE_CLINICA',
    name: 'Sistema Hospitalario y Clínico',
    category: 'Salud',
    description: 'Modelo clínico con Pacientes, Médicos, Consultas, Especialidades e Historiales.',
    nodeCount: 5,
    edgeCount: 4
  },
  {
    id: 'TEMPLATE_CONTABILIDAD',
    name: 'Sistema Contable y Facturación E-Commerce',
    category: 'Finanzas',
    description: 'Modelo comercial transaccional con Clientes, Facturas, Detalles, Productos y Pagos.',
    nodeCount: 5,
    edgeCount: 4
  }
];

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'educación':
    case 'educacion':
      return <GraduationCap size={18} className="text-amber-400" />;
    case 'salud':
      return <HeartPulse size={18} className="text-rose-400" />;
    case 'finanzas':
      return <Receipt size={18} className="text-emerald-400" />;
    case 'general':
    default:
      return <Layers size={18} className="text-blue-400" />;
  }
};

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen = true, 
  onClose, 
  onSuccess 
}) => {
  const { closeModal } = useUiStore();
  const { loadDiagram } = useDiagramStore();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<DomainTemplate[]>(DEFAULT_FALLBACK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<DomainTemplate>(DEFAULT_FALLBACK_TEMPLATES[0]);

  // Form State
  const [name, setName] = useState('Mi Nuevo Modelo UML');
  const [description, setDescription] = useState(DEFAULT_FALLBACK_TEMPLATES[0].description || '');
  const [version, setVersion] = useState('v1.0.0');
  const [tags, setTags] = useState<string[]>(['uml', 'spring-boot']);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.getTemplates();
        if (res && res.data && res.data.length > 0) {
          setTemplates(res.data);
        }
      } catch {
        // Fallback already in state
      }
    };
    fetchTemplates();
  }, []);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultTpl = templates[0] || DEFAULT_FALLBACK_TEMPLATES[0];
      setSelectedTemplate(defaultTpl);
      setName(defaultTpl.id === 'TEMPLATE_BLANK' ? 'Mi Nuevo Modelo UML' : ('Mi ' + defaultTpl.name));
      setDescription(defaultTpl.description || '');
      setVersion('v1.0.0');
      setTags(['uml', 'spring-boot']);
      setTagInput('');
      setLoading(false);
    }
  }, [isOpen, templates]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeModal();
    }
  };

  const handleSelectTemplate = (tpl: DomainTemplate) => {
    setSelectedTemplate(tpl);
    setName(tpl.id === 'TEMPLATE_BLANK' ? 'Mi Nuevo Modelo UML' : ('Mi ' + tpl.name));
    setDescription(tpl.description || '');
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre del proyecto es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        version: version.trim() || 'v1.0.0',
        tags,
        templateId: selectedTemplate?.id
      };

      const res = await api.createProject(payload);
      if (res && res.data) {
        toast.success(`Proyecto '${res.data.name}' creado con éxito`);
        await loadDiagram(res.data.id);
        if (onSuccess) onSuccess();
        handleClose();
        navigate(`/editor/${res.data.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-md">
              <FolderPlus size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Crear Nuevo Proyecto UML</h2>
              <p className="text-[11px] text-slate-400">
                Selecciona una plantilla base y revisa la configuración antes de inicializar el modelo
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body: 2 Columns on Desktop */}
        <form id="create-project-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Left Column: Template Selection */}
          <div className="md:w-1/2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                1. Plantilla de Dominio Base
              </span>
              <span className="text-[10px] text-slate-400">
                Selecciona una opción
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {templates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/80 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800">
                          {getCategoryIcon(tpl.category)}
                        </div>
                        <div>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            {tpl.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-100">
                            {tpl.name}
                          </h4>
                        </div>
                      </div>
                      
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>

                    <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{tpl.nodeCount > 0 ? (`${tpl.nodeCount} clases UML`) : 'Lienzo en blanco'}</span>
                      <span>{tpl.edgeCount > 0 ? (`${tpl.edgeCount} relaciones`) : 'Cero dependencias'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Project Configuration */}
          <div className="md:w-1/2 flex flex-col gap-4 bg-slate-950/40 border border-slate-800/80 rounded-lg p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                2. Configuración del Proyecto
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Listo para crear
              </span>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del Proyecto <span className="text-rose-400">*</span>
              </label>
              <input 
                type="text" 
                required
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Sistema de Gestión Hospitalaria"
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-2 text-xs focus:outline-none transition-colors"
              />
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descripción del Modelo
              </label>
              <textarea 
                rows={3}
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivo y arquitectura del modelo UML..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-2 text-xs focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Version Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Versión Semántica
              </label>
              <input 
                type="text" 
                value={version} 
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors"
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Etiquetas / Tags
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 focus:border-blue-500 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none"
                  placeholder="Agregar tag y presiona Enter..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-md text-xs flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {tags.map((t) => (
                    <span 
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-800/80 border border-slate-700 text-slate-300"
                    >
                      <Tag size={10} className="text-blue-400" />
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <button 
            type="button" 
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button 
            type="submit"
            form="create-project-form"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-md shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Creando Modelo...</span>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Crear Proyecto UML</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateProjectModal;
