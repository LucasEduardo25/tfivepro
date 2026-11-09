import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  DollarSign, 
  Settings, 
  Flame, 
  Play,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileCheck,
  CalendarCheck,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TFiveLogo } from '../common/TFiveLogo';
import { authService } from '../../services/authService';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export type TabType = 
  | 'hoje'
  | 'dashboard'
  | 'alunos'
  | 'propostas'
  | 'treino'
  | 'modelos'
  | 'exercicios'
  | 'agenda'
  | 'financeiro'
  | 'configuracoes';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { 
    activeWorkouts, 
    trainerProfile, 
    syncStatus, 
    pendingSyncCount, 
    syncNow 
  } = useApp();

  const [isManualSyncing, setIsManualSyncing] = useState(false);

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
    { id: 'hoje', label: 'Hoje', icon: CalendarCheck },
    { id: 'dashboard', label: 'Dashboard', icon: Flame },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'propostas', label: 'Propostas', icon: FileCheck },
    { id: 'modelos', label: 'Modelos', icon: Layers },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'exercicios', label: 'Exercícios', icon: BookOpen },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  const hasActiveWorkouts = activeWorkouts.length > 0;

  const renderSyncBadge = () => {
    const isSyncActive = syncStatus === 'syncing' || isManualSyncing;

    if (isSyncActive) {
      return (
        <button
          onClick={handleQuickSync}
          title="Sincronizando dados com o Supabase..."
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-tight hover:bg-amber-500/20 transition-all select-none cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="hidden sm:inline">Sincronizando</span>
        </button>
      );
    }

    if (syncStatus === 'offline') {
      return (
        <button
          onClick={() => onSelectTab('configuracoes')}
          title="Dispositivo offline. Conexão com a nuvem necessária para sincronização com o Supabase."
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-bold tracking-tight hover:bg-gray-200 transition-all select-none cursor-pointer"
        >
          <CloudOff className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Offline</span>
        </button>
      );
    }

    if (syncStatus === 'error') {
      return (
        <button
          onClick={handleQuickSync}
          title="Erro na última sincronização com o Supabase. Clique para tentar novamente."
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold tracking-tight hover:bg-rose-100 transition-all select-none cursor-pointer"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Erro Sync</span>
        </button>
      );
    }

    if (pendingSyncCount > 0) {
      return (
        <button
          onClick={handleQuickSync}
          title={`${pendingSyncCount} alterações pendentes para envio ao Supabase. Clique para sincronizar agora.`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-tight hover:bg-amber-100 transition-all select-none cursor-pointer"
        >
          <Cloud className="w-3.5 h-3.5 shrink-0" />
          <span>{pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleQuickSync}
        title="Supabase em Tempo Real (Tablet ↔ Supabase ↔ Celular). Clique para sincronizar."
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold tracking-tight hover:bg-emerald-100 transition-all select-none group cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="hidden sm:inline text-emerald-900">Supabase Nuvem</span>
      </button>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Top Header with Sleek Theme */}
      <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-[#E5E7EB] backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Title Zone with Official TFIVE PRO Identity */}
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="p-2 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] group-hover:border-[#D1D5DB] shadow-xs transition-all">
              <TFiveLogo variant="badge" size="sm" showProBadge={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#1F2937]">TFIVE <span className="text-[#4B5563] font-normal">PRO</span></span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] border border-[#E5E7EB] text-[#4B5563] uppercase tracking-wider">v5.3</span>
              </div>
              <p className="hidden md:block text-[11px] text-[#4B5563] font-medium tracking-tight">Performance e Gestão</p>
            </div>
          </div>

          {/* Navigation Links Zone */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#F3F4F6] p-1.5 rounded-2xl border border-[#E5E7EB] shadow-xs">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#374151] text-white shadow-xs' 
                      : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Zone / Multi-device Sync + Active Workout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA In-App Install Prompt Trigger */}
            <PWAInstallButton variant="navbar" />

            {/* Real-Time Sync Indicator */}
            {renderSyncBadge()}

            {hasActiveWorkouts ? (
              <button
                onClick={() => onSelectTab('treino')}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] border border-[#374151] text-white text-xs font-semibold shadow-xs transition-all tracking-wide cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Play className="w-4 h-4 fill-white shrink-0" />
                <span className="whitespace-nowrap">
                  {activeWorkouts.length === 2 
                    ? `Modo Duplo (${activeWorkouts[0].studentName.split(' ')[0]} & ${activeWorkouts[1].studentName.split(' ')[0]})`
                    : `Em Andamento (${activeWorkouts[0].studentName.split(' ')[0]})`}
                </span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-[#E5E7EB]">
                <div className="text-right">
                  <p className="text-xs font-bold text-[#1F2937] tracking-tight">
                    {trainerProfile.name || 'Personal Trainer'}
                  </p>
                  <p className="text-[10px] text-[#4B5563] uppercase tracking-wider">
                    {trainerProfile.cref || 'TFIVE PRO'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center font-bold text-sm text-[#1F2937] shadow-xs">
                  {trainerProfile.name ? trainerProfile.name.charAt(0) : 'T'}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Deseja realmente sair da sua conta?')) {
                      await authService.logout();
                    }
                  }}
                  title="Sair da conta"
                  className="p-2 rounded-xl text-[#4B5563] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Mobile / Tablet Bottom Navigation Bar with Safe Area Insets */}
      <div 
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-[#E5E7EB] backdrop-blur-lg px-2 pt-2 pb-2 flex items-center justify-around overflow-x-auto shadow-md"
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold tracking-tight transition-all shrink-0 min-w-[44px] min-h-[44px] cursor-pointer ${
                isActive 
                  ? 'text-white bg-[#374151] shadow-xs' 
                  : 'text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="truncate max-w-[56px] text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
