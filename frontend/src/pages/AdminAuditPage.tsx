import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../components/layout/AppLayout';
import { api } from '../services/api';
import { AuditLog, AuditMetrics, AuditQueryParams } from '../types/audit';
import { 
  History, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Download, 
  Calendar, 
  Clock, 
  User, 
  Globe, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  FileCode,
  ShieldCheck,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state (20 per page default)
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  // Filter state
  const [actionType, setActionType] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [timePreset, setTimePreset] = useState<'24h' | '7d' | '30d' | 'all' | 'custom'>('30d');
  
  // Dates
  const getThirtyDaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(getThirtyDaysAgoStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  // Modal payload inspection
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const fetchAuditData = useCallback(async (targetPage = 0) => {
    try {
      setLoading(true);
      const queryParams: AuditQueryParams = {
        page: targetPage,
        size: pageSize,
      };

      if (actionType) {
        queryParams.actionType = actionType;
      }
      if (search.trim()) {
        queryParams.search = search.trim();
      }
      if (timePreset !== 'all') {
        if (startDate) {
          queryParams.startDate = `${startDate}T00:00:00Z`;
        }
        if (endDate) {
          queryParams.endDate = `${endDate}T23:59:59Z`;
        }
      }

      const [logsRes, metricsRes] = await Promise.all([
        api.getAuditLogs(queryParams),
        api.getAuditMetrics()
      ]);

      if (logsRes) {
        setLogs(logsRes.content || []);
        const totalP = logsRes.totalPages ?? logsRes.page?.totalPages ?? 0;
        const totalE = logsRes.totalElements ?? logsRes.page?.totalElements ?? 0;
        const currP = logsRes.number ?? logsRes.page?.number ?? 0;
        setTotalPages(totalP);
        setTotalElements(totalE);
        setPage(currP);
      }

      if (metricsRes) {
        setMetrics(metricsRes);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar la bitácora de auditoría');
    } finally {
      setLoading(false);
    }
  }, [actionType, search, timePreset, startDate, endDate]);

  useEffect(() => {
    fetchAuditData(0);
  }, [actionType, timePreset, startDate, endDate, fetchAuditData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditData(0);
  };

  const handleTimePresetChange = (preset: '24h' | '7d' | '30d' | 'all') => {
    setTimePreset(preset);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (preset === '24h') {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === '7d') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === '30d') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAuditData(page);
    setRefreshing(false);
    toast.success('Bitácora sincronizada');
  };

  const handleExport = async (format: 'xlsx' | 'csv' | 'json') => {
    try {
      setExporting(true);
      const queryParams: AuditQueryParams = {};
      if (actionType) queryParams.actionType = actionType;
      if (search.trim()) queryParams.search = search.trim();
      if (timePreset !== 'all') {
        if (startDate) queryParams.startDate = `${startDate}T00:00:00Z`;
        if (endDate) queryParams.endDate = `${endDate}T23:59:59Z`;
      }

      const blob = await api.exportAuditLogs(format, queryParams);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `audit-logs-${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Archivo ${format.toUpperCase()} descargado exitosamente`);
    } catch {
      toast.error(`Error al exportar bitácora en ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const copyPayloadToClipboard = () => {
    if (!selectedLog) return;
    const content = typeof selectedLog.details === 'object' 
      ? JSON.stringify(selectedLog.details, null, 2) 
      : String(selectedLog.details || '{}');
    navigator.clipboard.writeText(content);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
    toast.success('Payload copiado al portapapeles');
  };

  const formatActionLabel = (action: string): string => {
    switch (action) {
      case 'NORMALIZATION_AUDITED':
        return 'Auditoría de Normalización';
      case 'PROJECT_CREATED':
        return 'Proyecto Creado';
      case 'PROJECT_CREATED_FROM_TEMPLATE':
        return 'Proyecto Creado de Plantilla';
      case 'PROJECT_UPDATED':
        return 'Proyecto Actualizado';
      case 'PROJECT_DELETED':
        return 'Proyecto en Papelera';
      case 'PROJECT_RESTORED':
        return 'Proyecto Restaurado';
      case 'PROJECT_PURGED':
        return 'Proyecto Purgado Definitivamente';
      case 'PROJECT_CLONED':
        return 'Proyecto Clonado';
      case 'CLASS_CREATED':
      case 'CLASS_NODE_CREATED':
        return 'Clase UML Creada';
      case 'CLASS_UPDATED':
      case 'CLASS_NODE_UPDATED':
        return 'Clase UML Modificada';
      case 'CLASS_DELETED':
      case 'CLASS_NODE_DELETED':
        return 'Clase UML Eliminada';
      case 'RELATIONSHIP_CREATED':
        return 'Relación Conectada';
      case 'RELATIONSHIP_UPDATED':
        return 'Relación Modificada';
      case 'RELATIONSHIP_DELETED':
        return 'Relación Eliminada';
      case 'DIAGRAM_SYNCED':
        return 'Diagrama Sincronizado';
      case 'AUTH_LOGIN_SUCCESS':
      case 'USER_LOGIN':
        return 'Inicio de Sesión';
      case 'AUTH_LOGIN_FAILED':
        return 'Fallo de Autenticación';
      case 'USER_REGISTERED':
        return 'Usuario Registrado';
      case 'USER_ROLE_CHANGED':
        return 'Rol Modificado';
      case 'USER_ACTIVATED':
        return 'Usuario Activado';
      case 'USER_SUSPENDED':
        return 'Usuario Suspendido';
      case 'USER_SELF_DELETED':
        return 'Cuenta Desactivada';
      case 'PASSWORD_CHANGED':
        return 'Contraseña Actualizada';
      case 'PROFILE_UPDATED':
        return 'Perfil Actualizado';
      default:
        return action
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const formatEntityNameSpanish = (entityName?: string) => {
    if (!entityName) return '-';
    switch (entityName.toLowerCase()) {
      case 'projects':
      case 'project':
        return 'Proyecto';
      case 'diagram_classes':
      case 'classes':
      case 'class':
      case 'class_node':
        return 'Clase UML';
      case 'relationships':
      case 'relationship':
        return 'Relación';
      case 'user_profiles':
      case 'users':
      case 'user':
        return 'Usuario';
      case 'security':
        return 'Seguridad';
      case 'normalization':
        return 'Normalización';
      default:
        return entityName;
    }
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('FAILED') || act.includes('DELETE') || act.includes('PURGE')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (act.includes('RESTORE') || act.includes('CLONE')) {
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
    if (act.includes('NORMALIZATION')) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    if (act.includes('ROLE') || act.includes('STATUS')) {
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    }
    if (act.includes('LOGIN') || act.includes('REGISTER') || act.includes('CREATE')) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 flex flex-col gap-6 font-sans">
        {/* Header Title & Immutability Badge */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#242934] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xs">
                <History size={18} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                  Bitácora Global de Auditoría
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro forense inmutable de eventos del sistema, trazabilidad de seguridad y accesos.
                </p>
              </div>
            </div>
          </div>

          {/* Immutability & Status Indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono">
              <Lock size={13} className="shrink-0" />
              <span>Inmutabilidad Relacional Activa • PostgreSQL</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14171d] hover:bg-[#181c24] text-slate-300 hover:text-white border border-[#242934] hover:border-[#2e3543] transition-all text-xs font-semibold cursor-pointer shadow-xs active:scale-95"
              title="Sincronizar eventos"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : 'text-indigo-400'} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-4 shadow-xs hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Eventos</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Activity size={15} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-display text-white">
                {metrics ? (metrics.totalLogs ?? metrics.totalEvents ?? 0) : '...'}
              </span>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">Registros persistentes</p>
            </div>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-4 shadow-xs hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Actividad 24h</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Clock size={15} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-display text-white">
                {metrics ? (metrics.logsLast24Hours ?? metrics.events24h ?? 0) : '...'}
              </span>
              <p className="text-[10px] font-mono text-emerald-400/90 mt-0.5">Operaciones recientes</p>
            </div>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-4 shadow-xs hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Eventos de Seguridad</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldAlert size={15} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-display text-rose-400">
                {metrics ? (metrics.securityEventsCount ?? metrics.securityEvents ?? 0) : '...'}
              </span>
              <p className="text-[10px] font-mono text-rose-400/80 mt-0.5">Autenticación y roles</p>
            </div>
          </div>

          <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-4 shadow-xs hover:border-[#2e3543] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Usuarios Auditados</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-display text-indigo-300">
                {metrics ? (metrics.activeAuditedUsers ?? metrics.activeUsers ?? 0) : '...'}
              </span>
              <p className="text-[10px] font-mono text-indigo-400/80 mt-0.5">Sujetos con actividad</p>
            </div>
          </div>
        </div>

        {/* Filtering & Export Controls Bar */}
        <div className="bg-[#14171d] border border-[#242934] rounded-2xl p-4 space-y-3.5 shadow-xs">
          {/* Upper control row: Time Presets & Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242934] pb-3.5">
            {/* Date Presets */}
            <div className="flex items-center gap-1 bg-[#0f1115] p-1 rounded-xl border border-[#242934]">
              <span className="text-[11px] text-slate-400 px-2 font-medium flex items-center gap-1.5">
                <Calendar size={13} />
                Periodo:
              </span>
              <button
                onClick={() => handleTimePresetChange('24h')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  timePreset === '24h' 
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c24]'
                }`}
              >
                24h
              </button>
              <button
                onClick={() => handleTimePresetChange('7d')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  timePreset === '7d' 
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c24]'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => handleTimePresetChange('30d')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  timePreset === '30d' 
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c24]'
                }`}
              >
                30 días
              </button>
              <button
                onClick={() => handleTimePresetChange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  timePreset === 'all' 
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c24]'
                }`}
              >
                Todo
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Download size={13} />
                Exportar:
              </span>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-xs active:scale-95"
                title="Exportar archivo Excel (.xlsx)"
              >
                <FileSpreadsheet size={13} />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181c24] hover:bg-[#1e232e] text-slate-300 hover:text-white border border-[#242934] hover:border-[#2e3543] text-xs font-medium transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Exportar archivo CSV"
              >
                <FileSpreadsheet size={13} />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181c24] hover:bg-[#1e232e] text-indigo-300 border border-[#242934] hover:border-indigo-500/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Exportar archivo JSON"
              >
                <FileCode size={13} />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Lower control row: Search, Filter by Action, Date Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-4 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuario, email o IP..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </form>

            {/* Action Filter */}
            <div className="md:col-span-3">
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full py-1.5 px-3 bg-[#0f1115] border border-[#242934] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#14171d] text-white">Todas las Acciones</option>
                <option value="NORMALIZATION_AUDITED" className="bg-[#14171d] text-white">Auditoría de Normalización</option>
                <option value="PROJECT_CREATED" className="bg-[#14171d] text-white">Creación de Proyecto</option>
                <option value="PROJECT_CREATED_FROM_TEMPLATE" className="bg-[#14171d] text-white">Creación desde Plantilla</option>
                <option value="PROJECT_UPDATED" className="bg-[#14171d] text-white">Actualización de Proyecto</option>
                <option value="PROJECT_DELETED" className="bg-[#14171d] text-white">Envío a Papelera</option>
                <option value="PROJECT_RESTORED" className="bg-[#14171d] text-white">Restauración de Proyecto</option>
                <option value="PROJECT_PURGED" className="bg-[#14171d] text-white">Purga Definitiva de Proyecto</option>
                <option value="PROJECT_CLONED" className="bg-[#14171d] text-white">Clonación de Proyecto</option>
                <option value="AUTH_LOGIN_FAILED" className="bg-[#14171d] text-white">Fallo de Autenticación</option>
                <option value="USER_REGISTERED" className="bg-[#14171d] text-white">Registro de Usuario</option>
                <option value="USER_ROLE_CHANGED" className="bg-[#14171d] text-white">Modificación de Rol</option>
                <option value="USER_STATUS" className="bg-[#14171d] text-white">Modificación de Estado de Usuario</option>
              </select>
            </div>

            {/* Date pickers for fine range */}
            <div className="md:col-span-5 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-[#0f1115] border border-[#242934] rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-slate-400 font-mono">Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5 bg-[#0f1115] border border-[#242934] rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-slate-400 font-mono">Hasta:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs Table with 20 items default */}
        <div className="bg-[#14171d] border border-[#242934] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#242934] bg-[#0f1115] text-slate-400 font-mono tracking-wider uppercase text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Fecha / Hora</th>
                  <th className="py-3.5 px-4 font-semibold">Usuario Responsable</th>
                  <th className="py-3.5 px-4 font-semibold">Acción Auditada</th>
                  <th className="py-3.5 px-4 font-semibold">Entidad</th>
                  <th className="py-3.5 px-4 font-semibold">IP / Agente</th>
                  <th className="py-3.5 px-4 text-center font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242934]/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-indigo-400" />
                        <span className="text-xs">Consultando bitácora inmutable...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History size={28} className="text-slate-600" />
                        <span className="text-xs font-medium text-slate-400">No se encontraron eventos en el rango seleccionado</span>
                        <span className="text-[11px] text-slate-600">Ajusta los filtros de fecha o búsqueda para ver otros registros.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#181c24] transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <Clock size={12} className="text-slate-500 shrink-0" />
                          <span>{formatDate(log.timestamp)}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-[#181c24] border border-[#2e3543] flex items-center justify-center text-slate-300 text-xs font-semibold shrink-0">
                            {log.userFullName ? (
                              <span className="font-mono text-xs">{log.userFullName.charAt(0).toUpperCase()}</span>
                            ) : (
                              <User size={13} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 truncate">
                              {log.userFullName || 'Sistema / Anónimo'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {log.userEmail || (log.userId ? log.userId.substring(0, 8) + '...' : '-')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-mono border font-medium ${getActionBadgeClass(log.actionType)}`}>
                          {formatActionLabel(log.actionType)}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-slate-300">
                          <span className="font-semibold text-slate-200">{formatEntityNameSpanish(log.entityName)}</span>
                          {log.entityId && (
                            <span className="text-[10px] text-slate-500 ml-1.5" title={log.entityId}>
                              [{log.entityId.substring(0, 8)}...]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IP & User Agent */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                          <Globe size={12} className="text-slate-500 shrink-0" />
                          <span>{log.ipAddress || '127.0.0.1'}</span>
                        </div>
                        {log.userAgent && (
                          <p className="text-[10px] text-slate-500 truncate max-w-[160px] font-mono" title={log.userAgent}>
                            {log.userAgent}
                          </p>
                        )}
                      </td>

                      {/* Details Modal Trigger */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-xl bg-[#181c24] hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-[#242934] hover:border-indigo-500/40 transition-all cursor-pointer"
                          title="Inspeccionar payload técnico"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (20 per page) */}
          <div className="py-3.5 px-4 border-t border-[#242934] bg-[#0f1115] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                Mostrando página <strong className="text-slate-200 font-mono">{totalPages === 0 ? 0 : page + 1}</strong> de <strong className="text-slate-200 font-mono">{totalPages}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span>
                Total: <strong className="text-slate-200 font-mono">{totalElements}</strong> registros (20 por página)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAuditData(page - 1)}
                disabled={page <= 0 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#14171d] hover:bg-[#181c24] text-slate-300 border border-[#242934] hover:border-[#2e3543] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>
              <button
                onClick={() => fetchAuditData(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#14171d] hover:bg-[#181c24] text-slate-300 border border-[#242934] hover:border-[#2e3543] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs"
              >
                <span>Siguiente</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#14171d] border border-[#242934] rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#242934] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileCode size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm font-display">Inspección de Registro Forense</h3>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {selectedLog.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181c24] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Metadata Summary */}
            <div className="grid grid-cols-2 gap-3 bg-[#0f1115] p-3.5 rounded-xl border border-[#242934] text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">ACCIÓN:</span>
                <span className="text-indigo-300 font-semibold">{formatActionLabel(selectedLog.actionType)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">FECHA Y HORA:</span>
                <span className="text-slate-300">{formatDate(selectedLog.timestamp)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">USUARIO / EMAIL:</span>
                <span className="text-slate-300 truncate block">{selectedLog.userEmail || selectedLog.userFullName || 'Anónimo'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">IP ORIGEN:</span>
                <span className="text-slate-300">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>
            </div>

            {/* Details JSON Viewer */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-400">Cuerpo del Evento (JSON):</span>
                <button
                  onClick={copyPayloadToClipboard}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {copiedPayload ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedPayload ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-[#0f1115] rounded-xl border border-[#242934] text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-60 leading-relaxed select-all">
                {typeof selectedLog.details === 'object' 
                  ? JSON.stringify(selectedLog.details, null, 2) 
                  : (selectedLog.details || '{\n  "info": "Sin payload adicional"\n}')}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#242934]">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#181c24] hover:bg-[#1e232e] border border-[#242934] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
};

export default AdminAuditPage;
