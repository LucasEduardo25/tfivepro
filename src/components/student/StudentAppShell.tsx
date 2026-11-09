/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — SHELL DO MODO ALUNO (MOBILE-FIRST)
 * 
 * REGRAS CRÍTICAS:
 * 1. Interface própria, simplificada e otimizada para celular.
 * 2. Bottom Navigation Bar com abas dinâmicas:
 *    - Presencial: [ Hoje, Treino, Agenda, Evolução, Perfil ]
 *    - Consultoria: [ Hoje, Treino, Evolução, Perfil ] (Agenda REMOVIDA)
 * 3. Restrição absoluta: nenhum acesso a módulos administrativos.
 * 4. Cores oficiais TFIVE PRO:
 *    - Fundo: #050505
 *    - Superfícies: #121212
 *    - Bordas: #27272A
 *    - Destaque: #D90429
 *    - Secundário: #A60321
 *    - Textos: #FFFFFF / #A1A1AA
 */

import React, { useState, useEffect } from 'react';
import { useStudentWorkout } from '../../hooks/useStudentWorkout';
import { StudentLiveWorkoutView } from './StudentLiveWorkoutView';
import { 
  Home, 
  Dumbbell, 
  Calendar, 
  TrendingUp, 
  User, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { authService } from '../../services/authService';
import { studentDataService, StudentDashboardData } from '../../services/studentDataService';
import { StudentTodayTab } from './StudentTodayTab';
import { StudentWorkoutTab } from './StudentWorkoutTab';
import { StudentScheduleTab } from './StudentScheduleTab';
import { StudentEvolutionTab } from './StudentEvolutionTab';
import { StudentProfileTab } from './StudentProfileTab';
import { TFiveLogo } from '../common/TFiveLogo';

export type StudentTab = 'hoje' | 'treino' | 'agenda' | 'evolucao' | 'perfil';

interface StudentAppShellProps {
  initialTab?: StudentTab;
  onExitPreview?: () => void;
}

export const StudentAppShell: React.FC<StudentAppShellProps> = ({ 
  initialTab = 'hoje',
  onExitPreview 
}) => {
  const authState = authService.getAuthState();
  const studentId = authState.studentId || '';

  const [currentTab, setCurrentTab] = useState<StudentTab>(initialTab);
  const [data, setData] = useState<StudentDashboardData | null>(null);

  const {
    activeWorkout,
    isLoading: isWorkoutLoading,
    startWorkout,
    recordSet,
    updateRecordedSet,
    deleteRecordedSet,
    startRestTimer,
    stopRestTimer,
    addRestTime,
    updateWorkoutState,
    finishWorkout,
    cancelWorkout
  } = useStudentWorkout(studentId);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega os dados do aluno autenticado
  const loadData = async () => {
    if (!studentId) {
      setError('Identificador de aluno não encontrado na sessão ativa.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const studentData = await studentDataService.loadAllStudentData(studentId);
      setData(studentData);

      // Se for Consultoria e a aba atual for agenda, redireciona imediatamente para 'hoje'
      if (!studentData.modalityInfo.hasSchedule && currentTab === 'agenda') {
        setCurrentTab('hoje');
      }
    } catch (err: any) {
      console.error('Falha ao inicializar Modo Aluno:', err);
      setError(err?.message || 'Não foi possível carregar as informações do aluno.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  // Se for Consultoria e tentar navegar para 'agenda', bloqueia e mantém em 'hoje'
  const handleSelectTab = (tab: StudentTab) => {
    if (tab === 'agenda' && data && !data.modalityInfo.hasSchedule) {
      setCurrentTab('hoje');
      return;
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Se estiver carregando
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#D90429] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-[#A1A1AA] font-bold uppercase tracking-wider">
          Carregando seu treino...
        </p>
      </div>
    );
  }

  // Se houver erro de carregamento ou autorização
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-white mb-2">Acesso ao Modo Aluno</h2>
        <p className="text-xs text-[#A1A1AA] max-w-sm mb-6 leading-relaxed">
          {error || 'Não foi possível carregar os dados deste aluno.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-5 py-2.5 rounded-xl bg-[#D90429] hover:bg-[#A60321] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => authService.logout()}
            className="px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const isConsultoria = !data.modalityInfo.hasSchedule;

  // Lista de abas da Bottom Navigation Bar
  const navTabs: Array<{ id: StudentTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'hoje', label: 'Hoje', icon: Home },
    { id: 'treino', label: 'Treino', icon: Dumbbell },
    // Agenda: apenas para Aluno Presencial
    ...(!isConsultoria ? [{ id: 'agenda' as StudentTab, label: 'Agenda', icon: Calendar }] : []),
    { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];


  if (activeWorkout) {
    return (
      <StudentLiveWorkoutView
        workoutState={activeWorkout}
        onRecordSet={recordSet}
        onUpdateSet={updateRecordedSet}
        onStartRest={startRestTimer}
        onStopRest={stopRestTimer}
        onAddRestTime={addRestTime}
        onUpdateState={updateWorkoutState}
        onFinish={async () => {
          const res = await finishWorkout();
          await loadData();
          return res;
        }}
        onCancel={async () => {
          await cancelWorkout();
          await loadData();
        }}
        onExit={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#D90429] selection:text-white">
      
      {/* Banner de Preview do Personal Trainer (se aplicável) */}
      {onExitPreview && (
        <div className="bg-[#18181B] border-b border-[#27272A] px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-40">
          <div className="flex items-center gap-2 text-zinc-300">
            <ShieldAlert className="w-3.5 h-3.5 text-[#D90429]" />
            <span>Visualizando como Aluno: <strong>{data.student.name}</strong></span>
          </div>
          <button
            onClick={onExitPreview}
            className="px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* Container Mobile-First Centralizado */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between">
        
        {/* Top Header Mobile */}
        <header className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-md border-b border-[#27272A] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TFiveLogo size="sm" theme="dark" />
            <div className="h-4 w-[1px] bg-[#27272A]" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D90429]">
              Modo Aluno
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
              isConsultoria 
                ? 'bg-blue-950/40 text-blue-400 border-blue-800/40' 
                : 'bg-[#18181B] text-zinc-300 border-[#27272A]'
            }`}>
              {isConsultoria ? 'Consultoria' : 'Presencial'}
            </span>

            {data.student.photo ? (
              <img 
                src={data.student.photo} 
                alt={data.student.name}
                className="w-7 h-7 rounded-full object-cover border border-[#27272A]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-white text-[11px] font-bold">
                {data.student.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Conteúdo Principal da Aba Ativa */}
        <main className="flex-1 px-4 py-5 pb-28">
          {currentTab === 'hoje' && (
            <StudentTodayTab 
              data={data} 
              onNavigateToTab={handleSelectTab}
              onStartWorkout={async (workout) => {
                await startWorkout(data.student, undefined, workout);
              }}
            />
          )}

          {currentTab === 'treino' && (
            <StudentWorkoutTab 
              data={data} 
              onStartWorkout={async (workout) => {
                await startWorkout(data.student, undefined, workout);
              }}
            />
          )}

          {currentTab === 'agenda' && !isConsultoria && (
            <StudentScheduleTab data={data} />
          )}

          {currentTab === 'evolucao' && (
            <StudentEvolutionTab data={data} />
          )}

          {currentTab === 'perfil' && (
            <StudentProfileTab data={data} />
          )}
        </main>

        {/* Bottom Navigation Bar Mobile-First */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/98 backdrop-blur-xl border-t border-[#27272A] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
            {navTabs.map(tab => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                    isActive 
                      ? 'text-[#D90429]' 
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {/* Ponto indicador de aba ativa */}
                  {isActive && (
                    <span className="absolute -top-1 w-1 h-1 rounded-full bg-[#D90429]" />
                  )}

                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                  <span className={`text-[10px] mt-1 tracking-wider ${isActive ? 'font-black text-white' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
};
