import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Wand2, 
  GitFork, 
  RotateCcw, 
  Copy, 
  X,
  Check,
  ArrowRight
} from 'lucide-react';
import { useDiagramStore } from '../../stores/diagramStore';
import { analyzeDiagramNormalization } from '../../services/normalizationEngine';
import { NormalizationIssue, NormalForm } from '../../types/normalization';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface NormalizationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NormalizationReportModal: React.FC<NormalizationReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { nodes, edges, project, addPrimaryKeyToClass, decomposeManyToMany } = useDiagramStore();
  const [activeTab, setActiveTab] = useState<'ALL' | NormalForm>('ALL');
  const [isAuditingBackend, setIsAuditingBackend] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute live client-side normalization analysis
  const report = useMemo(() => {
    return analyzeDiagramNormalization(nodes, edges);
  }, [nodes, edges]);

  if (!isOpen) return null;

  const filteredIssues = report.issues.filter((issue) => {
    if (activeTab === 'ALL') return true;
    return issue.normalForm === activeTab;
  });

  const handleApplyQuickFix = (issue: NormalizationIssue) => {
    if (issue.quickFixAction === 'ADD_PRIMARY_KEY' && issue.targetId) {
      addPrimaryKeyToClass(issue.targetId);
    } else if (issue.quickFixAction === 'DECOMPOSE_MANY_TO_MANY' && issue.targetId) {
      decomposeManyToMany(issue.targetId);
    }
  };

  const handleServerAudit = async () => {
    if (!project?.id) {
      toast('Auditoría reactiva en memoria actualizada');
      return;
    }

    try {
      setIsAuditingBackend(true);
      await api.validateProjectNormalization(project.id);
      toast.success('Auditoría registrada y certificada en la bitácora de seguridad');
    } catch (err) {
      toast.error('No se pudo certificar la auditoría en el servidor');
    } finally {
      setIsAuditingBackend(false);
    }
  };

  const handleCopyReport = () => {
    const textLines = [
      `=== INFORME DE NORMALIZACIÓN RELACIONAL ===`,
      `Modelo: ${project?.name || 'Modelo en Lienzo'}`,
      `Puntaje de Calidad: ${report.score}/100 (${report.status})`,
      `Entidades: ${report.totalEntities} | Relaciones: ${report.totalRelationships}`,
      `Violaciones Críticas: ${report.criticalIssuesCount}`,
      `Advertencias: ${report.warningIssuesCount}`,
      `Informativos: ${report.infoIssuesCount}`,
      ``,
      `DETALLE DE HALLAZGOS:`,
      ...report.issues.map(
        (iss, idx) =>
          `[${idx + 1}] [${iss.normalForm}] [${iss.severity}] ${iss.targetName}: ${iss.message}\n    Sugerencia: ${iss.recommendation}`
      ),
    ];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    toast.success('Reporte copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#14171d] border border-[#242934] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242934] flex items-center justify-between bg-[#11141a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2 font-display">
                Auditoría de Normalización Relacional
                <span className="text-xs font-normal text-slate-400 font-mono">1NF a 3NF</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Verificación de reglas de transformación objeto-modelo y fundamentos de Codd
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181c24] transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quality Score & Status Banner */}
        <div className="p-6 bg-[#0f1115]/80 border-b border-[#242934]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Gauge / Score Box */}
            <div className="flex items-center gap-4 p-3.5 bg-[#181c24] border border-[#242934] rounded-xl">
              <div
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-mono font-bold text-lg border-2 shadow-xs shrink-0 ${
                  report.score >= 90
                    ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300'
                    : report.score >= 70
                    ? 'border-amber-500/80 bg-amber-500/10 text-amber-300'
                    : 'border-rose-500/80 bg-rose-500/10 text-rose-300'
                }`}
              >
                <span>{report.score}%</span>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block">
                  Puntaje de Diseño
                </span>
                <span
                  className={`text-xs font-semibold truncate block font-display ${
                    report.status === 'COMPLIANT'
                      ? 'text-emerald-400'
                      : report.status === 'WARNINGS'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {report.status === 'COMPLIANT'
                    ? '100% Conforme'
                    : report.status === 'WARNINGS'
                    ? 'Con Advertencias Leves'
                    : 'Violaciones Críticas'}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-[#181c24] border border-[#242934] rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">1NF</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    report.nf1IssuesCount > 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {report.nf1IssuesCount} {report.nf1IssuesCount === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>
              <div className="p-2.5 bg-[#181c24] border border-[#242934] rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">2NF</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    report.nf2IssuesCount > 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {report.nf2IssuesCount} {report.nf2IssuesCount === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>
              <div className="p-2.5 bg-[#181c24] border border-[#242934] rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">3NF</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    report.nf3IssuesCount > 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {report.nf3IssuesCount} {report.nf3IssuesCount === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-6 pt-3 flex items-center gap-1 border-b border-[#242934] bg-[#11141a]">
          {(
            [
              { id: 'ALL', label: 'Todos los Hallazgos', count: report.issues.length },
              { id: '1NF', label: '1NF • Atomicidad y Claves Primarias', count: report.nf1IssuesCount },
              { id: '2NF', label: '2NF • Dependencia y Claves Foráneas', count: report.nf2IssuesCount },
              { id: '3NF', label: '3NF • Dependencia Transitiva', count: report.nf3IssuesCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-[#181c24] text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Issues List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-10 px-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 font-display">
                {activeTab === 'ALL'
                  ? 'Modelo 100% Conforme a las Reglas de Normalización'
                  : `Sin observaciones registradas para ${activeTab}`}
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Todas las entidades y relaciones evaluadas satisfacen los criterios de atomicidad,
                dependencia funcional completa y eliminación de redundancias de Codd y TOM.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const isCritical = issue.severity === 'CRITICAL';
              const isWarning = issue.severity === 'WARNING';

              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : isWarning
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-[#181c24] border-[#242934]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`p-1 rounded-lg ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-400'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-indigo-500/20 text-indigo-400'
                        }`}
                      >
                        {isCritical ? (
                          <AlertCircle size={15} />
                        ) : isWarning ? (
                          <AlertTriangle size={15} />
                        ) : (
                          <Info size={15} />
                        )}
                      </span>

                      <span className="font-semibold text-xs text-white font-display">
                        {issue.targetName}
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#0f1115] border border-[#242934] text-slate-300">
                        {issue.normalForm}
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}
                      >
                        {issue.severity === 'CRITICAL'
                          ? 'Crítica'
                          : issue.severity === 'WARNING'
                          ? 'Advertencia'
                          : 'Informativa'}
                      </span>
                    </div>

                    {/* Quick Fix Button */}
                    {issue.quickFixAvailable && (
                      <button
                        type="button"
                        onClick={() => handleApplyQuickFix(issue)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                      >
                        {issue.quickFixAction === 'ADD_PRIMARY_KEY' ? (
                          <>
                            <Wand2 size={13} />
                            <span>Añadir PK sugerida</span>
                          </>
                        ) : issue.quickFixAction === 'DECOMPOSE_MANY_TO_MANY' ? (
                          <>
                            <GitFork size={13} />
                            <span>Crear Tabla Intermedia</span>
                          </>
                        ) : (
                          <>
                            <Wand2 size={13} />
                            <span>Corregir</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                    {issue.message}
                  </p>

                  <div className="p-2.5 bg-[#0f1115] border border-[#242934] rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
                    <ArrowRight size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-200">Recomendación Técnica: </strong>
                      {issue.recommendation}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#242934] bg-[#11141a] flex items-center justify-between">
          <button
            onClick={handleCopyReport}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-[#181c24] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado' : 'Copiar Informe'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleServerAudit}
              disabled={isAuditingBackend}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#181c24] hover:bg-[#1f2430] border border-[#242934] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw size={13} className={isAuditingBackend ? 'animate-spin' : ''} />
              <span>{isAuditingBackend ? 'Certificando...' : 'Certificar en Servidor'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
