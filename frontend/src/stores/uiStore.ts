import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  activeModal: string | null;
  activeTool: string;
  
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setActiveTool: (toolId: string) => void;
  setPropertiesPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  propertiesPanelOpen: false,
  activeModal: null,
  activeTool: 'pointer',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setActiveTool: (toolId) => set({ activeTool: toolId }),
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
}));
