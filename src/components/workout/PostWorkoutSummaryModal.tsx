import React, { useEffect } from 'react';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  Clock, 
  Weight, 
  ChevronRight, 
  Share2, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  FileText,
  Camera,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WorkoutSession } from '../../types';
import { 
  computeSessionEvolution, 
  getConsolidatedWorkoutPRs,
  formatTimer, 
  formatWeight, 
  calculateWorkoutDensity 
} from '../../utils/calculations';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';

interface PostWorkoutSummaryModalProps {
  session: WorkoutSession;
  onClose: () => void;
  onOpenStudentMode: () => void;
  onOpenReport?: () => void;
  onOpenStory?: () => void;
}

export const PostWorkoutSummaryModal: React.FC<PostWorkoutSummaryModalProps> = ({
  session,
  onClose,
  onOpenStudentMode,
  onOpenReport,
  onOpenStory
}) => {
  const { sessions, students, exercises } = useApp();
  const student = students.find(s => s.id === session.studentId);
  const liveStudentPhoto = student?.photo || session.studentPhoto;

  const evolutionData = computeSessionEvolution(session, sessions);
  const consolidatedPRs = getConsolidatedWorkoutPRs(session, sessions);
  const { evolutions, exercisesEvolvedCount, volumeChangePercent } = evolutionData;
  const totalPRs = consolidatedPRs.length;
  const densityKgMin = calculateWorkoutDensity(session.totalVolume, session.durationSeconds, true);

  useEffect(() => {
    // Fire celebratory confetti explosion
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#374151', '#FFFFFF', '#1F2937', '#FFD700']
      });
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-[#374151]/60 rounded-3xl p-5 sm:p-7 max-w-2xl w-full my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl shadow-xs relative">
        
        {/* Header Badge */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#374151] text-white text-xs font-black uppercase tracking-widest mb-2.5 shadow-lg shadow-xs animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>TREINO CONCLUÍDO COM SUCESSO</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1F2937] tracking-wide">
            EVOLUÇÃO REGISTRADA!
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] mt-1">
            {session.studentName} superou os limites hoje no {session.routineTitle}
          </p>
        </div>

        {/* Student Mini Hero */}
        <div className="flex items-center justify-between bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-3.5 min-w-0">
            <StudentAvatar
              name={session.studentName}
              photo={liveStudentPhoto}
              size="lg"
            />
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-[#1F2937] truncate">{session.studentName}</h3>
              <p className="text-xs text-[#4B5563] truncate">{new Date(session.startTime).toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-[#4B5563] block">DURAÇÃO</span>
            <span className="text-base sm:text-lg font-black font-mono-nums text-[#1F2937] flex items-center gap-1 justify-end">
              <Clock className="w-4 h-4 text-[#374151]" />
              {formatTimer(session.durationSeconds)}
            </span>
          </div>
        </div>

        {/* Big Highlights: 4 Impact Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          
          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-3 text-center">
            <div className="w-7 h-7 rounded-lg bg-[#27272A] mx-auto flex items-center justify-center mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#374151]" />
            </div>
            <span className="text-xl font-black text-[#1F2937]">{exercisesEvolvedCount}</span>
            <p className="text-[9px] font-bold text-[#4B5563] uppercase tracking-wider mt-0.5">
              Exerc. com Evolução
            </p>
          </div>

          <div className="bg-[#F8F9FA] border border-[#374151]/40 rounded-2xl p-3 text-center relative overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#374151]/50 mx-auto flex items-center justify-center mb-1.5">
              <Trophy className="w-3.5 h-3.5 text-[#374151]" />
            </div>
            <span className="text-xl font-black font-display text-[#374151]">{totalPRs}</span>
            <p className="text-[9px] font-bold text-[#4B5563] uppercase tracking-wider mt-0.5">
              Novos Recordes (PR)
            </p>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-3 text-center">
            <div className="w-7 h-7 rounded-lg bg-[#27272A] mx-auto flex items-center justify-center mb-1.5">
              <Weight className="w-3.5 h-3.5 text-[#374151]" />
            </div>
            <span className="text-xl font-black text-[#1F2937]">{formatWeight(session.totalVolume)}</span>
            <p className="text-[9px] font-bold text-[#4B5563] uppercase tracking-wider mt-0.5">
              Volume Total
            </p>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-3 text-center">
            <div className="w-7 h-7 rounded-lg bg-[#27272A] mx-auto flex items-center justify-center mb-1.5">
              <Flame className="w-3.5 h-3.5 text-[#374151]" />
            </div>
            <span className="text-xl font-black text-[#1F2937]">{densityKgMin}</span>
            <p className="text-[9px] font-bold text-[#4B5563] uppercase tracking-wider mt-0.5">
              Ritmo (kg/min)
            </p>
          </div>

        </div>

        {/* RECORDES DO TREINO (Consolidado por Exercício) */}
        {consolidatedPRs.length > 0 && (
          <div className="bg-[#F8F9FA] border border-amber-500/40 rounded-2xl p-4 sm:p-5 mb-5 shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-black font-display uppercase tracking-wider text-amber-800">
                  Recordes do Treino ({consolidatedPRs.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Superação Pessoal
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {consolidatedPRs.map((pr) => (
                <div
                  key={pr.exerciseId}
                  className="p-3 rounded-xl bg-white border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-[#1F2937] text-xs sm:text-sm uppercase tracking-wide">
                        {pr.exerciseName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F3F4F6] text-[9px] font-bold text-[#4B5563] uppercase">
                        {pr.muscleGroup}
                      </span>
                    </div>

                    {/* Selos de todos os tipos de PR superados neste exercício */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {pr.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                        >
                          <Trophy className="w-2.5 h-2.5 text-amber-600" />
                          <span>{badge.label}</span>
                          {badge.detail && (
                            <span className="text-amber-800 font-mono-nums font-normal">
                              ({badge.detail})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>

                    {pr.previousSummary && (
                      <p className="text-[11px] text-[#4B5563] mt-1 truncate">
                        {pr.previousSummary}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-black font-mono-nums text-sm sm:text-base text-[#1F2937]">
                      {pr.metricHeadline}
                    </div>
                    {pr.estimated1RM > 0 && (
                      <div className="text-[10px] font-mono-nums font-bold text-amber-700">
                        1RM Est: {pr.estimated1RM} kg
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUA EVOLUÇÃO HOJE — Detailed Comparison Card */}
        <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#374151]" />
              <h3 className="text-xs sm:text-sm font-bold font-display uppercase tracking-wider text-[#1F2937]">
                Evolução do Treino (Cargas & Séries)
              </h3>
            </div>
            <span className="text-xs font-mono-nums text-[#4B5563]">
              {volumeChangePercent !== 0 && (
                <strong className={volumeChangePercent >= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                  {volumeChangePercent >= 0 ? `+${volumeChangePercent}%` : `${volumeChangePercent}%`} vol.
                </strong>
              )}
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {evolutions.length > 0 ? (
              evolutions.map(evo => (
                <div
                  key={evo.exerciseId}
                  className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1F2937] text-xs sm:text-sm">{evo.exerciseName}</span>
                      {evo.isPR && (
                        <span className="px-2 py-0.5 rounded bg-[#374151] text-white text-[9px] font-black uppercase">
                          NOVO PR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      Anterior: <span className="font-mono-nums">{evo.hasPrevious ? `${evo.previousWeight}kg × ${evo.previousReps}` : 'Primeiro registro'}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-black font-mono-nums text-xs sm:text-sm text-[#1F2937]">
                      Hoje: {evo.todayWeight}kg × {evo.todayReps}
                    </div>
                    {evo.hasPrevious && (
                      <div className="text-[10px] font-mono-nums font-bold text-[#374151]">
                        {evo.weightDelta >= 0 ? `+${evo.weightDelta}kg` : `${evo.weightDelta}kg`} ({evo.percentageDelta >= 0 ? `+${evo.percentageDelta}%` : `${evo.percentageDelta}%`})
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#4B5563] text-center py-2">Sessão salva com sucesso.</p>
            )}
          </div>
        </div>

        {/* Action Buttons: 4 Required Actions */}
        <div className="space-y-2.5">
          
          {/* Primary Action 1: MOSTRAR AO ALUNO */}
          <button
            onClick={onOpenStudentMode}
            className="w-full py-3.5 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold font-display text-base tracking-wider transition-all shadow-xl shadow-xs flex items-center justify-center gap-2.5 border border-white/20 hover:scale-[1.01]"
          >
            <Smartphone className="w-5 h-5" />
            <span>MOSTRAR AO ALUNO</span>
          </button>

          {/* Secondary Actions: CRIAR STORY + GERAR RELATÓRIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            <button
              onClick={onOpenStory}
              className="py-3 px-4 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#1F2937] font-bold font-display text-xs uppercase tracking-wider transition-all border border-[#374151]/40 hover:border-[#374151] flex items-center justify-center gap-2 shadow-lg"
            >
              <Camera className="w-4 h-4 text-[#374151]" />
              <span>CRIAR STORY</span>
            </button>

            {onOpenReport && (
              <button
                onClick={onOpenReport}
                className="py-3 px-4 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#1F2937] font-bold font-display text-xs uppercase tracking-wider transition-all border border-[#E5E7EB] hover:border-zinc-500 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#374151]" />
                <span>GERAR RELATÓRIO</span>
              </button>
            )}

          </div>

          {/* Close Action: FECHAR */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-[#F8F9FA] text-[#4B5563] hover:text-[#1F2937] font-bold text-xs uppercase tracking-wider transition-all"
          >
            FECHAR
          </button>

        </div>

      </div>
    </div>
  );
};
