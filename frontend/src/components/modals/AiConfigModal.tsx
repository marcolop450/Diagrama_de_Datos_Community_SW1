import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Cpu, 
  Key, 
  Server, 
  ShieldCheck, 
  Activity, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sliders, 
  Terminal, 
  Zap, 
  Radio,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  projectAiService, 
  ProjectAiConfigDto, 
  AiProvider, 
  ProjectAiTestResponse 
} from '../../services/projectAiService';
import { useProjectAiStore, formatAiEngineLabel } from '../../stores/projectAiStore';
import { useCollabStore } from '../../stores/collabStore';
import { collabWebSocketService } from '../../services/collabWebSocketService';

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

type HarnessSection = 'LOCAL' | 'CLOUD' | 'DEFAULT';
type LocalServerType = 'LMSTUDIO' | 'OLLAMA';

export const AiConfigModal: React.FC<AiConfigModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName
}) => {
  // Main view state
  const [activeTab, setActiveTab] = useState<'harness' | 'sandbox'>('harness');
  const [activeSection, setActiveSection] = useState<HarnessSection>('LOCAL');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Active Project Engine (Persisted)
  const [activeProvider, setActiveProvider] = useState<string>('SYSTEM_DEFAULT');

  // Section 1: Local AI State
  const [localServerType, setLocalServerType] = useState<LocalServerType>('LMSTUDIO');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:1234');
  const [detectedLocalModels, setDetectedLocalModels] = useState<string[]>([]);
  const [selectedLocalModel, setSelectedLocalModel] = useState('');
  const [isCustomLocalModel, setIsCustomLocalModel] = useState(false);
  const [customLocalModelName, setCustomLocalModelName] = useState('');

  // Section 2: External Cloud (Clean: Provider + Key + Model + Optional Base URL)
  const [cloudProviderName, setCloudProviderName] = useState('Meta');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [showCloudApiKey, setShowCloudApiKey] = useState(false);
  const [maskedCloudApiKey, setMaskedCloudApiKey] = useState('');
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [cloudModelName, setCloudModelName] = useState('');
  const [cloudEndpoint, setCloudEndpoint] = useState('');
  const [isDiscoveringExternal, setIsDiscoveringExternal] = useState(false);
  const [externalDiscoveredModels, setExternalDiscoveredModels] = useState<string[]>([]);

  // Sandbox State
  const [testPrompt, setTestPrompt] = useState('Crear clase Factura con id Long y total BigDecimal');
  const [testResult, setTestResult] = useState<ProjectAiTestResponse | null>(null);

  // Load project configuration
  useEffect(() => {
    if (isOpen && projectId) {
      loadConfig();
    }
  }, [isOpen, projectId]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await projectAiService.getProjectAiConfig(projectId);
      const prov = (data.provider || 'SYSTEM_DEFAULT') as AiProvider;
      setActiveProvider(prov);
      useProjectAiStore.getState().updateActiveEngine(prov, data.selectedModel, data.ollamaEndpoint);

      if (prov === 'LMSTUDIO_LOCAL' || prov === 'OLLAMA_LOCAL') {
        setActiveSection('LOCAL');
        setLocalServerType(prov === 'LMSTUDIO_LOCAL' ? 'LMSTUDIO' : 'OLLAMA');
        setLocalEndpoint(data.ollamaEndpoint || (prov === 'LMSTUDIO_LOCAL' ? 'http://localhost:1234' : 'http://localhost:11434'));
        setSelectedLocalModel(data.selectedModel || '');
      } else if (prov === 'SYSTEM_DEFAULT') {
        setActiveSection('DEFAULT');
      } else {
        // Modelo Externo Cloud
        setActiveSection('CLOUD');
        setCloudProviderName(prov.replace('_CLOUD', '').replace('_API', ''));
        setCloudModelName(data.selectedModel || '');
        setCloudEndpoint(data.ollamaEndpoint || '');
      }

      setMaskedCloudApiKey(data.maskedApiKey || '');
      setHasCustomApiKey(Boolean(data.hasCustomApiKey));
      setCloudApiKey('');
    } catch (err: any) {
      console.error('Error al cargar configuración de IA:', err);
      toast.error('No se pudo cargar la configuración de IA del proyecto.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch local server type
  const handleSelectLocalServer = (type: LocalServerType) => {
    setLocalServerType(type);
    if (!localEndpoint || localEndpoint.includes('localhost:1234') || localEndpoint.includes('localhost:11434')) {
      setLocalEndpoint(type === 'LMSTUDIO' ? 'http://localhost:1234' : 'http://localhost:11434');
    }
    setDetectedLocalModels([]);
    setSelectedLocalModel('');
  };

  // Scan local server models
  const handleDetectLocalModels = async () => {
    if (!localEndpoint.trim()) {
      toast.error('Por favor ingresa la URL de tu servidor local.');
      return;
    }
    setIsDetecting(true);
    try {
      const resp = await projectAiService.detectLocalModels(projectId, localServerType, localEndpoint.trim());
      if (resp.success && resp.models.length > 0) {
        setDetectedLocalModels(resp.models);
        setSelectedLocalModel(resp.models[0]);
        setIsCustomLocalModel(false);
        const serverName = localServerType === 'LMSTUDIO' ? 'LM Studio' : 'Ollama';
        toast.success(`Conectado a ${serverName}: ${resp.models.length} modelos detectados.`);
      } else {
        setDetectedLocalModels([]);
        toast.error(resp.errorMessage || 'No se detectaron modelos activos en el servidor.');
      }
    } catch (err: any) {
      const serverName = localServerType === 'LMSTUDIO' ? 'LM Studio' : 'Ollama';
      toast.error(err.response?.data?.message || `No se pudo conectar con el servidor ${serverName}.`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Descubrir modelos autorizados en la API externa (Meta, OpenAI, Groq, OpenRouter)
  const handleDiscoverExternalModels = async () => {
    if (!cloudApiKey.trim() && !hasCustomApiKey) {
      toast.error('Ingresa tu API Key para consultar los modelos autorizados.');
      return;
    }
    setIsDiscoveringExternal(true);
    try {
      const resp = await projectAiService.discoverExternalModels(
        projectId,
        cloudProviderName.trim() || 'Meta',
        cloudEndpoint.trim() || undefined,
        cloudApiKey.trim() || undefined
      );
      if (resp.success && resp.models && resp.models.length > 0) {
        setExternalDiscoveredModels(resp.models);
        toast.success(`Se descubrieron ${resp.models.length} modelos en tu API.`);
        if (!cloudModelName.trim() || !resp.models.includes(cloudModelName)) {
          setCloudModelName(resp.models[0]);
        }
      } else {
        toast.error(resp.errorMessage || 'No se pudieron listar los modelos de esta API.');
      }
    } catch (err: any) {
      console.error('Error al descubrir modelos externos:', err);
      toast.error(err.response?.data?.message || 'Error al conectar con el endpoint de modelos.');
    } finally {
      setIsDiscoveringExternal(false);
    }
  };

  // Guardado unificado y reactivo en base de datos y store global
  const executeSave = async (
    targetProvider: string,
    targetEndpoint?: string,
    targetModel?: string,
    targetKey?: string,
    closeOnDone: boolean = false
  ) => {
    setIsSaving(true);
    try {
      const payload: ProjectAiConfigDto = {
        projectId,
        provider: targetProvider as AiProvider,
        ollamaEndpoint: targetEndpoint,
        selectedModel: targetModel,
        apiKey: targetKey,
        temperature: 0.20,
        hasCustomApiKey: hasCustomApiKey || Boolean(targetKey),
        isActive: true
      };

      const saved = await projectAiService.saveProjectAiConfig(projectId, payload);
      setActiveProvider(targetProvider);
      useProjectAiStore.getState().updateActiveEngine(
        targetProvider as AiProvider,
        targetModel,
        targetEndpoint
      );
      setMaskedCloudApiKey(saved.maskedApiKey || '');
      setHasCustomApiKey(Boolean(saved.hasCustomApiKey));
      setCloudApiKey('');
      toast.success(`Motor IA activado para el proyecto: ${formatAiEngineLabel(targetProvider, targetModel)}`);

      // Sincronizar en tiempo real con todos los colaboradores conectados a la sala
      const collabState = useCollabStore.getState();
      if (collabState.isLive && collabState.sessionCode) {
        collabWebSocketService.sendMessage({
          type: 'AI_CONFIG_CHANGED' as any,
          senderId: collabState.myParticipant?.userId,
          senderName: collabState.myParticipant?.fullName || 'Colaborador',
          sessionCode: collabState.sessionCode,
          payload: {
            provider: targetProvider,
            selectedModel: targetModel,
            endpoint: targetEndpoint
          },
          timestamp: Date.now()
        });
      }

      if (closeOnDone) {
        onClose();
      }
    } catch (err: any) {
      console.error('Error al guardar configuración de IA:', err);
      toast.error(err.response?.data?.message || 'Error al guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  // Set Local AI as Project Engine (Guarda al instante)
  const handleApplyLocalAsActive = async () => {
    const finalModel = isCustomLocalModel ? customLocalModelName.trim() : selectedLocalModel.trim();
    if (!localEndpoint.trim()) {
      toast.error('Especifica la URL del servidor local antes de activarlo.');
      return;
    }
    const prov = localServerType === 'LMSTUDIO' ? 'LMSTUDIO_LOCAL' : 'OLLAMA_LOCAL';
    await executeSave(prov, localEndpoint.trim(), finalModel, undefined, false);
  };

  // Set Cloud External as Project Engine (Guarda al instante)
  const handleApplyCloudAsActive = async () => {
    const provClean = cloudProviderName.trim() || 'EXTERNAL_CLOUD';
    const modelClean = cloudModelName.trim();
    if (!hasCustomApiKey && !cloudApiKey.trim()) {
      toast.error('Ingresa tu API Key para activar este modelo externo.');
      return;
    }
    if (!modelClean) {
      toast.error('Ingresa el nombre del modelo (ej: meta-llama/Llama-3-70b).');
      return;
    }
    await executeSave(provClean, cloudEndpoint.trim() || undefined, modelClean, cloudApiKey.trim() || undefined, false);
  };

  // Set Default System as Project Engine (Guarda al instante)
  const handleApplyDefaultAsActive = async () => {
    await executeSave('SYSTEM_DEFAULT', undefined, undefined, undefined, false);
  };

  // Guardar desde el botón principal inferior
  const handleSave = async () => {
    let finalEndpoint: string | undefined = undefined;
    let finalModel: string | undefined = undefined;
    let finalKey: string | undefined = undefined;

    if (activeProvider === 'LMSTUDIO_LOCAL' || activeProvider === 'OLLAMA_LOCAL') {
      finalEndpoint = localEndpoint.trim();
      finalModel = isCustomLocalModel ? customLocalModelName.trim() : selectedLocalModel.trim();
    } else if (activeProvider !== 'SYSTEM_DEFAULT') {
      finalEndpoint = cloudEndpoint.trim() || undefined;
      finalModel = cloudModelName.trim();
      finalKey = cloudApiKey.trim() || undefined;
    }

    await executeSave(activeProvider, finalEndpoint, finalModel, finalKey, true);
  };

  // Test current configuration in Sandbox Harness
  const handleTestInSandbox = async (target: 'CURRENT_CONFIG' | 'ACTIVE_ENGINE') => {
    setIsTesting(true);
    setTestResult(null);

    let testProv: string = activeProvider;
    let testEndpoint: string | undefined = undefined;
    let testModel: string | undefined = undefined;
    let testKey: string | undefined = undefined;

    if (target === 'CURRENT_CONFIG') {
      if (activeSection === 'LOCAL') {
        testProv = localServerType === 'LMSTUDIO' ? 'LMSTUDIO_LOCAL' : 'OLLAMA_LOCAL';
        testEndpoint = localEndpoint.trim();
        testModel = isCustomLocalModel ? customLocalModelName.trim() : selectedLocalModel.trim();
      } else if (activeSection === 'CLOUD') {
        testProv = cloudProviderName.trim() || 'EXTERNAL_CLOUD';
        testEndpoint = cloudEndpoint.trim() || undefined;
        testModel = cloudModelName.trim();
        testKey = cloudApiKey.trim() || undefined;
      } else {
        testProv = 'SYSTEM_DEFAULT';
      }
    } else {
      testProv = activeProvider;
      if (testProv === 'LMSTUDIO_LOCAL' || testProv === 'OLLAMA_LOCAL') {
        testEndpoint = localEndpoint.trim();
        testModel = isCustomLocalModel ? customLocalModelName.trim() : selectedLocalModel.trim();
      } else if (testProv !== 'SYSTEM_DEFAULT') {
        testEndpoint = cloudEndpoint.trim() || undefined;
        testModel = cloudModelName.trim();
        testKey = cloudApiKey.trim() || undefined;
      }
    }

    try {
      const resp = await projectAiService.testAiConnection(projectId, {
        provider: testProv as AiProvider,
        ollamaEndpoint: testEndpoint,
        selectedModel: testModel,
        apiKey: testKey,
        testPrompt: testPrompt.trim()
      });
      setTestResult(resp);
      if (resp.success) {
        toast.success(`Prueba completada (${resp.latencyMs} ms).`);
      } else {
        toast.error(resp.errorMessage || 'Fallo en la prueba de inferencia.');
      }
    } catch (err: any) {
      console.error('Error en prueba de IA:', err);
      toast.error(err.response?.data?.message || 'Fallo al ejecutar la prueba en el servidor.');
    } finally {
      setIsTesting(false);
    }
  };

  const getActiveBadgeLabel = () => {
    if (activeProvider === 'LMSTUDIO_LOCAL') {
      return `LM Studio (${selectedLocalModel || 'qwen/qwen3.5-9b'})`;
    }
    if (activeProvider === 'OLLAMA_LOCAL') {
      return `Ollama (${selectedLocalModel || 'local'})`;
    }
    if (activeProvider === 'SYSTEM_DEFAULT') {
      return 'Gratuito Integrado (Circuit Breaker)';
    }
    return `${activeProvider} (${cloudModelName || 'custom'})`;
  };

  if (!isOpen) return null;

  // Montado con createPortal directamente en document.body con z-[100]
  // para evitar que ningún widget flotante (como el Asistente IA z-40) sobresalga
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#14171d] border border-[#242934] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Limpio */}
        <div className="px-5 py-3.5 border-b border-[#242934] bg-[#0f1115] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 font-display">
                  Motor de Inferencia IA del Proyecto
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Colaborativo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                {projectName ? `Proyecto: ${projectName}` : 'Configura tu motor de IA para modelado y co-desarrollo.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#1a1e27] rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        {/* Banner de Motor Activo */}
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-950/60 via-[#131622] to-[#101319] border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold shadow-xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVO
            </span>
            <span className="text-xs text-slate-300 font-sans hidden sm:inline shrink-0">Motor en uso en este proyecto:</span>
            <span className="text-xs font-bold text-white font-mono bg-[#161a26] px-3 py-1 rounded-lg border border-indigo-500/40 shadow-inner truncate">
              {getActiveBadgeLabel()}
            </span>
          </div>
          <span className="text-[10px] text-indigo-300/80 font-mono hidden md:inline shrink-0">
            Afecta a todo el equipo
          </span>
        </div>

        {/* Tabs Principales */}
        <div className="flex items-center px-5 border-b border-[#242934] bg-[#11141a]">
          <button
            onClick={() => setActiveTab('harness')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'harness'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={13} />
            <span>Motores de Inferencia</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={13} />
            <span>Sandbox de Pruebas</span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin scrollbar-thumb-[#242934] scrollbar-track-transparent">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-indigo-400 mb-2" />
              <span className="text-xs font-sans">Cargando configuración...</span>
            </div>
          ) : activeTab === 'harness' ? (
            <>
              {/* Selector de los 3 Apartados Limpios */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Apartado 1 */}
                  <button
                    onClick={() => setActiveSection('LOCAL')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      activeSection === 'LOCAL'
                        ? 'border-indigo-500 bg-indigo-950/25 text-white ring-1 ring-indigo-500/30'
                        : 'border-[#242934] bg-[#161a22] text-slate-300 hover:border-[#384152]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-300">
                        <Server size={14} />
                        <span>1. IA Local</span>
                      </div>
                      {(activeProvider === 'LMSTUDIO_LOCAL' || activeProvider === 'OLLAMA_LOCAL') && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> ACTIVO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">LM Studio & Ollama</span>
                  </button>

                  {/* Apartado 2 */}
                  <button
                    onClick={() => setActiveSection('CLOUD')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      activeSection === 'CLOUD'
                        ? 'border-indigo-500 bg-indigo-950/25 text-white ring-1 ring-indigo-500/30'
                        : 'border-[#242934] bg-[#161a22] text-slate-300 hover:border-[#384152]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                        <Zap size={14} />
                        <span>2. Modelo Externo</span>
                      </div>
                      {activeProvider !== 'SYSTEM_DEFAULT' && activeProvider !== 'LMSTUDIO_LOCAL' && activeProvider !== 'OLLAMA_LOCAL' && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> ACTIVO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">API + Modelo Libre</span>
                  </button>

                  {/* Apartado 3 */}
                  <button
                    onClick={() => setActiveSection('DEFAULT')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      activeSection === 'DEFAULT'
                        ? 'border-indigo-500 bg-indigo-950/25 text-white ring-1 ring-indigo-500/30'
                        : 'border-[#242934] bg-[#161a22] text-slate-300 hover:border-[#384152]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                        <ShieldCheck size={14} />
                        <span>3. Gratuito Integrado</span>
                      </div>
                      {activeProvider === 'SYSTEM_DEFAULT' && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> ACTIVO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">Circuit Breaker</span>
                  </button>
                </div>

                {/* Nota informativa sobre Visión Multimodal */}
                <div className="mt-2.5 p-2.5 rounded-xl border border-sky-500/25 bg-sky-950/20 flex items-start gap-2.5 text-[11px] text-sky-200">
                  <Info size={14} className="mt-0.5 shrink-0 text-sky-400" />
                  <div className="leading-relaxed font-sans">
                    <strong className="text-sky-300">Digitalización de Pizarras UML:</strong> Funciona permanentemente a través de la infraestructura multimodal integrada del sistema (Google Gemini / OpenRouter Vision), de modo que tu modelo de texto local o clave BYOK no requiere soportar procesamiento de imágenes.
                  </div>
                </div>
              </div>

              {/* ===== APARTADO 1: IA LOCAL ===== */}
              {activeSection === 'LOCAL' && (
                <div className="space-y-3.5 p-4 rounded-xl border border-indigo-500/30 bg-[#161a22]">
                  <div className="flex items-center justify-between border-b border-[#242934] pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Servidor Local On-Premise</h4>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Ejecuta modelos en tu máquina sin límites ni costos.
                      </p>
                    </div>

                    <button
                      onClick={handleApplyLocalAsActive}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={13} />
                      <span>Establecer como Activo</span>
                    </button>
                  </div>

                  {/* Selector LM Studio vs Ollama */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectLocalServer('LMSTUDIO')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        localServerType === 'LMSTUDIO'
                          ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/40'
                          : 'border-[#2a303c] bg-[#11141a] text-slate-300 hover:border-[#3d4556]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Cpu size={16} className="text-indigo-400" />
                        <div>
                          <span className="text-xs font-bold block">LM Studio</span>
                          <span className="text-[10px] text-slate-400">Puerto :1234</span>
                        </div>
                      </div>
                      {localServerType === 'LMSTUDIO' && <CheckCircle2 size={14} className="text-indigo-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectLocalServer('OLLAMA')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        localServerType === 'OLLAMA'
                          ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/40'
                          : 'border-[#2a303c] bg-[#11141a] text-slate-300 hover:border-[#3d4556]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-indigo-400" />
                        <div>
                          <span className="text-xs font-bold block">Ollama</span>
                          <span className="text-[10px] text-slate-400">Puerto :11434</span>
                        </div>
                      </div>
                      {localServerType === 'OLLAMA' && <CheckCircle2 size={14} className="text-indigo-400" />}
                    </button>
                  </div>

                  {/* URL y Botón Escanear */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      URL del Servidor {localServerType === 'LMSTUDIO' ? 'LM Studio' : 'Ollama'}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Terminal size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={localEndpoint}
                          onChange={(e) => setLocalEndpoint(e.target.value)}
                          placeholder={localServerType === 'LMSTUDIO' ? 'http://localhost:1234' : 'http://localhost:11434'}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleDetectLocalModels}
                        disabled={isDetecting}
                        className="px-3 py-1.5 bg-[#1f242e] hover:bg-[#282f3d] text-indigo-300 text-xs font-medium rounded-lg border border-[#303848] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={isDetecting ? 'animate-spin' : ''} />
                        <span>{isDetecting ? 'Detectando...' : 'Escanear'}</span>
                      </button>
                    </div>

                    {/* Guía Contextual si se accede desde la Web Cloud */}
                    {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                      <div className="mt-2 p-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-200/90 space-y-1">
                        <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                          <Info size={13} />
                          <span>Conexión desde la Web hacia tu PC Local</span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-slate-300">
                          Al estar en la nube, el backend en AWS no puede ver el <code>127.0.0.1</code> de tu laptop privada. Para enlazar tu servidor local a esta web, ejecuta en una terminal de tu PC:
                        </p>
                        <code className="block bg-[#0f1115] px-2 py-1 rounded text-[11px] font-mono text-amber-300 select-all border border-[#242934]">
                          npx localtunnel --port {localServerType === 'LMSTUDIO' ? '1234' : '11434'} --local-host 127.0.0.1
                        </code>
                        <p className="text-[10px] text-slate-400">
                          Copia la URL pública generada (ej. <code>https://xxx.loca.lt</code>) y pégala arriba para escanear y usar tus modelos.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Modelo detectado o manual */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        Modelo en {localServerType === 'LMSTUDIO' ? 'LM Studio' : 'Ollama'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomLocalModel(!isCustomLocalModel)}
                        className="text-[10.5px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        {isCustomLocalModel ? 'Elegir de detectados' : '+ Escribir modelo manual'}
                      </button>
                    </div>

                    {!isCustomLocalModel ? (
                      detectedLocalModels.length > 0 ? (
                        <select
                          value={selectedLocalModel}
                          onChange={(e) => setSelectedLocalModel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                        >
                          {detectedLocalModels.map((m) => (
                            <option key={m} value={m} className="bg-[#14171d] text-slate-200">
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 rounded-lg bg-[#0f1115] border border-[#242934] text-slate-400 text-xs flex items-center justify-between">
                          <span>{selectedLocalModel ? `Modelo seleccionado: ${selectedLocalModel}` : 'Pulsa "Escanear" arriba para listar tus modelos cargados.'}</span>
                          <span className="text-[10px] text-indigo-400 font-mono">{detectedLocalModels.length} modelos</span>
                        </div>
                      )
                    ) : (
                      <input
                        type="text"
                        value={customLocalModelName}
                        onChange={(e) => setCustomLocalModelName(e.target.value)}
                        placeholder="Ej: qwen/qwen3.5-9b o llama-3.2-3b"
                        className="w-full px-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ===== APARTADO 2: MODELO EXTERNO LIMPIO (API + MODELO) ===== */}
              {activeSection === 'CLOUD' && (
                <div className="space-y-3.5 p-4 rounded-xl border border-amber-500/30 bg-[#161a22]">
                  <div className="flex items-center justify-between border-b border-[#242934] pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Modelo Externo (API + Modelo Libre)</h4>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Conecta tu API (Meta, Groq, OpenAI, Google, etc.) y escribe tu modelo directamente.
                      </p>
                    </div>

                    <button
                      onClick={handleApplyCloudAsActive}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={13} />
                      <span>Establecer como Activo</span>
                    </button>
                  </div>

                  {/* Nombre de la API / Proveedor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Proveedor / Nombre de la API
                      </label>
                      <input
                        type="text"
                        value={cloudProviderName}
                        onChange={(e) => setCloudProviderName(e.target.value)}
                        placeholder="Ej: Meta, Groq, OpenAI, Gemini, Together"
                        className="w-full px-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
                      />
                    </div>

                    {/* Modelo a Invocar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          Nombre del Modelo
                        </label>
                        <button
                          type="button"
                          onClick={handleDiscoverExternalModels}
                          disabled={isDiscoveringExternal}
                          className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 underline cursor-pointer disabled:opacity-50"
                          title="Consultar modelos disponibles con tu API Key"
                        >
                          <RefreshCw size={10} className={isDiscoveringExternal ? 'animate-spin' : ''} />
                          <span>Descubrir Modelos</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={cloudModelName}
                        onChange={(e) => setCloudModelName(e.target.value)}
                        placeholder="Ej: meta-llama/Llama-3-70b o gpt-4o"
                        className="w-full px-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />

                      {/* Lista de Modelos Descubiertos */}
                      {externalDiscoveredModels.length > 0 && (
                        <div className="mt-2 space-y-1 animate-in fade-in duration-150">
                          <label className="text-[10px] font-medium text-amber-300/90 block">
                            Modelos autorizados en tu API ({externalDiscoveredModels.length}):
                          </label>
                          <select
                            value={cloudModelName}
                            onChange={(e) => setCloudModelName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#0f1115] border border-amber-500/40 rounded-lg text-xs text-amber-200 font-mono focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Selecciona un modelo descubierto --</option>
                            {externalDiscoveredModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showCloudApiKey ? 'text' : 'password'}
                        value={cloudApiKey}
                        onChange={(e) => setCloudApiKey(e.target.value)}
                        placeholder={hasCustomApiKey && maskedCloudApiKey ? maskedCloudApiKey : 'Introduce tu API Key'}
                        className="w-full pl-8 pr-10 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCloudApiKey(!showCloudApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showCloudApiKey ? 'Ocultar' : 'Mostrar'}
                      >
                        {showCloudApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-mono mt-1 block">
                      <ShieldCheck size={11} className="inline mr-1" /> Cifrado con AES-256 GCM en Supabase PostgreSQL 17
                    </span>
                  </div>

                  {/* URL Base / Endpoint */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        URL Base / Endpoint de la API
                      </label>
                      {cloudProviderName.toLowerCase().includes('meta') && !cloudEndpoint && (
                        <button
                          type="button"
                          onClick={() => setCloudEndpoint('https://api.meta.ai/v1')}
                          className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                        >
                          Usar endpoint Meta (https://api.meta.ai/v1)
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={cloudEndpoint}
                      onChange={(e) => setCloudEndpoint(e.target.value)}
                      placeholder="Ej: https://api.meta.ai/v1 o tu pasarela compatible OpenAI"
                      className="w-full px-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                      Para OpenAI se utiliza automáticamente <code className="text-slate-300">api.openai.com</code>. Para <strong className="text-amber-300">Meta</strong>, pasarelas multimodelo (OpenRouter, Together AI) o proxies, ingresa el endpoint base (ej: <span className="text-sky-300 cursor-pointer underline hover:text-sky-200" onClick={() => setCloudEndpoint('https://api.meta.ai/v1')}>https://api.meta.ai/v1</span>).
                    </p>
                  </div>
                </div>
              )}

              {/* ===== APARTADO 3: GRATUITO INTEGRADO ===== */}
              {activeSection === 'DEFAULT' && (
                <div className="space-y-3.5 p-4 rounded-xl border border-emerald-500/30 bg-[#161a22]">
                  <div className="flex items-center justify-between border-b border-[#242934] pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Gratuito Integrado (Circuit Breaker)</h4>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Infraestructura gestionada por la plataforma sin costo ni configuración requerida.
                      </p>
                    </div>

                    <button
                      onClick={handleApplyDefaultAsActive}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={13} />
                      <span>Restablecer a Gratuito</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[#11141a] border border-[#262c38]">
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold block">Nivel 1</span>
                      <span className="text-xs font-bold text-slate-200">Gemini Flash</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#11141a] border border-[#262c38]">
                      <span className="text-[10px] font-mono text-amber-400 font-semibold block">Nivel 2</span>
                      <span className="text-xs font-bold text-slate-200">Groq Llama</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#11141a] border border-[#262c38]">
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold block">Nivel 3</span>
                      <span className="text-xs font-bold text-slate-200">OpenRouter</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#11141a] border border-[#262c38]">
                      <span className="text-[10px] font-mono text-purple-400 font-semibold block">Nivel 4</span>
                      <span className="text-xs font-bold text-slate-200">Regex Offline</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans">
                    Disponible de inmediato sin necesidad de ingresar API Keys ni iniciar servidores en tu máquina. Preserva el 100% del contexto del modelo UML.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* ===== PESTAÑA SANDBOX ===== */
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl border border-[#242934] bg-[#161a22] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} className="text-indigo-400" />
                    <span>Consola de Pruebas (Sandbox)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Verifica latencia y conectividad</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Prompt de Prueba
                  </label>
                  <textarea
                    rows={2}
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Escribe una orden de modelado UML..."
                    className="w-full px-3 py-1.5 bg-[#0f1115] border border-[#242934] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans resize-none"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTestPrompt('Crear clase Factura con id Long y total BigDecimal')}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#1f242e] text-slate-300 hover:text-white cursor-pointer"
                    >
                      Factura
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPrompt('Crear relación 1 a muchos entre Pedido y DetallePedido')}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#1f242e] text-slate-300 hover:text-white cursor-pointer"
                    >
                      Relación 1..*
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleTestInSandbox('CURRENT_CONFIG')}
                    disabled={isTesting}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Play size={12} className={isTesting ? 'animate-spin' : ''} />
                    <span>{isTesting ? 'Ejecutando...' : 'Probar Apartado Actual'}</span>
                  </button>

                  <button
                    onClick={() => handleTestInSandbox('ACTIVE_ENGINE')}
                    disabled={isTesting}
                    className="px-3 py-1.5 bg-[#202632] hover:bg-[#2b3344] text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-[#323c4e] disabled:opacity-50"
                  >
                    <Radio size={12} className="text-emerald-400" />
                    <span>Probar Motor Activo</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className="p-3.5 rounded-xl border border-[#242934] bg-[#11141a] space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-[#242934] pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${testResult.success ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold text-slate-200">
                        {testResult.success ? 'Prueba Completada' : 'Fallo en Inferencia'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        HTTP: <span className={testResult.httpStatusCode === 200 ? 'text-emerald-400' : 'text-rose-400'}>{testResult.httpStatusCode}</span>
                      </span>
                      <span className="text-slate-400">
                        Latencia: <span className="text-indigo-400 font-bold">{testResult.latencyMs} ms</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#0f1115] p-2 rounded-lg border border-[#202530]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Proveedor:</span>
                      <span className="text-slate-200 font-semibold">{testResult.providerUsed}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Modelo:</span>
                      <span className="text-slate-200 font-semibold">{testResult.modelUsed || 'default'}</span>
                    </div>
                  </div>

                  {testResult.rawResponse && (
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Salida Cruda
                      </span>
                      <pre className="p-2.5 bg-[#0a0c10] border border-[#202530] rounded-lg text-[11px] text-emerald-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {testResult.rawResponse}
                      </pre>
                    </div>
                  )}

                  {testResult.errorMessage && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                      {testResult.errorMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#242934] bg-[#0f1115]">
          <span className="text-[11px] text-slate-400 font-sans">
            Motor seleccionado: <strong className="text-indigo-300">{getActiveBadgeLabel()}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>{isSaving ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
