import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useUiStore } from '../../stores/uiStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Navbar */}
      <Header />

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden"
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

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
