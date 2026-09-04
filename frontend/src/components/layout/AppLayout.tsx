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
        {/* Mobile Backdrop for Sidebar with Fade */}
        <div 
          className={`fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ease-in-out ${
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

        {/* Page Content Viewport with Smooth Page-Enter Animation */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-slate-950 transition-all duration-300 ease-in-out">
          <div className="animate-page-enter min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
