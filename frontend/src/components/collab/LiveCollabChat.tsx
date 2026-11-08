import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  ChevronDown, 
  Sparkles, 
  Cpu, 
  FileText, 
  ShieldCheck, 
  Wrench,
  Save,
  Download,
  CheckCircle2,
  Code2,
  Image as ImageIcon,
  FileSpreadsheet,
  Database,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollabStore } from '../../stores/collabStore';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useProjectAiStore } from '../../stores/projectAiStore';
import { 
  exportDiagramXmi, 
  exportDiagramPng, 
  exportDiagramExcel, 
  exportDiagramPdf 
} from '../../services/exportService';
import { 
  downloadSqlDdl, 
  downloadPostmanCollection 
} from '../../services/generatorService';

export const LiveCollabChat: React.FC = () => {
  const { 
    isLive, 
    chatMessages, 
    unreadCount, 
    isChatOpen, 
    toggleChat, 
    sendChatMessage, 
    myParticipant 
  } = useCollabStore();

  const authUser = useAuthStore((s) => s.user);
  const { activeEngineLabel } = useProjectAiStore();

  const [inputMessage, setInputMessage] = useState('');
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDirectExport = async (formatKey: 'XMI' | 'PNG' | 'PDF' | 'EXCEL' | 'SQL' | 'POSTMAN') => {
    const { project, nodes } = useDiagramStore.getState();
    if (!project?.id) {
      toast.error('El proyecto debe estar guardado para exportar su especificación.');
      return;
    }
    if (!nodes || nodes.length === 0) {
      toast.error('No es posible exportar un modelo sin clases definidas.');
      return;
    }

    setExportingKey(formatKey);
    try {
      if (formatKey === 'XMI') {
        await exportDiagramXmi(project.id, project.name, project.version || '1.0.0');
        toast.success('Modelo OMG XMI 2.1 exportado');
      } else if (formatKey === 'PNG') {
        await exportDiagramPng(nodes, project.name, { scale: 2, backgroundColor: '#0f1115' });
        toast.success('Diagrama PNG (2x) exportado');
      } else if (formatKey === 'PDF') {
        await exportDiagramPdf(project.id, project.name, nodes, {
          includeImage: true,
          includeDictionary: true,
          includeRelationships: true,
        });
        toast.success('Memoria técnica PDF generada');
      } else if (formatKey === 'EXCEL') {
        await exportDiagramExcel(project.id, project.name);
        toast.success('Diccionario de datos Excel (.xlsx) exportado');
      } else if (formatKey === 'SQL') {
        await downloadSqlDdl(project.id, project.name);
        toast.success('Esquema DDL SQL (PostgreSQL 17) exportado');
      } else if (formatKey === 'POSTMAN') {
        await downloadPostmanCollection(project.id, project.name);
        toast.success('Colección Postman v2.1 exportada');
      }
    } catch (err: any) {
      console.error('Error en exportación directa:', err);
      toast.error(err.message || 'Error al exportar');
    } finally {
      setExportingKey(null);
    }
  };

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendChatMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Inmunidad total contra atajos del canvas UML
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputMessage(promptText);
    inputRef.current?.focus();
  };

  // Helper de renderizado de texto enriquecido / Markdown liviano
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      const formattedLine = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIdx} className="font-semibold text-slate-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={partIdx}
              className="px-1 py-0.5 rounded bg-black/60 text-indigo-300 font-mono text-[10.5px] border border-indigo-900/50"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      return (
        <div 
          key={lineIdx} 
          className={`${line.trim() === '' ? 'h-1.5' : ''} ${isBullet ? 'pl-2 text-slate-200' : ''}`}
        >
          {formattedLine}
        </div>
      );
    });
  };

  const isWaitingForAi =
    chatMessages.length > 0 &&
    chatMessages[chatMessages.length - 1].text.toLowerCase().includes('@ai') &&
    !chatMessages[chatMessages.length - 1].isAi;

  return (
    <div className="fixed bottom-5 right-5 z-40 font-sans select-none">
      {!isChatOpen ? (
        <button
          onClick={toggleChat}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#14171d]/95 hover:bg-[#181c24] text-slate-200 border border-[#242934] shadow-xl shadow-black/50 hover:border-indigo-500/40 transition-all active:scale-95 cursor-pointer group backdrop-blur-md"
          title={isLive ? "Abrir Chat Colaborativo en Vivo" : "Abrir Asistente Co-Desarrollador IA"}
        >
          <div className="relative flex items-center justify-center">
            {isLive ? (
              <MessageSquare size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Cpu size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-mono font-bold rounded-full animate-pulse shadow-sm shadow-rose-500/30">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold text-slate-200 font-sans">
              {isLive ? 'Chat en Vivo' : 'Asistente IA'}
            </span>
            <span className="text-[9.5px] text-indigo-300 font-mono font-medium truncate max-w-[110px]" title={`Motor: ${activeEngineLabel}`}>
              {activeEngineLabel}
            </span>
          </div>
        </button>
      ) : (
        <div 
          className="w-[350px] sm:w-[400px] h-[440px] flex flex-col rounded-2xl border border-[#242934] bg-[#14171d]/95 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#242934] bg-[#0f1115]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                {isLive ? <MessageSquare size={14} /> : <Cpu size={14} />}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-display font-bold text-slate-200 leading-none truncate">
                  {isLive ? 'Chat Colaborativo' : 'Asistente IA (Co-Dev)'}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono text-indigo-300 truncate max-w-[140px]" title={`Motor activo: ${activeEngineLabel}`}>
                    {activeEngineLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#181c24] rounded-lg transition-colors cursor-pointer shrink-0"
              title="Minimizar chat"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#14171d] scrollbar-thin scrollbar-thumb-[#242934] scrollbar-track-transparent">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Sparkles size={22} className="mb-2 text-indigo-400/50" />
                <p className="text-xs font-medium text-slate-300 font-sans">
                  {isLive ? 'No hay mensajes aún en la sala' : 'Asistente Co-Desarrollador Listo'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-sans max-w-[260px]">
                  {isLive
                    ? 'Interactúa con el equipo o menciona @ai para asistencia.'
                    : 'Consulta conceptos de ingeniería de software, audita el modelo 1NF o pide crear clases.'}
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = !msg.isAi && (
                  (myParticipant && msg.senderId === myParticipant.userId) ||
                  (authUser && msg.senderId === authUser.userId) ||
                  msg.senderName === 'Tú' ||
                  !isLive
                );
                const isAi = msg.isAi || msg.senderId === '00000000-0000-0000-0000-000000000000';
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (isAi) {
                  return (
                    <div key={msg.id} className="flex flex-col items-start w-full animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 mb-1 w-full">
                        <div className="p-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                          <Cpu size={11} />
                        </div>
                        <span className="text-[10.5px] font-bold text-indigo-300 font-sans">
                          {msg.senderName}
                        </span>
                        <span 
                          className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold rounded shrink-0 max-w-[170px] truncate"
                          title={`Motor de inferencia: ${msg.providerUsed || activeEngineLabel}`}
                        >
                          {msg.providerUsed || activeEngineLabel}
                        </span>
                        {msg.requesterName && (
                          <span className="text-[9px] text-slate-400 font-sans truncate max-w-[80px]">
                            @{msg.requesterName}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-slate-500 ml-auto shrink-0">{timeStr}</span>
                      </div>
                      <div className="w-full bg-[#161a26] text-slate-200 rounded-2xl rounded-tl-xs border border-indigo-500/30 p-2.5 text-xs leading-relaxed font-sans shadow-md shadow-black/40">
                        {renderFormattedText(msg.text)}

                        {/* Botón interactivo de 1-clic si la IA ofreció auto-reparación */}
                        {msg.text.includes('@ai si') && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-500/20">
                            <button
                              type="button"
                              onClick={() => sendChatMessage('@ai si')}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-sans font-semibold transition-all shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer"
                            >
                              <Wrench size={12} />
                              <span>Aplicar Auto-Reparación Ahora</span>
                            </button>
                          </div>
                        )}

                        {/* Badge de acción operativa ejecutada por la IA */}
                        {msg.actionType && msg.actionType !== 'EXPORT_OPTIONS' && (
                          <div className="mt-2 pt-1.5 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-emerald-300 font-sans">
                            <span className="flex items-center gap-1 font-semibold">
                              <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                              {msg.actionType === 'SAVE_PROJECT' ? 'Persistencia ejecutada en PostgreSQL 17' : 'Acción operativa iniciada'}
                            </span>
                            <span className="font-mono text-[9px] text-emerald-400/80 ml-1 shrink-0">100% Sincronizado</span>
                          </div>
                        )}

                        {/* Opciones directas de exportación sin abrir modal (CU17 / CU14) */}
                        {(msg.actionType === 'EXPORT_OPTIONS' || msg.text.includes('Catálogo de Exportación') || (msg.actionData as any)?.options) && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex flex-col gap-1.5">
                            <div className="grid grid-cols-2 gap-1.5">
                              {/* 1. OMG XMI 2.1 */}
                              <button
                                type="button"
                                disabled={exportingKey !== null}
                                onClick={() => handleDirectExport('XMI')}
                                className="flex flex-col items-start p-2 rounded-xl bg-[#0f1115] hover:bg-[#181c24] border border-[#242934] hover:border-indigo-500/50 transition-all text-left cursor-pointer group disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <Code2 size={13} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                  <span className="px-1 py-0.2 bg-indigo-500/20 text-indigo-300 text-[8.5px] font-mono font-bold rounded">
                                    UML 2.1
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                  {exportingKey === 'XMI' ? 'Exportando...' : 'OMG XMI 2.1'}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                  Intercambio estándar XML
                                </span>
                              </button>

                              {/* 2. Diagrama PNG */}
                              <button
                                type="button"
                                disabled={exportingKey !== null}
                                onClick={() => handleDirectExport('PNG')}
                                className="flex flex-col items-start p-2 rounded-xl bg-[#0f1115] hover:bg-[#181c24] border border-[#242934] hover:border-emerald-500/50 transition-all text-left cursor-pointer group disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <ImageIcon size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                  <span className="px-1 py-0.2 bg-emerald-500/20 text-emerald-300 text-[8.5px] font-mono font-bold rounded">
                                    Alta Res.
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                                  {exportingKey === 'PNG' ? 'Generando...' : 'Diagrama PNG'}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                  Captura rasterizada nítida
                                </span>
                              </button>

                              {/* 3. Memoria Técnica PDF */}
                              <button
                                type="button"
                                disabled={exportingKey !== null}
                                onClick={() => handleDirectExport('PDF')}
                                className="flex flex-col items-start p-2 rounded-xl bg-[#0f1115] hover:bg-[#181c24] border border-[#242934] hover:border-purple-500/50 transition-all text-left cursor-pointer group disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <FileText size={13} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                  <span className="px-1 py-0.2 bg-purple-500/20 text-purple-300 text-[8.5px] font-mono font-bold rounded">
                                    PDF
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                                  {exportingKey === 'PDF' ? 'Compilando...' : 'Memoria Técnica'}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                  Documento con carátula
                                </span>
                              </button>

                              {/* 4. Diccionario de Datos Excel */}
                              <button
                                type="button"
                                disabled={exportingKey !== null}
                                onClick={() => handleDirectExport('EXCEL')}
                                className="flex flex-col items-start p-2 rounded-xl bg-[#0f1115] hover:bg-[#181c24] border border-[#242934] hover:border-teal-500/50 transition-all text-left cursor-pointer group disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <FileSpreadsheet size={13} className="text-teal-400 group-hover:scale-110 transition-transform" />
                                  <span className="px-1 py-0.2 bg-teal-500/20 text-teal-300 text-[8.5px] font-mono font-bold rounded">
                                    .xlsx
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-100 group-hover:text-teal-300 transition-colors">
                                  {exportingKey === 'EXCEL' ? 'Generando...' : 'Diccionario Datos'}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                  Libro 3 hojas JPA/SQL
                                </span>
                              </button>

                              {/* 5. Esquema DDL SQL */}
                              <button
                                type="button"
                                disabled={exportingKey !== null}
                                onClick={() => handleDirectExport('SQL')}
                                className="flex flex-col items-start p-2 rounded-xl bg-[#0f1115] hover:bg-[#181c24] border border-[#242934] hover:border-amber-500/50 transition-all text-left cursor-pointer group disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <Database size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                  <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 text-[8.5px] font-mono font-bold rounded">
                                    Postgres 17
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                                  {exportingKey === 'SQL' ? 'Descargando...' : 'Esquema DDL SQL'}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                  Script CREATE TABLE
                                </span>
                              </button>

                              {/* 6. Colección Postman */}
                              <button
                                type="button"
                                disabled={exportingKey !== null}
                                onClick={() => handleDirectExport('POSTMAN')}
                                className="flex flex-col items-start p-2 rounded-xl bg-[#0f1115] hover:bg-[#181c24] border border-[#242934] hover:border-orange-500/50 transition-all text-left cursor-pointer group disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <Send size={13} className="text-orange-400 group-hover:scale-110 transition-transform" />
                                  <span className="px-1 py-0.2 bg-orange-500/20 text-orange-300 text-[8.5px] font-mono font-bold rounded">
                                    v2.1
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-100 group-hover:text-orange-300 transition-colors">
                                  {exportingKey === 'POSTMAN' ? 'Generando...' : 'Colección Postman'}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                  Suite CRUD pm.test
                                </span>
                              </button>
                            </div>
                            {exportingKey && (
                              <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-indigo-300 animate-pulse font-mono">
                                <Loader2 size={11} className="animate-spin" />
                                <span>Descargando especificación {exportingKey}...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.actionSummary && (
                          <div className="mt-2 pt-1.5 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-indigo-300">
                            <span className="truncate">{msg.actionSummary}</span>
                            <span className="font-mono text-[9px] text-slate-400 ml-1 shrink-0">Ctrl+Z revertir</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span 
                        className="text-[10px] font-semibold truncate max-w-[120px] font-sans"
                        style={{ color: msg.senderColor || '#94A3B8' }}
                      >
                        {isMe ? 'Tú' : msg.senderName}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">{timeStr}</span>
                    </div>
                    <div
                      className={`px-3 py-1.5 text-xs max-w-[85%] break-words leading-relaxed font-sans ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-xs shadow-sm'
                          : 'bg-[#181c24] text-slate-200 rounded-2xl rounded-tl-xs border border-[#242934]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}

            {isWaitingForAi && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161a26] border border-indigo-500/30 rounded-xl text-indigo-300 text-xs animate-pulse">
                <Cpu size={12} className="text-indigo-400 shrink-0" />
                <span className="text-[11px] font-sans">Asistente IA analizando consulta...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar (Resumen, Auditar, Guardar, Exportar) */}
          <div className="px-2.5 py-1.5 bg-[#0f1115] border-t border-[#242934] grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPrompt('@ai resumen')}
              className="flex items-center justify-center gap-1 px-1 py-1 bg-[#161a26] hover:bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-[10.5px] font-sans font-medium transition-colors cursor-pointer"
              title="Solicitar resumen de lo realizado en la sesión (@ai resumen)"
            >
              <FileText size={11} className="text-indigo-400 shrink-0" />
              <span className="truncate">Resumen</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPrompt('@ai auditar')}
              className="flex items-center justify-center gap-1 px-1 py-1 bg-[#161a26] hover:bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-[10.5px] font-sans font-medium transition-colors cursor-pointer"
              title="Auditar consistencia y normalización 1NF-3NF (@ai auditar)"
            >
              <ShieldCheck size={11} className="text-indigo-400 shrink-0" />
              <span className="truncate">Auditar</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPrompt('@ai guardar el proyecto')}
              className="flex items-center justify-center gap-1 px-1 py-1 bg-[#161a26] hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-[10.5px] font-sans font-medium transition-colors cursor-pointer"
              title="Guardar y persistir el proyecto en PostgreSQL (@ai guardar el proyecto)"
            >
              <Save size={11} className="text-emerald-400 shrink-0" />
              <span className="truncate">Guardar</span>
            </button>

            <button
              type="button"
              onClick={() => sendChatMessage('@ai exportar')}
              className="flex items-center justify-center gap-1 px-1 py-1 bg-[#161a26] hover:bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg text-[10.5px] font-sans font-medium transition-colors cursor-pointer"
              title="Desplegar catálogo de exportación directa multiformato (@ai exportar)"
            >
              <Download size={11} className="text-amber-400 shrink-0" />
              <span className="truncate">Exportar</span>
            </button>
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSend}
            className="p-2.5 bg-[#0f1115] flex items-center gap-1.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLive ? "Escribe un mensaje o menciona @ai..." : "Pregunta a @ai o usa los botones rápidos..."}
              maxLength={1000}
              className="flex-1 bg-[#14171d] border border-[#242934] focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className={`p-2 rounded-lg transition-all ${
                inputMessage.trim()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 cursor-pointer shadow-sm shadow-indigo-500/20'
                  : 'bg-[#181c24] text-slate-600 cursor-not-allowed border border-[#242934]'
              }`}
              title="Enviar mensaje"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
