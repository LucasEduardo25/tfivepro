import React, { useState, useMemo, useEffect } from "react";
import { 
  TrendingDown, TrendingUp, Camera, Activity, Eye, Printer, Share2, Layers, Trash2, Scale, Plus, X, Play, BookmarkPlus, Copy, Archive, Edit, RotateCcw, Dumbbell, Sparkles, FileText 
} from 'lucide-react';

import { 
  calculateSumOf7Skinfolds, SKINFOLD_LABELS_PT, CIRCUMFERENCE_LABELS_PT, compareAssessments, formatNumberBR, formatPercentagePointsBR, formatDeltaValueBR
} from '../../utils/assessmentCalculations';

import { StudentEditModal } from './StudentEditModal';
import { RoutineEditorModal } from '../routines/RoutineEditorModal';
import { NewPhysicalAssessmentModal } from '../assessments/NewPhysicalAssessmentModal';
import { PhysicalAssessmentReportView } from '../assessments/PhysicalAssessmentReportView';
import { PhysicalAssessmentStudentModeModal } from '../assessments/PhysicalAssessmentStudentModeModal';
import { RoutinePDFModal } from '../routines/RoutinePDFModal';
import { PhysicalAssessmentPDFModal } from '../assessments/PhysicalAssessmentPDFModal';
import { AssessmentStudentPresentationModal } from '../assessments/AssessmentStudentPresentationModal';
import { AssessmentStoryModal } from '../assessments/AssessmentStoryModal';
import { ReportPDFModal } from '../reports/ReportPDFModal';


import { ImportAssessmentPhotoModal } from '../assessments/ImportAssessmentPhotoModal';


import { CycleEditorModal } from '../cycles/CycleEditorModal';
import { StudentMetricsSummaryTab } from './StudentMetricsSummaryTab';
import { StudentPerformanceInsightsTab } from './StudentPerformanceInsightsTab';
import { LongevityTab } from '../longevity/LongevityTab';
import { EvolutionReportsTab } from '../reports/EvolutionReportsTab';
import { useApp } from '../../context/AppContext';

import { EvolutionPhotosGallery } from './EvolutionPhotosGallery';
import { WorkoutStoryModal } from '../story/WorkoutStoryModal';
import { SessionSummaryViewModal } from '../workout/SessionSummaryViewModal';
import { SaveRoutineAsTemplateModal } from '../templates/SaveRoutineAsTemplateModal';
import { TemplateSelectorModal } from '../templates/TemplateSelectorModal';
import { CycleDashboardCard } from '../cycles/CycleDashboardCard';

import { calculateAllTimePRs, calculateEstimated1RM, formatPrescriptionSummary, formatTimer, formatWeight } from '../../utils/calculations';
import { normalizeWorkoutRoutine } from '../../db/indexedDB';

import { Student, WorkoutRoutine, RoutineWorkout, WorkoutSession, PhysicalAssessment, TrainingCycle } from '../../types';

import { StudentAccessControlCard } from "./StudentAccessControlCard";
import { StudentPlanTab } from "../plans/StudentPlanTab";
import { StudentPlanSummaryCard } from "../plans/StudentPlanSummaryCard";
import { ProposalDetailModal } from '../proposals/ProposalDetailModal';
import { ProposalPDFModal } from '../proposals/ProposalPDFModal';
import { Proposal } from '../../types/proposal';
import { isUUID } from '../../utils/supabaseHelpers';

interface StudentProfileViewProps {
  student: Student;
  initialTab?: string;
  onBack: () => void;
  onStartWorkout: (
    student: Student,
    routine?: WorkoutRoutine,
    workout?: RoutineWorkout | string,
  ) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student: initialStudent,
  initialTab = "summary",
  onBack,
  onStartWorkout,
}) => {
  const {
    deleteStudent,
    students,
    routines,
    sessions,
    assessments,
    exercises,
    evolutionReports,
    trainerProfile,
    saveRoutine,
    deleteRoutine,
    duplicateRoutine,
    toggleArchiveRoutine,
    saveAssessment,
    deleteAssessment,
    trainingCycles,
    saveTrainingCycle,
    completeTrainingCycle,
    extendTrainingBlock,
    changeBlockRoutine,
    duplicateTrainingCycle,
    proposals,
    deleteSession,
    updateProposalStatus,
    deleteProposal,
    duplicateProposal,
    createProposalRevision,
  } = useApp();

  const student =
    students.find((s) => s.id === initialStudent.id) || initialStudent;

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<Proposal | null>(null);
  const [selectedProposalForPDF, setSelectedProposalForPDF] = useState<Proposal | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showEditStudentModal, setShowEditStudentModal] =
    useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] =
    useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] =
    useState<string>("");
  const [routineToDelete, setRoutineToDelete] = useState<WorkoutRoutine | null>(
    null,
  );
  const [isDeletingRoutine, setIsDeletingRoutine] = useState<boolean>(false);
  const [selectedStorySession, setSelectedStorySession] =
    useState<WorkoutSession | null>(null);
  const [viewingHistorySession, setViewingHistorySession] =
    useState<WorkoutSession | null>(null);
  const [selectedExerciseForEvo, setSelectedExerciseForEvo] =
    useState<string>("");
  const [evolutionMetric, setEvolutionMetric] = useState<
    "weight" | "1rm" | "volume" | "reps"
  >("weight");

  // Cycle Modal State
  const [showCycleEditorModal, setShowCycleEditorModal] =
    useState<boolean>(false);
  const [editingCycleFromProfile, setEditingCycleFromProfile] =
    useState<TrainingCycle | null>(null);

  // Routine Edit / Create Modal State
  const [showRoutineModal, setShowRoutineModal] = useState<boolean>(false);
  const [showTemplateSelector, setShowTemplateSelector] =
    useState<boolean>(false);
  const [routineToSaveAsTemplate, setRoutineToSaveAsTemplate] =
    useState<WorkoutRoutine | null>(null);
  const [selectedRoutineForPDF, setSelectedRoutineForPDF] = useState<WorkoutRoutine | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(
    null,
  );
  const [activeWorkoutTabByRoutine, setActiveWorkoutTabByRoutine] = useState<
    Record<string, string>
  >({});

  const [sessionToDelete, setSessionToDelete] = useState<WorkoutSession | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Assessment Modal State
  const [showAssessmentModal, setShowAssessmentModal] =
    useState<boolean>(false);
  const [showImportPhotoModal, setShowImportPhotoModal] =
    useState<boolean>(false);
  const [selectedAssessmentForDetail, setSelectedAssessmentForDetail] =
    useState<PhysicalAssessment | null>(null);
  const [
    selectedAssessmentForStudentMode,
    setSelectedAssessmentForStudentMode,
  ] = useState<PhysicalAssessment | null>(null);
  const [selectedAssessmentForPDF, setSelectedAssessmentForPDF] =
    useState<PhysicalAssessment | null>(null);
  const [
    selectedAssessmentForPresentation,
    setSelectedAssessmentForPresentation,
  ] = useState<PhysicalAssessment | null>(null);
  const [selectedAssessmentForStory, setSelectedAssessmentForStory] =
    useState<PhysicalAssessment | null>(null);
  const [assessmentEvolutionView, setAssessmentEvolutionView] = useState<
    "overview" | "skinfolds" | "circumferences" | "chart"
  >("overview");
  const [selectedAssessmentChartMetric, setSelectedAssessmentChartMetric] =
    useState<string>("bodyFat");
  const [expandedRawAssessmentId, setExpandedRawAssessmentId] = useState<
    string | null
  >(null);
  const [zoomedAssessmentImage, setZoomedAssessmentImage] = useState<
    string | null
  >(null);

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);
    try {
      await deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } catch (err: any) {
      alert(`Não foi possível excluir o treino. Erro: ${err.message || err.code || 'Desconhecido'}`);
      console.error(err);
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Onboarding Module States

  const handleConfirmDeleteRoutine = async () => {
    if (!routineToDelete) return;
    setIsDeletingRoutine(true);
    try {
      await deleteRoutine(routineToDelete.id);
    } catch (err) {
      console.error("Error deleting routine:", err);
      alert("Não foi possível excluir. Nenhum dado foi removido.");
    } finally {
      setIsDeletingRoutine(false);
      setRoutineToDelete(null);
    }
  };

  const handleDeleteStudent = async () => {
    if (deleteConfirmationText !== "EXCLUIR") return;
    setIsDeleting(true);
    try {
      await deleteStudent(student.id);
      onBack();
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("Não foi possível excluir. Nenhum dado foi removido.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
    }
  };

  

  

  

  // Filter student specific records (Normalized to new multi-workout schema)
  const studentRoutines = useMemo(() => {
    return routines
      .filter((r) => r.studentId === student.id)
      .map((r) => normalizeWorkoutRoutine(r));
  }, [routines, student.id]);

  const studentSessions = useMemo(() => {
    return sessions
      .filter((s) => s.studentId === student.id && s.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
  }, [sessions, student.id]);

  const studentReports = useMemo(() => {
    return (evolutionReports || [])
      .filter((r) => r.studentId === student.id)
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      );
  }, [evolutionReports, student.id]);

  const studentCycles = useMemo(() => {
    return (trainingCycles || []).filter((c) => c.studentId === student.id);
  }, [trainingCycles, student.id]);

  const currentCycle = useMemo(() => {
    return (
      studentCycles.find((c) => c.status === "current") ||
      studentCycles.find((c) => c.status === "planned") ||
      null
    );
  }, [studentCycles]);

  // Calculate next workout in cycle for a routine based on student history
  const getNextWorkoutInRoutine = (routine: WorkoutRoutine): RoutineWorkout => {
    const norm = normalizeWorkoutRoutine(routine);
    if (!norm.workouts || norm.workouts.length === 0) {
      return {
        id: "default",
        routineId: norm.id,
        letter: "A",
        name: "Treino A",
        order: 1,
        exercises: [],
      };
    }
    const pastSessionsForRoutine = studentSessions.filter(
      (s) => s.routineId === norm.id,
    );
    if (pastSessionsForRoutine.length === 0) {
      return norm.workouts[0];
    }
    const lastSession = pastSessionsForRoutine[0];
    const lastWId = lastSession.workoutId;
    const lastWLetter = lastSession.workoutLetter;
    const lastIdx = norm.workouts.findIndex(
      (w) =>
        (lastWId && w.id === lastWId) ||
        (lastWLetter && w.letter === lastWLetter),
    );
    const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % norm.workouts.length : 0;
    return norm.workouts[nextIdx];
  };

  const studentAssessments = useMemo(() => {
    return assessments
      .filter((a) => a.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assessments, student.id]);

  // Assessment comparison (latest vs previous) using centralized engine
  const assessmentComparison = useMemo(() => {
    if (studentAssessments.length >= 2) {
      return compareAssessments(studentAssessments[0], studentAssessments[1]);
    }
    return null;
  }, [studentAssessments]);

  // Distinct exercises previously trained by student
  const trainedExercises = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const session of studentSessions) {
      const sets = Array.isArray(session?.sets) ? session.sets : [];
      for (const set of sets) {
        if (!set || !set.exerciseId) continue;
        if (!map.has(set.exerciseId)) {
          map.set(set.exerciseId, {
            id: set.exerciseId,
            name: set.exerciseName || "Exercício",
            count: 1,
          });
        } else {
          map.get(set.exerciseId)!.count++;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [studentSessions]);

  // Initialize selected exercise for evolution
  useEffect(() => {
    if (!selectedExerciseForEvo) {
      if (trainedExercises.length > 0) {
        setSelectedExerciseForEvo(trainedExercises[0].id);
      } else if (exercises.length > 0) {
        setSelectedExerciseForEvo(exercises[0].id);
      }
    }
  }, [trainedExercises, exercises, selectedExerciseForEvo]);

  // PR computation
  const allTimePRs = calculateAllTimePRs(studentSessions);

  // Total volume & frequency metrics
  const totalVolumeAccumulated = studentSessions.reduce(
    (sum, s) => sum + (s.totalVolume || 0),
    0,
  );
  const averageDuration =
    studentSessions.length > 0
      ? Math.round(
          studentSessions.reduce(
            (sum, s) => sum + (s.durationSeconds || 0),
            0,
          ) / studentSessions.length,
        )
      : 0;

  // Selected exercise evolution data points
  const exerciseEvoData = useMemo(() => {
    if (!selectedExerciseForEvo) return [];
    const points: {
      date: string;
      weight: number;
      reps: number;
      volume: number;
      estimated1RM: number;
      rpe?: number;
    }[] = [];

    // Scan all past sessions for this exercise in chronological order
    const chronoSessions = [...studentSessions].reverse();
    for (const session of chronoSessions) {
      const sessionSets = Array.isArray(session?.sets) ? session.sets : [];
      const sets = sessionSets.filter(
        (s) =>
          s &&
          s.exerciseId === selectedExerciseForEvo &&
          s.status !== "skipped",
      );
      if (sets.length > 0) {
        const bestSet = [...sets].sort(
          (a, b) =>
            (b.weightKg || 0) - (a.weightKg || 0) ||
            (b.actualReps || 0) - (a.actualReps || 0),
        )[0];
        const est1RM = calculateEstimated1RM(
          bestSet.weightKg || 0,
          bestSet.actualReps || 0,
        );
        points.push({
          date: new Date(session.startTime || Date.now()).toLocaleDateString(
            "pt-BR",
            { day: "2-digit", month: "2-digit" },
          ),
          weight: bestSet.weightKg || 0,
          reps: bestSet.actualReps || 0,
          volume: sets.reduce(
            (acc, s) => acc + (s.weightKg || 0) * (s.actualReps || 0),
            0,
          ),
          estimated1RM: est1RM,
          rpe: bestSet.rpe ?? undefined,
        });
      }
    }
    return points;
  }, [studentSessions, selectedExerciseForEvo]);

  const handleDuplicateRoutine = async (routine: WorkoutRoutine) => {
    await duplicateRoutine(routine);
  };

  const studentProposalsCount = useMemo(() => {
    const studentUuid = student.uuid || (isUUID(student.id) ? student.id : null);
    const studentLegacyId = student.legacyId || (!isUUID(student.id) ? student.id : null);

    return (proposals || []).filter((p) => {
      if (p.studentId) {
        if (p.studentId === student.id) return true;
        if (studentUuid && (p.studentId === studentUuid || p.studentUuid === studentUuid)) return true;
        if (studentLegacyId && (p.studentId === studentLegacyId || p.legacyId === studentLegacyId)) return true;
        const matched = students.find(s => s.id === p.studentId || (s.uuid && s.uuid === p.studentId) || (s.legacyId && s.legacyId === p.studentId));
        if (matched && (matched.id === student.id || (studentLegacyId && matched.id === studentLegacyId) || (studentUuid && (matched.uuid === studentUuid || matched.id === studentUuid)))) {
          return true;
        }
      }
      if (p.participants?.some(pt => {
        if (!pt.studentId) return false;
        if (pt.studentId === student.id) return true;
        if (studentUuid && pt.studentId === studentUuid) return true;
        if (studentLegacyId && pt.studentId === studentLegacyId) return true;
        const matched = students.find(s => s.id === pt.studentId || (s.uuid && s.uuid === pt.studentId) || (s.legacyId && s.legacyId === pt.studentId));
        return matched && (matched.id === student.id || (studentLegacyId && matched.id === studentLegacyId) || (studentUuid && (matched.uuid === studentUuid || matched.id === studentUuid)));
      })) return true;
      if (!p.studentId && p.studentSnapshot?.name?.trim().toLowerCase() === student.name.trim().toLowerCase()) return true;
      return false;
    }).length;
  }, [proposals, student.id, student.name, student.uuid, student.legacyId, students]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho compacto do perfil */}
      <section className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#1F2937] text-lg font-black shrink-0">
              {student.name?.trim()?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#1F2937] truncate">{student.name}</h2>
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                {student.goal || "Objetivo não informado"}
                {student.planName ? ` • ${student.planName}` : ""}
              </p>
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${student.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                {student.status === "active" ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowEditStudentModal(true)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Editar cadastro do aluno"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirmModal(true)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-[#E5E7EB] text-[#9B1C1C] text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Excluir aluno"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              onClick={() => onStartWorkout(student, studentRoutines[0])}
              className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Iniciar treino</span>
            </button>
          </div>
        </div>
      </section>

      {/* Navegação principal agrupada por contexto */}
      {(() => {
        const groups = [
          { id: "overview", label: "Visão geral", tabs: [{ id: "summary", label: "Resumo" }] },
          { id: "training", label: "Treinamento", tabs: [
            { id: "routines", label: `Rotinas (${studentRoutines.length})` },
            { id: "history", label: `Histórico (${studentSessions.length})` },
            { id: "evolution", label: "Cargas" },
          ] },
          { id: "assessments", label: "Avaliações", tabs: [
            { id: "assessments", label: `Avaliações físicas (${studentAssessments.length})` },
            { id: "longevity", label: "Funcional" },
          ] },
          { id: "evolution", label: "Evolução", tabs: [
            { id: "reports", label: `Relatórios (${studentReports.length})` },
            { id: "insights", label: "Desempenho" },
            { id: "photos", label: "Fotos e bio" },
          ] },
          { id: "management", label: "Gestão", tabs: [
            { id: "plan", label: studentProposalsCount > 0 ? `Planos e contratos (${studentProposalsCount})` : "Planos e contratos" },
            { id: "access", label: "Acesso TFIVE" },
          ] },
        ];
        const activeGroup = groups.find((group) => group.tabs.some((tab) => tab.id === activeTab)) || groups[0];
        return (
          <div className="space-y-2">
            <nav aria-label="Áreas do perfil do aluno" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#E5E7EB]">
              {groups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => setActiveTab(group.tabs[0].id)}
                  aria-current={activeGroup.id === group.id ? "page" : undefined}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${activeGroup.id === group.id ? "bg-[#374151] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F3F4F6]"}`}
                >
                  {group.label}
                </button>
              ))}
            </nav>
            {activeGroup.tabs.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {activeGroup.tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-[#E5E7EB] text-[#1F2937]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB CONTENT: PROPOSTAS E CONTRATOS */}
      {activeTab === "plan" && (
        <StudentPlanTab
          student={student}
          students={students}
          proposals={proposals}
          onOpenProposalDetail={(p) => setSelectedProposalForDetail(p)}
          onOpenPDF={(p) => setSelectedProposalForPDF(p)}
        />
      )}

      {/* TAB CONTENT: RELATÓRIOS DE PERFORMANCE E EVOLUÇÃO */}
      {activeTab === "reports" && <EvolutionReportsTab student={student} />}
      {activeTab === "insights" && <StudentPerformanceInsightsTab student={student} sessions={studentSessions} />}

      {/* TAB CONTENT: 1. RESUMO & MÉTRICAS (REDESIGN PROFISSIONAL) */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Card de Plano Atual Contratado */}
          <StudentPlanSummaryCard
            student={student}
            proposals={proposals}
            onOpenPlanTab={() => setActiveTab("plan")}
          />

          <StudentMetricsSummaryTab
            student={student}
            sessions={sessions}
            routines={studentRoutines}
            onStartWorkout={onStartWorkout}
          />
        </div>
      )}

      {/* TAB CONTENT: LONGEVIDADE FUNCIONAL */}
      {activeTab === "longevity" && <LongevityTab student={student} />}

      {/* TAB CONTENT: 2. TREINOS */}
      {activeTab === "routines" && (
        <div className="space-y-6">
          {/* CAMADA SUPERIOR: CICLO E BLOCO DE TREINAMENTO ATIVO */}
          <CycleDashboardCard
            student={student}
            currentCycle={currentCycle}
            routines={studentRoutines}
            onStartWorkout={onStartWorkout}
            onViewRoutine={(routineId) => {
              // already on routines tab
            }}
            onOpenNewCycleModal={() => {
              setEditingCycleFromProfile(null);
              setShowCycleEditorModal(true);
            }}
            onEditCycle={(cycle) => {
              setEditingCycleFromProfile(cycle);
              setShowCycleEditorModal(true);
            }}
            onCompleteCycle={completeTrainingCycle}
            onExtendBlock={extendTrainingBlock}
            onChangeBlockRoutine={changeBlockRoutine}
            onDuplicateCycle={duplicateTrainingCycle}
          />

          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-lg font-bold font-display uppercase text-white">
                Rotinas de Treino
              </h3>
              <p className="text-xs text-[#4B5563]">
                Estrutura de planejamento A / B / C associada a {student.name}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRoutine(null);
                setShowTemplateSelector(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Rotina</span>
            </button>
          </div>

          {studentRoutines.length > 0 ? (
            <div className="space-y-5">
              {studentRoutines.map((routine) => {
                const nextWorkout = getNextWorkoutInRoutine(routine);
                const activeWorkoutId =
                  activeWorkoutTabByRoutine[routine.id] ||
                  routine.workouts[0]?.id ||
                  "";
                const selectedWorkout =
                  routine.workouts.find((w) => w.id === activeWorkoutId) ||
                  routine.workouts[0] ||
                  null;

                return (
                  <div
                    key={routine.id}
                    className={`bg-white border rounded-3xl p-5 sm:p-6 transition-all ${
                      routine.isArchived
                        ? "border-zinc-800 opacity-90"
                        : "border-[#E5E7EB] hover:border-zinc-700 shadow-xl"
                    }`}
                  >
                    {/* Routine Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-bold text-[#1F2937] text-lg sm:text-xl truncate">
                            {routine.title}
                          </h4>
                          {routine.objective && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] uppercase">
                              {routine.objective}
                            </span>
                          )}
                          {routine.version && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-nums bg-[#F8F9FA] text-[#71717A] border border-[#E5E7EB]">
                              v{routine.version}
                            </span>
                          )}
                          {routine.isArchived && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Arquivada
                            </span>
                          )}
                        </div>

                        {(routine.description || routine.notes) && (
                          <p className="text-xs text-[#4B5563] line-clamp-2">
                            {routine.notes || routine.description}
                          </p>
                        )}
                      </div>

                      {/* Routine Top Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => setRoutineToSaveAsTemplate(routine)}
                          className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-[#374151] border border-[#E5E7EB] transition-all"
                          title="Salvar esta rotina como modelo na biblioteca"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateRoutine(routine)}
                          className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white border border-[#E5E7EB] transition-all"
                          title="Duplicar rotina completa (com todos os treinos)"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleArchiveRoutine(routine.id)}
                          className={`p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] transition-all ${
                            routine.isArchived
                              ? "text-amber-400"
                              : "text-[#4B5563] hover:text-white"
                          }`}
                          title={
                            routine.isArchived
                              ? "Desarquivar rotina"
                              : "Arquivar rotina"
                          }
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRoutine(routine);
                            setShowRoutineModal(true);
                          }}
                          className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white border border-[#E5E7EB] transition-all"
                          title="Editar rotina"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                `Deseja realmente excluir a rotina "${routine.title}"?`,
                              )
                            ) {
                              await deleteRoutine(routine.id);
                            }
                          }}
                          className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-[#374151] border border-[#E5E7EB] transition-all"
                          title="Excluir rotina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Workouts Internal Navigation (Treinos A, B, C...) */}
                    <div className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                          Treinos da Rotina ({routine.workouts.length})
                        </span>
                        {nextWorkout && (
                          <span className="text-[11px] font-bold text-[#374151] flex items-center gap-1 bg-[#F3F4F6] px-2.5 py-0.5 rounded-full">
                            <span>Próximo do ciclo:</span>
                            <span className="text-white font-black">
                              Treino {nextWorkout.letter}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {routine.workouts.map((w, wIdx) => {
                          const isSelected = selectedWorkout?.id === w.id;
                          const isNext = nextWorkout?.id === w.id;

                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() =>
                                setActiveWorkoutTabByRoutine((prev) => ({
                                  ...prev,
                                  [routine.id]: w.id,
                                }))
                              }
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                                isSelected
                                  ? "bg-white text-black font-black shadow-md"
                                  : "bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB]"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-mono-nums text-[10px] font-black ${
                                  isSelected
                                    ? "bg-black text-white"
                                    : "bg-[#27272A] text-[#374151]"
                                }`}
                              >
                                {w.letter || String.fromCharCode(65 + wIdx)}
                              </span>
                              <span className="truncate max-w-[140px]">
                                {w.name}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] ${
                                  isSelected
                                    ? "bg-zinc-200 text-zinc-800"
                                    : "bg-[#27272A] text-[#71717A]"
                                }`}
                              >
                                {w.exercises.length}
                              </span>
                              {isNext && (
                                <span
                                  className="w-2 h-2 rounded-full bg-[#374151] animate-pulse"
                                  title="Próximo treino a ser realizado"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Workout Exercises Panel */}
                      {selectedWorkout && (
                        <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3 mt-2">
                          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-[#1F2937] truncate">
                                Treino {selectedWorkout.letter}:{" "}
                                {selectedWorkout.name}
                              </span>
                              <span className="text-[10px] text-[#71717A]">
                                ({selectedWorkout.exercises.length} exercícios)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onStartWorkout(
                                  student,
                                  routine,
                                  selectedWorkout,
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md shadow-xs"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>
                                Iniciar Treino {selectedWorkout.letter}
                              </span>
                            </button>
                          </div>

                          {selectedWorkout.exercises.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedWorkout.exercises.map((ex, exIdx) => {
                                return (
                                  <div
                                    key={ex.id || exIdx}
                                    className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-5 h-5 rounded-md bg-[#27272A] text-zinc-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {exIdx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-[#1F2937] truncate block max-w-[140px] sm:max-w-[180px]">
                                            {ex.exerciseName}
                                          </span>
                                          {ex.groupId && (
                                            <span className="px-1.5 py-0.2 rounded bg-[#F3F4F6] text-[#374151] text-[9px] font-black uppercase">
                                              {ex.groupType === "bi_set"
                                                ? "Bi-Set"
                                                : ex.groupType === "tri_set"
                                                  ? "Tri-Set"
                                                  : "Circuito"}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-[#71717A] block">
                                          {ex.muscleGroup}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[#4B5563] font-mono-nums font-medium text-[11px] shrink-0 text-right">
                                      {formatPrescriptionSummary(ex)}
                                      <span className="text-[10px] text-[#71717A] block">
                                        {ex.restSeconds}s{" "}
                                        {ex.targetRPE
                                          ? `• RPE ${ex.targetRPE}`
                                          : ""}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-[#71717A] italic py-2 text-center">
                              Nenhum exercício cadastrado no Treino{" "}
                              {selectedWorkout.letter}.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Routine Primary Action: Start Selected Workout or Next in Cycle */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      {selectedWorkout ? (
                        <button
                          type="button"
                          onClick={() =>
                            onStartWorkout(student, routine, selectedWorkout)
                          }
                          className="flex-1 py-3.5 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-xs"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>
                            INICIAR TREINO {selectedWorkout.letter}:{" "}
                            {selectedWorkout.name}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onStartWorkout(
                              student,
                              routine,
                              nextWorkout || undefined,
                            )
                          }
                          className="flex-1 py-3.5 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-xs"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>
                            {nextWorkout
                              ? `INICIAR TREINO ${nextWorkout.letter}: ${nextWorkout.name}`
                              : "INICIAR TREINO COM ESTA ROTINA"}
                          </span>
                        </button>
                      )}

                      {nextWorkout &&
                        selectedWorkout &&
                        nextWorkout.id !== selectedWorkout.id && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartWorkout(student, routine, nextWorkout)
                            }
                            className="py-3 px-4 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                            title="Iniciar o próximo treino da sequência calculada"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#374151]" />
                            <span>Ciclo: Treino {nextWorkout.letter}</span>
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-[#E5E7EB] rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F8F9FA] border border-white/5 flex items-center justify-center text-[#374151]">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#1F2937]">
                  Nenhuma rotina de treino cadastrada
                </h4>
                <p className="text-xs text-[#4B5563] mt-1 max-w-sm">
                  Crie a primeira rotina (com Treinos A, B, C...) para
                  prescrever exercícios, séries, repetições e intervalos de
                  descanso para {student.name}.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRoutine(null);
                  setShowTemplateSelector(true);
                }}
                className="mt-2 px-6 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>CRIAR PRIMEIRA ROTINA</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. AVALIAÇÕES */}
      {activeTab === "assessments" && (
        <div className="space-y-5">
          {/* HEADER WITH CALL-TO-ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold font-display uppercase text-white">
                Avaliação Física & Composição Corporal
              </h3>
              <p className="text-xs text-[#4B5563]">
                Jackson & Pollock 7 Dobras • Equação de Siri • Antropometria •
                Evolução Automática
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAssessmentModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>NOVA AVALIAÇÃO FÍSICA</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportPhotoModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#374151]" />
                <span>Importar por Foto</span>
              </button>
            </div>
          </div>

          {/* SINGLE ASSESSMENT: BASELINE BANNER */}
          {studentAssessments.length === 1 && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-[#374151]" />
                <span className="text-xs font-black uppercase font-display tracking-wider">
                  Linha de Base Registrada
                </span>
                <span className="text-xs text-[#4B5563] ml-auto">
                  Avaliação inicial em{" "}
                  {new Date(studentAssessments[0].date).toLocaleDateString(
                    "pt-BR",
                  )}
                </span>
              </div>
              <p className="text-xs text-[#4B5563]">
                Esta é a avaliação de referência inicial do aluno. A partir da
                próxima avaliação, o TFIVE exibirá comparativos de evolução
                corporal com deltas automáticos.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-center text-xs">
                <div className="bg-[#F8F9FA] p-3 rounded-xl">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">
                    Peso
                  </span>
                  <span className="text-base font-black font-mono-nums text-white">
                    {formatNumberBR(studentAssessments[0].weightKg)} kg
                  </span>
                </div>
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#374151] uppercase font-bold block">
                    % Gordura
                  </span>
                  <span className="text-base font-black font-mono-nums text-white">
                    {formatNumberBR(studentAssessments[0].bodyFatPercentage)}%
                  </span>
                </div>
                <div className="bg-[#F8F9FA] p-3 rounded-xl">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                    Massa Magra
                  </span>
                  <span className="text-base font-black font-mono-nums text-white">
                    {formatNumberBR(studentAssessments[0].leanMassKg)} kg
                  </span>
                </div>
                <div className="bg-[#F8F9FA] p-3 rounded-xl">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">
                    Massa Gorda
                  </span>
                  <span className="text-base font-black font-mono-nums text-white">
                    {formatNumberBR(studentAssessments[0].fatMassKg)} kg
                  </span>
                </div>
                {studentAssessments[0].sumOfSkinfolds && (
                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">
                      Soma Dobras
                    </span>
                    <span className="text-base font-black font-mono-nums text-white">
                      {formatNumberBR(studentAssessments[0].sumOfSkinfolds)} mm
                    </span>
                  </div>
                )}
                {studentAssessments[0].bmi && (
                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">
                      IMC
                    </span>
                    <span className="text-base font-black font-mono-nums text-white">
                      {formatNumberBR(studentAssessments[0].bmi)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2+ ASSESSMENTS: EVOLUÇÃO COMPARATIVA COMPLETA */}
          {assessmentComparison && (
            <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-lg shadow-black/40">
              {/* TOP HEADER: INTERVAL & VIEW TOGGLE PILLS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#374151] animate-pulse"></span>
                    <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
                      Evolução Desde a Última Avaliação
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    {new Date(
                      assessmentComparison.previous.date,
                    ).toLocaleDateString("pt-BR")}{" "}
                    →{" "}
                    {new Date(
                      assessmentComparison.latest.date,
                    ).toLocaleDateString("pt-BR")}{" "}
                    ({assessmentComparison.daysBetween} dias de intervalo)
                  </p>
                </div>

                {/* Sub-navigation pills */}
                <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E7EB] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setAssessmentEvolutionView("overview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      assessmentEvolutionView === "overview"
                        ? "bg-[#374151] text-white"
                        : "text-[#4B5563] hover:text-white"
                    }`}
                  >
                    Visão Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentEvolutionView("skinfolds")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      assessmentEvolutionView === "skinfolds"
                        ? "bg-[#374151] text-white"
                        : "text-[#4B5563] hover:text-white"
                    }`}
                  >
                    Ver Dobras (mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentEvolutionView("circumferences")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      assessmentEvolutionView === "circumferences"
                        ? "bg-[#374151] text-white"
                        : "text-[#4B5563] hover:text-white"
                    }`}
                  >
                    Perímetros (cm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentEvolutionView("chart")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      assessmentEvolutionView === "chart"
                        ? "bg-[#374151] text-white"
                        : "text-[#4B5563] hover:text-white"
                    }`}
                  >
                    Gráficos
                  </button>
                </div>
              </div>

              {/* VIEW 1: OVERVIEW METRIC CARDS */}
              {assessmentEvolutionView === "overview" && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  {/* % GORDURA */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-3.5 rounded-xl">
                    <span className="text-[#4B5563] block text-[10px] uppercase font-bold">
                      Gordura Corporal
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs text-[#71717A] font-mono-nums">
                        {formatNumberBR(
                          assessmentComparison.previous.bodyFatPercentage,
                        )}
                        % →
                      </span>
                      <strong className="text-base font-mono-nums text-white">
                        {formatNumberBR(
                          assessmentComparison.latest.bodyFatPercentage,
                        )}
                        %
                      </strong>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          assessmentComparison.deltas.bodyFatPercentage <= 0
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {assessmentComparison.deltas.bodyFatPercentage <= 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {formatPercentagePointsBR(
                          assessmentComparison.deltas.bodyFatPercentage,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* MASSA MAGRA */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-3.5 rounded-xl">
                    <span className="text-[#4B5563] block text-[10px] uppercase font-bold">
                      Massa Magra
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs text-[#71717A] font-mono-nums">
                        {formatNumberBR(
                          assessmentComparison.previous.leanMassKg,
                        )}{" "}
                        →
                      </span>
                      <strong className="text-base font-mono-nums text-white">
                        {formatNumberBR(assessmentComparison.latest.leanMassKg)}{" "}
                        kg
                      </strong>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          assessmentComparison.deltas.leanMassKg >= 0
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {assessmentComparison.deltas.leanMassKg >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {formatDeltaValueBR(
                          assessmentComparison.deltas.leanMassKg,
                          "kg",
                        )}
                      </span>
                    </div>
                  </div>

                  {/* PESO TOTAL */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-3.5 rounded-xl">
                    <span className="text-[#4B5563] block text-[10px] uppercase font-bold">
                      Peso Corporal
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs text-[#71717A] font-mono-nums">
                        {formatNumberBR(assessmentComparison.previous.weightKg)}{" "}
                        →
                      </span>
                      <strong className="text-base font-mono-nums text-white">
                        {formatNumberBR(assessmentComparison.latest.weightKg)}{" "}
                        kg
                      </strong>
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md bg-[#27272A] text-white">
                        {formatDeltaValueBR(
                          assessmentComparison.deltas.weightKg,
                          "kg",
                        )}
                      </span>
                    </div>
                  </div>

                  {/* MASSA GORDA */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-3.5 rounded-xl">
                    <span className="text-[#4B5563] block text-[10px] uppercase font-bold">
                      Massa Gorda
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs text-[#71717A] font-mono-nums">
                        {formatNumberBR(
                          assessmentComparison.previous.fatMassKg,
                        )}{" "}
                        →
                      </span>
                      <strong className="text-base font-mono-nums text-white">
                        {formatNumberBR(assessmentComparison.latest.fatMassKg)}{" "}
                        kg
                      </strong>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          assessmentComparison.deltas.fatMassKg <= 0
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {assessmentComparison.deltas.fatMassKg <= 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {formatDeltaValueBR(
                          assessmentComparison.deltas.fatMassKg,
                          "kg",
                        )}
                      </span>
                    </div>
                  </div>

                  {/* SOMA DAS 7 DOBRAS */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-3.5 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[#4B5563] block text-[10px] uppercase font-bold">
                      Soma das Dobras
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs text-[#71717A] font-mono-nums">
                        {assessmentComparison.previous.sumOfSkinfolds
                          ? `${formatNumberBR(assessmentComparison.previous.sumOfSkinfolds)} →`
                          : "—"}
                      </span>
                      <strong className="text-base font-mono-nums text-white">
                        {assessmentComparison.latest.sumOfSkinfolds
                          ? `${formatNumberBR(assessmentComparison.latest.sumOfSkinfolds)} mm`
                          : "—"}
                      </strong>
                    </div>
                    <div className="mt-2">
                      {assessmentComparison.deltas.sumOfSkinfolds !==
                      undefined ? (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                            assessmentComparison.deltas.sumOfSkinfolds <= 0
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {assessmentComparison.deltas.sumOfSkinfolds <= 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <TrendingUp className="w-3 h-3" />
                          )}
                          {formatDeltaValueBR(
                            assessmentComparison.deltas.sumOfSkinfolds,
                            "mm",
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#71717A]">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: SKINFOLDS COMPARISON TABLE */}
              {assessmentEvolutionView === "skinfolds" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F2937] uppercase">
                      Comparativo Ponto a Ponto de Dobras Cutâneas (mm)
                    </span>
                    {assessmentComparison.deltas.sumOfSkinfolds !==
                      undefined && (
                      <span className="text-xs font-mono-nums text-[#374151] font-bold">
                        Variação Total:{" "}
                        {formatDeltaValueBR(
                          assessmentComparison.deltas.sumOfSkinfolds,
                          "mm",
                        )}
                      </span>
                    )}
                  </div>
                  {assessmentComparison.skinfoldComparisons.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {assessmentComparison.skinfoldComparisons.map((item) => (
                        <div
                          key={item.key}
                          className="bg-[#F8F9FA] border border-[#E5E7EB] p-3 rounded-xl"
                        >
                          <span className="text-[#4B5563] text-[11px] font-bold block truncate">
                            {item.label}
                          </span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-xs text-[#71717A] font-mono-nums">
                              {item.previous} →{" "}
                              <strong className="text-white text-sm">
                                {item.current}
                              </strong>{" "}
                              mm
                            </span>
                            <span
                              className={`text-[11px] font-black font-mono-nums ${item.diff <= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {formatDeltaValueBR(item.diff, "mm")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#71717A] py-2">
                      Dados de dobras cutâneas individuais indisponíveis para
                      comparação direta entre estas duas avaliações.
                    </p>
                  )}
                </div>
              )}

              {/* VIEW 3: CIRCUMFERENCES COMPARISON */}
              {assessmentEvolutionView === "circumferences" && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#1F2937] uppercase block">
                    Comparativo de Perímetros e Circunferências (cm)
                  </span>
                  {assessmentComparison.circumferenceComparisons.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {assessmentComparison.circumferenceComparisons.map(
                        (item) => (
                          <div
                            key={item.key}
                            className="bg-[#F8F9FA] border border-[#E5E7EB] p-3 rounded-xl"
                          >
                            <span className="text-[#4B5563] text-[11px] font-bold block truncate">
                              {item.label}
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-xs text-[#71717A] font-mono-nums">
                                {item.previous} →{" "}
                                <strong className="text-white text-sm">
                                  {item.current}
                                </strong>{" "}
                                cm
                              </span>
                              <span
                                className={`text-[11px] font-black font-mono-nums ${item.diff <= 0 ? "text-emerald-400" : "text-amber-400"}`}
                              >
                                {formatDeltaValueBR(item.diff, "cm")}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#71717A] py-2">
                      Circunferências corporais não registradas nas avaliações
                      comparadas.
                    </p>
                  )}
                </div>
              )}

              {/* VIEW 4: PROGRESSION CHART */}
              {assessmentEvolutionView === "chart" && (
                <div className="space-y-4">
                  {/* Metric selector */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#4B5563] mr-1">
                      Métrica:
                    </span>
                    {[
                      { id: "bodyFat", label: "% Gordura" },
                      { id: "leanMass", label: "Massa Magra (kg)" },
                      { id: "weight", label: "Peso Total (kg)" },
                      { id: "fatMass", label: "Massa Gorda (kg)" },
                      { id: "skinfoldsSum", label: "Soma Dobras (mm)" },
                      { id: "waist", label: "Cintura (cm)" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedAssessmentChartMetric(m.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedAssessmentChartMetric === m.id
                            ? "bg-[#374151] text-white"
                            : "bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Chart Visual Bars */}
                  <div className="h-44 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 flex items-end justify-between gap-2 overflow-x-auto">
                    {(() => {
                      const chronoSorted = [...studentAssessments].reverse();
                      const values = chronoSorted
                        .map((a) => {
                          let val = 0;
                          if (selectedAssessmentChartMetric === "bodyFat")
                            val = a.bodyFatPercentage || 0;
                          else if (selectedAssessmentChartMetric === "leanMass")
                            val = a.leanMassKg || 0;
                          else if (selectedAssessmentChartMetric === "weight")
                            val = a.weightKg || 0;
                          else if (selectedAssessmentChartMetric === "fatMass")
                            val = a.fatMassKg || 0;
                          else if (
                            selectedAssessmentChartMetric === "skinfoldsSum"
                          )
                            val =
                              a.sumOfSkinfolds ||
                              (a.skinfolds
                                ? calculateSumOf7Skinfolds(a.skinfolds)
                                : 0);
                          else if (selectedAssessmentChartMetric === "waist")
                            val = a.circumferences?.waist || 0;
                          return { date: a.date, val };
                        })
                        .filter((item) => item.val > 0);

                      if (values.length === 0) {
                        return (
                          <div className="w-full text-center text-xs text-[#71717A] self-center">
                            Nenhum registro para esta métrica no histórico.
                          </div>
                        );
                      }

                      const maxVal =
                        Math.max(...values.map((v) => v.val)) * 1.15;

                      return values.map((v, i) => {
                        const hPct = Math.max(
                          15,
                          Math.min(100, Math.round((v.val / maxVal) * 100)),
                        );
                        const isLast = i === values.length - 1;

                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group min-w-[50px]"
                          >
                            <span
                              className={`text-xs font-mono-nums font-bold ${isLast ? "text-[#374151]" : "text-white"}`}
                            >
                              {formatNumberBR(v.val)}
                            </span>
                            <div
                              style={{ height: `${hPct}%` }}
                              className={`w-full max-w-[48px] rounded-t-lg transition-all ${
                                isLast
                                  ? "bg-[#374151]"
                                  : "bg-[#3F3F46] group-hover:bg-[#52525B]"
                              }`}
                            />
                            <span className="text-[10px] text-[#4B5563] font-mono-nums truncate">
                              {new Date(v.date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTÓRICO DE AVALIAÇÕES */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                Histórico Completo ({studentAssessments.length})
              </h4>
            </div>

            {studentAssessments.length > 0 ? (
              studentAssessments.map((item) => {
                const protocolLabels: Record<string, string> = {
                  jackson_pollock_7: "Jackson & Pollock — 7 Dobras",
                  jackson_pollock_3: "Jackson & Pollock — 3 Dobras",
                  bioimpedance: "Bioimpedância Tetrapolar",
                  external_app: "Relatório / App Externo",
                  other: "Outro",
                };

                const isExpanded = expandedRawAssessmentId === item.id;
                const effectiveSum =
                  item.sumOfSkinfolds ||
                  (item.skinfolds
                    ? calculateSumOf7Skinfolds(item.skinfolds)
                    : undefined);

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all rounded-2xl p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        {/* Tags / Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider font-mono-nums">
                            {new Date(item.date).toLocaleDateString("pt-BR", {
                              dateStyle: "medium",
                            })}
                          </span>

                          {item.source === "photo_import" ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Importada por Foto
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#F8F9FA] text-[#4B5563] border border-[#E5E7EB] text-[10px] font-bold">
                              {protocolLabels[item.protocol] ||
                                item.formulaUsed ||
                                item.protocol}
                            </span>
                          )}

                          {item.bmi && (
                            <span className="px-2 py-0.5 rounded-md bg-[#F8F9FA] text-[#4B5563] border border-[#E5E7EB] text-[10px] font-mono-nums font-bold">
                              IMC {formatNumberBR(item.bmi)}
                            </span>
                          )}

                          {item.waistHipRatio && (
                            <span className="px-2 py-0.5 rounded-md bg-[#F8F9FA] text-[#4B5563] border border-[#E5E7EB] text-[10px] font-mono-nums font-bold">
                              RCQ {item.waistHipRatio}
                            </span>
                          )}
                        </div>

                        {/* Core Metric Highlights */}
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm font-bold pt-1">
                          <span className="text-white">
                            Peso:{" "}
                            <strong className="font-mono-nums">
                              {formatNumberBR(item.weightKg)} kg
                            </strong>
                          </span>
                          <span className="text-[#374151]">
                            Gordura:{" "}
                            <strong className="font-mono-nums">
                              {formatNumberBR(item.bodyFatPercentage)}%
                            </strong>
                          </span>
                          <span className="text-emerald-400">
                            Massa Magra:{" "}
                            <strong className="font-mono-nums">
                              {formatNumberBR(item.leanMassKg)} kg
                            </strong>
                          </span>
                          <span className="text-[#4B5563]">
                            Massa Gorda:{" "}
                            <strong className="font-mono-nums">
                              {formatNumberBR(item.fatMassKg)} kg
                            </strong>
                          </span>
                          {effectiveSum && (
                            <span className="text-[#4B5563]">
                              Soma Dobras:{" "}
                              <strong className="font-mono-nums">
                                {formatNumberBR(effectiveSum)} mm
                              </strong>
                            </span>
                          )}
                        </div>

                        {/* Circumferences short line */}
                        {item.circumferences &&
                          Object.keys(item.circumferences).length > 0 && (
                            <p className="text-xs text-[#71717A]">
                              {item.circumferences.waist
                                ? `Cintura: ${item.circumferences.waist}cm • `
                                : ""}
                              {item.circumferences.hips
                                ? `Quadril: ${item.circumferences.hips}cm • `
                                : ""}
                              {item.circumferences.rightArmContracted
                                ? `Braço: ${item.circumferences.rightArmContracted}cm • `
                                : ""}
                              {item.circumferences.rightThigh
                                ? `Coxa: ${item.circumferences.rightThigh}cm`
                                : ""}
                            </p>
                          )}
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                        {/* VER RELATÓRIO COMPLETO */}
                        <button
                          type="button"
                          onClick={() => setSelectedAssessmentForDetail(item)}
                          className="px-3 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-xs transition-all cursor-pointer"
                          title="Abrir Relatório Completo da Avaliação Física"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Relatório</span>
                        </button>

                        {/* MODO ALUNO */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAssessmentForStudentMode(item)
                          }
                          className="px-3 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Apresentar resultado ao aluno (Modo Tela Cheia)"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#374151]" />
                          <span className="hidden sm:inline">Modo Aluno</span>
                        </button>

                        {/* PDF A4 */}
                        <button
                          type="button"
                          onClick={() => setSelectedAssessmentForPDF(item)}
                          className="px-3 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Gerar PDF Oficial A4"
                        >
                          <Printer className="w-3.5 h-3.5 text-zinc-300" />
                          <span>PDF</span>
                        </button>

                        {/* GERAR STORY PNG */}
                        <button
                          type="button"
                          onClick={() => setSelectedAssessmentForStory(item)}
                          className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Gerar Story 9:16 de evolução corporal"
                        >
                          <Share2 className="w-3.5 h-3.5 text-white" />
                        </button>

                        {/* TOGGLE RAW FOLDS ACCORDION */}
                        {(item.skinfolds || item.circumferences) && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRawAssessmentId(
                                isExpanded ? null : item.id,
                              )
                            }
                            className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white text-xs font-bold transition-all cursor-pointer"
                            title="Ver dados brutos e dobras"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.originalImageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedAssessmentImage(item.originalImageUrl!)
                            }
                            className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white transition-all cursor-pointer"
                            title="Ver foto do relatório original"
                          >
                            <Camera className="w-4 h-4 text-[#374151]" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Excluir esta avaliação física permanentemente?",
                              )
                            ) {
                              deleteAssessment(item.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-[#F8F9FA] text-[#4B5563] hover:text-[#374151] hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-all cursor-pointer"
                          title="Excluir avaliação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED RAW MEASURES ACCORDION */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-[#E5E7EB] space-y-3 animate-in fade-in duration-150">
                        {item.skinfolds &&
                          Object.keys(item.skinfolds).length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] block mb-1.5">
                                Dobras Cutâneas Registradas (mm):
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                                {Object.entries(SKINFOLD_LABELS_PT).map(
                                  ([k, label]) => {
                                    const val = (item.skinfolds as any)?.[k];
                                    const multi =
                                      item.skinfoldMeasurements?.[k];
                                    return (
                                      <div
                                        key={k}
                                        className="bg-[#F8F9FA] border border-[#E5E7EB] p-2.5 rounded-xl"
                                      >
                                        <span className="text-[10px] text-[#4B5563] block truncate">
                                          {label}
                                        </span>
                                        <span className="text-sm font-black font-mono-nums text-white">
                                          {val !== undefined
                                            ? `${val} mm`
                                            : "—"}
                                        </span>
                                        {multi && multi.length > 1 && (
                                          <span className="text-[9px] text-[#71717A] block font-mono-nums truncate">
                                            M: [{multi.join(", ")}]
                                          </span>
                                        )}
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          )}

                        {item.circumferences &&
                          Object.keys(item.circumferences).length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] block mb-1.5">
                                Perimetria Completa (cm):
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                                {Object.entries(item.circumferences).map(
                                  ([k, val]) => (
                                    <div
                                      key={k}
                                      className="bg-[#F8F9FA] border border-[#E5E7EB] p-2 rounded-xl flex justify-between items-center"
                                    >
                                      <span className="text-[10px] text-[#4B5563] truncate">
                                        {(CIRCUMFERENCE_LABELS_PT as any)[k] ||
                                          k}
                                        :
                                      </span>
                                      <span className="text-xs font-bold font-mono-nums text-white">
                                        {val} cm
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {item.notes && (
                          <p className="text-xs text-[#4B5563] bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB] italic">
                            Observações: {item.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 px-4 bg-white border border-[#E5E7EB] rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center mx-auto">
                  <Scale className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">
                  Nenhuma avaliação física cadastrada
                </h4>
                <p className="text-xs text-[#4B5563] max-w-sm mx-auto">
                  Realize uma nova avaliação com cálculo automático Jackson &
                  Pollock ou importe um relatório por foto.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>NOVA AVALIAÇÃO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportPhotoModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#374151]" />
                    <span>Importar por Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. HISTÓRICO */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-display uppercase text-white">
            Histórico de Treinos Finalizados
          </h3>

          {studentSessions.length > 0 ? (
            studentSessions.map((session) => {
              const workoutLabel = session.workoutLetter
                ? `Treino ${session.workoutLetter}${session.workoutName && session.workoutName !== `Treino ${session.workoutLetter}` ? `: ${session.workoutName}` : ""}`
                : "";

              return (
                <div
                  key={session.id}
                  className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all rounded-2xl p-5 group"
                >
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#374151] uppercase">
                          {new Date(session.startTime).toLocaleDateString(
                            "pt-BR",
                            { dateStyle: "full" },
                          )}
                        </span>
                        {workoutLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] text-[10px] font-black uppercase">
                            {workoutLabel}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-[#1F2937] mt-0.5">
                        {session.routineTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#1F2937] font-mono-nums">
                          {formatTimer(session.durationSeconds)}
                        </span>
                        <p className="text-[11px] text-[#4B5563]">
                          Vol: {formatWeight(session.totalVolume)}
                        </p>
                      </div>

                      <button
                        onClick={() => setViewingHistorySession(session)}
                        title="Ver resumo completo e mapa corporal deste treino"
                        className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Eye className="w-4 h-4 text-[#374151]" />
                        <span className="hidden sm:inline">Ver Resumo</span>
                      </button>

                      <button
                        onClick={() => setSelectedStorySession(session)}
                        title="Gerar Story PNG deste treino"
                        className="p-2.5 rounded-xl bg-[#F8F9FA] group-hover:bg-[#1F2937] text-[#4B5563] group-hover:text-white border border-[#E5E7EB] group-hover:border-[#374151] transition-all flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">Story</span>
                      </button>
                      <button
                        onClick={() => setSessionToDelete(session)}
                        title="Excluir treino (ex. treino de teste)"
                        className="p-2.5 rounded-xl bg-[#FEF2F2] hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#FEE2E2] hover:border-[#EF4444] transition-all flex items-center justify-center group/del"
                      >
                        <Trash2 className="w-4 h-4 text-[#EF4444] group-hover/del:text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {session.sets.map((set, idx) => (
                      <div
                        key={set.id || idx}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-[#F8F9FA]"
                      >
                        <span className="font-semibold text-[#1F2937] truncate max-w-[220px]">
                          {set.exerciseName}
                        </span>
                        <span className="font-mono-nums text-[#4B5563]">
                          {set.weightKg}kg × {set.actualReps}{" "}
                          {set.rpe && `(RPE ${set.rpe})`} {set.isPR && "🔥 PR"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[#4B5563] text-center py-8">
              Nenhum treino registrado ainda para este aluno.
            </p>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. EVOLUÇÃO DE CARGAS */}
      {activeTab === "evolution" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold font-display uppercase text-white">
                  Evolução de Performance por Exercício
                </h3>
                <p className="text-xs text-[#4B5563]">
                  Curva real de sobrecarga progressiva
                </p>
              </div>

              {/* Metric & Exercise Pickers */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={evolutionMetric}
                  onChange={(e) => setEvolutionMetric(e.target.value as any)}
                  className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                >
                  <option value="weight">Carga Máxima (kg)</option>
                  <option value="1rm">1RM Estimado (kg)</option>
                  <option value="volume">Volume da Sessão (kg)</option>
                  <option value="reps">Repetições</option>
                </select>

                <select
                  value={selectedExerciseForEvo}
                  onChange={(e) => setSelectedExerciseForEvo(e.target.value)}
                  className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151] max-w-[220px] truncate"
                >
                  {trainedExercises.map((te) => (
                    <option key={te.id} value={te.id}>
                      ★ {te.name} ({te.count}x)
                    </option>
                  ))}
                  {exercises
                    .filter((e) => !trainedExercises.some((t) => t.id === e.id))
                    .slice(0, 30)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {exerciseEvoData.length > 0 ? (
              <>
                {/* Metric Summary for this exercise */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-[#F8F9FA] p-3.5 rounded-xl text-center border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold">
                      Carga Inicial
                    </span>
                    <p className="text-xl font-bold text-[#1F2937] font-mono-nums">
                      {exerciseEvoData[0]?.weight} kg
                    </p>
                  </div>
                  <div className="bg-[#F8F9FA] p-3.5 rounded-xl text-center border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold">
                      Última Carga
                    </span>
                    <p className="text-xl font-bold text-[#1F2937] font-mono-nums">
                      {exerciseEvoData[exerciseEvoData.length - 1]?.weight} kg
                    </p>
                  </div>
                  <div className="bg-[#F8F9FA] p-3.5 rounded-xl text-center border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#374151] uppercase font-bold">
                      Melhor Marca (PR)
                    </span>
                    <p className="text-xl font-black text-[#374151] font-mono-nums">
                      {Math.max(...exerciseEvoData.map((d) => d.weight))} kg
                    </p>
                  </div>
                  <div className="bg-[#F8F9FA] p-3.5 rounded-xl text-center border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold">
                      1RM Estimado Atual
                    </span>
                    <p className="text-xl font-bold text-[#1F2937] font-mono-nums">
                      {
                        exerciseEvoData[exerciseEvoData.length - 1]
                          ?.estimated1RM
                      }{" "}
                      kg
                    </p>
                  </div>
                </div>

                {/* Interactive Progression Bar Chart */}
                <div className="h-48 sm:h-56 flex items-end gap-3 sm:gap-6 pt-8 border-b border-[#E5E7EB] px-4">
                  {exerciseEvoData.map((pt, i) => {
                    let displayVal = pt.weight;
                    let suffix = "kg";
                    if (evolutionMetric === "1rm") displayVal = pt.estimated1RM;
                    if (evolutionMetric === "volume") displayVal = pt.volume;
                    if (evolutionMetric === "reps") {
                      displayVal = pt.reps;
                      suffix = "r";
                    }

                    const allVals = exerciseEvoData.map((d) => {
                      if (evolutionMetric === "1rm") return d.estimated1RM;
                      if (evolutionMetric === "volume") return d.volume;
                      if (evolutionMetric === "reps") return d.reps;
                      return d.weight;
                    });
                    const maxMetricVal = Math.max(...allVals, 1);
                    const heightPercent = Math.max(
                      20,
                      Math.round((displayVal / maxMetricVal) * 100),
                    );

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                      >
                        <span className="text-xs font-mono-nums font-bold text-[#1F2937] whitespace-nowrap">
                          {displayVal}
                          {suffix}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[42px] bg-[#374151] rounded-t-lg transition-all group-hover:brightness-125 relative"
                        />
                        <span className="text-[10px] text-[#4B5563] font-mono-nums">
                          {pt.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-[#4B5563] py-8 text-center">
                Nenhum histórico gravado para este exercício ainda. Conclua
                treinos registrando este exercício para visualizar a evolução
                gráfica.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. FOTOS */}
      {activeTab === "photos" && <EvolutionPhotosGallery student={student} />}

      {/* TAB CONTENT: ACESSO TFIVE (MODO ALUNO - ETAPA 1) */}
      {activeTab === "access" && <StudentAccessControlCard student={student} />}

      {/* Student Edit Profile Modal */}
      {routineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Excluir rotina?
            </h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              A rotina <span className="font-bold">{routineToDelete.name}</span>{" "}
              será removida dos treinos atuais. O histórico de treinos já
              realizados será preservado.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRoutineToDelete(null)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteRoutine}
                disabled={isDeletingRoutine}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-80 transition-colors flex items-center gap-2"
              >
                {isDeletingRoutine ? "Excluindo..." : "Excluir rotina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Excluir treino concluído?
            </h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Essa ação removerá este treino ({sessionToDelete.routineTitle}) e seus dados associados permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => !isDeletingSession && setSessionToDelete(null)}
                disabled={isDeletingSession}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteSession}
                disabled={isDeletingSession}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-80 transition-colors flex items-center gap-2"
              >
                {isDeletingSession ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Excluir aluno permanentemente?
            </h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Esta ação removerá os dados operacionais vinculados ao aluno{" "}
              <span className="font-bold">{student.name}</span> e não poderá ser
              desfeita.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digite "EXCLUIR" para confirmar.
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="EXCLUIR"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmationText("");
                }}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={deleteConfirmationText !== "EXCLUIR" || isDeleting}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-80 transition-colors flex items-center gap-2"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStudentModal && (
        <StudentEditModal
          student={student}
          onClose={() => setShowEditStudentModal(false)}
        />
      )}

      {/* Routine Modal (Create / Edit with Real Exercise Picker and Prescription Settings) */}
      {showRoutineModal && (
        <RoutineEditorModal
          student={student}
          routineToEdit={editingRoutine}
          onClose={() => {
            setShowRoutineModal(false);
            setEditingRoutine(null);
          }}
          onSaved={() => {
            setShowRoutineModal(false);
            setEditingRoutine(null);
          }}
        />
      )}

      {/* Physical Assessment 5-Step Wizard Modal */}
      {showAssessmentModal && (
        <NewPhysicalAssessmentModal
          student={student}
          onClose={() => setShowAssessmentModal(false)}
        />
      )}

      {/* Redesigned Physical Assessment In-App Report View */}
      {selectedAssessmentForDetail && (
        <PhysicalAssessmentReportView
          student={student}
          assessment={selectedAssessmentForDetail}
          allStudentAssessments={studentAssessments}
          trainerProfile={trainerProfile}
          onClose={() => setSelectedAssessmentForDetail(null)}
          onOpenStudentMode={() => {
            setSelectedAssessmentForStudentMode(selectedAssessmentForDetail);
          }}
          onOpenPDF={() => {
            setSelectedAssessmentForPDF(selectedAssessmentForDetail);
          }}
          onOpenStory={() => {
            setSelectedAssessmentForStory(selectedAssessmentForDetail);
          }}
          onDelete={() => {
            if (
              window.confirm("Excluir esta avaliação física permanentemente?")
            ) {
              deleteAssessment(selectedAssessmentForDetail.id);
              setSelectedAssessmentForDetail(null);
            }
          }}
        />
      )}

      {/* Redesigned Student Mode Presentation Modal */}
      {selectedAssessmentForStudentMode && (
        <PhysicalAssessmentStudentModeModal
          student={student}
          assessment={selectedAssessmentForStudentMode}
          previousAssessment={studentAssessments.find(
            (a) =>
              new Date(a.date).getTime() <
              new Date(selectedAssessmentForStudentMode.date).getTime(),
          )}
          onClose={() => setSelectedAssessmentForStudentMode(null)}
        />
      )}

      
      {selectedRoutineForPDF && (
        <RoutinePDFModal
          student={student}
          routine={selectedRoutineForPDF}
          studentCycles={studentCycles}
          onClose={() => setSelectedRoutineForPDF(null)}
        />
      )}
      
      {/* Redesigned True A4 PDF & Print Modal */}

      {selectedAssessmentForPDF && (
        <PhysicalAssessmentPDFModal
          student={student}
          assessment={selectedAssessmentForPDF}
          allStudentAssessments={studentAssessments}
          trainerProfile={trainerProfile}
          onClose={() => setSelectedAssessmentForPDF(null)}
        />
      )}

      {/* Legacy Student Presentation Modal (Full screen results mode) */}
      {selectedAssessmentForPresentation && (
        <AssessmentStudentPresentationModal
          student={student}
          assessment={selectedAssessmentForPresentation}
          previousAssessment={studentAssessments.find(
            (a) =>
              new Date(a.date).getTime() <
              new Date(selectedAssessmentForPresentation.date).getTime(),
          )}
          onClose={() => setSelectedAssessmentForPresentation(null)}
        />
      )}

      {/* Assessment Story Generator Modal (9:16 Canvas PNG) */}
      {selectedAssessmentForStory && (
        <AssessmentStoryModal
          student={student}
          assessment={selectedAssessmentForStory}
          previousAssessment={studentAssessments.find(
            (a) =>
              new Date(a.date).getTime() <
              new Date(selectedAssessmentForStory.date).getTime(),
          )}
          onClose={() => setSelectedAssessmentForStory(null)}
        />
      )}

      {/* PDF Report Generation Modal */}
      {showReportModal && (
        <ReportPDFModal
          student={student}
          routines={studentRoutines}
          sessions={studentSessions}
          assessments={studentAssessments}
          trainerProfile={trainerProfile}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Workout Story Generator Modal */}
      {selectedStorySession && (
        <WorkoutStoryModal
          session={selectedStorySession}
          onClose={() => setSelectedStorySession(null)}
        />
      )}

      {/* Session Summary View Modal (History Details with BodyMap) */}
      {viewingHistorySession && (
        <SessionSummaryViewModal
          session={viewingHistorySession}
          onClose={() => setViewingHistorySession(null)}
          onOpenStory={() => {
            setSelectedStorySession(viewingHistorySession);
            setViewingHistorySession(null);
          }}
        />
      )}

      {/* Import Assessment by Photo / OCR Modal */}
      {showImportPhotoModal && (
        <ImportAssessmentPhotoModal
          student={student}
          onClose={() => setShowImportPhotoModal(false)}
        />
      )}

      {/* Zoom / View Original Assessment Image Modal */}
      {zoomedAssessmentImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#374151]" />
                <h4 className="text-sm font-bold text-[#1F2937] font-display uppercase tracking-wide">
                  Imagem Original da Avaliação
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setZoomedAssessmentImage(null)}
                className="p-1.5 rounded-lg bg-[#F8F9FA] text-[#4B5563] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-2xl bg-black flex items-center justify-center p-2 border border-[#E5E7EB]">
              <img
                src={zoomedAssessmentImage}
                alt="Imagem Original da Avaliação"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Routine as Template Modal */}
      {routineToSaveAsTemplate && (
        <SaveRoutineAsTemplateModal
          routine={routineToSaveAsTemplate}
          onClose={() => setRoutineToSaveAsTemplate(null)}
        />
      )}

      {/* Template / Routine Creation Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelectorModal
          student={student}
          onClose={() => setShowTemplateSelector(false)}
          onCreateFromScratch={() => {
            setShowTemplateSelector(false);
            setEditingRoutine(null);
            setShowRoutineModal(true);
          }}
          onTemplateApplied={(createdRoutine) => {
            setShowTemplateSelector(false);
            if (createdRoutine?.workouts?.[0]?.id) {
              setActiveWorkoutTabByRoutine((prev) => ({
                ...prev,
                [createdRoutine.id]: createdRoutine.workouts[0].id,
              }));
            }
          }}
        />
      )}

      {/* Cycle Editor Modal */}
      {showCycleEditorModal && (
        <CycleEditorModal
          student={student}
          routines={studentRoutines}
          existingCycle={editingCycleFromProfile}
          onClose={() => {
            setShowCycleEditorModal(false);
            setEditingCycleFromProfile(null);
          }}
          onSave={async (cycle) => {
            await saveTrainingCycle(cycle);
          }}
        />
      )}

      {/* Detalhe da Proposta Comercial */}
      {selectedProposalForDetail && (
        <ProposalDetailModal
          proposal={selectedProposalForDetail}
          onClose={() => setSelectedProposalForDetail(null)}
          onEdit={() => {
            // Edição se requerida
          }}
          onOpenPDF={(p) => {
            setSelectedProposalForDetail(null);
            setSelectedProposalForPDF(p);
          }}
          onDuplicate={(p) => duplicateProposal(p)}
          onCreateRevision={(p) => createProposalRevision(p)}
          onDelete={async (id) => {
            await deleteProposal(id);
            setSelectedProposalForDetail(null);
          }}
          onStatusChange={async (id, status) => {
            await updateProposalStatus(id, status);
            setSelectedProposalForDetail(prev => prev ? { 
              ...prev, 
              status, 
              acceptedAt: status === 'accepted' ? (prev.acceptedAt || new Date().toISOString()) : prev.acceptedAt 
            } : null);
          }}
        />
      )}

      {/* PDF Oficial da Proposta */}
      {selectedProposalForPDF && (
        <ProposalPDFModal
          proposal={selectedProposalForPDF}
          onClose={() => setSelectedProposalForPDF(null)}
          onStatusChange={async (newStatus) => {
            await updateProposalStatus(selectedProposalForPDF.id, newStatus);
            setSelectedProposalForPDF(prev => prev ? { ...prev, status: newStatus } : null);
          }}
        />
      )}
    </div>
  );
};
