/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { StudentsListView } from './components/students/StudentsListView';
import { StudentProfileView } from './components/students/StudentProfileView';
import { LiveWorkoutView } from './components/workout/LiveWorkoutView';
import { PostWorkoutSummaryModal } from './components/workout/PostWorkoutSummaryModal';
import { StudentPresentationView } from './components/workout/StudentPresentationView';
import { ExerciseBankView } from './components/exercises/ExerciseBankView';
import { WorkoutTemplatesView } from './components/templates/WorkoutTemplatesView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { FinancialView } from './components/financial/FinancialView';
import { ProposalsView } from './components/proposals/ProposalsView';
import { SettingsView } from './components/settings/SettingsView';
import { TodayHub } from './components/today/TodayHub';
import { StartupLoadingScreen } from './components/common/StartupLoadingScreen';
import { StartupRecoveryScreen } from './components/common/StartupRecoveryScreen';
import { GlobalErrorBoundary } from './components/common/GlobalErrorBoundary';
import { Student, WorkoutRoutine, RoutineWorkout, WorkoutSession } from './types';
import { ShieldAlert } from 'lucide-react';
import { authService } from './services/authService';
import { LoginView } from './components/auth/LoginView';
import { DATA_BACKEND } from './utils/constants';
import { OfflineConnectivityBanner } from './components/common/OfflineConnectivityBanner';
import { PWAUpdateNotification } from './components/pwa/PWAUpdateNotification';
import { IntelligenceView } from './components/intelligence/IntelligenceView';

const MainContent: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    activeWorkout, 
    startWorkout, 
    routines, 
    bootState,
    startupStep,
    startupStepMessage,
    startupError,
    retryStartup,
    enterSafeMode,
    isSafeMode
  } = useApp();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentProfileTab, setStudentProfileTab] = useState<string>('summary');
  const [justFinishedSession, setJustFinishedSession] = useState<WorkoutSession | null>(null);
  const [presentationSession, setPresentationSession] = useState<WorkoutSession | null>(null);

  // 1. Phased Booting / Startup Screen
  if (bootState === 'booting') {
    return (
      <StartupLoadingScreen
        currentStepMessage={startupStepMessage}
        stepNumber={startupStep}
        totalSteps={5}
      />
    );
  }

  // 2. Recoverable Error Screen (Guarantees no black screen)
  if (bootState === 'recoverable_error') {
    return (
      <StartupRecoveryScreen
        errorMessage={startupError || 'Falha ao inicializar o banco local.'}
        onRetry={retryStartup}
        onEnterSafeMode={enterSafeMode}
        isSafeModeActive={isSafeMode}
      />
    );
  }

  // Handle starting a workout from student profile, schedule, or dashboard
  const handleStartWorkout = async (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => {
    let targetRoutine = routine;
    if (!targetRoutine) {
      targetRoutine = routines.find(r => r.studentId === student.id && r.status === 'active') || 
                      routines.find(r => r.studentId === student.id);
    }
    const res = await startWorkout(student, targetRoutine, workout);
    if (!res.success) {
      if (res.message) {
        // If student is already in training, navigate to the workout tab
        if (res.message.includes('já possui um treino')) {
          setCurrentTab('treino');
          return;
        }
        alert(res.message);
      }
      return;
    }
    setCurrentTab('treino');
  };

  const handleSelectStudent = (student: Student, initialTab: string = 'summary') => {
    setSelectedStudent(student);
    setStudentProfileTab(initialTab);
    setCurrentTab('alunos');
  };

  const handleFinishLiveWorkout = () => {
    if (activeWorkout) {
      setJustFinishedSession(activeWorkout.session);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] flex flex-col font-sans selection:bg-[#374151] selection:text-white">
      
      {/* Real-Time Connectivity Alert Banner (Supabase Cloud Status) */}
      <OfflineConnectivityBanner />

      {/* Safe Mode Indicator Banner if active */}
      {isSafeMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span><strong>Modo Seguro Ativo:</strong> Acesso prioritário aos dados locais e backup de emergência.</span>
          </div>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('safemode');
              window.location.href = url.pathname;
            }}
            className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px]"
          >
            Sair do Modo Seguro
          </button>
        </div>
      )}

      {/* New Professional App Shell (Sidebar + Topbar + Content + MobileNav) */}
      <AppShell
        currentTab={currentTab}
        onSelectTab={tab => {
          if (tab === 'alunos' && selectedStudent) {
            setSelectedStudent(null);
          }
          setCurrentTab(tab);
        }}
      >
        {/* TAB: CENTRAL HOJE (Operational Hub) */}
        {currentTab === 'hoje' && (
          <TodayHub
            onStartWorkout={handleStartWorkout}
            onOpenLiveWorkout={() => setCurrentTab('treino')}
            onSelectStudent={handleSelectStudent}
            onOpenSchedule={() => setCurrentTab('agenda')}
          />
        )}

        {/* TAB: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <DashboardView
            onSelectStudent={handleSelectStudent}
            onStartWorkoutFromSchedule={(student, routine, workout) => handleStartWorkout(student, routine, workout)}
            onOpenLiveWorkout={() => setCurrentTab('treino')}
          />
        )}

        {/* TAB: ALUNOS (List or Detailed Profile) */}
        {currentTab === 'alunos' && (
          selectedStudent ? (
            <StudentProfileView
              student={selectedStudent}
              initialTab={studentProfileTab}
              onBack={() => setSelectedStudent(null)}
              onStartWorkout={handleStartWorkout}
            />
          ) : (
            <StudentsListView
              onSelectStudent={handleSelectStudent}
              onStartWorkout={handleStartWorkout}
            />
          )
        )}

        {/* TAB: TREINO EM TEMPO REAL */}
        {currentTab === 'treino' && (
          <LiveWorkoutView
            onFinishWorkout={handleFinishLiveWorkout}
            onExit={() => setCurrentTab('dashboard')}
          />
        )}

        {/* TAB: TFIVE INTELLIGENCE */}
        {currentTab === 'intelligence' && <IntelligenceView />}

        {/* TAB: BANCO DE EXERCÍCIOS */}
        {currentTab === 'exercicios' && (
          <ExerciseBankView />
        )}

        {/* TAB: PROPOSTAS COMERCIAIS */}
        {currentTab === 'propostas' && (
          <ProposalsView />
        )}

        {/* TAB: MODELOS DE TREINO */}
        {currentTab === 'modelos' && (
          <WorkoutTemplatesView
            onSelectStudent={handleSelectStudent}
          />
        )}

        {/* TAB: AGENDA */}
        {currentTab === 'agenda' && (
          <ScheduleView
            onStartWorkout={handleStartWorkout}
            onSelectStudent={handleSelectStudent}
          />
        )}

        {/* TAB: FINANCEIRO (Strictly separate tab) */}
        {currentTab === 'financeiro' && (
          <FinancialView />
        )}

        {/* TAB: CONFIGURAÇÕES */}
        {currentTab === 'configuracoes' && (
          <SettingsView />
        )}
      </AppShell>

      {/* Post-Workout Summary & PR Celebration Modal */}
      {justFinishedSession && (
        <PostWorkoutSummaryModal
          session={justFinishedSession}
          onClose={() => {
            setJustFinishedSession(null);
            setCurrentTab('dashboard');
          }}
          onOpenStudentMode={() => {
            setPresentationSession(justFinishedSession);
            setJustFinishedSession(null);
          }}
        />
      )}

      {/* Full-Screen Modo Aluno Presentation Mode */}
      {presentationSession && (
        <StudentPresentationView
          session={presentationSession}
          onExit={() => {
            setPresentationSession(null);
            setCurrentTab('dashboard');
          }}
        />
      )}

      {/* PWA Background Update Prompt */}
      <PWAUpdateNotification />

    </div>
  );
};

export default function App() {
  const [authState, setAuthState] = useState(authService.getAuthState());

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });
    return unsubscribe;
  }, []);

  if (DATA_BACKEND === 'supabase' && authState.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-neutral-600 font-medium">Verificando sessão segura...</p>
      </div>
    );
  }

  if (DATA_BACKEND === 'supabase' && !authState.isAuthenticated) {
    return <LoginView />;
  }

  return (
    <GlobalErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </GlobalErrorBoundary>
  );
}
