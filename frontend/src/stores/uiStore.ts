import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  activeModal: string | null;
  activeTool: string;
  isOnboardingOpen: boolean;
  onboardingStep: number;
  
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setActiveTool: (toolId: string) => void;
  setPropertiesPanelOpen: (open: boolean) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  setOnboardingStep: (step: number) => void;
  nextOnboardingStep: () => void;
  prevOnboardingStep: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  propertiesPanelOpen: false,
  activeModal: null,
  activeTool: 'pointer',
  isOnboardingOpen: false,
  onboardingStep: 0,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setActiveTool: (toolId) => set({ activeTool: toolId }),
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
  openOnboarding: () => set({ isOnboardingOpen: true, onboardingStep: 0 }),
  closeOnboarding: () => set({ isOnboardingOpen: false }),
  setOnboardingStep: (step: number) => set({ onboardingStep: step }),
  nextOnboardingStep: () => set((state) => ({ onboardingStep: state.onboardingStep + 1 })),
  prevOnboardingStep: () => set((state) => ({ onboardingStep: Math.max(0, state.onboardingStep - 1) })),
}));
