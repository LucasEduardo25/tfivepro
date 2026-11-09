import React, { useState } from 'react';
import { 
  Flame, 
  Plus, 
  Users, 
  X, 
  Timer, 
  Trophy,
  Dumbbell,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student, WorkoutRoutine, RoutineWorkout, WorkoutSession } from '../../types';
import { WorkoutSessionPanel } from './WorkoutSessionPanel';
import { PostWorkoutSummaryModal } from './PostWorkoutSummaryModal';
import { StudentPresentationView } from './StudentPresentationView';
import { WorkoutStoryModal } from '../story/WorkoutStoryModal';
import { ReportPDFModal } from '../reports/ReportPDFModal';
import { StudentAvatar } from '../common/StudentAvatar';
import { normalizeWorkoutRoutine } from '../../db/indexedDB';

interface LiveWorkoutViewProps {
  onFinishWorkout?: () => void;
  onExit: () => void;
}

export const LiveWorkoutView: React.FC<LiveWorkoutViewProps> = ({
  onExit
}) => {
  const { 
    activeWorkouts, 
    students, 
    routines, 
    sessions,
    assessments,
    startWorkout, 
    trainerProfile 
  } = useApp();

  // Tab index for mobile/compact dual mode (0 or 1)
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState<number>(0);
  const [dualLayoutType, setDualLayoutType] = useState<'split' | 'focus'>('split');
  
  // Modals
  const [showAddSecondModal, setShowAddSecondModal] = useState<boolean>(false);
  const [selectedSecondStudent, setSelectedSecondStudent] = useState<Student | null>(null);
  const [selectedSecondRoutine, setSelectedSecondRoutine] = useState<WorkoutRoutine | null>(null);
  const [selectedSecondWorkout, setSelectedSecondWorkout] = useState<RoutineWorkout | null>(null);
  
  // Summary, Story, Report & Student presentation states
  const [completedSummarySession, setCompletedSummarySession] = useState<WorkoutSession | null>(null);
  const [presentationSession, setPresentationSession] = useState<WorkoutSession | null>(null);
  const [storySession, setStorySession] = useState<WorkoutSession | null>(null);
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available students for adding as 2nd (active and not currently working out)
  const availableStudentsForSecond = students.filter(
    s => s.status === 'active' && !activeWorkouts.some(w => w.studentId === s.id)
  );

  const handleStartSecondStudent = async () => {
    if (!selectedSecondStudent) return;
    const result = await startWorkout(
      selectedSecondStudent, 
      selectedSecondRoutine || undefined,
      selectedSecondWorkout || undefined
    );
    if (result.success) {
      setShowAddSecondModal(false);
      setSelectedSecondStudent(null);
      setSelectedSecondRoutine(null);
      setSelectedSecondWorkout(null);
      setSelectedWorkoutIndex(1);
    } else {
      setErrorMessage(result.message || 'Não foi possível iniciar o treino.');
    }
  };

  // Zero active workouts state
  if (activeWorkouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6 bg-[#121212] border border-[#27272a] rounded-3xl max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-[#27272a] flex items-center justify-center text-zinc-300 mb-4">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">
          Nenhum treino em andamento
        </h2>
        <p className="text-sm text-[#A1A1AA] max-w-md mb-6 leading-relaxed">
          Inicie o treino de 1 ou até 2 alunos simultaneamente a partir da lista de alunos ou da sua agenda.
        </p>
        <button
          onClick={onExit}
          className="px-6 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-md"
        >
          Voltar ao Painel Principal
        </button>
      </div>
    );
  }

  const isDual = activeWorkouts.length === 2;
  const currentFocusedIndex = Math.min(selectedWorkoutIndex, activeWorkouts.length - 1);

  return (
    <div className="space-y-4 pb-16">
      
      {/* Top Dual Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] border border-[#27272A] p-3 sm:p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#18181B] border border-[#27272A] text-zinc-300 text-xs font-black uppercase tracking-wider">
            <Flame className="w-4 h-4" />
            <span className="text-white">{isDual ? 'Modo Duplo Ativo (2 Alunos)' : 'Treino Individual em Tempo Real'}</span>
          </div>

          {/* Dual Screen Layout Switcher (Tablet Horizontal / Desktop) */}
          {isDual && (
            <div className="hidden lg:flex items-center bg-[#18181B] p-0.5 rounded-xl border border-[#27272A] text-[10px] font-black uppercase">
              <button
                onClick={() => setDualLayoutType('split')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dualLayoutType === 'split' ? 'bg-[#374151] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Lado a Lado (50/50)
              </button>
              <button
                onClick={() => setDualLayoutType('focus')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dualLayoutType === 'focus' ? 'bg-[#374151] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Foco Ponderado (65/35)
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add 2nd Student Button (Visible only when exactly 1 active workout) */}
          {!isDual && (
            <button
              onClick={() => setShowAddSecondModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#374151] text-white text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ ADICIONAR 2º ALUNO</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-bold transition-colors"
          >
            Voltar ao Menu
          </button>
        </div>
      </div>

      {/* Mobile / Vertical Tablet Selector Tabs (Only when 2 students active) */}
      {isDual && (
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          {activeWorkouts.map((w, idx) => {
            const isSelected = currentFocusedIndex === idx;
            return (
              <button
                key={w.sessionId}
                onClick={() => setSelectedWorkoutIndex(idx)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected 
                    ? 'bg-[#18181B] border-[#374151] shadow-lg shadow-xs ring-1 ring-[#374151]/60' 
                    : 'bg-[#121212] border-[#27272A] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <StudentAvatar name={w.studentName} photo={w.studentPhoto} size="sm" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">{w.studentName.split(' ')[0]}</span>
                    <span className="text-[10px] text-[#A1A1AA] block truncate">{w.routineTitle}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {w.isRestActive ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono-nums font-black border border-amber-500/40 animate-pulse">
                      {w.restTimerSeconds}s
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono-nums text-[#A1A1AA] font-bold">
                      {w.session.sets.length} séries
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Sessions Layout */}
      {isDual ? (
        <>
          {/* Desktop / Horizontal Tablet View */}
          <div className="hidden lg:block">
            {dualLayoutType === 'split' ? (
              /* 50 / 50 Side-by-Side Dual Columns */
              <div className="grid grid-cols-2 gap-4 items-start">
                {activeWorkouts.map((workout) => (
                  <WorkoutSessionPanel
                    key={workout.sessionId}
                    workout={workout}
                    isDualMode={true}
                    onFinish={(finishedSession) => setCompletedSummarySession(finishedSession)}
                    onShowPresentation={(presSession) => setPresentationSession(presSession)}
                  />
                ))}
              </div>
            ) : (
              /* 65% / 35% Focused Dual Layout */
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* 65% Focused Primary Panel */}
                <div className="col-span-8">
                  {activeWorkouts[currentFocusedIndex] && (
                    <WorkoutSessionPanel
                      key={activeWorkouts[currentFocusedIndex].sessionId}
                      workout={activeWorkouts[currentFocusedIndex]}
                      isDualMode={false}
                      onFinish={(finishedSession) => setCompletedSummarySession(finishedSession)}
                      onShowPresentation={(presSession) => setPresentationSession(presSession)}
                    />
                  )}
                </div>

                {/* 35% Sleek Companion Card for 2nd Student */}
                <div className="col-span-4">
                  {activeWorkouts.map((workout, idx) => {
                    if (idx === currentFocusedIndex) return null;
                    const routineExs = workout.routineSnapshot?.exercises || [];
                    const curEx = routineExs[workout.currentExerciseIndex] || routineExs[0];
                    const completedForEx = workout.session.sets.filter(s => s.exerciseId === curEx?.exerciseId).length;

                    return (
                      <div
                        key={workout.sessionId}
                        className="bg-[#121212] border border-[#27272A] rounded-3xl p-5 shadow-2xl flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <StudentAvatar name={workout.studentName} photo={workout.studentPhoto} size="md" />
                            <div className="min-w-0">
                              <h3 className="font-black text-white text-base truncate uppercase">{workout.studentName}</h3>
                              <p className="text-xs text-[#A1A1AA] truncate">{workout.routineTitle}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-[#18181B] text-[10px] font-bold text-[#A1A1AA] border border-[#27272A] uppercase">
                            2º Aluno
                          </span>
                        </div>

                        {/* Status & Current Exercise */}
                        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#A1A1AA] uppercase font-bold text-[10px]">Exercício Atual:</span>
                            <span className="text-white font-bold font-mono-nums">{completedForEx}/{curEx?.targetSets || 4} séries</span>
                          </div>
                          <h4 className="text-lg font-black text-white truncate uppercase">
                            {curEx?.exerciseName || 'Exercício'}
                          </h4>
                          <span className="text-xs text-[#A1A1AA] block">{curEx?.muscleGroup}</span>

                          {/* Rest Timer if active */}
                          {workout.isRestActive && (
                            <div className="mt-3 p-3 bg-zinc-900 border border-[#374151] rounded-xl flex items-center justify-between animate-pulse">
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-black text-white uppercase">Descanso Ativo</span>
                              </div>
                              <span className="font-mono-nums font-black text-sm text-amber-400">
                                {workout.restTimerSeconds}s
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Switch Focus Button */}
                        <button
                          onClick={() => setSelectedWorkoutIndex(idx)}
                          className="w-full py-3.5 rounded-2xl bg-[#1F2937] hover:bg-[#111827] border border-[#374151] text-white font-bold font-display text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                          <span>FOCAR NO ALUNO ({workout.studentName.split(' ')[0]})</span>
                          <ArrowRight className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile / Vertical Tablet View: Single Tabbed Screen */}
          <div className="block lg:hidden">
            {activeWorkouts[currentFocusedIndex] && (
              <WorkoutSessionPanel
                key={activeWorkouts[currentFocusedIndex].sessionId}
                workout={activeWorkouts[currentFocusedIndex]}
                isDualMode={false}
                onFinish={(finishedSession) => setCompletedSummarySession(finishedSession)}
                onShowPresentation={(presSession) => setPresentationSession(presSession)}
              />
            )}
          </div>
        </>
      ) : (
        /* Single Student View */
        <WorkoutSessionPanel
          workout={activeWorkouts[0]}
          isDualMode={false}
          onFinish={(finishedSession) => setCompletedSummarySession(finishedSession)}
          onShowPresentation={(presSession) => setPresentationSession(presSession)}
          onOpenAddSecondStudent={() => setShowAddSecondModal(true)}
        />
      )}

      {/* Add 2nd Student Modal */}
      {showAddSecondModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-6 max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <h3 className="text-lg font-bold text-white uppercase">
                  Adicionar 2º Aluno Simultâneo
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddSecondModal(false);
                  setSelectedSecondStudent(null);
                  setSelectedSecondRoutine(null);
                  setErrorMessage(null);
                }}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-3 p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300">
                {errorMessage}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div>
                <label className="block text-[#A1A1AA] font-bold uppercase mb-2">
                  1. Selecione o Aluno:
                </label>
                {availableStudentsForSecond.length === 0 ? (
                  <p className="text-[#A1A1AA] italic py-2">Nenhum outro aluno ativo disponível para treino no momento.</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {availableStudentsForSecond.map(st => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setSelectedSecondStudent(st);
                          const studentRoutines = routines.filter(r => r.studentId === st.id);
                          setSelectedSecondRoutine(studentRoutines.length > 0 ? studentRoutines[0] : null);
                        }}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          selectedSecondStudent?.id === st.id
                            ? 'bg-[#18181B] border-[#374151] text-white ring-1 ring-[#374151]/60'
                            : 'bg-[#050505] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StudentAvatar name={st.name} photo={st.photo} size="sm" />
                          <div className="text-left min-w-0">
                            <span className="font-bold block truncate">{st.name}</span>
                            <span className="text-[10px] text-[#A1A1AA]">{st.goal || 'Musculação'}</span>
                          </div>
                        </div>
                        {selectedSecondStudent?.id === st.id && (
                          <span className="text-[10px] font-bold text-white bg-[#374151] px-2 py-0.5 rounded uppercase">Selecionado</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSecondStudent && (
                <div>
                  <label className="block text-[#A1A1AA] font-bold uppercase mb-2">
                    2. Selecione a Rotina & Treino (Opcional):
                  </label>
                  {routines.filter(r => r.studentId === selectedSecondStudent.id).length === 0 ? (
                    <p className="text-[#A1A1AA] italic py-1">Sem rotinas cadastradas. O treino iniciará como Personalizado.</p>
                  ) : (
                    <div className="space-y-3">
                      {routines
                        .filter(r => r.studentId === selectedSecondStudent.id)
                        .map(rawR => {
                          const r = normalizeWorkoutRoutine(rawR);
                          const isRoutineSelected = selectedSecondRoutine?.id === r.id;

                          return (
                            <div
                              key={r.id}
                              className={`p-3 rounded-2xl border transition-all ${
                                isRoutineSelected
                                  ? 'bg-[#18181B] border-[#374151]'
                                  : 'bg-[#050505] border-[#27272A]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSecondRoutine(r);
                                  setSelectedSecondWorkout(null);
                                }}
                                className="w-full text-left flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-white block text-sm">
                                    {r.title}
                                  </span>
                                  <span className="text-[10px] text-[#A1A1AA]">
                                    {r.workouts.length} treinos ({r.workouts.map(w => w.letter).join(', ')})
                                  </span>
                                </div>
                                {isRoutineSelected && !selectedSecondWorkout && (
                                  <span className="text-[10px] font-bold text-white bg-[#374151] px-2 py-0.5 rounded border border-zinc-600">
                                    Auto Ciclo
                                  </span>
                                )}
                              </button>

                              {isRoutineSelected && r.workouts.length > 0 && (
                                <div className="mt-2.5 pt-2.5 border-t border-[#27272A] flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSecondWorkout(null)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                      selectedSecondWorkout === null
                                        ? 'bg-[#374151] text-white'
                                        : 'bg-[#27272A] text-[#A1A1AA] hover:text-white'
                                    }`}
                                  >
                                    Próximo do Ciclo
                                  </button>
                                  {r.workouts.map(w => (
                                    <button
                                      key={w.id}
                                      type="button"
                                      onClick={() => setSelectedSecondWorkout(w)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                        selectedSecondWorkout?.id === w.id
                                          ? 'bg-white text-black'
                                          : 'bg-[#27272A] text-[#A1A1AA] hover:text-white'
                                      }`}
                                    >
                                      <span>Treino {w.letter}</span>
                                      <span className="text-[9px] opacity-70">({w.exercises.length} ex)</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#27272A] flex gap-2">
              <button
                onClick={() => {
                  setShowAddSecondModal(false);
                  setSelectedSecondStudent(null);
                  setSelectedSecondRoutine(null);
                  setSelectedSecondWorkout(null);
                }}
                className="flex-1 py-3 rounded-xl bg-[#27272A] hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedSecondStudent}
                onClick={handleStartSecondStudent}
                className="flex-1 py-3 rounded-xl bg-[#1F2937] hover:bg-[#111827] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all"
              >
                Iniciar 2º Aluno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Workout Summary Modal for Finished Session */}
      {completedSummarySession && (
        <PostWorkoutSummaryModal
          session={completedSummarySession}
          onClose={() => setCompletedSummarySession(null)}
          onOpenStudentMode={() => {
            const s = completedSummarySession;
            setCompletedSummarySession(null);
            setPresentationSession(s);
          }}
          onOpenStory={() => {
            const s = completedSummarySession;
            setCompletedSummarySession(null);
            setStorySession(s);
          }}
          onOpenReport={() => {
            const s = completedSummarySession;
            const targetStudent = students.find(st => st.id === s.studentId);
            if (targetStudent) {
              setCompletedSummarySession(null);
              setReportStudent(targetStudent);
            }
          }}
        />
      )}

      {/* Workout Story Generator Modal */}
      {storySession && (
        <WorkoutStoryModal
          session={storySession}
          onClose={() => setStorySession(null)}
        />
      )}

      {/* Report PDF Modal */}
      {reportStudent && (
        <ReportPDFModal
          student={reportStudent}
          trainerProfile={trainerProfile}
          sessions={sessions.filter(s => s.studentId === reportStudent.id)}
          assessments={assessments.filter(a => a.studentId === reportStudent.id)}
          routines={routines.filter(r => r.studentId === reportStudent.id)}
          onClose={() => setReportStudent(null)}
        />
      )}

      {/* Student Presentation Full-Screen View */}
      {presentationSession && (
        <StudentPresentationView
          session={presentationSession}
          onExit={() => setPresentationSession(null)}
        />
      )}

    </div>
  );
};
