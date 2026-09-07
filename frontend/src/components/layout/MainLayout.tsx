import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Toolbar from '../toolbar/Toolbar';
import DiagramCanvas from '../canvas/DiagramCanvas';
import PropertiesPanel from '../panels/PropertiesPanel';
import CreateProjectModal from '../modals/CreateProjectModal';
import { OnboardingSpotlight } from '../onboarding/OnboardingSpotlight';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useDiagramStore } from '../../stores/diagramStore';
import { ReactFlowProvider } from '@xyflow/react';

const MainLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, propertiesPanelOpen, activeModal, openOnboarding } = useUiStore();
  const { user } = useAuthStore();
  const { project, saveDiagram } = useDiagramStore();

  // Defense-in-depth: SUPER_ADMIN is a governance role and must never see or use the drawing canvas
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Automatic onboarding trigger on first entrance for modeling roles (CU06)
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      const isCompleted = user.preferences?.onboardingCompleted === true;
      if (!isCompleted) {
        const timer = setTimeout(() => {
          openOnboarding();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [user, openOnboarding]);

  // Background Auto-Save based on user preferences interval
  useEffect(() => {
    const intervalSeconds = user?.preferences?.autoSaveInterval ?? 30;
    if (!project?.id || intervalSeconds <= 0) return;

    const intervalMs = intervalSeconds * 1000;
    const autoSaveTimer = setInterval(() => {
      saveDiagram().catch(() => {
        // Silent background sync
      });
    }, intervalMs);

    return () => clearInterval(autoSaveTimer);
  }, [project?.id, user?.preferences?.autoSaveInterval, saveDiagram]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 relative select-none">
        <Header />
        
        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Mobile Backdrop for Sidebar with Fade */}
          <div 
            className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ease-in-out ${
              sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={toggleSidebar}
          />

          {/* Responsive Smooth-Animated Sidebar Drawer */}
          <aside 
            className={`
              fixed md:relative inset-y-0 left-0 z-50 md:z-20 h-full shrink-0 flex flex-col
              transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
              ${sidebarOpen 
                ? 'w-64 translate-x-0 opacity-100' 
                : 'w-0 -translate-x-full md:translate-x-0 md:w-0 opacity-0 pointer-events-none'
              }
            `}
          >
            <div className="w-64 h-full shrink-0">
              <Sidebar />
            </div>
          </aside>
          
          <div className="flex flex-1 relative overflow-hidden">
            <Toolbar />
            <main className="flex-1 bg-transparent h-full relative overflow-hidden">
              <DiagramCanvas />
            </main>
          </div>

          {/* Properties Panel */}
          {propertiesPanelOpen && <PropertiesPanel />}
        </div>

        {activeModal === 'createProject' && <CreateProjectModal />}

        {/* Interactive Guided Tour (CU06) */}
        <OnboardingSpotlight />
      </div>
    </ReactFlowProvider>
  );
};

export default MainLayout;
