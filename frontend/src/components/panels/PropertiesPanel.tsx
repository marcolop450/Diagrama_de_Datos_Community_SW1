import React, { useState } from 'react';
import { useDiagramStore } from '../../stores/diagramStore';
import { 
  X, 
  Trash2, 
  Plus, 
  Sliders
} from 'lucide-react';
import { ClassAttribute, ClassMethod } from '../../types/diagram';
import toast from 'react-hot-toast';

const PropertiesPanel: React.FC = () => {
  const { 
    selectedNode, 
    selectedEdge, 
    updateClassNode, 
    deleteClassNode, 
    updateRelationship, 
    deleteRelationship, 
    setSelectedNode,
    setSelectedEdge
  } = useDiagramStore();

  const [activeTab, setActiveTab] = useState<'general' | 'attributes' | 'methods'>('general');

  if (!selectedNode && !selectedEdge) return null;

  // Handle Class Node Changes
  const handleNodeNameChange = (name: string) => {
    if (!selectedNode) return;
    updateClassNode(selectedNode.id, { name });
  };

  const handleNodeStereotypeChange = (stereotype: string) => {
    if (!selectedNode) return;
    updateClassNode(selectedNode.id, { stereotype: stereotype || undefined });
  };

  const handleNodeAbstractToggle = (isAbstract: boolean) => {
    if (!selectedNode) return;
    updateClassNode(selectedNode.id, { isAbstract });
  };

  const handleAddAttribute = () => {
    if (!selectedNode) return;
    const newAttr: ClassAttribute = {
      id: `a-${Date.now()}`,
      name: `campo${(selectedNode.data.attributes?.length || 0) + 1}`,
      type: 'String',
      visibility: 'private',
      isStatic: false
    };
    const updated = [...(selectedNode.data.attributes || []), newAttr];
    updateClassNode(selectedNode.id, { attributes: updated });
    toast.success('Atributo añadido');
  };

  const handleRemoveAttribute = (attrId: string) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.attributes.filter(a => a.id !== attrId);
    updateClassNode(selectedNode.id, { attributes: updated });
  };

  const handleUpdateAttribute = (attrId: string, patch: Partial<ClassAttribute>) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.attributes.map(a => a.id === attrId ? { ...a, ...patch } : a);
    updateClassNode(selectedNode.id, { attributes: updated });
  };

  const handleAddMethod = () => {
    if (!selectedNode) return;
    const newMethod: ClassMethod = {
      id: `m-${Date.now()}`,
      name: `operacion${(selectedNode.data.methods?.length || 0) + 1}`,
      returnType: 'void',
      visibility: 'public',
      isStatic: false,
      isAbstract: false,
      parameters: []
    };
    const updated = [...(selectedNode.data.methods || []), newMethod];
    updateClassNode(selectedNode.id, { methods: updated });
    toast.success('Método añadido');
  };

  const handleRemoveMethod = (methodId: string) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.methods.filter(m => m.id !== methodId);
    updateClassNode(selectedNode.id, { methods: updated });
  };

  const handleUpdateMethod = (methodId: string, patch: Partial<ClassMethod>) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.methods.map(m => m.id === methodId ? { ...m, ...patch } : m);
    updateClassNode(selectedNode.id, { methods: updated });
  };

  // Handle Relationship Changes
  const handleEdgeTypeChange = (type: any) => {
    if (!selectedEdge) return;
    updateRelationship(selectedEdge.id, { type });
  };

  const handleEdgeLabelChange = (label: string) => {
    if (!selectedEdge) return;
    updateRelationship(selectedEdge.id, { label });
  };

  const handleEdgeCardinalityChange = (sourceCard: string, targetCard: string) => {
    if (!selectedEdge) return;
    updateRelationship(selectedEdge.id, { 
      sourceCardinality: sourceCard, 
      targetCardinality: targetCard 
    });
  };

  return (
    <aside className="w-80 bg-slate-950 text-slate-200 border-l border-slate-800/80 flex flex-col h-full shadow-2xl z-20 select-none animate-fade-in-up">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-blue-400" />
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-100">
            {selectedNode ? 'Propiedades de Clase' : 'Propiedades de Relación'}
          </h2>
        </div>
        <button 
          onClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
          title="Cerrar panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ================= CLASS NODE PROPERTIES ================= */}
        {selectedNode && (
          <>
            {/* Tabs for Class */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  activeTab === 'general' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('attributes')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  activeTab === 'attributes' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Atributos ({selectedNode.data.attributes?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('methods')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  activeTab === 'methods' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Métodos ({selectedNode.data.methods?.length || 0})
              </button>
            </div>

            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nombre de la Clase
                  </label>
                  <input 
                    type="text" 
                    value={selectedNode.data.name} 
                    onChange={(e) => handleNodeNameChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Estereotipo UML
                  </label>
                  <select 
                    value={selectedNode.data.stereotype || ''} 
                    onChange={(e) => handleNodeStereotypeChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-sans text-slate-200 focus:outline-none transition-colors"
                  >
                    <option value="">(Ninguno)</option>
                    <option value="entity">entity (Entidad JPA)</option>
                    <option value="interface">interface (Interfaz)</option>
                    <option value="service">service (Servicio Spring)</option>
                    <option value="controller">controller (REST Controller)</option>
                    <option value="repository">repository (Repositorio)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!selectedNode.data.isAbstract} 
                      onChange={(e) => handleNodeAbstractToggle(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-medium">Es Clase Abstracta</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB: ATTRIBUTES */}
            {activeTab === 'attributes' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Campos</span>
                  <button 
                    onClick={handleAddAttribute}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition-colors"
                  >
                    <Plus size={12} />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {(!selectedNode.data.attributes || selectedNode.data.attributes.length === 0) ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Sin atributos definidos</p>
                  ) : (
                    selectedNode.data.attributes.map((attr) => (
                      <div key={attr.id} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={attr.visibility}
                            onChange={(e) => handleUpdateAttribute(attr.id, { visibility: e.target.value as any })}
                            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-slate-200"
                          >
                            <option value="public">+ Public</option>
                            <option value="private">- Private</option>
                            <option value="protected"># Protected</option>
                            <option value="package">~ Package</option>
                          </select>

                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleUpdateAttribute(attr.id, { name: e.target.value })}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100"
                            placeholder="nombre"
                          />

                          <button 
                            onClick={() => handleRemoveAttribute(attr.id)}
                            className="text-slate-400 hover:text-rose-400 p-1"
                            title="Eliminar atributo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 uppercase font-mono">Tipo:</span>
                          <input
                            type="text"
                            value={attr.type}
                            onChange={(e) => handleUpdateAttribute(attr.id, { type: e.target.value })}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-blue-300"
                            placeholder="Long / String / etc."
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: METHODS */}
            {activeTab === 'methods' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operaciones</span>
                  <button 
                    onClick={handleAddMethod}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition-colors"
                  >
                    <Plus size={12} />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {(!selectedNode.data.methods || selectedNode.data.methods.length === 0) ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Sin métodos definidos</p>
                  ) : (
                    selectedNode.data.methods.map((method) => (
                      <div key={method.id} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={method.visibility}
                            onChange={(e) => handleUpdateMethod(method.id, { visibility: e.target.value as any })}
                            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-slate-200"
                          >
                            <option value="public">+ Public</option>
                            <option value="private">- Private</option>
                            <option value="protected"># Protected</option>
                            <option value="package">~ Package</option>
                          </select>

                          <input
                            type="text"
                            value={method.name}
                            onChange={(e) => handleUpdateMethod(method.id, { name: e.target.value })}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100"
                            placeholder="nombreMetodo"
                          />

                          <button 
                            onClick={() => handleRemoveMethod(method.id)}
                            className="text-slate-400 hover:text-rose-400 p-1"
                            title="Eliminar método"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 uppercase font-mono">Retorno:</span>
                          <input
                            type="text"
                            value={method.returnType}
                            onChange={(e) => handleUpdateMethod(method.id, { returnType: e.target.value })}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-emerald-300"
                            placeholder="void / int / String / etc."
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Delete Class Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  deleteClassNode(selectedNode.id);
                  toast.success('Clase eliminada');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold transition-colors"
              >
                <Trash2 size={14} />
                <span>Eliminar Clase</span>
              </button>
            </div>
          </>
        )}

        {/* ================= RELATIONSHIP PROPERTIES ================= */}
        {selectedEdge && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo de Relación UML
              </label>
              <select 
                value={selectedEdge.data?.type || 'association'} 
                onChange={(e) => handleEdgeTypeChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-sans text-slate-200 focus:outline-none transition-colors"
              >
                <option value="association">Asociación (Línea simple con flecha)</option>
                <option value="aggregation">Agregación (Rombo vacío)</option>
                <option value="composition">Composición (Rombo relleno)</option>
                <option value="inheritance">Herencia / Generalización (Triángulo)</option>
                <option value="implementation">Realización / Implementación (Línea punteada + Triángulo)</option>
                <option value="dependency">Dependencia (Línea punteada + Flecha)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Etiqueta / Verbo de Relación
              </label>
              <input 
                type="text" 
                value={selectedEdge.data?.label || ''} 
                onChange={(e) => handleEdgeLabelChange(e.target.value)}
                placeholder="ej: pertenece_a, gestiona, contiene"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Card. Origen
                </label>
                <input 
                  type="text" 
                  value={selectedEdge.data?.sourceCardinality || ''} 
                  onChange={(e) => handleEdgeCardinalityChange(e.target.value, selectedEdge.data?.targetCardinality || '')}
                  placeholder="1, 0..1, 1..*"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-blue-300 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Card. Destino
                </label>
                <input 
                  type="text" 
                  value={selectedEdge.data?.targetCardinality || ''} 
                  onChange={(e) => handleEdgeCardinalityChange(selectedEdge.data?.sourceCardinality || '', e.target.value)}
                  placeholder="1, 0..*, *"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-indigo-300 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Delete Edge Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  deleteRelationship(selectedEdge.id);
                  toast.success('Relación eliminada');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold transition-colors"
              >
                <Trash2 size={14} />
                <span>Eliminar Relación</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default PropertiesPanel;
