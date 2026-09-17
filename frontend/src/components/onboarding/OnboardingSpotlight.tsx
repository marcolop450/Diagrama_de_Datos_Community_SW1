import React, { useEffect, useState, useCallback } from 'react';
import { 
  Clock, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  Box, 
  Edit3, 
  GitFork, 
  Code2, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore, UserPreferences } from '../../stores/authStore';
import { api } from '../../services/api';
import { OnboardingStep } from '../../types/onboarding';
import toast from 'react-hot-toast';

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido al Entorno CASE UML',
    subtitle: 'Lienzo interactivo de ingeniería de software',
    description: 'Modela diagramas de clases UML completos con normalización relacional (1NF a 3NF), generación automatizada de Backend Spring Boot (Java 21) y esquemas DDL SQL para PostgreSQL 17.',
    placement: 'center',
    icon: 'Layers',
    badge: 'Paso 1 de 7 · Introducción',
    actionHint: 'Navega con las flechas del teclado o los botones inferiores'
  },
  {
    id: 'toolbar',
    title: 'Barra de Herramientas UML',
    subtitle: 'Entidades, Interfaces y Clases Abstractas',
    description: 'Haz clic en cualquier clase para armar la herramienta, y luego haz clic en el lienzo para colocarla rápidamente con alineación magnética.',
    targetSelector: '[data-tour="toolbar-classes"]',
    placement: 'right',
    icon: 'Box',
    badge: 'Paso 2 de 7 · Creación',
    actionHint: 'Herramientas de selección y colocación rápida'
  },
  {
    id: 'canvas-nodes',
    title: 'Lienzo y Edición de Nodos',
    subtitle: 'Atributos, tipos y visibilidad UML',
    description: 'Arrastra y reorganiza clases con snap to grid. Haz clic en una clase para configurar atributos con modificadores (+, -, #, ~), tipos Java/SQL, clave primaria {PK} y operaciones.',
    placement: 'center',
    icon: 'Edit3',
    badge: 'Paso 3 de 7 · Modelado',
    actionHint: 'Soporta zoom con rueda del ratón y paneo arrastrando el fondo'
  },
  {
    id: 'relationships',
    title: 'Conexión de Relaciones y Multiplicidades',
    subtitle: 'Cardinalidades OMG UML 2.5 a elección',
    description: 'Conecta dos clases arrastrando desde los puntos de anclaje (handles). Podrás definir asociaciones, herencias, agregaciones o composiciones con preajustes de cardinalidad (1..1, 1..*, *..*).',
    placement: 'center',
    icon: 'GitFork',
    badge: 'Paso 4 de 7 · Relaciones',
    actionHint: 'Relaciones tipadas y validadas contra el metamodelo'
  },
  {
    id: 'ai-tools',
    title: 'Modelado Asistido por Inteligencia Artificial',
    subtitle: 'Dictado por Voz y Digitalización de Pizarras',
    description: 'Acelera el diseño arquitectónico utilizando entrada por voz (PLN) para modelar clases sin teclear, o digitaliza fotografías de bocetos en pizarra física mediante visión artificial.',
    targetSelector: '[data-tour="toolbar-ai-tools"]',
    placement: 'right',
    icon: 'Sparkles',
    badge: 'Paso 5 de 7 · Inteligencia Artificial',
    actionHint: 'Prueba el micrófono o el digitalizador en la barra lateral'
  },
  {
    id: 'cloud-save',
    title: 'Guardado y Sincronización en la Nube',
    subtitle: 'Persistencia continua en PostgreSQL 17',
    description: 'Guarda tus cambios manualmente con el botón superior o confía en el autoguardado periódico configurado en tus Preferencias. Cada cambio queda registrado y versionado.',
    targetSelector: '[data-tour="header-save-button"]',
    placement: 'bottom',
    icon: 'CheckCircle2',
    badge: 'Paso 6 de 7 · Sincronización',
    actionHint: 'Puedes ajustar la frecuencia de autoguardado en Configuración'
  },
  {
    id: 'case-tools',
    title: 'Herramientas CASE: Backend, SQL y Trazabilidad',
    subtitle: 'Spring Boot 4 Capas, PostgreSQL 17 y Auditoría',
    description: 'En la barra lateral dispones de los aceleradores CASE: genera automáticamente el código Java 21 Backend Spring Boot en 4 capas (Controller, Service, Repository, Entity), exporta el script DDL SQL listo para PostgreSQL 17 y consulta la trazabilidad.',
    targetSelector: '[data-tour="toolbar-case-tools"]',
    placement: 'right',
    icon: 'Code2',
    badge: 'Paso 7 de 7 · Ingeniería CASE',
    actionHint: 'Accede a Historial, Backend Spring Boot y Script PostgreSQL 17'
  }
];

export const OnboardingSpotlight: React.FC = () => {
  const { isOnboardingOpen, onboardingStep, closeOnboarding, nextOnboardingStep, prevOnboardingStep } = useUiStore();
  const { user, updateUserProfile } = useAuthStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = STEPS[onboardingStep] || STEPS[0];
  const isLastStep = onboardingStep === STEPS.length - 1;

  // Measure target element position
  const updateTargetRect = useCallback(() => {
    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep.targetSelector]);

  useEffect(() => {
    if (!isOnboardingOpen) return;
    updateTargetRect();

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOnboardingOpen, onboardingStep, updateTargetRect]);

  const persistCompleted = async () => {
    if (!user) return;
    const updatedPreferences: UserPreferences = {
      theme: 'dark',
      grid: user.preferences?.grid ?? true,
      snapToGrid: user.preferences?.snapToGrid ?? true,
      autoSaveInterval: user.preferences?.autoSaveInterval ?? 30,
      defaultZoom: user.preferences?.defaultZoom ?? 1,
      ...(user.preferences || {}),
      onboardingCompleted: true
    };

    try {
      await api.completeOnboarding();
      updateUserProfile({ preferences: updatedPreferences });
    } catch {
      // Fallback local update
      updateUserProfile({ preferences: updatedPreferences });
    }
  };

  const handleFinish = async () => {
    await persistCompleted();
    closeOnboarding();
    toast.success('¡Tutorial completado! Puedes volver a abrirlo con "Guía Rápida".');
  };

  const handleSkip = async () => {
    await persistCompleted();
    closeOnboarding();
    toast('Tutorial omitido. Recuerda que puedes consultarlo desde "Guía Rápida".');
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOnboardingOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (isLastStep) {
          handleFinish();
        } else {
          nextOnboardingStep();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevOnboardingStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOnboardingOpen, onboardingStep, isLastStep, nextOnboardingStep, prevOnboardingStep]);

  if (!isOnboardingOpen) return null;

  // Render step icon
  const renderIcon = () => {
    const iconClass = "text-indigo-400 shrink-0";
    const size = 22;
    switch (currentStep.icon) {
      case 'Layers': return <Layers size={size} className={iconClass} />;
      case 'Box': return <Box size={size} className={iconClass} />;
      case 'Edit3': return <Edit3 size={size} className={iconClass} />;
      case 'GitFork': return <GitFork size={size} className={iconClass} />;
      case 'Code2': return <Code2 size={size} className={iconClass} />;
      case 'Sparkles': return <Sparkles size={size} className={iconClass} />;
      case 'CheckCircle2': return <CheckCircle2 size={size} className={iconClass} />;
      default: return <HelpCircle size={size} className={iconClass} />;
    }
  };

  // Compute card style based on targetRect & placement
  const getCardPositionStyle = (): React.CSSProperties => {
    if (!targetRect || currentStep.placement === 'center' || window.innerWidth < 768) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      };
    }

    const margin = 16;
    let top = targetRect.top;
    let left = targetRect.left;

    if (currentStep.placement === 'right') {
      left = Math.min(window.innerWidth - 440, targetRect.right + margin);
      top = Math.max(20, Math.min(window.innerHeight - 380, targetRect.top));
    } else if (currentStep.placement === 'bottom') {
      top = Math.min(window.innerHeight - 380, targetRect.bottom + margin);
      left = Math.max(20, Math.min(window.innerWidth - 440, targetRect.right - 420));
    } else if (currentStep.placement === 'left') {
      left = Math.max(20, targetRect.left - 420 - margin);
      top = Math.max(20, Math.min(window.innerHeight - 380, targetRect.top));
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed'
    };
  };

  return (
    <div className="fixed inset-0 z-50 select-none pointer-events-auto">
      {/* SVG Mask Backdrop: punches a 100% crystal-clear hole with ZERO blur or dimming over the target */}
      {targetRect && currentStep.placement !== 'center' ? (
        <svg 
          className="fixed inset-0 w-full h-full pointer-events-auto cursor-default z-40"
          onClick={handleSkip}
        >
          <defs>
            <mask id="spotlight-hole-mask">
              {/* White reveals the dark background */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black punches an exact transparent hole, leaving the element 100% crisp */}
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 17, 21, 0.85)"
            mask="url(#spotlight-hole-mask)"
          />
        </svg>
      ) : (
        /* Full dark backdrop when center step (no blur so canvas is focused but not distorted) */
        <div 
          className="fixed inset-0 bg-[#0f1115]/85 transition-opacity duration-300 z-40 cursor-default"
          onClick={handleSkip}
        />
      )}

      {/* Spotlight cutout highlight border if target exists */}
      {targetRect && currentStep.placement !== 'center' && (
        <div
          className="fixed rounded-xl border-2 border-indigo-500 ring-4 ring-indigo-500/25 shadow-[0_0_35px_rgba(92,104,226,0.45)] pointer-events-none transition-all duration-300 ease-out z-50 animate-pulse"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Floating Tour Dialog Card */}
      <div 
        style={getCardPositionStyle()}
        className="z-50 w-[92vw] max-w-md bg-[#14171d]/95 border border-[#242934] rounded-2xl shadow-2xl p-5 md:p-6 flex flex-col gap-4 transition-all duration-300 ease-out backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header: Step pill + Timer badge + Close button */}
        <div className="flex items-center justify-between gap-2 border-b border-[#242934] pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-950/70 border border-indigo-800/50 text-indigo-300">
              {currentStep.badge}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-[#181c24] border border-[#242934]">
              <Clock size={11} className="text-indigo-400" />
              &lt; 2 min
            </span>
          </div>

          <button
            onClick={handleSkip}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#181c24] transition-colors cursor-pointer"
            title="Cerrar tutorial (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#181c24] rounded-full h-1.5 overflow-hidden border border-[#242934]">
          <div 
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((onboardingStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="flex items-start gap-3.5 pt-1">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shrink-0">
            {renderIcon()}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-base font-display font-bold text-slate-100 leading-tight">
              {currentStep.title}
            </h3>
            <p className="text-xs font-sans font-semibold text-indigo-400">
              {currentStep.subtitle}
            </p>
            <p className="text-xs font-sans text-slate-300 leading-relaxed pt-1">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Action Hint */}
        {currentStep.actionHint && (
          <div className="p-2 rounded-xl bg-[#0f1115] border border-[#242934] text-[11px] text-slate-400 flex items-center gap-1.5 font-sans">
            <Sparkles size={12} className="text-indigo-400 shrink-0" />
            <span className="truncate">{currentStep.actionHint}</span>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#242934]">
          <button
            onClick={handleSkip}
            className="text-xs font-sans text-slate-400 hover:text-slate-200 hover:underline transition-colors cursor-pointer px-1 py-1"
          >
            Saltar Tutorial
          </button>

          <div className="flex items-center gap-2">
            {onboardingStep > 0 && (
              <button
                onClick={prevOnboardingStep}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold text-slate-300 hover:text-white bg-[#181c24] hover:bg-[#242934] border border-[#242934] transition-all cursor-pointer active:scale-95"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
            )}

            {!isLastStep ? (
              <button
                onClick={nextOnboardingStep}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-sm shadow-indigo-500/20 active:scale-95"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-sans font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-500/25 active:scale-95"
              >
                <CheckCircle2 size={14} />
                ¡Comenzar a Modelar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
