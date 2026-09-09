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
    <div 
      className="flex flex-col h-screen overflow-hidden select-none transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}
    >
      {/* Top Navbar */}
      <Header />

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar with Fade - strictly below 56px navbar */}
        <div 
          className={`fixed top-14 bottom-0 inset-x-0 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 ease-in-out ${
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ backgroundColor: 'rgba(18, 19, 22, 0.8)' }}
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

        {/* Page Content Viewport with Smooth Page-Enter Animation */}
        <main 
          className="flex-1 overflow-y-auto min-w-0 transition-all duration-300 ease-in-out"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
          <div className="animate-page-enter min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
