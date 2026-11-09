/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — MODO ALUNO: TELA EVOLUÇÃO
 * 
 * Exibe:
 * 1. Métricas de consistência e treinos concluídos
 * 2. Histórico recente de sessões realizadas
 * 3. Marcas Pessoais (PRs) e cargas registradas nos principais exercícios
 */

import React from 'react';
import { 
  TrendingUp, 
  Dumbbell, 
  Calendar, 
  CheckCircle2, 
  Award, 
  Flame, 
  Clock 
} from 'lucide-react';
import { StudentDashboardData } from '../../services/studentDataService';

interface StudentEvolutionTabProps {
  data: StudentDashboardData;
}

export const StudentEvolutionTab: React.FC<StudentEvolutionTabProps> = ({ data }) => {
  const { recentSessions, access } = data;

  const totalCompletedSessions = recentSessions.filter(
    s => s.status === 'completed' || Boolean(s.endTime) || (s.sets && s.sets.length > 0)
  ).length;

  // Calcula marcas de carga máxima registrada por exercício no histórico
  const exercisePRs: Record<string, { maxLoadKg: number; date: string; reps?: number }> = {};

  recentSessions.forEach(session => {
    const sessionDateStr = (session as any).date || session.startTime?.split('T')[0] || '';
    if (session.sets) {
      session.sets.forEach(set => {
        const weight = set.weightKg || (set as any).loadKg || 0;
        if (set.status === 'completed' && set.exerciseName && weight > 0) {
          const current = exercisePRs[set.exerciseName];
          if (!current || weight > current.maxLoadKg) {
            exercisePRs[set.exerciseName] = {
              maxLoadKg: weight,
              date: sessionDateStr,
              reps: set.actualReps || (set as any).reps
            };
          }
        }
      });
    }
  });

  const prList = Object.entries(exercisePRs).sort((a, b) => b[1].maxLoadKg - a[1].maxLoadKg);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#D90429]" />
          <span>Desempenho & Consistência</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Minha Evolução
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Histórico de treinos completados e evolução de marcas pessoais
        </p>
      </div>

      {/* Grid de Métricas de Consistência */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A1A1AA] flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Sessões Concluídas
          </span>
          <div className="text-2xl font-black text-white">
            {totalCompletedSessions}
          </div>
          <p className="text-[11px] text-zinc-500">Treinos computados</p>
        </div>

        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A1A1AA] flex items-center gap-1.5">
            <Award className="w-3 h-3 text-[#D90429]" />
            Recordes Registrados
          </span>
          <div className="text-2xl font-black text-white">
            {prList.length}
          </div>
          <p className="text-[11px] text-zinc-500">Exercícios com PR</p>
        </div>
      </div>

      {/* Marcas Pessoais (PRs) */}
      {access.permissions.evolution && (
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#D90429]">
                <Award className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Marcas Pessoais (Cargas Máximas)
              </h3>
            </div>
          </div>

          {prList.length > 0 ? (
            <div className="space-y-2 pt-1">
              {prList.slice(0, 6).map(([exerciseName, pr]) => (
                <div 
                  key={exerciseName}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">{exerciseName}</h4>
                    <span className="text-[10px] text-[#A1A1AA]">
                      {new Date(`${pr.date}T12:00:00`).toLocaleDateString('pt-BR')} {pr.reps ? `• ${pr.reps} reps` : ''}
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-[#D90429]/15 border border-[#D90429]/30 text-white font-black text-sm shrink-0">
                    {pr.maxLoadKg} kg
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] text-center text-xs text-[#A1A1AA]">
              As marcas recordes aparecerão automaticamente conforme as cargas forem registradas pelo seu treinador.
            </div>
          )}
        </div>
      )}

      {/* Histórico Recente de Treinos Concluídos */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#D90429]">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Histórico de Sessões
            </h3>
          </div>
          <span className="text-xs font-semibold text-[#A1A1AA]">
            {recentSessions.length} registros
          </span>
        </div>

        {recentSessions.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            {recentSessions.slice(0, 10).map(session => {
              const dateStr = (session as any).date || session.startTime?.split('T')[0] || new Date().toISOString().split('T')[0];
              const sessionDate = new Date(`${dateStr}T12:00:00`);
              const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }).format(sessionDate);

              const completedSets = session.sets?.filter(s => s.status === 'completed').length || 0;
              const durationMin = session.durationSeconds 
                ? Math.round(session.durationSeconds / 60) 
                : ((session as any).totalDurationMinutes || 0);

              return (
                <div 
                  key={session.id}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {session.workoutLetter ? `Treino ${session.workoutLetter}` : (session.workoutName || session.routineTitle)}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] font-normal">
                        {dateFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#A1A1AA]">
                      {durationMin > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {durationMin} min
                        </span>
                      )}
                      <span>{completedSets} séries concluídas</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Realizado
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] text-center text-xs text-[#A1A1AA]">
            Nenhum histórico de treino registrado ainda.
          </div>
        )}
      </div>

    </div>
  );
};
