import React from 'react';
import { 
  Users, 
  Dumbbell, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  CloudOff, 
  AlertCircle, 
  Cloud,
  Plus,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TFiveLogo } from '../common/TFiveLogo';

interface TopbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewStudent?: () => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão operacional do dia' },
  alunos: { title: 'Alunos', subtitle: 'Gestão, rotinas e avaliações' },
  treino: { title: 'Console de Treino', subtitle: 'Execução e prescrição em tempo real' },
  agenda: { title: 'Agenda', subtitle: 'Horários e atendimentos' },
  modelos: { title: 'Modelos de Treino', subtitle: 'Biblioteca de rotinas base' },
  exercicios: { title: 'Banco de Exercícios', subtitle: 'Catálogo de movimentos' },
  financeiro: { title: 'Financeiro', subtitle: 'Planos e mensalidades' },
  propostas: { title: 'Propostas', subtitle: 'Modelos de contratação' },
  configuracoes: { title: 'Ajustes', subtitle: 'Perfil e sincronização' }
};

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewStudent
}) => {
  const { 
    activeWorkouts, 
    syncStatus, 
    pendingSyncCount, 
    syncNow,
    trainerProfile
  } = useApp();

  const [isManualSyncing, setIsManualSyncing] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('tfive_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('tfive_theme', theme); } catch {}
  }, [theme]);

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

  const currentInfo = TAB_TITLES[currentTab] || { title: 'TFIVE PRO', subtitle: 'Gestão e Performance' };
  const hasActiveWorkouts = activeWorkouts.length > 0;

  return (
    <header className="h-14 px-3 sm:px-6 bg-white border-b border-[#E5E7EB] flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-20 min-w-0 max-w-full">
      
      {/* Left: Mobile Brand & Desktop Screen Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
        
        {/* Mobile Brand (Only visible < md) */}
        <div 
          onClick={() => onSelectTab('dashboard')} 
          className="flex md:hidden items-center cursor-pointer shrink-0"
        >
          <TFiveLogo size="sm" theme={theme} />
        </div>

        {/* Desktop / Tablet Breadcrumb & Title */}
        <div className="hidden md:block min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2937] tracking-tight truncate">
              {currentInfo.title}
            </h1>
            <span className="text-xs text-[#4B5563] hidden sm:inline">•</span>
            <p className="text-xs text-[#4B5563] truncate hidden sm:inline">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

      </div>

      {/* Right: Quick Actions & Trainer Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        
        {/* Active Workouts Live Badge (If any) */}
        {hasActiveWorkouts && (
          <button
            onClick={() => onSelectTab('treino')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Treino Ativo ({activeWorkouts.length})</span>
            <span className="sm:hidden font-mono-nums font-bold">({activeWorkouts.length})</span>
          </button>
        )}

        {/* Contextual Quick Add Button */}
        {onOpenNewStudent && (
          <button
            onClick={onOpenNewStudent}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-semibold tracking-wide transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Aluno</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-lg text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors"
          title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Sync Status Icon Button */}
        <button
          onClick={handleQuickSync}
          className="p-1.5 rounded-lg text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors"
          title={
            syncStatus === 'syncing' || isManualSyncing
              ? 'Sincronizando com a nuvem...'
              : syncStatus === 'offline'
              ? 'Sem conexão com a internet'
              : syncStatus === 'error'
              ? 'Erro na sincronização'
              : pendingSyncCount > 0
              ? `${pendingSyncCount} alterações locais pendentes`
              : 'Nuvem sincronizada'
          }
        >
          {syncStatus === 'syncing' || isManualSyncing ? (
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
          ) : syncStatus === 'offline' ? (
            <CloudOff className="w-4 h-4 text-[#4B5563]" />
          ) : syncStatus === 'error' ? (
            <AlertCircle className="w-4 h-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
        </button>

        {/* Trainer Profile Avatar / Name */}
        <div 
          onClick={() => onSelectTab('configuracoes')}
          className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB] cursor-pointer group"
          title="Ver perfil e configurações"
        >
          <div className="w-7 h-7 rounded-full bg-[#E5E7EB] text-[#374151] font-bold text-xs flex items-center justify-center border border-[#D1D5DB]">
            {trainerProfile?.name ? trainerProfile.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <span className="text-xs font-medium text-[#4B5563] group-hover:text-[#1F2937] hidden lg:inline max-w-[120px] truncate">
            {trainerProfile?.name || 'Personal'}
          </span>
        </div>

      </div>

    </header>
  );
};
