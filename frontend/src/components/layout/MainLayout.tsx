import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Toolbar from '../toolbar/Toolbar';
import DiagramCanvas from '../canvas/DiagramCanvas';
import PropertiesPanel from '../panels/PropertiesPanel';
import CreateProjectModal from '../modals/CreateProjectModal';
import { useUiStore } from '../../stores/uiStore';

const MainLayout: React.FC = () => {
  const { sidebarOpen, propertiesPanelOpen, activeModal } = useUiStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        
        <div className="flex flex-1 relative">
          <Toolbar />
          <div className="flex-1 bg-gray-50 h-full relative">
            <DiagramCanvas />
          </div>
        </div>

        {propertiesPanelOpen && <PropertiesPanel />}
      </div>

      {activeModal === 'createProject' && <CreateProjectModal />}
    </div>
  );
};

export default MainLayout;
