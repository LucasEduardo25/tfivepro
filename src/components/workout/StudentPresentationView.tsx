import React from 'react';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  Clock, 
  Weight, 
  Dumbbell, 
  X, 
  CheckCircle,
  Zap
} from 'lucide-react';
import { WorkoutSession } from '../../types';
import { computeSessionEvolution, formatTimer, formatWeight } from '../../utils/calculations';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';

interface StudentPresentationViewProps {
  session: WorkoutSession;
  onExit: () => void;
}

export const StudentPresentationView: React.FC<StudentPresentationViewProps> = ({
  session,
  onExit
}) => {
  const { students, sessions, trainerProfile, exercises } = useApp();
  const student = students.find(s => s.id === session.studentId);
  const evolution = computeSessionEvolution(session, sessions);
  const { evolutions, totalPRs, exercisesEvolvedCount, volumeChangePercent } = evolution;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-white flex flex-col justify-between p-6 sm:p-10 overflow-y-auto select-none">
      
      {/* Top Bar for Student Mode */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#374151] flex items-center justify-center shadow-lg shadow-xs">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl tracking-wider text-white">TFIVE <span className="text-[#374151]">PRO</span></h1>
            <p className="text-[11px] text-[#4B5563] uppercase tracking-widest font-bold">Modo Aluno • Performance</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
          <span>Sair do Modo Aluno</span>
        </button>
      </div>

      {/* Main Student Experience Content */}
      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col justify-center">
        
        {/* Student Welcome & Slogan */}
        <div className="text-center flex flex-col items-center">
          <div className="mb-3">
            <StudentAvatar
              name={session.studentName}
              photo={student?.photo}
              size="xl"
              className="w-20 h-20 text-xl border-2 border-[#374151] shadow-xl shadow-xs"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-xs text-[#4B5563] mb-2">
            <Flame className="w-3.5 h-3.5 text-[#374151]" />
            <span>Resultados do Treino de Hoje</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display text-white tracking-wide">
            PARABÉNS, {session.studentName.toUpperCase()}!
          </h2>
          <p className="text-sm sm:text-base text-[#374151] font-bold mt-1 tracking-widest uppercase">
            Performance sem desculpas. Resultados sem limites.
          </p>
        </div>

        {/* 4 Big Showcase Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#121212] border-2 border-[#27272A] rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#18181B] mx-auto flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-[#374151]" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-mono-nums text-white">
              {formatTimer(session.durationSeconds)}
            </span>
            <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider mt-1">Tempo de Foco</p>
          </div>

          <div className="bg-[#121212] border-2 border-[#27272A] rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#18181B] mx-auto flex items-center justify-center mb-2">
              <Weight className="w-5 h-5 text-[#374151]" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-mono-nums text-white">
              {formatWeight(session.totalVolume)}
            </span>
            <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider mt-1">Volume Movimentado</p>
          </div>

          <div className="bg-[#121212] border-2 border-[#374151] rounded-2xl p-5 text-center bg-radial from-[#374151]/15 to-transparent">
            <div className="w-10 h-10 rounded-xl bg-[#374151] mx-auto flex items-center justify-center mb-2 shadow-lg shadow-xs">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-display text-[#374151]">
              {totalPRs}
            </span>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-1">Novos Recordes (PR)</p>
          </div>

          <div className="bg-[#121212] border-2 border-[#27272A] rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#18181B] mx-auto flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-[#374151]" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-mono-nums text-white">
              +{volumeChangePercent}%
            </span>
            <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider mt-1">Sobrecarga Progressiva</p>
          </div>

        </div>

        {/* Evolução dos Exercícios em Destaque */}
        <div className="bg-[#121212] border-2 border-[#27272A] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#27272A]">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#374151]" />
              <h3 className="text-lg font-black font-display uppercase tracking-wider text-white">
                Progressão nos Exercícios de Hoje
              </h3>
            </div>
            <span className="text-xs text-[#4B5563]">Superação contínua</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {evolutions.map(evo => (
              <div
                key={evo.exerciseId}
                className={`p-4 rounded-2xl border transition-all ${
                  evo.isPR 
                    ? 'bg-[#18181B] border-[#374151]' 
                    : 'bg-[#18181B] border-[#27272A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-base">{evo.exerciseName}</span>
                  {evo.isPR && (
                    <span className="px-2 py-0.5 rounded bg-[#374151] text-white text-[10px] font-black uppercase tracking-wider">
                      RECORDE PESSOAL
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[#27272A]">
                  <span className="text-[#4B5563]">
                    Anterior: {evo.previousWeight}kg × {evo.previousReps}
                  </span>
                  <span className="text-sm font-black font-mono-nums text-white">
                    Hoje: {evo.todayWeight}kg × {evo.todayReps}
                  </span>
                  <span className="font-bold text-[#374151] font-mono-nums">
                    {evo.weightDelta >= 0 ? `+${evo.weightDelta}kg` : `${evo.weightDelta}kg`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="text-center text-xs text-[#4B5563] pt-4 border-t border-[#27272A]">
        TFIVE PRO • Personal Trainer {trainerProfile.name} • Performance sem desculpas
      </div>

    </div>
  );
};
