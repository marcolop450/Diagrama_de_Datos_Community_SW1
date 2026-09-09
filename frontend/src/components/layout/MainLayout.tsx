import React, { useEffect } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
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
import toast from 'react-hot-toast';

const isUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const MainLayout: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar, propertiesPanelOpen, activeModal, openOnboarding } = useUiStore();
  const { user } = useAuthStore();
  const { project, loadDiagram, saveDiagram, resetDiagram } = useDiagramStore();

  // Remember last opened project or restore if entering /editor
  useEffect(() => {
    if (id) {
      if (isUUID(id)) {
        if (project?.id !== id) {
          loadDiagram(id).catch((err: any) => {
            const errMsg = err?.response?.data?.message || 'El proyecto no existe o fue eliminado';
            toast.error(errMsg);
            resetDiagram();
            navigate('/editor', { replace: true });
          });
        }
      } else {
        resetDiagram();
        navigate('/editor', { replace: true });
      }
    } else {
      // Direct access to /editor without project ID: check last opened project
      const lastProjectId = localStorage.getItem('case_last_project_id');
      if (lastProjectId && isUUID(lastProjectId)) {
        navigate(`/editor/${lastProjectId}`, { replace: true });
      } else if (project !== null) {
        // If no last project is recorded, ensure canvas stays cleanly empty
        resetDiagram();
      }
    }
  }, [id, project?.id, loadDiagram, resetDiagram, navigate]);

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

  // Background Auto-Save based on user preferences (strictly only when autoSaveEnabled is true and active UUID project)
  useEffect(() => {
    const isAutoSaveActive = user?.preferences?.autoSaveEnabled !== false;
    const intervalSeconds = user?.preferences?.autoSaveInterval ?? 30;
    
    if (!isAutoSaveActive || !project?.id || !isUUID(project.id) || intervalSeconds <= 0) {
      return;
    }

    const intervalMs = intervalSeconds * 1000;
    const autoSaveTimer = setInterval(() => {
      saveDiagram().catch(() => {
        // Silent background sync
      });
    }, intervalMs);

    return () => clearInterval(autoSaveTimer);
  }, [project?.id, user?.preferences?.autoSaveEnabled, user?.preferences?.autoSaveInterval, saveDiagram]);

  return (
    <ReactFlowProvider>
      <div 
        className="flex flex-col h-screen overflow-hidden relative select-none transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}
      >
        <Header />
        
        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Mobile Backdrop for Sidebar with Fade - strictly below 56px Header */}
          <div 
            className={`fixed top-14 bottom-0 inset-x-0 bg-slate-950/70 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 ease-in-out ${
              sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={toggleSidebar}
          />

          {/* Responsive Smooth-Animated Sidebar Drawer (positioned strictly below navbar) */}
          <aside 
            className={`
              fixed top-14 bottom-0 left-0 z-40 md:relative md:top-0 md:h-full md:z-20 shrink-0 flex flex-col
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
