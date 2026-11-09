import React from 'react';
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
  RefreshCw, 
  CloudOff, 
  AlertCircle, 
  CheckCircle2, 
  Cloud,
  Dumbbell,
  Play,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TFiveLogo } from '../common/TFiveLogo';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse
}) => {
  const { 
    activeWorkouts, 
    syncStatus, 
    pendingSyncCount, 
    syncNow,
    students,
    workoutTemplates
  } = useApp();

  const [isManualSyncing, setIsManualSyncing] = React.useState(false);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isManualSyncing || syncStatus === 'syncing') return;
    setIsManualSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'alunos', label: 'Alunos', icon: Users, badge: students.filter(s => s.status === 'active').length },
    { 
      id: 'treino', 
      label: 'Ao Vivo', 
      icon: Dumbbell, 
      badge: activeWorkouts.length > 0 ? activeWorkouts.length : null,
      isLive: activeWorkouts.length > 0 
    },
    { id: 'agenda', label: 'Agenda', icon: Calendar, badge: null },
    { id: 'modelos', label: 'Modelos', icon: Layers, badge: workoutTemplates.length > 0 ? workoutTemplates.length : null },
    { id: 'exercicios', label: 'Exercícios', icon: BookOpen, badge: null },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, badge: null },
    { id: 'propostas', label: 'Propostas', icon: FileText, badge: null },
    { id: 'configuracoes', label: 'Ajustes', icon: Settings, badge: null }
  ];

  return (
    <aside 
      className={`hidden md:flex flex-col bg-[#1F2937] border-r border-[#374151] transition-all duration-200 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-[70px]' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#374151] bg-[#111827]/40">
        <div 
          onClick={() => onSelectTab('dashboard')} 
          className="flex items-center gap-2 cursor-pointer overflow-hidden group"
          title="TFIVE PRO"
        >
          <TFiveLogo size={isCollapsed ? "sm" : "md"} theme="dark" />
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#4B5563] hover:text-white hover:bg-[#374151] transition-colors"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors group relative ${
                isActive
                  ? 'bg-[#374151] text-white shadow-sm'
                  : 'text-[#4B5563] hover:text-white hover:bg-[#283344]'
              }`}
            >
              <div className="relative shrink-0">
                <Icon className={`w-4 h-4 ${
                  isActive ? 'text-white' : item.isLive ? 'text-emerald-400' : 'text-[#4B5563] group-hover:text-white'
                }`} />
                
                {/* Live active workouts indicator */}
                {item.isLive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono-nums font-medium ${
                      isActive 
                        ? 'bg-[#1F2937] text-white' 
                        : item.isLive 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-[#374151] text-[#4B5563]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Collapsed dot for badges */}
              {isCollapsed && item.badge !== null && item.badge !== undefined && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Workout Quick Banner */}
      {activeWorkouts.length > 0 && (
        <div className="p-3 border-t border-[#374151] bg-[#111827]/40">
          <button
            onClick={() => onSelectTab('treino')}
            className={`w-full rounded-xl bg-emerald-950/60 border border-emerald-700/60 p-2.5 text-left hover:bg-emerald-950 transition-all ${
              isCollapsed ? 'flex justify-center p-2' : ''
            }`}
            title="Treino em andamento"
          >
            {isCollapsed ? (
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            ) : (
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-400 tracking-wider mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    EM ANDAMENTO
                  </span>
                  <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-white truncate">
                  {activeWorkouts.map(w => w.studentName.split(' ')[0]).join(' & ')}
                </div>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Footer Sync Status */}
      <div className="p-3 border-t border-[#374151] bg-[#111827]/40">
        {isCollapsed ? (
          <button
            onClick={handleQuickSync}
            className="w-full flex justify-center py-2 text-[#4B5563] hover:text-white rounded-lg hover:bg-[#374151] transition-all"
            title="Sincronizar dados"
          >
            {syncStatus === 'syncing' || isManualSyncing ? (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            ) : syncStatus === 'offline' ? (
              <CloudOff className="w-4 h-4 text-zinc-600" />
            ) : syncStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        ) : (
          <button
            onClick={handleQuickSync}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#283344] border border-[#374151] hover:bg-[#374151] transition-all text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {syncStatus === 'syncing' || isManualSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              ) : syncStatus === 'offline' ? (
                <CloudOff className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">
                  {syncStatus === 'syncing' || isManualSyncing
                    ? 'Sincronizando'
                    : syncStatus === 'offline'
                    ? 'Modo Offline'
                    : syncStatus === 'error'
                    ? 'Erro Sync'
                    : pendingSyncCount > 0
                    ? `${pendingSyncCount} pendentes`
                    : 'Sincronizado'}
                </p>
                <p className="text-[10px] text-[#4B5563] truncate">Nuvem Supabase</p>
              </div>
            </div>
            <RefreshCw className="w-3 h-3 text-[#4B5563] hover:text-white transition-all shrink-0" />
          </button>
        )}
      </div>
    </aside>
  );
};
