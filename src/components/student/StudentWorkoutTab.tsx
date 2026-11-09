/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — MODO ALUNO: TELA TREINO (PRESCRIÇÃO READ-ONLY)
 * 
 * REGRAS CRÍTICAS DE PRESCRIÇÃO:
 * - O aluno NÃO pode editar exercícios, trocar ordem, alterar séries, repetições, descansos ou cargas.
 * - 100% READ-ONLY: visualização limpa, de alta legibilidade, com observações do Personal Trainer.
 * - Apenas exibe a prescrição protegida (execução interativa será implementada na Etapa 2).
 */

import React, { useState } from 'react';
import { 
  Dumbbell, 
  ShieldCheck, 
  Clock, 
  Flame, 
  Info, 
  Layers, 
  Repeat, 
  Weight, 
  FileText,
  Activity
} from 'lucide-react';
import { StudentDashboardData } from '../../services/studentDataService';
import { RoutineWorkout, RoutineExercise } from '../../types';

interface StudentWorkoutTabProps {
  onStartWorkout?: (workoutId?: string) => void;
  data: StudentDashboardData;
}

export const StudentWorkoutTab: React.FC<StudentWorkoutTabProps> = ({ data, onStartWorkout }) => {
  const { routines } = data;
  const activeRoutine = routines.find(r => r.status === 'active') || routines[0];

  if (!activeRoutine) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-8 text-center space-y-2 mt-4">
          <p className="text-sm font-bold text-white">Seu treinador ainda não disponibilizou uma rotina.</p>
        </div>
      </div>
    );
  }

  const workouts = activeRoutine.workouts || [];
  const [selectedWorkoutLetter, setSelectedWorkoutLetter] = useState<string>(
    workouts.length > 0 ? workouts[0].letter : 'A'
  );

  const currentWorkout = workouts.find(w => w.letter === selectedWorkoutLetter) || workouts[0];
  const exercises: RoutineExercise[] = currentWorkout?.exercises || [];


  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Header da Tela de Treino */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">
          <Dumbbell className="w-3.5 h-3.5 text-[#D90429]" />
          <span>Ficha de Treino Oficial</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Prescrição de Treino
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          {activeRoutine?.name ? `Rotina: ${activeRoutine.name}` : 'Rotina Prescrita pelo Treinador'}
        </p>
      </div>

      {/* Banner de Proteção da Prescrição (Read-Only Guarantee) */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#27272A] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-[#D90429] shrink-0" />
          <span className="font-semibold text-white">Modo Somente Leitura</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Prescrito pelo Personal
        </span>
      </div>

      {/* Seletor de Treinos (Treino A, Treino B, Treino C...) */}
      {workouts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {workouts.map(w => {
            const isSelected = w.letter === selectedWorkoutLetter;
            return (
              <button
                key={w.letter}
                onClick={() => setSelectedWorkoutLetter(w.letter)}
                className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#D90429] border-[#D90429] text-white shadow-lg shadow-[#D90429]/20'
                    : 'bg-[#121212] border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-zinc-700'
                }`}
              >
                <span>Treino {w.letter}</span>
                {w.name && <span className="block text-[10px] font-normal truncate opacity-80">{w.name}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Resumo do Treino Selecionado */}
      {currentWorkout && (
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Treino {currentWorkout.letter}
              {currentWorkout.name && (
                <span className="text-xs font-semibold text-[#A1A1AA]">• {currentWorkout.name}</span>
              )}
            </h2>
            <span className="text-xs text-[#A1A1AA] font-bold">
              {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
            </span>
          </div>

          {currentWorkout.description && (
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {currentWorkout.description}
            </p>
          )}

          {onStartWorkout && (
            <button
              onClick={() => onStartWorkout(currentWorkout.id)}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#D90429] hover:bg-[#A60321] active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#D90429]/20 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Iniciar Treino {currentWorkout.letter}</span>
            </button>
          )}
        </div>
      )}

      {/* Lista dos Exercícios em Ordem Pedagógica Exata (READ-ONLY) */}
      <div className="space-y-3">
        {exercises.length > 0 ? (
          exercises.map((exercise, index) => {
            const exName = exercise.exerciseName || (exercise as any).name || 'Exercício';
            const orderNumber = String(index + 1).padStart(2, '0');
            const setsCount = exercise.targetSets || (exercise as any).sets?.length || 3;
            const repsStr = exercise.targetRepsMin 
              ? (exercise.targetRepsMax && exercise.targetRepsMax !== exercise.targetRepsMin 
                  ? `${exercise.targetRepsMin}-${exercise.targetRepsMax}` 
                  : `${exercise.targetRepsMin}`)
              : ((exercise as any).targetReps || '10-12');
            const loadStr = exercise.lastSuggestedLoad 
              ? `${exercise.lastSuggestedLoad} kg` 
              : ((exercise as any).targetLoadKg ? `${(exercise as any).targetLoadKg} kg` : 'Ajustar');
            const restStr = exercise.restSeconds ? `${exercise.restSeconds}s` : '60s';
            const methodStr = (exercise as any).method || (exercise.groupType ? exercise.groupType.replace('_', ' ') : 'Tradicional');

            return (
              <div 
                key={exercise.id || index}
                className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 shadow-md space-y-3 hover:border-zinc-700 transition-colors"
              >
                {/* Cabeçalho do Exercício */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-400 font-mono text-xs font-black flex items-center justify-center shrink-0">
                      {orderNumber}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-wide">
                        {exName}
                      </h3>
                      {exercise.muscleGroup && (
                        <span className="text-[11px] font-semibold text-[#A1A1AA] capitalize">
                          {exercise.muscleGroup}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Método se for especial */}
                  {methodStr !== 'Tradicional' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D90429]/15 text-[#D90429] border border-[#D90429]/30 uppercase tracking-wider shrink-0">
                      {methodStr}
                    </span>
                  )}
                </div>

                {/* Grid de Parâmetros Prescritos (READ-ONLY) */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {/* Séries */}
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2 text-center">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block flex items-center justify-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      Séries
                    </span>
                    <span className="text-xs font-black text-white mt-0.5 block">
                      {setsCount}
                    </span>
                  </div>

                  {/* Repetições */}
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2 text-center">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block flex items-center justify-center gap-1">
                      <Repeat className="w-2.5 h-2.5" />
                      Reps
                    </span>
                    <span className="text-xs font-black text-white mt-0.5 block">
                      {repsStr}
                    </span>
                  </div>

                  {/* Carga */}
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2 text-center">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block flex items-center justify-center gap-1">
                      <Weight className="w-2.5 h-2.5" />
                      Carga
                    </span>
                    <span className="text-xs font-black text-white mt-0.5 block truncate">
                      {loadStr}
                    </span>
                  </div>

                  {/* Descanso */}
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2 text-center">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block flex items-center justify-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Pausa
                    </span>
                    <span className="text-xs font-black text-white mt-0.5 block">
                      {restStr}
                    </span>
                  </div>
                </div>

                {/* Observações do Personal Trainer (se houver) */}
                {(exercise.notes || (exercise as any).coachNotes) && (
                  <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-[#A1A1AA] flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-[#D90429] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11px] mb-0.5">Observação do Personal:</strong>
                      <p className="text-[11px] leading-relaxed">{(exercise as any).coachNotes || exercise.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm font-bold text-white">Nenhum exercício cadastrado nesta rotina.</p>
            <p className="text-xs text-[#A1A1AA]">O seu Personal Trainer atualizará sua prescrição em breve.</p>
          </div>
        )}
      </div>

    </div>
  );
};
