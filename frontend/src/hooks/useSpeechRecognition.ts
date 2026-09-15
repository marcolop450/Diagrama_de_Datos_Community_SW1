import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            currentFinal += text + ' ';
          } else {
            currentInterim += text;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${currentFinal.trim()}` : currentFinal.trim()));
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Permiso de acceso al micrófono denegado en el navegador.');
        } else if (event.error === 'no-speech') {
          // No speech detected, ignore silently or warn
        } else if (event.error === 'network') {
          setError('Error de conectividad de red con el servicio de voz.');
        } else {
          setError(`Error de reconocimiento: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError('Tu navegador no soporta Web Speech API. Puedes escribir el comando directamente.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    try {
      recognitionRef.current.start();
    } catch {
      // If already started, ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
