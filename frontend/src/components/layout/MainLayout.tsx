import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Toolbar from '../toolbar/Toolbar';
import DiagramCanvas from '../canvas/DiagramCanvas';
import PropertiesPanel from '../panels/PropertiesPanel';
import CreateProjectModal from '../modals/CreateProjectModal';
import { AuroraBackground } from '../common/AuroraBackground';
import { useUiStore } from '../../stores/uiStore';
import { ReactFlowProvider } from '@xyflow/react';

const MainLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, propertiesPanelOpen, activeModal } = useUiStore();

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[#070A12] text-slate-100 relative select-none">
        {/* Dynamic Canvas Aurora Background */}
        <AuroraBackground opacity={0.45} />

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
