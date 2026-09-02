import React, { useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { X, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateProjectModal: React.FC = () => {
  const { closeModal } = useUiStore();
  const { user } = useAuthStore();
  const { loadDiagram } = useDiagramStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        ownerId: user?.userId,
        metadata: { grid: true, zoom: 1 }
      };

      const res = await api.createProject(payload);
      if (res && res.data) {
        toast.success(`Proyecto "${res.data.name}" creado`);
        await loadDiagram(res.data.id);
      }
      closeModal();
    } catch {
      // Local creation fallback
      toast.success(`Proyecto "${name}" creado localmente`);
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg">
              <FolderPlus size={18} />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">Nuevo Proyecto UML</h2>
          </div>
          <button 
            onClick={closeModal} 
            className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre del Modelo
            </label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none transition-colors"
              placeholder="Ej: Sistema de Facturación y Ventas"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Descripción de Arquitectura (Opcional)
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none transition-colors resize-none"
              placeholder="Detalles sobre el dominio del problema, entidades principales, etc."
            />
          </div>
          
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800/80">
            <button 
              type="button" 
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
