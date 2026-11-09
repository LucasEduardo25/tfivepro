import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  Settings,
  MoreHorizontal,
  Layers,
  BookOpen,
  DollarSign,
  FileText,
  X,
  BrainCircuit
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

type MobileNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const MORE_GROUPS: { title: string; items: MobileNavItem[] }[] = [
  {
    title: 'Treinamento',
    items: [
      { id: 'modelos', label: 'Modelos de treino', icon: Layers },
      { id: 'exercicios', label: 'Banco de exercícios', icon: BookOpen }
    ]
  },
  {
    title: 'Gestão',
    items: [
      { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
      { id: 'propostas', label: 'Propostas', icon: FileText }
    ]
  },
  {
    title: 'Conta',
    items: [
      { id: 'configuracoes', label: 'Ajustes', icon: Settings }
    ]
  }
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab
}) => {
  const { activeWorkouts } = useApp();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [currentTab]);

  const mainNavItems: (MobileNavItem & { isLive?: boolean })[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'treino', label: 'Ao Vivo', icon: Dumbbell, isLive: activeWorkouts.length > 0 },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'intelligence', label: 'IA', icon: BrainCircuit }
  ];

  const moreTabIds = MORE_GROUPS.flatMap(group => group.items.map(item => item.id));
  const isMoreActive = moreTabIds.includes(currentTab);

  const handleSelectTab = (id: string) => {
    onSelectTab(id);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      <div
        className={`md:hidden fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300 ${
          isMoreMenuOpen ? 'visible' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!isMoreMenuOpen}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMoreMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMoreMenuOpen(false)}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mais opções"
          className={`relative bg-white rounded-t-3xl border-t border-[#E5E7EB] shadow-2xl transition-transform duration-300 flex flex-col max-h-[80vh] ${
            isMoreMenuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          <div className="w-full flex justify-center py-3 shrink-0">
            <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full" />
          </div>

          <div className="px-5 pb-3 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-lg text-[#1F2937] tracking-tight">Mais opções</h3>
              <p className="text-xs text-[#71717A]">Funções organizadas por área</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(false)}
              aria-label="Fechar menu"
              className="p-2 rounded-xl text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-5 overflow-y-auto min-h-0">
            {MORE_GROUPS.map(group => (
              <section key={group.title} aria-label={group.title}>
                <h4 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">{group.title}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                          isActive
                            ? 'bg-[#1F2937] text-white'
                            : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#4B5563] hover:border-[#D1D5DB] hover:text-[#1F2937]'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-semibold leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] px-1 py-1 flex items-center justify-around select-none shadow-sm"
        style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))' }}
      >
        {mainNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors relative min-w-[44px] min-h-[44px] flex-1 max-w-[68px] ${
                isActive ? 'text-[#1F2937] bg-[#F3F4F6]' : 'text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              <span className="relative">
                <Icon className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                )}
              </span>
              <span className={`text-[9px] font-medium mt-0.5 tracking-tight truncate w-full text-center ${isActive ? 'font-bold text-[#1F2937]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(true)}
          aria-expanded={isMoreMenuOpen}
          aria-label="Abrir mais opções"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors relative min-w-[44px] min-h-[44px] flex-1 max-w-[68px] ${
            isMoreActive || isMoreMenuOpen ? 'text-[#1F2937] bg-[#F3F4F6]' : 'text-[#4B5563] hover:text-[#1F2937]'
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
