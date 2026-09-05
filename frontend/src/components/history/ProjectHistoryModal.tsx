import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, History, Clock, Search, RefreshCw, ChevronDown, ChevronRight, 
  Layers, Box, GitBranch, Trash2, RotateCcw, Shield
} from 'lucide-react';
import { api } from '../../services/api';
import { DiagramHistoryEntry, HistoryFilterCategory } from '../../types/history';
import toast from 'react-hot-toast';

interface ProjectHistoryModalProps {
  projectId: string;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({
  projectId,
  projectName,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<DiagramHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<HistoryFilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchHistory = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getProjectHistory(projectId);
      if (res && res.data) {
        setHistory(res.data);
      } else if (Array.isArray(res)) {
        setHistory(res);
      }
    } catch (err: any) {
      console.error('Error fetching project history:', err);
      toast.error('Error al cargar la trazabilidad del proyecto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchHistory();
      setSearchQuery('');
      setSelectedCategory('ALL');
      setExpandedIds(new Set());
    }
  }, [isOpen, projectId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Category filter
      if (selectedCategory === 'PROJECT' && item.entityType !== 'PROJECT') return false;
      if (selectedCategory === 'NODE' && item.entityType !== 'CLASS_NODE') return false;
      if (selectedCategory === 'RELATIONSHIP' && item.entityType !== 'RELATIONSHIP') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchAction = item.actionLabelSpanish?.toLowerCase().includes(q) || item.actionType?.toLowerCase().includes(q);
      const matchUser = item.userFullName?.toLowerCase().includes(q) || item.userEmail?.toLowerCase().includes(q);
      const matchEntity = item.entityType?.toLowerCase().includes(q);
      return matchAction || matchUser || matchEntity;
    });
  }, [history, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const getActionBadgeColor = (actionType: string) => {
    const act = actionType.toUpperCase();
    if (act.includes('DELETE') || act.includes('ELIMIN')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (act.includes('CREATE') || act.includes('AGREG')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (act.includes('RESTORE') || act.includes('RESTAUR') || act.includes('CLON')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const getActionIcon = (actionType: string) => {
    const act = actionType.toUpperCase();
    if (act.includes('DELETE')) return <Trash2 size={15} className="text-rose-400" />;
    if (act.includes('RESTORE')) return <RotateCcw size={15} className="text-purple-400" />;
    if (act.includes('CLONE')) return <GitBranch size={15} className="text-purple-400" />;
    if (act.includes('NODE') || act.includes('CLASS')) return <Box size={15} className="text-emerald-400" />;
    if (act.includes('RELATIONSHIP')) return <GitBranch size={15} className="text-amber-400" />;
    return <Layers size={15} className="text-blue-400" />;
  };

  const getRoleBadge = (role?: string) => {
    const r = role ? role.toUpperCase() : 'COLABORADOR';
    if (r === 'SUPER_ADMIN') {
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">SUPER ADMIN</span>;
    }
    if (r === 'ARQUITECTO') {
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">ARQUITECTO</span>;
    }
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">COLABORADOR</span>;
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStateObject = (state: Record<string, any> | null | undefined, type: 'before' | 'after') => {
    if (!state || Object.keys(state).length === 0) {
      return <span className="text-xs text-slate-500 italic">Sin datos previos</span>;
    }

    const isBefore = type === 'before';

    return (
      <div className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
        isBefore 
          ? 'bg-rose-950/20 border-rose-900/40 text-rose-200' 
          : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
      }`}>
        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
          isBefore ? 'text-rose-400' : 'text-emerald-400'
        }`}>
          <span>{isBefore ? 'Estado Anterior' : 'Nuevo Estado'}</span>
        </div>
        {Object.entries(state).map(([key, val]) => (
          <div key={key} className="flex items-start gap-2 overflow-x-auto">
            <span className="text-slate-400 font-medium select-none">{key}:</span>
            <span className="break-all">
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">Historial y Trazabilidad</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {history.length} {history.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {projectName ? `Línea de tiempo de cambios en "${projectName}"` : 'Trazabilidad cronológica de mutaciones del proyecto'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              title="Recargar historial"
              className="text-slate-400 hover:text-slate-200 p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Todos ({history.length})
            </button>
            <button
              onClick={() => setSelectedCategory('PROJECT')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedCategory === 'PROJECT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Proyecto
            </button>
            <button
              onClick={() => setSelectedCategory('NODE')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedCategory === 'NODE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Clases UML
            </button>
            <button
              onClick={() => setSelectedCategory('RELATIONSHIP')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedCategory === 'RELATIONSHIP'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Relaciones
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuario o acción..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-blue-500" />
              <p className="text-sm">Cargando trazabilidad del proyecto...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <Clock size={28} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-300">No hay registros de trazabilidad disponibles</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Las mutaciones sobre el proyecto, clases UML y relaciones se registrarán automáticamente en esta línea de tiempo.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-800">
              {filteredHistory.map(entry => {
                const isExpanded = expandedIds.has(entry.id);
                const hasStateDiff = (entry.beforeState && Object.keys(entry.beforeState).length > 0) || 
                                     (entry.afterState && Object.keys(entry.afterState).length > 0);

                return (
                  <div key={entry.id} className="relative group">
                    {/* Node Dot on Timeline */}
                    <div className="absolute -left-[30px] top-1.5 p-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-sm group-hover:border-blue-500 transition-colors">
                      {getActionIcon(entry.actionType)}
                    </div>

                    {/* Card */}
                    <div className="bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-4 transition-all shadow-sm">
                      {/* Top row: Action badge, entity type, timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${getActionBadgeColor(entry.actionType)}`}>
                            {entry.actionLabelSpanish || entry.actionType}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                            {entry.entityType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock size={13} className="text-slate-500" />
                          <span>{formatTimestamp(entry.createdAt)}</span>
                        </div>
                      </div>

                      {/* Author row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                        <div className="flex items-center gap-2.5">
                          {entry.userAvatarUrl ? (
                            <img
                              src={entry.userAvatarUrl}
                              alt={entry.userFullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-[10px]">
                              {entry.userFullName ? entry.userFullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-200">
                              {entry.userFullName || 'Colaborador'}
                            </span>
                            {getRoleBadge(entry.userRole)}
                            {entry.userEmail && (
                              <span className="text-[11px] text-slate-500 hidden sm:inline">
                                ({entry.userEmail})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Collapsible toggle */}
                        {hasStateDiff && (
                          <button
                            onClick={() => toggleExpand(entry.id)}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium py-1 px-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                          >
                            <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </div>

                      {/* State Diff Details */}
                      {isExpanded && hasStateDiff && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
                          <div>
                            <div className="text-[11px] font-semibold text-slate-400 mb-1">Antes de la mutación:</div>
                            {renderStateObject(entry.beforeState, 'before')}
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-400 mb-1">Después de la mutación:</div>
                            {renderStateObject(entry.afterState, 'after')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-emerald-400" />
            <span>Registro inmutable de trazabilidad (CU05)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
