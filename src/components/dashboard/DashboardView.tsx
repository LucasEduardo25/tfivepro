import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Calendar, 
  Users, 
  Dumbbell, 
  Share2, 
  Download, 
  UserPlus, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CalendarPlus,
  ArrowRight,
  Sparkles,
  Trophy
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student, WorkoutRoutine, WorkoutSession, ExternalStoryData, ScheduleAppointment } from '../../types';
import { 
  getGreeting, 
  getFormattedDeviceDate, 
  calculateDailySummary, 
  getTodayAppointments, 
  getNextAppointment
} from '../../utils/dashboardMetrics';
import { formatWorkoutDuration, formatTonnesOrKg } from '../../utils/calculations';
import { StudentAvatar } from '../common/StudentAvatar';
import { ActiveWorkoutsSection } from './ActiveWorkoutsSection';
import { QuickStartWorkoutModal } from './QuickStartWorkoutModal';
import { StorySelectionModal } from './StorySelectionModal';
import { NewStudentModal } from '../students/NewStudentModal';
import { WorkoutStoryModal } from '../story/WorkoutStoryModal';
import { ExternalWorkoutStoryModal } from '../story/ExternalWorkoutStoryModal';
import { DailySummaryStoryModal } from '../story/DailySummaryStoryModal';
import { SessionSummaryViewModal } from '../workout/SessionSummaryViewModal';
import { ReportPDFModal } from '../reports/ReportPDFModal';
import { TodayHub } from '../today/TodayHub';

interface DashboardViewProps {
  onSelectStudent: (student: Student, initialTab?: string) => void;
  onStartWorkoutFromSchedule: (student: Student, routine?: WorkoutRoutine, workout?: import('../../types').RoutineWorkout) => void;
  onOpenLiveWorkout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectStudent,
  onStartWorkoutFromSchedule,
  onOpenLiveWorkout
}) => {
  const { 
    students, 
    sessions, 
    schedule, 
    activeWorkouts, 
    trainerProfile, 
    setCurrentTab,
    finishWorkout,
    routines,
    assessments
  } = useApp();

  // Modals state
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [showStorySelectionModal, setShowStorySelectionModal] = useState(false);
  const [selectedStorySession, setSelectedStorySession] = useState<WorkoutSession | null>(null);
  const [showExternalWorkoutModal, setShowExternalWorkoutModal] = useState(false);
  const [externalStoryData, setExternalStoryData] = useState<ExternalStoryData | null>(null);
  const [showExternalStoryModal, setShowExternalStoryModal] = useState(false);
  const [showDailyStoryModal, setShowDailyStoryModal] = useState(false);
  const [viewingSession, setViewingSession] = useState<WorkoutSession | null>(null);
  const [reportStudentSession, setReportStudentSession] = useState<{ student: Student; session: WorkoutSession } | null>(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  const greetingText = useMemo(() => getGreeting(trainerProfile.name), [trainerProfile.name]);
  const formattedDate = useMemo(() => getFormattedDeviceDate(), []);

  // Centralized calculations
  const dailySummary = useMemo(() => {
    return calculateDailySummary(sessions, activeWorkouts, todayStr);
  }, [sessions, activeWorkouts, todayStr]);

  const todayAppointments = useMemo(() => {
    return getTodayAppointments(schedule, todayStr);
  }, [schedule, todayStr]);

  const studentsMap = useMemo(() => {
    return new Map<string, Student>(students.map(s => [s.id, s]));
  }, [students]);

  // Alunos que precisam de atenção (Real Data)
  const studentsNeedingAttention = useMemo(() => {
    const now = new Date().getTime();
    const activeStudents = students.filter(s => s.status === 'active');
    
    const items = activeStudents.map(student => {
      const studentSessions = sessions
        .filter(s => s.studentId === student.id && s.status === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      const lastSession = studentSessions[0];
      let daysWithoutWorkout = 999;
      let reason = 'Sem treinos concluídos';

      if (lastSession) {
        const lastDate = new Date(lastSession.startTime).getTime();
        daysWithoutWorkout = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        reason = `${daysWithoutWorkout} dias sem treinar`;
      }

      return {
        student,
        daysWithoutWorkout,
        reason,
        lastDate: lastSession ? new Date(lastSession.startTime).toLocaleDateString('pt-BR') : null
      };
    });

    // Filter students with >= 7 days without training or never trained
    return items
      .filter(item => item.daysWithoutWorkout >= 7)
      .sort((a, b) => b.daysWithoutWorkout - a.daysWithoutWorkout)
      .slice(0, 4);
  }, [students, sessions]);

  // Recent completed sessions
  const recentSessions = useMemo(() => {
    return [...sessions]
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5);
  }, [sessions]);

  const activeStudentsCount = useMemo(() => {
    return students.filter(s => s.status === 'active').length;
  }, [students]);

  const completedTodayCount = todayAppointments.filter(a => a.status === 'completed').length;
  const scheduledTodayCount = todayAppointments.length;

  const handleStartWorkout = (student: Student, routine?: WorkoutRoutine) => {
    onStartWorkoutFromSchedule(student, routine);
  };

  const handleFinishActiveWorkout = async (sessionId: string) => {
    await finishWorkout(sessionId);
  };

  const isBrandNewAccount = students.length === 0 && sessions.length === 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. CABEÇALHO OPERACIONAL */}
      <header className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">
            {greetingText}
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563]">
            {formattedDate} • {scheduledTodayCount > 0 ? (
              <span><strong>{scheduledTodayCount}</strong> atendimentos agendados hoje ({completedTodayCount} concluídos).</span>
            ) : (
              <span>Nenhum atendimento agendado para hoje.</span>
            )}
          </p>
        </div>


      </header>

      {/* 2. BARRA DE AÇÕES RÁPIDAS (EXISTENTES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setShowNewStudentModal(true)}
          className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors flex items-center gap-3 text-left shadow-xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center shrink-0 group-hover:bg-[#E5E7EB] transition-colors">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#1F2937] block truncate">+ Aluno</span>
            <span className="text-[11px] text-[#4B5563] block truncate">Cadastrar ficha</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentTab('agenda')}
          className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors flex items-center gap-3 text-left shadow-xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center shrink-0 group-hover:bg-[#E5E7EB] transition-colors">
            <CalendarPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#1F2937] block truncate">+ Agendamento</span>
            <span className="text-[11px] text-[#4B5563] block truncate">Marcar horário</span>
          </div>
        </button>

        <button
          onClick={() => {
            if (dailySummary.completedWorkoutsCount > 0) {
              setShowDailyStoryModal(true);
            } else {
              setShowStorySelectionModal(true);
            }
          }}
          className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors flex items-center gap-3 text-left shadow-xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center shrink-0 group-hover:bg-[#E5E7EB] transition-colors">
            <Share2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#1F2937] block truncate">Story do Dia</span>
            <span className="text-[11px] text-[#4B5563] block truncate">Exportar visual</span>
          </div>
        </button>
      </div>

      {/* 4. GRID OPERACIONAL PRINCIPAL (2 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA (MAIOR): AGENDA DE HOJE + ATIVIDADE RECENTE */}
        <div className="lg:col-span-2 space-y-6">
          
          <TodayHub
            embedded
            onStartWorkout={(student, routine, workout) => onStartWorkoutFromSchedule(student, routine, workout)}
            onOpenLiveWorkout={onOpenLiveWorkout}
            onSelectStudent={student => onSelectStudent(student)}
            onOpenSchedule={() => setCurrentTab('agenda')}
          />

          {/* F. ATIVIDADE RECENTE (VISUAL LEVE E CRONOLÓGICO) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF1]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center font-bold">
                  <Dumbbell className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold text-[#1F2937] tracking-tight">
                  Atividade Recente ({recentSessions.length})
                </h2>
              </div>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]">
                <p className="text-xs text-[#4B5563]">Nenhum treino concluído recentemente.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map(session => {
                  const student = studentsMap.get(session.studentId);
                  const sessionSets = Array.isArray(session.sets) ? session.sets : [];
                  const sessionVolume = sessionSets.reduce((acc, s) => acc + ((s.weightKg || 0) * (s.actualReps || 0)), 0);
                  const prsCount = session.prsAchieved?.length || 0;
                  const dateFormatted = session.startTime ? new Date(session.startTime).toLocaleDateString('pt-BR') : '';

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-between gap-3 hover:border-[#D1D5DB] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {student && (
                          <div 
                            onClick={() => onSelectStudent(student)}
                            className="cursor-pointer shrink-0"
                          >
                            <StudentAvatar student={student} size="sm" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1F2937] truncate">
                            {student?.name || session.studentName || 'Aluno'}
                          </p>
                          <p className="text-[11px] text-[#4B5563] truncate">
                            {session.routineName || 'Treino'} • {formatWorkoutDuration(session.durationSeconds || 0)} • {formatTonnesOrKg(sessionVolume)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {prsCount > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-600" />
                            <span>{prsCount} PR{prsCount > 1 ? 's' : ''}</span>
                          </span>
                        )}

                        <button
                          onClick={() => setViewingSession(session)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#D1D5DB] text-xs font-medium text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors"
                        >
                          Ver
                        </button>

                        <button
                          onClick={() => setSelectedStorySession(session)}
                          className="p-1.5 rounded-lg bg-white border border-[#D1D5DB] text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors"
                          title="Gerar Story do Treino"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* COLUNA DIREITA: RESUMO OPERACIONAL + ALUNOS QUE PRECISAM DE ATENÇÃO */}
        <div className="space-y-6">
          
          {/* E. RESUMO OPERACIONAL (POUCOS E ÚTEIS) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#1F2937] tracking-tight pb-2 border-b border-[#ECEEF1]">
              Resumo Operacional
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-[10px] font-semibold uppercase text-[#4B5563] tracking-wider block mb-1">
                  Atendimentos Hoje
                </span>
                <span className="text-lg font-bold text-[#1F2937]">
                  {dailySummary.completedWorkoutsCount}
                </span>
                <span className="text-[10px] text-[#4B5563] block">
                  {scheduledTodayCount > 0 ? `de ${scheduledTodayCount} agendados` : 'concluídos'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-[10px] font-semibold uppercase text-[#4B5563] tracking-wider block mb-1">
                  Alunos Ativos
                </span>
                <span className="text-lg font-bold text-[#1F2937]">
                  {activeStudentsCount}
                </span>
                <span className="text-[10px] text-[#4B5563] block">
                  em acompanhamento
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-[10px] font-semibold uppercase text-[#4B5563] tracking-wider block mb-1">
                  Volume Total Movimentado Hoje
                </span>
                <span className="text-lg font-bold text-[#1F2937]">
                  {formatTonnesOrKg(dailySummary.totalVolumeKg)}
                </span>
                <span className="text-[10px] text-[#4B5563] block">
                  tonelagem das sessões de hoje
                </span>
              </div>
            </div>
          </div>

          {/* D. ALUNOS QUE PRECISAM DE ATENÇÃO (DADOS REAIS, SEM IA INVENTADA) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF1]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-[#1F2937] tracking-tight">
                  Precisam de Atenção
                </h2>
              </div>
            </div>

            {studentsNeedingAttention.length === 0 ? (
              <p className="text-xs text-[#4B5563] py-3 text-center bg-[#F8F9FA] rounded-xl border border-[#E5E7EB]">
                Todos os alunos ativos treinaram nos últimos 7 dias.
              </p>
            ) : (
              <div className="space-y-2.5">
                {studentsNeedingAttention.map(item => (
                  <div
                    key={item.student.id}
                    onClick={() => onSelectStudent(item.student)}
                    className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StudentAvatar student={item.student} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1F2937] group-hover:text-[#374151] truncate">
                          {item.student.name}
                        </p>
                        <p className="text-[11px] text-amber-700 font-medium truncate">
                          {item.reason}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#4B5563] group-hover:text-[#1F2937] transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODALS */}
      {showQuickStartModal && (
        <QuickStartWorkoutModal
          onClose={() => setShowQuickStartModal(false)}
          onSelectStudentToStart={handleStartWorkout}
          onOpenNewStudent={() => {
            setShowQuickStartModal(false);
            setShowNewStudentModal(true);
          }}
        />
      )}

      {showNewStudentModal && (
        <NewStudentModal
          onClose={() => setShowNewStudentModal(false)}
          onStudentCreated={student => {
            onSelectStudent(student);
          }}
        />
      )}

      {showStorySelectionModal && (
        <StorySelectionModal
          recentSessions={recentSessions}
          hasTodayCompleted={dailySummary.completedWorkoutsCount > 0}
          onSelectSession={session => setSelectedStorySession(session)}
          onSelectDailySummary={() => setShowDailyStoryModal(true)}
          onSelectExternalWorkout={() => {
            setShowStorySelectionModal(false);
            setShowExternalWorkoutModal(true);
          }}
          onClose={() => setShowStorySelectionModal(false)}
        />
      )}

      {showExternalWorkoutModal && (
        <ExternalWorkoutStoryModal
          initialData={externalStoryData || undefined}
          onClose={() => setShowExternalWorkoutModal(false)}
          onSubmit={(data) => {
            setExternalStoryData(data);
            setShowExternalWorkoutModal(false);
            setShowExternalStoryModal(true);
          }}
        />
      )}

      {showExternalStoryModal && externalStoryData && (
        <WorkoutStoryModal
          session={null}
          externalData={externalStoryData}
          onClose={() => {
            setShowExternalStoryModal(false);
          }}
          onEditExternalData={() => {
            setShowExternalStoryModal(false);
            setShowExternalWorkoutModal(true);
          }}
        />
      )}

      {selectedStorySession && (
        <WorkoutStoryModal
          session={selectedStorySession}
          onClose={() => setSelectedStorySession(null)}
        />
      )}

      {showDailyStoryModal && (
        <DailySummaryStoryModal
          onClose={() => setShowDailyStoryModal(false)}
        />
      )}

      {viewingSession && (
        <SessionSummaryViewModal
          session={viewingSession}
          onClose={() => setViewingSession(null)}
          onOpenStory={() => {
            setSelectedStorySession(viewingSession);
            setViewingSession(null);
          }}
        />
      )}

      {reportStudentSession && (
        <ReportPDFModal
          student={reportStudentSession.student}
          trainerProfile={trainerProfile}
          sessions={sessions.filter(s => s.studentId === reportStudentSession.student.id)}
          assessments={assessments.filter(a => a.studentId === reportStudentSession.student.id)}
          routines={routines.filter(r => r.studentId === reportStudentSession.student.id)}
          onClose={() => setReportStudentSession(null)}
        />
      )}

    </div>
  );
};
