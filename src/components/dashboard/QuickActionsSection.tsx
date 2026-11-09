import React, { useState } from 'react';
import { 
  Play, 
  UserPlus, 
  Users, 
  Calendar, 
  Share2, 
  Download, 
  Check, 
  Dumbbell, 
  Settings 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface QuickActionsSectionProps {
  onOpenQuickStart: () => void;
  onOpenNewStudent: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenStoryPicker: () => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onOpenQuickStart,
  onOpenNewStudent,
  onNavigateTab,
  onOpenStoryPicker
}) => {
  const { exportDatabase } = useApp();
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  const handleInstantBackup = async () => {
    try {
      const jsonString = await exportDatabase();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TFIVE_PRO_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupDownloaded(true);
      setTimeout(() => setBackupDownloaded(false), 3000);
    } catch (err) {
      console.error('Backup error:', err);
    }
  };

  const actions = [
    {
      id: 'start-workout',
      label: 'Iniciar Treino',
      description: 'Começar sessão',
      icon: Play,
      isPrimary: true,
      onClick: onOpenQuickStart
    },
    {
      id: 'new-student',
      label: 'Novo Aluno',
      description: 'Cadastrar atleta',
      icon: UserPlus,
      onClick: onOpenNewStudent
    },
    {
      id: 'all-students',
      label: 'Ver Alunos',
      description: 'Base e fichas',
      icon: Users,
      onClick: () => onNavigateTab('alunos')
    },
    {
      id: 'schedule',
      label: 'Ver Agenda',
      description: 'Grade de horários',
      icon: Calendar,
      onClick: () => onNavigateTab('agenda')
    },
    {
      id: 'story',
      label: 'Criar Story',
      description: 'PNG transparente',
      icon: Share2,
      onClick: onOpenStoryPicker
    },
    {
      id: 'backup',
      label: backupDownloaded ? 'Backup Salvo!' : 'Backup Rápido',
      description: backupDownloaded ? 'Download concluído' : 'Exportar dados',
      icon: backupDownloaded ? Check : Download,
      onClick: handleInstantBackup,
      highlight: backupDownloaded
    }
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-black uppercase tracking-wider text-[#4B5563] px-1">
        Ações Rápidas
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {actions.map(action => {
          const Icon = action.icon;

          if (action.isPrimary) {
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className="p-3.5 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white shadow-[0_4px_15px_rgba(217,4,41,0.3)] transition-all flex flex-col items-start justify-between min-h-[96px] text-left group"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4 fill-white ml-0.5" />
                </div>
                <div>
                  <span className="block text-xs font-black font-display text-white tracking-tight">
                    {action.label}
                  </span>
                  <span className="block text-[10px] text-white/80 font-medium">
                    {action.description}
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`p-3.5 rounded-2xl bg-[#121212] border transition-all flex flex-col items-start justify-between min-h-[96px] text-left group ${
                action.highlight
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : 'border-[#27272a] hover:border-[#374151] hover:bg-[#18181B]'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                action.highlight 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-[#050505] border border-[#27272a] text-[#4B5563] group-hover:text-white'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <span className={`block text-xs font-bold transition-colors ${
                  action.highlight ? 'text-emerald-400' : 'text-white group-hover:text-[#1F2937]'
                }`}>
                  {action.label}
                </span>
                <span className="block text-[10px] text-[#71717A]">
                  {action.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
