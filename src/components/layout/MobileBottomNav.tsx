import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Calendar, 
  Dumbbell, 
  Settings,
  MoreHorizontal,
  BookOpen,
  DollarSign,
  FileText,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab
}) => {
  const { activeWorkouts } = useApp();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Fecha o menu se a rota mudar (caso seja alterada por outro meio)
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [currentTab]);

  const mainNavItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { 
      id: 'treino', 
      label: 'Ao Vivo', 
      icon: Dumbbell,
      isLive: activeWorkouts.length > 0 
    },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'modelos', label: 'Modelos', icon: Layers },
  ];

  const moreNavItems = [
    { id: 'exercicios', label: 'Exercícios', icon: BookOpen },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'propostas', label: 'Propostas', icon: FileText },
    { id: 'configuracoes', label: 'Ajustes', icon: Settings }
  ];

  const isMoreActive = moreNavItems.some(item => item.id === currentTab);

  const handleSelectTab = (id: string) => {
    onSelectTab(id);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Menu "Mais" (Bottom Sheet) */}
      <div 
        className={`md:hidden fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300 ${
          isMoreMenuOpen ? 'visible' : 'invisible pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMoreMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMoreMenuOpen(false)}
        />
        
        {/* Sheet Content */}
        <div 
          className={`relative bg-white rounded-t-3xl border-t border-[#E5E7EB] shadow-2xl transition-transform duration-300 flex flex-col max-h-[80vh] ${
            isMoreMenuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          {/* Handle */}
          <div className="w-full flex justify-center py-3 shrink-0">
            <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full" />
          </div>

          <div className="px-5 pb-2 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-lg text-[#1F2937] tracking-tight">Mais opções</h3>
            <button 
              onClick={() => setIsMoreMenuOpen(false)}
              className="p-2 rounded-xl text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-4 gap-2 overflow-y-auto min-h-0">
            {moreNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    isActive 
                      ? 'bg-[#1F2937] text-white shadow-md scale-100' 
                      : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#4B5563] hover:border-[#D1D5DB] hover:text-[#1F2937] active:scale-95'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isActive ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
                  <span className={`text-[10px] sm:text-xs text-center tracking-tight truncate w-full ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navegação Inferior */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] px-2 py-1 flex items-center justify-around select-none shadow-sm pb-safe"
        style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))' }}
      >
        {mainNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors relative min-w-[44px] min-h-[44px] flex-1 max-w-[64px] ${
                isActive 
                  ? 'text-[#1F2937] bg-[#F3F4F6]' 
                  : 'text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                )}
              </div>
              <span className={`text-[9px] font-medium mt-0.5 tracking-tight truncate w-full text-center ${isActive ? 'font-bold text-[#1F2937]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botão "Mais" */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors relative min-w-[44px] min-h-[44px] flex-1 max-w-[64px] ${
            isMoreActive || isMoreMenuOpen
              ? 'text-[#1F2937] bg-[#F3F4F6]' 
              : 'text-[#4B5563] hover:text-[#1F2937]'
          }`}
        >
          <MoreHorizontal className={`w-[22px] h-[22px] ${isMoreActive || isMoreMenuOpen ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] font-medium mt-0.5 tracking-tight truncate w-full text-center ${isMoreActive || isMoreMenuOpen ? 'font-bold text-[#1F2937]' : ''}`}>
            Mais
          </span>
        </button>
      </nav>
    </>
  );
};
