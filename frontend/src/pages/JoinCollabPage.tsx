import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Radio, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Lock, 
  LogIn, 
  UserPlus, 
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollabStore } from '../stores/collabStore';
import { useAuthStore } from '../stores/authStore';

export const JoinCollabPage: React.FC = () => {
  const navigate = useNavigate();
  const { code: paramCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code');

  const { joinSession, isLoading } = useCollabStore();
  const { user } = useAuthStore();

  const [sessionCode, setSessionCode] = useState(paramCode || queryCode || '');

  useEffect(() => {
    const initialCode = paramCode || queryCode;
    if (initialCode) {
      setSessionCode(initialCode.toUpperCase());
    }
  }, [paramCode, queryCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionCode.trim()) {
      toast.error('Por favor ingresa el código de sala (ej. SW1-902).');
      return;
    }

    const cleanCode = sessionCode.trim().toUpperCase();
    const success = await joinSession(cleanCode);
    if (success) {
      const activeSession = useCollabStore.getState().session;
      if (activeSession?.projectId) {
        navigate(`/editor/${activeSession.projectId}`);
      } else {
        navigate('/editor');
      }
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0f1115] text-slate-100 font-sans">
      {/* Subtle Aurora Ambient Lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-[#242934] bg-[#14171d]/95 p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-sm">
            <Radio className="w-7 h-7 animate-pulse text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">
            Sala Colaborativa en Vivo
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Sincronización multiusuario en tiempo real para co-diseño de diagramas UML.
          </p>
        </div>

        {/* CASO 1: NO AUTENTICADO */}
        {!user && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#242934] text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-white font-display">
                Autenticación Requerida
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Por políticas de trazabilidad y gobernanza del proyecto, únicamente usuarios registrados con rol <span className="text-indigo-400 font-semibold">Arquitecto</span> o <span className="text-blue-400 font-semibold">Colaborador</span> pueden participar en salas de modelado.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                to={`/login?redirect=${encodeURIComponent('/join' + (sessionCode ? `?code=${sessionCode}` : ''))}`}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión para Unirse</span>
              </Link>

              <Link
                to="/register"
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#181c24] hover:bg-[#1e232e] text-slate-200 border border-[#242934] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-slate-400" />
                <span>Registrarse como Colaborador</span>
              </Link>
            </div>
          </div>
        )}

        {/* CASO 2: SUPER_ADMIN (BLOQUEADO DE MODELADO) */}
        {user && isSuperAdmin && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-rose-200 font-display">
                Acceso Restringido para Super Admin
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                El rol <span className="font-semibold text-rose-300 font-mono">SUPER_ADMIN</span> está reservado exclusivamente para gobernanza de usuarios, auditoría forense y supervisión. No participa en la edición interactiva de diagramas de clases.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#181c24] hover:bg-[#1e232e] text-slate-200 border border-[#242934] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Panel de Gobernanza</span>
              </button>
            </div>
          </div>
        )}

        {/* CASO 3: ARQUITECTO O COLABORADOR REGISTRADO */}
        {user && !isSuperAdmin && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Profile Badge */}
            <div className="p-3.5 rounded-xl bg-[#0f1115] border border-[#242934] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0 font-mono">
                  {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.fullName || user.username}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate font-mono">
                    {user.email || user.username}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                {user.role}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
                Código de Sala Colaborativa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="EJ. SW1-902"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1115] border border-[#242934] text-white placeholder-slate-500 font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase"
                  required
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Conectando a la sala...' : 'Conectar a la Sala'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Footer features */}
        <div className="mt-6 pt-4 border-t border-[#242934] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sincronización WSS &lt; 50ms</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCollabPage;
