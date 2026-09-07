import React, { useState } from 'react';
import { useDiagramStore } from '../../stores/diagramStore';
import { 
  X, 
  Trash2, 
  Plus, 
  Sliders,
  Key,
  Sparkles,
  Copy,
  AlertCircle
} from 'lucide-react';
import { ClassAttribute, ClassMethod } from '../../types/diagram';
import toast from 'react-hot-toast';

const CARDINALITY_OPTIONS = ['1', '0..1', '1..*', '0..*', '*'];
const COMMON_TYPES = ['Long', 'Integer', 'Double', 'BigDecimal', 'String', 'Boolean', 'LocalDate', 'LocalDateTime', 'UUID', 'byte[]'];
const COMMON_RETURN_TYPES = ['void', 'String', 'Long', 'Integer', 'Double', 'Boolean', 'UUID', 'List<T>', 'Optional<T>'];

const PropertiesPanel: React.FC = () => {
  const { 
    selectedNode, 
    selectedEdge, 
    updateClassNode, 
    deleteClassNode, 
    cloneClassNode,
    isClassNameTaken,
    updateRelationship, 
    deleteRelationship, 
    setSelectedNode,
    setSelectedEdge
  } = useDiagramStore();

  const [activeTab, setActiveTab] = useState<'general' | 'attributes' | 'methods'>('general');
  const [customSourceCard, setCustomSourceCard] = useState(false);
  const [customTargetCard, setCustomTargetCard] = useState(false);

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
    const currentCount = selectedNode.data.attributes?.length || 0;
    const newAttr: ClassAttribute = {
      id: `a-${Date.now()}`,
      name: `campo${currentCount + 1}`,
      type: currentCount === 0 ? 'Long' : 'String',
      visibility: 'private',
      isId: currentCount === 0,
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
    toast('Atributo eliminado');
  };

  const handleUpdateAttribute = (attrId: string, patch: Partial<ClassAttribute>) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.attributes.map(a => a.id === attrId ? { ...a, ...patch } : a);
    updateClassNode(selectedNode.id, { attributes: updated });
  };

  const handleToggleAttributeId = (attrId: string) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.attributes.map(a => 
      a.id === attrId ? { ...a, isId: !a.isId } : a
    );
    updateClassNode(selectedNode.id, { attributes: updated });
    const target = updated.find(a => a.id === attrId);
    if (target?.isId) {
      toast.success(`Atributo '${target.name}' marcado como {PK}`);
    } else {
      toast('Atributo desmarcado de clave primaria');
    }
  };

  const handleAddMethod = () => {
    if (!selectedNode) return;
    const currentCount = selectedNode.data.methods?.length || 0;
    const newMethod: ClassMethod = {
      id: `m-${Date.now()}`,
      name: `operacion${currentCount + 1}`,
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
    toast('Método eliminado');
  };

  const handleUpdateMethod = (methodId: string, patch: Partial<ClassMethod>) => {
    if (!selectedNode) return;
    const updated = selectedNode.data.methods.map(m => m.id === methodId ? { ...m, ...patch } : m);
    updateClassNode(selectedNode.id, { methods: updated });
  };

  const handleAddParameter = (methodId: string) => {
    if (!selectedNode) return;
    const targetMethod = selectedNode.data.methods?.find(m => m.id === methodId);
    if (!targetMethod) return;
    const currentParams = targetMethod.parameters || [];
    const newParam = { name: `p${currentParams.length + 1}`, type: 'String' };
    handleUpdateMethod(methodId, { parameters: [...currentParams, newParam] });
  };

  const handleUpdateParameter = (methodId: string, paramIndex: number, patch: { name?: string; type?: string }) => {
    if (!selectedNode) return;
    const targetMethod = selectedNode.data.methods?.find(m => m.id === methodId);
    if (!targetMethod) return;
    const currentParams = [...(targetMethod.parameters || [])];
    currentParams[paramIndex] = { ...currentParams[paramIndex], ...patch };
    handleUpdateMethod(methodId, { parameters: currentParams });
  };

  const handleRemoveParameter = (methodId: string, paramIndex: number) => {
    if (!selectedNode) return;
    const targetMethod = selectedNode.data.methods?.find(m => m.id === methodId);
    if (!targetMethod) return;
    const currentParams = (targetMethod.parameters || []).filter((_, idx) => idx !== paramIndex);
    handleUpdateMethod(methodId, { parameters: currentParams });
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

  const applyCardinalityPreset = (src: string, tgt: string) => {
    setCustomSourceCard(false);
    setCustomTargetCard(false);
    handleEdgeCardinalityChange(src, tgt);
    toast.success(`Cardinalidad: ${src} .. ${tgt}`);
  };

  return (
    <aside className="w-96 bg-slate-950 text-slate-200 border-l border-slate-800/90 flex flex-col h-full shadow-2xl z-20 select-none animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/70">
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
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors ${
                      isClassNameTaken(selectedNode.data.name, selectedNode.id)
                        ? 'border-amber-500/80 focus:border-amber-400 ring-1 ring-amber-500/30'
                        : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                  {isClassNameTaken(selectedNode.data.name, selectedNode.id) && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] leading-snug">
                      <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <span className="font-semibold">Conflicto de unicidad (E1):</span> Ya existe otra clase con el nombre "{selectedNode.data.name}" en este proyecto. Los nombres de clase deben ser únicos.
                      </div>
                    </div>
                  )}
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
                    <option value="entity">&laquo;entity&raquo; (Entidad JPA)</option>
                    <option value="interface">&laquo;interface&raquo; (Interfaz)</option>
                    <option value="service">&laquo;service&raquo; (Servicio Spring)</option>
                    <option value="controller">&laquo;controller&raquo; (REST Controller)</option>
                    <option value="repository">&laquo;repository&raquo; (Repositorio)</option>
                    <option value="abstract">&laquo;abstract&raquo; (Clase Base Abstracta)</option>
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

                <div className="pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={async () => {
                      await cloneClassNode(selectedNode.id);
                      toast.success('Clase duplicada exitosamente');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 rounded-lg text-xs font-semibold transition-all active:scale-98 cursor-pointer shadow-xs"
                  >
                    <Copy size={13} className="text-blue-400" />
                    <span>Duplicar Clase</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ATTRIBUTES */}
            {activeTab === 'attributes' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1">
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Atributos / Campos</span>
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400">
                      {selectedNode.data.attributes?.length || 0}
                    </span>
                  </div>
                  <button 
                    onClick={handleAddAttribute}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {(!selectedNode.data.attributes || selectedNode.data.attributes.length === 0) ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
                      <p className="text-xs text-slate-500 italic">Sin atributos definidos en esta clase</p>
                      <button 
                        onClick={handleAddAttribute}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        + Añadir primer atributo
                      </button>
                    </div>
                  ) : (
                    selectedNode.data.attributes.map((attr) => (
                      <div key={attr.id} className="p-3 bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-xl space-y-2.5 transition-colors shadow-xs">
                        {/* Row 1: Visibility, Name, PK Toggle, Trash */}
                        <div className="flex items-center gap-1.5">
                          {/* Visibility dropdown */}
                          <select
                            value={attr.visibility}
                            onChange={(e) => handleUpdateAttribute(attr.id, { visibility: e.target.value as any })}
                            className={`rounded-lg px-2 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                              attr.visibility === 'public'
                                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                                : attr.visibility === 'private'
                                  ? 'bg-rose-950/40 border-rose-700/60 text-rose-400'
                                  : attr.visibility === 'protected'
                                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-400'
                                    : 'bg-sky-950/40 border-sky-700/60 text-sky-400'
                            }`}
                            title="Modificador de visibilidad UML"
                          >
                            <option value="public" className="bg-slate-950 text-emerald-400">+ Public</option>
                            <option value="private" className="bg-slate-950 text-rose-400">- Private</option>
                            <option value="protected" className="bg-slate-950 text-amber-400"># Protected</option>
                            <option value="package" className="bg-slate-950 text-sky-400">~ Package</option>
                          </select>

                          {/* Attribute Name Input */}
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleUpdateAttribute(attr.id, { name: e.target.value })}
                            className="flex-1 min-w-0 bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                            placeholder="nombreAtributo"
                          />

                          {/* PK Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleAttributeId(attr.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                              attr.isId
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                            title={attr.isId ? 'Clave Primaria activa ({PK})' : 'Marcar como Clave Primaria ({PK})'}
                          >
                            <Key size={10} className={attr.isId ? 'text-amber-400' : 'text-slate-500'} />
                            <span>PK</span>
                          </button>

                          {/* Static Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateAttribute(attr.id, { isStatic: !attr.isStatic })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all cursor-pointer shrink-0 ${
                              attr.isStatic
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 ring-1 ring-purple-400/40 shadow-xs'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                            title={attr.isStatic ? 'Atributo estático (subrayado OMG UML 2.5)' : 'Marcar como estático (UML)'}
                          >
                            <span className="underline">_S_</span>
                          </button>

                          {/* Delete Button */}
                          <button 
                            type="button"
                            onClick={() => handleRemoveAttribute(attr.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Eliminar atributo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Row 2: Type Input & Quick Types Pills */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider shrink-0">Tipo:</span>
                            <input
                              type="text"
                              value={attr.type}
                              onChange={(e) => handleUpdateAttribute(attr.id, { type: e.target.value })}
                              className="flex-1 min-w-0 bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-0.5 text-xs font-mono text-sky-300 placeholder:text-slate-600 focus:outline-none transition-colors"
                              placeholder="Long, String, etc."
                            />
                          </div>

                          {/* Quick Type Pills */}
                          <div className="flex flex-wrap items-center gap-1 pl-8">
                            {COMMON_TYPES.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleUpdateAttribute(attr.id, { type: t })}
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                                  attr.type === t
                                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
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
                <div className="flex justify-between items-center pb-1">
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Operaciones / Métodos</span>
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400">
                      {selectedNode.data.methods?.length || 0}
                    </span>
                  </div>
                  <button 
                    onClick={handleAddMethod}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {(!selectedNode.data.methods || selectedNode.data.methods.length === 0) ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
                      <p className="text-xs text-slate-500 italic">Sin operaciones definidas en esta clase</p>
                      <button 
                        onClick={handleAddMethod}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        + Añadir primera operación
                      </button>
                    </div>
                  ) : (
                    selectedNode.data.methods.map((method) => (
                      <div key={method.id} className="p-3 bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-xl space-y-2.5 transition-colors shadow-xs">
                        {/* Row 1: Visibility, Name, Trash */}
                        <div className="flex items-center gap-1.5">
                          {/* Visibility dropdown */}
                          <select
                            value={method.visibility}
                            onChange={(e) => handleUpdateMethod(method.id, { visibility: e.target.value as any })}
                            className={`rounded-lg px-2 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                              method.visibility === 'public'
                                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                                : method.visibility === 'private'
                                  ? 'bg-rose-950/40 border-rose-700/60 text-rose-400'
                                  : method.visibility === 'protected'
                                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-400'
                                    : 'bg-sky-950/40 border-sky-700/60 text-sky-400'
                            }`}
                            title="Modificador de visibilidad UML"
                          >
                            <option value="public" className="bg-slate-950 text-emerald-400">+ Public</option>
                            <option value="private" className="bg-slate-950 text-rose-400">- Private</option>
                            <option value="protected" className="bg-slate-950 text-amber-400"># Protected</option>
                            <option value="package" className="bg-slate-950 text-sky-400">~ Package</option>
                          </select>

                          {/* Method Name Input */}
                          <input
                            type="text"
                            value={method.name}
                            onChange={(e) => handleUpdateMethod(method.id, { name: e.target.value })}
                            className="flex-1 min-w-0 bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                            placeholder="nombreMetodo"
                          />

                          {/* Static Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateMethod(method.id, { isStatic: !method.isStatic })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all cursor-pointer shrink-0 ${
                              method.isStatic
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 ring-1 ring-purple-400/40 shadow-xs'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                            title={method.isStatic ? 'Método estático (subrayado OMG UML 2.5)' : 'Marcar como estático'}
                          >
                            <span className="underline">_S_</span>
                          </button>

                          {/* Abstract Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateMethod(method.id, { isAbstract: !method.isAbstract })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all cursor-pointer shrink-0 ${
                              method.isAbstract
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                            title={method.isAbstract ? 'Método abstracto (cursiva OMG UML 2.5)' : 'Marcar como abstracto'}
                          >
                            <span className="italic">_A_</span>
                          </button>

                          {/* Delete Button */}
                          <button 
                            type="button"
                            onClick={() => handleRemoveMethod(method.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Eliminar método"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Row 2: Return Type Input & Quick Types Pills */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider shrink-0">Retorno:</span>
                            <input
                              type="text"
                              value={method.returnType}
                              onChange={(e) => handleUpdateMethod(method.id, { returnType: e.target.value })}
                              className="flex-1 min-w-0 bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-0.5 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none transition-colors"
                              placeholder="void, String, etc."
                            />
                          </div>

                          {/* Quick Return Type Pills */}
                          <div className="flex flex-wrap items-center gap-1 pl-12">
                            {COMMON_RETURN_TYPES.map((rt) => (
                              <button
                                key={rt}
                                type="button"
                                onClick={() => handleUpdateMethod(method.id, { returnType: rt })}
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                                  method.returnType === rt
                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                {rt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 3: Parameter Manager */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                              Parámetros ({method.parameters?.length || 0}):
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddParameter(method.id)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus size={11} /> Añadir parámetro
                            </button>
                          </div>
                          {method.parameters && method.parameters.length > 0 && (
                            <div className="space-y-1.5 pl-1">
                              {method.parameters.map((param, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={param.name}
                                    onChange={(e) => handleUpdateParameter(method.id, pIdx, { name: e.target.value })}
                                    placeholder="nombre"
                                    className="w-24 bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none transition-colors"
                                  />
                                  <span className="text-slate-500 text-xs">:</span>
                                  <input
                                    type="text"
                                    value={param.type}
                                    onChange={(e) => handleUpdateParameter(method.id, pIdx, { type: e.target.value })}
                                    placeholder="tipo"
                                    className="flex-1 min-w-0 bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded px-1.5 py-0.5 text-[11px] font-mono text-sky-300 placeholder:text-slate-600 focus:outline-none transition-colors"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParameter(method.id, pIdx)}
                                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors cursor-pointer shrink-0"
                                    title="Eliminar parámetro"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Delete Class Button */}
            <div className="pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  deleteClassNode(selectedNode.id);
                  toast.success('Clase eliminada del modelo');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-800/40 hover:border-rose-700/60 rounded-xl text-xs font-semibold transition-all active:scale-98 cursor-pointer"
              >
                <Trash2 size={14} className="text-rose-400" />
                <span>Eliminar Clase del Modelo</span>
              </button>
            </div>
          </>
        )}

        {/* ================= RELATIONSHIP PROPERTIES ================= */}
        {selectedEdge && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo de Relación UML (OMG 2.5)
              </label>
              <select 
                value={selectedEdge.data?.type || 'association'} 
                onChange={(e) => handleEdgeTypeChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-sans text-slate-200 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="association">Asociación (Línea simple con flecha)</option>
                <option value="aggregation">Agregación (Rombo vacío en origen)</option>
                <option value="composition">Composición (Rombo relleno en origen)</option>
                <option value="inheritance">Herencia / Generalización (Triángulo cerrado)</option>
                <option value="implementation">Realización / Implementación (Punteada + Triángulo)</option>
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
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Quick Cardinality Presets */}
            <div className="p-3 bg-slate-900/70 border border-slate-800/90 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Preajustes Rápidos (UML 2.5)
                </span>
                <Sparkles size={12} className="text-blue-400" />
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: '1 : 1', src: '1', tgt: '1' },
                  { label: '1 : *', src: '1', tgt: '*' },
                  { label: '1 : 1..*', src: '1', tgt: '1..*' },
                  { label: '* : *', src: '*', tgt: '*' },
                  { label: '0..1 : 1', src: '0..1', tgt: '1' },
                ].map((preset) => {
                  const isActive = 
                    selectedEdge.data?.sourceCardinality === preset.src && 
                    selectedEdge.data?.targetCardinality === preset.tgt;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyCardinalityPreset(preset.src, preset.tgt)}
                      className={`px-1.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-center transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-400 shadow-xs shadow-blue-500/20'
                          : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                      }`}
                      title={`Aplicar ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Source / Target Cardinalities "a Elección" */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Card. Origen
                </label>
                <select 
                  value={CARDINALITY_OPTIONS.includes(selectedEdge.data?.sourceCardinality || '') && !customSourceCard ? selectedEdge.data?.sourceCardinality : 'custom'} 
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setCustomSourceCard(true);
                    } else {
                      setCustomSourceCard(false);
                      handleEdgeCardinalityChange(e.target.value, selectedEdge.data?.targetCardinality || '');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-2.5 py-2 text-xs font-mono text-blue-300 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="1">1 (Exactamente 1)</option>
                  <option value="0..1">0..1 (Opcional)</option>
                  <option value="1..*">1..* (Uno o más)</option>
                  <option value="0..*">0..* (Cero o más)</option>
                  <option value="*">* (Muchos)</option>
                  <option value="custom">Personalizado...</option>
                </select>
                {(customSourceCard || !CARDINALITY_OPTIONS.includes(selectedEdge.data?.sourceCardinality || '')) && (
                  <input 
                    type="text" 
                    value={selectedEdge.data?.sourceCardinality || ''} 
                    onChange={(e) => handleEdgeCardinalityChange(e.target.value, selectedEdge.data?.targetCardinality || '')}
                    placeholder="ej: 1..10"
                    className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-blue-300 focus:outline-none transition-colors"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Card. Destino
                </label>
                <select 
                  value={CARDINALITY_OPTIONS.includes(selectedEdge.data?.targetCardinality || '') && !customTargetCard ? selectedEdge.data?.targetCardinality : 'custom'} 
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setCustomTargetCard(true);
                    } else {
                      setCustomTargetCard(false);
                      handleEdgeCardinalityChange(selectedEdge.data?.sourceCardinality || '', e.target.value);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-2.5 py-2 text-xs font-mono text-indigo-300 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="1">1 (Exactamente 1)</option>
                  <option value="0..1">0..1 (Opcional)</option>
                  <option value="1..*">1..* (Uno o más)</option>
                  <option value="0..*">0..* (Cero o más)</option>
                  <option value="*">* (Muchos)</option>
                  <option value="custom">Personalizado...</option>
                </select>
                {(customTargetCard || !CARDINALITY_OPTIONS.includes(selectedEdge.data?.targetCardinality || '')) && (
                  <input 
                    type="text" 
                    value={selectedEdge.data?.targetCardinality || ''} 
                    onChange={(e) => handleEdgeCardinalityChange(selectedEdge.data?.sourceCardinality || '', e.target.value)}
                    placeholder="ej: 0..5"
                    className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-indigo-300 focus:outline-none transition-colors"
                  />
                )}
              </div>
            </div>

            {/* Delete Edge Button */}
            <div className="pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  deleteRelationship(selectedEdge.id);
                  toast.success('Relación eliminada del modelo');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-800/40 hover:border-rose-700/60 rounded-xl text-xs font-semibold transition-all active:scale-98 cursor-pointer"
              >
                <Trash2 size={14} className="text-rose-400" />
                <span>Eliminar Relación del Modelo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default PropertiesPanel;
