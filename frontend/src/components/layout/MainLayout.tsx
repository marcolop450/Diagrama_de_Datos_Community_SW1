import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Toolbar from '../toolbar/Toolbar';
import DiagramCanvas from '../canvas/DiagramCanvas';
import PropertiesPanel from '../panels/PropertiesPanel';
import CreateProjectModal from '../modals/CreateProjectModal';
import { useUiStore } from '../../stores/uiStore';
import { ReactFlowProvider } from '@xyflow/react';

const MainLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, propertiesPanelOpen, activeModal } = useUiStore();

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[#0B0F19] text-slate-100 relative select-none">
        {/* Animated ambient aurora lights in background */}
        <div className="absolute top-10 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] animate-aurora-1 pointer-events-none z-0" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] animate-aurora-2 pointer-events-none z-0" />

        <Header />
        
        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Mobile Backdrop for Sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden"
              onClick={toggleSidebar}
            />
          )}

          {/* Responsive Sidebar Drawer */}
          <div className={`
            fixed md:relative inset-y-0 left-0 z-50 md:z-20 h-full flex transition-all duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
          `}>
            <Sidebar />
          </div>
          
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
      </div>
    </ReactFlowProvider>
  );
};

export default MainLayout;
