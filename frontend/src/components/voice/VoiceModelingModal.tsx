import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  X,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { aiVoiceService } from '../../services/aiVoiceService';
import { useDiagramStore } from '../../stores/diagramStore';
import toast from 'react-hot-toast';

interface VoiceModelingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceModelingModal: React.FC<VoiceModelingModalProps> = ({ isOpen, onClose }) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { project, nodes, edges, applyVoiceMutations, undo, canUndo } = useDiagramStore();

  const currentClasses = nodes.map((n) => n.data.name).filter(Boolean);
  const currentRelationships = edges.map((e) => ({
    source: nodes.find((n) => n.id === e.source)?.data.name || '',
    target: nodes.find((n) => n.id === e.target)?.data.name || '',
    type: e.data?.type || 'association'
  }));

  // Sincronizar texto cuando se recibe transcripción por voz activa
  useEffect(() => {
    if (isListening && (transcript || interimTranscript)) {
      const voiceText = transcript + (interimTranscript ? ' ' + interimTranscript : '');
      setInputText(voiceText);
    }
  }, [isListening, transcript, interimTranscript]);

  // Enfocar el input cuando se abre el dock
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Si hay error de speech recognition, notificar
  useEffect(() => {
    if (speechError) {
      toast.error(speechError);
    }
  }, [speechError]);

  if (!isOpen) return null;

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!isSupported) {
        toast.error('Reconocimiento de voz no soportado en este navegador. Puedes escribir el comando.');
        return;
      }
      startListening();
    }
  };

  const handleExecute = async (overridePrompt?: string) => {
    const textToProcess = (overridePrompt !== undefined ? overridePrompt : inputText).trim();
    if (!textToProcess) {
      toast.error('Habla o escribe una instrucción para la IA.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    const cleanedText = textToProcess
      .replace(/\bcoma\b/gi, ',')
      .replace(/\bpunto y coma\b/gi, ';')
      .replace(/\bpunto\b/gi, '.')
      .replace(/\bdos puntos\b/gi, ':')
      .replace(/\bguion\b/gi, '-')
      .replace(/\by de nombre\b/gi, 'nombre')
      .replace(/\by con nombre\b/gi, 'nombre')
      .replace(/\s+/g, ' ')
      .trim();

    setIsLoading(true);

    try {
      const res = await aiVoiceService.parseVoiceCommand({
        projectId: project?.id,
        transcript: cleanedText,
        currentClasses,
        currentRelationships,
        modality: isListening ? 'VOICE_SPEECH_PLN' : 'TEXT_COPILOT'
      });

      if (res.success && res.mutations && res.mutations.length > 0) {
        // Aplicación inmediata en tiempo real sobre el lienzo (en vivo)
        applyVoiceMutations(res.mutations);

        toast.success(
          () => (
            <div className="flex flex-col gap-0.5 select-none">
              <span className="font-semibold text-xs text-emerald-400">✓ {res.message}</span>
              <span className="text-[10px] text-slate-300">
                Cambios aplicados en vivo • Presiona <b>Ctrl+Z</b> para revertir
              </span>
            </div>
          ),
          { duration: 4500, icon: '✨' }
        );

        setInputText('');
        resetTranscript();
        setShowSuggestions(false);
      } else {
        toast.error(res.message || 'No se interpretó una instrucción UML clara. Intenta de nuevo.');
      }
    } catch (err: any) {
      console.error('Error aplicando comando con IA:', err);
      toast.error(err.response?.data?.message || 'Error de conexión con el motor de Inteligencia Artificial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }
    setInputText('');
    resetTranscript();
    onClose();
  };

  const handleChipClick = (sampleText: string) => {
    setInputText(sampleText);
    handleExecute(sampleText);
  };

  const suggestions = [
    'generame una tabla llamado gatos conectado con la tabla estudiante',
    'crear clase Factura con atributos total Double y fecha LocalDate',
    'modificar la tabla estudiante agregando los campos telefono String y direccion String',
    'conecta la tabla estudiante con la tabla docente de uno a uno',
    'crear clase Empleado que hereda de Persona',
    'hacer la clase Persona abstracta'
  ];

  return createPortal(
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95vw] max-w-2xl select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Popover de Sugerencias Rápidas */}
      {showSuggestions && (
        <div className="mb-2 p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Comandos sugeridos para dictar o ejecutar
            </span>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded-sm"
              title="Ocultar sugerencias"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(s)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-left flex items-center gap-1 active:scale-95"
              >
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dock Principal Flotante (No tapa el lienzo ni las tablas) */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        {/* Botón de Micrófono con Pulso Activo */}
        <button
          onClick={handleToggleMic}
          disabled={isLoading}
          className={`relative p-2.5 rounded-xl flex items-center justify-center transition-all ${
            isListening
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-blue-500/20 active:scale-95'
          }`}
          title={isListening ? 'Detener escucha' : 'Hablar por micrófono'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isListening && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping" />
          )}
        </button>

        {/* Input de Comando en Vivo (Voz o Texto sin recorte de espacios) */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              isListening
                ? 'Escuchando tu voz... (di: "Crear tabla Gatos conectado a Estudiante")'
                : 'Habla o escribe aquí tu orden UML (ej: "Crear tabla Gatos conectado a Estudiante")...'
            }
            className={`w-full bg-slate-800/80 border rounded-xl py-2 px-3.5 text-xs md:text-sm text-white select-text placeholder-slate-400 focus:outline-none transition-all ${
              isListening
                ? 'border-rose-500/60 ring-1 ring-rose-500/40 shadow-inner'
                : 'border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />
          {inputText && (
            <button
              onClick={() => {
                setInputText('');
                resetTranscript();
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-1 rounded-md"
              title="Limpiar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botón Ejecutar / Enviar */}
        <button
          onClick={() => handleExecute()}
          disabled={isLoading || !inputText.trim()}
          className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
            inputText.trim() && !isLoading
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
          title="Ejecutar y aplicar cambios en vivo"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>

        {/* Botón Deshacer Inmediato (Ctrl+Z) */}
        {canUndo && (
          <button
            onClick={() => {
              undo();
              toast('Deshecho último cambio • Ctrl+Z');
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95 hidden sm:flex items-center justify-center"
            title="Deshacer cambio (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Botón Sugerencias */}
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className={`p-2.5 rounded-xl border transition-all ${
            showSuggestions
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700/60'
          }`}
          title="Ver comandos de ejemplo"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Botón Cerrar Dock */}
        <button
          onClick={handleClose}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-all"
          title="Cerrar barra de IA (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default VoiceModelingModal;
