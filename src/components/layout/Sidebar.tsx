import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Layers,
  Calendar,
  BookOpen,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  FileText,
  BrainCircuit
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TFiveLogo } from '../common/TFiveLogo';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | null;
  isLive?: boolean;
};

const TRAINING_ITEMS: NavItem[] = [
  { id: 'treino', label: 'Ao Vivo', icon: Dumbbell },
  { id: 'modelos', label: 'Modelos de treino', icon: Layers },
  { id: 'exercicios', label: 'Banco de exercícios', icon: BookOpen }
];

const MANAGEMENT_ITEMS: NavItem[] = [
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'propostas', label: 'Propostas', icon: FileText }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse
}) => {
  const { activeWorkouts, students, workoutTemplates } = useApp();

  const primaryItems: NavItem[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'alunos', label: 'Alunos', icon: Users, badge: students.filter(student => student.status === 'active').length },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'intelligence', label: 'TFIVE IA', icon: BrainCircuit }
  ];

  const trainingItems = TRAINING_ITEMS.map(item => ({
    ...item,
    badge: item.id === 'treino'
      ? (activeWorkouts.length > 0 ? activeWorkouts.length : null)
      : item.id === 'modelos'
        ? (workoutTemplates.length > 0 ? workoutTemplates.length : null)
        : null,
    isLive: item.id === 'treino' && activeWorkouts.length > 0
  }));

  const isTrainingActive = trainingItems.some(item => item.id === currentTab);
  const isManagementActive = MANAGEMENT_ITEMS.some(item => item.id === currentTab);
  const [trainingOpen, setTrainingOpen] = useState(isTrainingActive);
  const [managementOpen, setManagementOpen] = useState(isManagementActive);

  useEffect(() => {
    if (isTrainingActive) setTrainingOpen(true);
    if (isManagementActive) setManagementOpen(true);
  }, [isTrainingActive, isManagementActive]);

  const renderItem = (item: NavItem, nested = false) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectTab(item.id)}
        title={isCollapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-3 ${nested ? 'pl-10 pr-3' : 'px-3'} py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors group relative ${
          isActive
            ? 'bg-[#27272A] text-white shadow-sm'
            : 'text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F5]'
        }`}
      >
        <span className="relative shrink-0">
          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isLive ? 'text-emerald-500' : 'text-[#4B5563]'}`} />
          {item.isLive && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </span>
        {!isCollapsed && (
          <span className="flex-1 flex items-center justify-between min-w-0">
            <span className="truncate">{item.label}</span>
            {item.badge !== null && item.badge !== undefined && (
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono-nums font-medium ${
                isActive ? 'bg-white/15 text-white' : 'bg-[#F4F4F5] text-[#52525B]'
              }`}>
                {item.badge}
              </span>
            )}
          </span>
        )}
        {isCollapsed && item.badge !== null && item.badge !== undefined && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>
    );
  };

  const renderGroup = (
    id: string,
    label: string,
    icon: React.ElementType,
    items: NavItem[],
    isActive: boolean,
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const Icon = icon;

    return (
      <div key={id} className="space-y-1">
        <button
          type="button"
          onClick={() => {
            if (isCollapsed) {
              onToggleCollapse();
              setIsOpen(true);
            } else {
              setIsOpen(open => !open);
            }
          }}
          title={isCollapsed ? label : undefined}
          aria-expanded={!isCollapsed && isOpen}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
            isActive ? 'text-[#18181B] bg-[#F4F4F5]' : 'text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F5]'
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </>
          )}
          {isCollapsed && isActive && <span className="absolute left-1 w-1 h-5 rounded-full bg-[#27272A]" />}
        </button>
        {!isCollapsed && isOpen && (
          <div className="space-y-1">
            {items.map(item => renderItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col bg-white border-r border-[#E4E4E7] transition-all duration-200 select-none z-30 shrink-0 ${
      isCollapsed ? 'w-[70px]' : 'w-60'
    }`}>
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E4E4E7] bg-white">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2 cursor-pointer overflow-hidden"
          title="TFIVE PRO - Início"
        >
          <TFiveLogo size={isCollapsed ? 'sm' : 'md'} theme="dark" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {primaryItems.map(item => renderItem(item))}
        {renderGroup('training', 'Treinamento', Layers, trainingItems, isTrainingActive, trainingOpen, setTrainingOpen)}
        {renderGroup('management', 'Gestão', DollarSign, MANAGEMENT_ITEMS, isManagementActive, managementOpen, setManagementOpen)}
      </nav>

      <div className="p-3 border-t border-[#E4E4E7]">
        {renderItem({ id: 'configuracoes', label: 'Ajustes', icon: Settings })}
      </div>
    </aside>
  );
};
