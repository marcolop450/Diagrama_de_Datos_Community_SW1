import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  X, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck,
  UserX,
  Eye,
  Edit3,
  Loader2,
  Lock,
  Unlock,
  Play,
  LogIn,
  Layers,
  ArrowRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollabStore } from '../../stores/collabStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { useAuthStore } from '../../stores/authStore';

export const LiveCollabModal: React.FC = () => {
  const { 
    session, 
    sessionCode, 
    isLive,
    participants, 
    isModalOpen, 
    setModalOpen, 
    startSession,
    joinSession,
    endSession, 
    leaveSession, 
    toggleGuestAccess,
    role,
    myParticipant,
    kickParticipant,
    changeParticipantRole,
    isLoading
  } = useCollabStore();

  const { project } = useDiagramStore();
  const { user } = useAuthStore();

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);

  if (!isModalOpen) return null;

  const isOwner = Boolean(
    (project?.ownerId && user?.userId && project.ownerId === user.userId) ||
    (role === 'host') ||
    (session?.hostId && user?.userId && session.hostId === user.userId)
  );

  const isHost = role === 'host' || isOwner;
  const isPaused = session?.status === 'paused';
  const isMultiUserStreaming = participants.length >= 2;
  const joinUrl = sessionCode ? `${window.location.origin}/join?code=${sessionCode}` : '';

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Enlace de invitación copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success(`Código ${sessionCode} copiado`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endSession();
    } finally {
      setIsEnding(false);
    }
  };

  const handleToggleRole = async (pUserId: string, currentRole: string) => {
    if (updatingUserId) return;
    setUpdatingUserId(pUserId);
    try {
      const nextRole = currentRole === 'viewer' ? 'editor' : 'viewer';
      await changeParticipantRole(pUserId, nextRole);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleAccess = async () => {
    if (isTogglingAccess) return;
    setIsTogglingAccess(true);
    try {
      const currentlyPaused = session?.status === 'paused';
      await toggleGuestAccess(currentlyPaused);
    } finally {
      setIsTogglingAccess(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      toast.error('Ingresa un código de sala válido (ej. SW1-902).');
      return;
    }
    const cleanCode = inputCode.trim().toUpperCase();
    const success = await joinSession(cleanCode);
    if (success) {
      setInputCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-slate-900/95 p-6 shadow-2xl shadow-black/80 backdrop-blur-xl text-slate-100 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.90) 100%)' }}
      >
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100 tracking-wide">
                  {isHost ? 'Configuración de la Pizarra Compartida' : 'Pizarra Compartida en Vivo'}
                </h3>
                {isLive && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isPaused 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : isMultiUserStreaming
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPaused 
                        ? 'bg-amber-400' 
                        : isMultiUserStreaming 
                        ? 'bg-emerald-400 animate-ping' 
                        : 'bg-blue-400'
                    }`} />
                    {isPaused ? 'Acceso Pausado' : isMultiUserStreaming ? 'WSS Streaming Activo' : 'En Reposo (1 Usuario)'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isLive
                  ? `Sala: ${sessionCode || 'Activa'} | Modelo: ${session?.projectName || project?.name || 'UML'}`
                  : (project?.name ? `Modelo actual: ${project.name}` : 'Pizarra multiusuario en tiempo real')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CASE A: LIVE SESSION ACTIVE (Both Host & Collaborator have dedicated UI) */}
        {/* ========================================================================= */}
        {isLive ? (
          <div className="my-4 space-y-4">
            {/* Host Controls: Toggle Room Access (Open vs Paused) */}
            {isHost && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Estado de la Sala:
                    </span>
                    <span className={`text-xs font-bold ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isPaused ? 'Pausada (Bloqueada a nuevos colaboradores)' : 'Abierta a Colaboradores'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isPaused
                      ? 'Nuevos usuarios no podrán ingresar con el código mientras esté pausada.'
                      : 'Cualquier colaborador registrado con el código puede entrar y colaborar.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isTogglingAccess}
                  onClick={handleToggleAccess}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isPaused
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {isTogglingAccess ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isPaused ? (
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{isPaused ? 'Abrir Sala' : 'Pausar Sala'}</span>
                </button>
              </div>
            )}

            {/* Room Code Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 relative group shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400/90">
                    Código de la Pizarra Compartida
                  </span>
                  <div className="text-3xl font-extrabold tracking-widest text-slate-50 font-mono mt-0.5 flex items-center gap-2">
                    {sessionCode}
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all text-xs border border-slate-700/60 cursor-pointer"
                      title="Copiar código"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="truncate max-w-[300px] select-all">
                  {joinUrl}
                </span>
                <span className="text-emerald-400/90 shrink-0 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Pizarra Compartida Segura
                </span>
              </div>
            </div>

            {/* Collaborator Role Info Banner (Visible for non-host) */}
            {!isHost && (
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                role === 'viewer'
                  ? 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className={`p-2 rounded-lg ${role === 'viewer' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {role === 'viewer' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div className="text-xs">
                  <span className="font-bold block">
                    {role === 'viewer' ? 'Permiso: Solo Lectura (Lector)' : 'Permiso: Editor de la Pizarra'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {role === 'viewer' 
                      ? 'Observas las clases y cursores en tiempo real. El anfitrión puede otorgarte permisos de edición.'
                      : 'Puedes crear, editar, conectar clases y guardar el diagrama en tiempo real.'}
                  </span>
                </div>
              </div>
            )}

            {/* Hybrid WebSocket Concurrency Indicator */}
            <div className="px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                {isMultiUserStreaming ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className={isMultiUserStreaming ? 'text-emerald-300 font-medium' : 'text-amber-300 font-medium'}>
                  {isMultiUserStreaming
                    ? `Sincronización WebSocket en Vivo Activa (${participants.length} usuarios concurrentes)`
                    : 'Pizarra en Reposo (El WebSocket optimiza tráfico hasta que otro usuario se conecte)'}
                </span>
              </div>
              <span className="font-mono text-slate-500">
                {isMultiUserStreaming ? '< 30 ms' : 'Standby'}
              </span>
            </div>

            {/* Participants & Governance Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Participantes en la Pizarra ({participants.length})</span>
                </div>
                {isHost && (
                  <span className="text-[10px] text-slate-400">
                    Puedes alternar permisos de Editor / Lector o expulsar
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-1.5 space-y-1 divide-y divide-slate-800/40">
                {participants.map((p) => {
                  const isMe = p.userId === myParticipant?.userId;
                  const isUserHost = p.role === 'host';

                  return (
                    <div 
                      key={p.userId || p.id} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                          style={{ backgroundColor: p.cursorColor || '#10B981' }}
                        >
                          {(p.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {p.fullName} {isMe && '(Tú)'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {isUserHost ? 'Anfitrión del Proyecto' : 'Colaborador de la Sala'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Host controls for other participants */}
                        {isHost && !isMe && !isUserHost ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={updatingUserId === p.userId}
                              onClick={() => p.userId && handleToggleRole(p.userId, p.role)}
                              className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider transition-all cursor-pointer ${
                                updatingUserId === p.userId ? 'opacity-60 cursor-not-allowed' : ''
                              } ${
                                p.role === 'viewer'
                                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              }`}
                              title={`Clic para cambiar permiso a ${p.role === 'viewer' ? 'Editor' : 'Solo Lectura'}`}
                            >
                              {updatingUserId === p.userId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : p.role === 'viewer' ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <Edit3 className="w-3 h-3" />
                              )}
                              <span>{p.role === 'viewer' ? 'Lector' : 'Editor'}</span>
                            </button>

                            <button
                              onClick={() => p.userId && kickParticipant(p.userId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title={`Expulsar a ${p.fullName}`}
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Static Badge for self or when user is not host */
                          <span 
                            className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider"
                            style={{
                              borderColor: p.cursorColor ? `${p.cursorColor}55` : '#10B98155',
                              color: p.cursorColor || '#10B981',
                              backgroundColor: p.cursorColor ? `${p.cursorColor}15` : '#10B98115'
                            }}
                          >
                            {isUserHost ? 'Anfitrión' : p.role === 'viewer' ? 'Lector' : 'Editor'}
                          </span>
                        )}

                        <div 
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.cursorColor || '#10B981' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Pizarra compartida multiusuario</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Minimizar
                </button>

                {isHost ? (
                  <button
                    onClick={handleEndSession}
                    disabled={isEnding}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isEnding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{isEnding ? 'Cerrando...' : 'Cerrar Sala'}</span>
                  </button>
                ) : (
                  <button
                    onClick={leaveSession}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <span>Salir de la Pizarra</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE B: NOT IN A LIVE SESSION YET                                         */
          /* If Owner -> Show "Activar Pizarra Compartida"                             */
          /* If Collaborator -> Show "Unirse a Pizarra con Código"                     */
          /* ========================================================================= */
          <div className="my-5 space-y-4">
            {isOwner ? (
              /* Host view when room is not yet started */
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Pizarra Compartida en Tiempo Real</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Como anfitrión de este proyecto, puedes habilitar la sala colaborativa para compartir el modelo y trabajar simultáneamente con otros colaboradores.
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
                    <li>Genera un código de acceso único <span className="font-mono text-amber-400">SW1-XXX</span>.</li>
                    <li>Asigna permisos de <span className="text-emerald-400">Editor</span> o <span className="text-blue-400">Solo Lectura</span> a tus colaboradores.</li>
                    <li>Sincronización inmediata de cambios al conectar $\ge 2$ usuarios.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isLoading || !project?.id}
                  onClick={() => project?.id && startSession(project.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>{isLoading ? 'Habilitando sala...' : 'Habilitar Pizarra Compartida'}</span>
                </button>
              </div>
            ) : (
              /* Collaborator view when not in a room: Join by Code */
              <form onSubmit={handleJoinSubmit} className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                    <LogIn className="w-4 h-4" />
                    <span>Conectarse a una Pizarra Compartida</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ingresa el código que te proporcionó el Anfitrión para acceder a su pizarra de modelado en tiempo real.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Código de la Pizarra
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="EJ. SW1-TH9"
                      maxLength={10}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all uppercase"
                      required
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !inputCode.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{isLoading ? 'Conectando a la pizarra...' : 'Conectarse a la Pizarra'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCollabModal;
