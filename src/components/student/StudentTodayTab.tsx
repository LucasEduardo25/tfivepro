/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — MODO ALUNO: TELA HOJE (HOME)
 * 
 * Elementos:
 * 1. Saudação personalizada com nome do aluno
 * 2. Data atual formatada
 * 3. Resumo do treino previsto para hoje (ou indicação de descanso se não houver treino)
 * 4. Status do próximo agendamento (SOMENTE SE PRESENCIAL)
 * 5. Indicador do ciclo atual de periodização (se existir e autorizado)
 */

import React from 'react';
import { 
  Calendar, 
  Dumbbell, 
  Clock, 
  Activity, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  MapPin,
  Coffee
} from 'lucide-react';
import { StudentDashboardData } from '../../services/studentDataService';

interface StudentTodayTabProps {
  onStartWorkout?: (workout?: any) => void;
  data: StudentDashboardData;
  onNavigateToTab: (tab: 'hoje' | 'treino' | 'agenda' | 'evolucao' | 'perfil') => void;
}

export const StudentTodayTab: React.FC<StudentTodayTabProps> = ({ data, onNavigateToTab, onStartWorkout }) => {
  const { 
    student, 
    access, 
    modalityInfo, 
    routines, 
    upcomingAppointments, 
    currentCycle 
  } = data;

  // Saudação com base no horário
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 
    ? 'Bom dia' 
    : currentHour < 18 
      ? 'Boa tarde' 
      : 'Boa noite';

  const firstName = student.name.split(' ')[0] || 'Aluno';

  // Data formatada em português
  const todayDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  // Treino ativo / prescrito
  const activeRoutine = routines.find(r => r.status === 'active') || routines[0];
  const activeWorkouts = activeRoutine?.workouts || [];
  
  // Próximo agendamento se Presencial
  const nextAppointment = modalityInfo.hasSchedule && upcomingAppointments.length > 0
    ? upcomingAppointments[0]
    : null;

  // Se houver agendamento com workoutLetter vinculado ou primeiro treino da rotina
  const plannedWorkoutLetter = nextAppointment?.workoutLetter || (activeWorkouts.length > 0 ? activeWorkouts[0].letter : null);
  const plannedWorkout = activeWorkouts.find(w => w.letter === plannedWorkoutLetter) || activeWorkouts[0];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. Header com Saudação e Data */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">
          <Calendar className="w-3.5 h-3.5 text-[#D90429]" />
          <span className="capitalize">{todayDateFormatted}</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          {greeting}, {firstName}!
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          {modalityInfo.modality === 'PRESENCIAL' 
            ? 'Atendimento Presencial Personal Training' 
            : 'Consultoria Online de Treino'}
        </p>
      </div>

      {/* 2. Card do Treino Previsto */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        {/* Glow de destaque */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D90429]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#D90429]">
              <Dumbbell className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {plannedWorkout ? 'Treino Previsto' : 'Programação de Hoje'}
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#D90429]" />
            Prescrição Oficial
          </span>
        </div>

        {plannedWorkout ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-black text-white">
                  Treino {plannedWorkout.letter}
                </h2>
                {plannedWorkout.name && (
                  <span className="text-sm font-semibold text-[#A1A1AA]">
                    • {plannedWorkout.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">
                {activeRoutine?.name ? `Rotina: ${activeRoutine.name}` : 'Rotina ativa prescrita pelo Personal'}
              </p>
            </div>

            {/* Badges de Metadados do Treino */}
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-300 flex items-center gap-1.5">
                <span className="text-[#A1A1AA]">Exercícios:</span>
                <strong className="text-white">{plannedWorkout.exercises?.length || 0}</strong>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span>~{Math.max(45, (plannedWorkout.exercises?.length || 0) * 8)} min</span>
              </div>
            </div>

            {/* Botão de Ação: Ver Prescrição Completa */}
            <button
              onClick={() => onNavigateToTab('treino')}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Ver Ficha Prescrita</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Botão de Ação: Iniciar Treino (disponível em ambas as modalidades) */}
            <button
              onClick={() => onStartWorkout?.(plannedWorkout.id)}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#D90429] hover:bg-[#A60321] active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#D90429]/20 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Iniciar Treino Real</span>
            </button>

          </div>
        ) : (
          /* Estado de Descanso Ativo / Sem Treino Programado */
          <div className="py-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-amber-400">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Dia de Recuperação</h3>
              <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto mt-1">
                Nenhum treino específico programado para hoje. Mantenha-se hidratado e priorize o descanso.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('treino')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <span>Ver Todas as Rotinas</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#D90429]" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Card do Próximo Agendamento (SOMENTE SE PRESENCIAL) */}
      {modalityInfo.hasSchedule && (
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#D90429]">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Próximo Atendimento
              </h3>
            </div>

            <button
              onClick={() => onNavigateToTab('agenda')}
              className="text-xs text-[#D90429] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver agenda</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {nextAppointment ? (
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">
                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${nextAppointment.date}T12:00:00`))}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D90429]/20 text-[#D90429] border border-[#D90429]/30">
                    {nextAppointment.time}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  <span>{nextAppointment.notes || 'Atendimento Presencial com Personal'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Agendado
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 text-center">
              <p className="text-xs text-[#A1A1AA]">
                Nenhum horário presencial agendado para os próximos dias.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Indicador do Ciclo Atual de Periodização (se existir e autorizado) */}
      {currentCycle && access.permissions.currentCycle && (
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#D90429]">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Periodização Ativa
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Em Andamento
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white">
              {currentCycle.name}
            </h4>
            {currentCycle.objective && (
              <p className="text-xs text-[#A1A1AA]">
                <strong>Foco:</strong> {currentCycle.objective}
              </p>
            )}

            {Array.isArray(currentCycle.blocks) && currentCycle.blocks.length > 0 && (
              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>Bloco Atual: <strong className="text-white">{currentCycle.blocks[0].name || 'Fase 1'}</strong></span>
                <span>{currentCycle.blocks[0].durationWeeks || 4} semanas</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Card de Informação sobre a Prescrição */}
      <div className="p-4 rounded-xl bg-[#18181B]/80 border border-[#27272A] text-xs text-[#A1A1AA] flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-[#D90429] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Seus treinos e parâmetros foram calculados com rigor científico pelo seu Personal Trainer no TFIVE PRO. Siga a ordem e os intervalos para máxima resposta fisiológica.
        </p>
      </div>

    </div>
  );
};
