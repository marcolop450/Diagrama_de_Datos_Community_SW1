import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  UploadCloud,
  Sparkles,
  RefreshCw,
  X,
  Layers,
  CheckCircle2,
  Trash2,
  Video,
  VideoOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { aiVisionService } from '../../services/aiVisionService';
import { useDiagramStore } from '../../stores/diagramStore';
import { UmlMutationDto } from '../../services/aiVoiceService';

interface WhiteboardVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

export const WhiteboardVisionModal: React.FC<WhiteboardVisionModalProps> = ({
  isOpen,
  onClose,
  onApplied
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Result state
  const [resultSummary, setResultSummary] = useState<{
    message: string;
    provider: string;
    latencyMs: number;
    classesCount: number;
    relationshipsCount: number;
    mutations: UmlMutationDto[];
  } | null>(null);

  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { project, applyVoiceMutations } = useDiagramStore();

  useEffect(() => {
    if (!isOpen) {
      handleReset();
      stopCamera();
    }
  }, [isOpen]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      stopCamera();
    };
  }, [previewUrl]);

  const handleReset = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultSummary(null);
    setIsProcessing(false);
    setProcessingStage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Formato no compatible. Por favor sube una imagen PNG, JPG o WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('La imagen excede el límite de 15MB.');
      return;
    }

    handleReset();
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Camera management
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Tu navegador no soporta captura de cámara directa.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Error accediendo a cámara:', err);
      toast.error('No se pudo acceder a la cámara. Revisa los permisos en tu navegador.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          handleReset();
          setSelectedFile(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopCamera();
          setActiveTab('upload');
          toast.success('Fotografía capturada con éxito.');
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleDigitize = async () => {
    if (!selectedFile) {
      toast.error('Por favor carga o captura una fotografía antes de digitalizar.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStage('Enviando imagen al pipeline de IA Visión...');

      setTimeout(() => {
        setProcessingStage('Analizando grafo visual con Google Gemini Multimodal...');
      }, 1200);

      setTimeout(() => {
        setProcessingStage('Extrayendo clases, atributos, relaciones y aplicando 1NF...');
      }, 2600);

      const res = await aiVisionService.digitizeWhiteboard({
        file: selectedFile,
        projectId: project?.id,
        mergeMode
      });

      if (res.success && res.mutations && res.mutations.length > 0) {
        const classCount = res.mutations.filter((m) => m.action === 'CREATE_CLASS').length;
        const relCount = res.mutations.filter((m) => m.action === 'CREATE_RELATIONSHIP').length;

        setResultSummary({
          message: res.message,
          provider: res.providerUsed,
          latencyMs: res.latencyMs,
          classesCount: classCount,
          relationshipsCount: relCount,
          mutations: res.mutations
        });
        toast.success('¡Diagrama de pizarra analizado y vectorizado con éxito!');
      } else {
        toast.error(res.message || 'No se pudieron reconocer elementos UML en la imagen.');
      }
    } catch (err: any) {
      console.error('Error al digitalizar pizarra:', err);
      toast.error(
        err.response?.data?.message || 'Error durante el procesamiento visual con IA.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleApplyToCanvas = () => {
    if (!resultSummary || !resultSummary.mutations) return;

    // Aplicar mutaciones en diagramStore con snapshot Undo/Redo y respeto a clearFirst
    applyVoiceMutations(resultSummary.mutations, { clearFirst: !mergeMode });

    toast.success(
      () => (
        <div className="flex flex-col gap-0.5 select-none">
          <span className="font-semibold text-xs text-emerald-400">
            ✓ Diagrama de pizarra inyectado en el lienzo
          </span>
          <span className="text-[10px] text-slate-300">
            {resultSummary.classesCount} clases y {resultSummary.relationshipsCount} relaciones • Presiona <b>Ctrl+Z</b> para revertir
          </span>
        </div>
      ),
      { duration: 5000 }
    );

    if (onApplied) {
      onApplied();
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-[#14171d] border border-[#242934] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242934] bg-[#11141a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2 font-display">
                Digitalizar Foto de Pizarra
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  IA Visión
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Convierte bocetos en pizarras físicas o papel a diagramas interactivos OMG UML 2.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181c24] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (Subir Archivo vs Cámara) */}
        {!resultSummary && (
          <div className="flex border-b border-[#242934] bg-[#0f1115]/60 px-6 pt-3 gap-2">
            <button
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-xl transition-all border-b-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-indigo-500 text-indigo-300 bg-[#181c24]'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-[#181c24]/50'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Subir Imagen
            </button>
            <button
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-xl transition-all border-b-2 cursor-pointer ${
                activeTab === 'camera'
                  ? 'border-indigo-500 text-indigo-300 bg-[#181c24]'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-[#181c24]/50'
              }`}
            >
              <Video className="w-4 h-4" />
              Usar Cámara Web
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Result View */}
          {resultSummary ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-200 font-display">
                    Boceto Vectorizado Exitosamente
                  </h4>
                  <p className="text-xs text-slate-300">
                    {resultSummary.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="px-2 py-0.5 text-[11px] rounded-lg bg-[#181c24] text-slate-200 border border-[#242934] font-mono">
                      Proveedor: <strong className="text-indigo-400 font-semibold">{resultSummary.provider}</strong>
                    </span>
                    <span className="px-2 py-0.5 text-[11px] rounded-lg bg-[#181c24] text-slate-200 border border-[#242934] font-mono">
                      Latencia: <strong className="text-indigo-400 font-semibold">{resultSummary.latencyMs} ms</strong>
                    </span>
                    <span className="px-2 py-0.5 text-[11px] rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                      {resultSummary.classesCount} Clases
                    </span>
                    <span className="px-2 py-0.5 text-[11px] rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                      {resultSummary.relationshipsCount} Relaciones
                    </span>
                  </div>
                </div>
              </div>

              {/* Small preview of processed image */}
              {previewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-[#242934] max-h-48 bg-[#0a0c10] flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Pizarra procesada"
                    className="max-h-48 object-contain"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] text-slate-300 border border-white/10 font-mono">
                    Fotografía analizada
                  </div>
                </div>
              )}

              {/* Detected classes overview */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-display">
                  Entidades Detectadas en la Pizarra:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {resultSummary.mutations
                    .filter((m) => m.action === 'CREATE_CLASS')
                    .map((mut, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#181c24] border border-[#242934] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs font-medium text-white font-display">
                            {mut.classData?.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {mut.classData?.attributes?.length || 0} atr • {mut.classData?.methods?.length || 0} mét
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Strategy reminder */}
              <div className="p-3 rounded-xl bg-[#181c24] border border-[#242934] text-xs text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Modo seleccionado: <strong className="text-white">{mergeMode ? 'Incorporar al diagrama actual' : 'Reemplazar diagrama actual'}</strong>.
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Tab 1: Upload File Mode */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  {!previewUrl ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                        dragOver
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-[#242934] hover:border-indigo-500/40 bg-[#0f1115]/60 hover:bg-[#0f1115]'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="p-3 rounded-2xl bg-[#181c24] text-indigo-400 border border-[#242934]">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200 font-display">
                          Arrastra y suelta la foto de tu pizarra aquí
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          o haz clic para explorar archivos en tu equipo (PNG, JPG, WEBP hasta 15MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-[#242934] bg-[#0a0c10]">
                      <img
                        src={previewUrl}
                        alt="Boceto cargado"
                        className="max-h-64 w-full object-contain bg-[#0a0c10]"
                      />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={handleReset}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium backdrop-blur-md flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cambiar Foto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Live Camera Mode */}
              {activeTab === 'camera' && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-[#242934] bg-black aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0f1115]/90">
                        <VideoOff className="w-8 h-8 text-slate-500" />
                        <p className="text-xs text-slate-400">Cámara apagada o sin permisos</p>
                        <button
                          onClick={startCamera}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reintentar Acceso
                        </button>
                      </div>
                    )}
                  </div>

                  {isCameraActive && (
                    <div className="flex justify-center">
                      <button
                        onClick={capturePhoto}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        Capturar Fotograma
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Injection Strategy (Reemplazar vs Fusionar) */}
              <div className="p-4 rounded-xl bg-[#0f1115]/60 border border-[#242934] space-y-2">
                <label className="text-xs font-semibold text-slate-200 block font-display">
                  Estrategia de Inyección en el Lienzo:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      !mergeMode
                        ? 'border-indigo-500/80 bg-indigo-500/10'
                        : 'border-[#242934] bg-[#181c24] hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="injectionStrategy"
                      checked={!mergeMode}
                      onChange={() => setMergeMode(false)}
                      className="mt-0.5 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Reemplazar Modelo
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Limpia el lienzo actual e inserta el modelo digitalizado desde cero.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      mergeMode
                        ? 'border-indigo-500/80 bg-indigo-500/10'
                        : 'border-[#242934] bg-[#181c24] hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="injectionStrategy"
                      checked={mergeMode}
                      onChange={() => setMergeMode(true)}
                      className="mt-0.5 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Incorporar / Fusionar
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Agrega las clases detectadas sin borrar ni solapar las existentes.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Progress Indicator */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-xs font-medium">{processingStage}</span>
                  </div>
                  <div className="w-full bg-[#181c24] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full animate-pulse w-full" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#242934] bg-[#11141a]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-[#181c24] hover:bg-[#1f2430] border border-[#242934] rounded-xl transition-colors cursor-pointer"
          >
            {resultSummary ? 'Cerrar' : 'Cancelar'}
          </button>

          <div className="flex items-center gap-3">
            {resultSummary ? (
              <>
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#181c24] hover:bg-[#1f2430] border border-[#242934] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Volver a Analizar
                </button>
                <button
                  onClick={handleApplyToCanvas}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  Aplicar al Diagrama
                </button>
              </>
            ) : (
              <button
                onClick={handleDigitize}
                disabled={!selectedFile || isProcessing}
                className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  !selectedFile || isProcessing
                    ? 'bg-[#181c24] text-slate-500 border border-[#242934] cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando Visión...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Digitalizar Pizarra
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};