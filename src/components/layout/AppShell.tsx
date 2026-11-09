import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewStudent?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewStudent,
  children
}) => {
  // Sidebar collapsed state persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tfive_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 768 && window.innerWidth < 1100;
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('tfive_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] flex flex-row overflow-hidden font-sans selection:bg-[#374151] selection:text-white">
      
      {/* Desktop / Tablet Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Flow */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Topbar Header */}
        <Topbar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          onOpenNewStudent={onOpenNewStudent}
        />

        {/* Scrollable Main Area (Tablet-first responsive, spacious, clean) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 lg:p-8 pb-24 md:pb-8 bg-[#F8F9FA]">
          <div className="w-full max-w-7xl mx-auto min-w-0">
            {children}
          </div>
        </main>

      </div>

      {/* Mobile Bottom Navigation (< 768px) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
      />

    </div>
  );
};
