import React, { useState } from 'react';
import { 
  Activity, 
  Layers, 
  Target, 
  TrendingUp, 
  Grid
} from 'lucide-react';
import { 
  Student, 
  FunctionalTest, 
  FunctionalBattery, 
  AutonomyTaskKey,
  FunctionalAssessment 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { LongevityOverviewSection } from './LongevityOverviewSection';
import { AutonomyMapSection } from './AutonomyMapSection';
import { FunctionalTestsListSection } from './FunctionalTestsListSection';
import { FunctionalGoalsSection } from './FunctionalGoalsSection';
import { FunctionalEvolutionSection } from './FunctionalEvolutionSection';
import { FunctionalAssessmentRunnerModal } from './FunctionalAssessmentRunnerModal';
import { FunctionalStoryModal } from './FunctionalStoryModal';
import { FunctionalReportModal } from './FunctionalReportModal';

interface LongevityTabProps {
  student: Student;
}

export type LongevitySubTab = 'overview' | 'autonomy_map' | 'tests' | 'goals' | 'evolution';

export const LongevityTab: React.FC<LongevityTabProps> = ({ student }) => {
  const { 
    functionalAssessments, 
    functionalGoals, 
    functionalMilestones,
    functionalTests,
    functionalBatteries
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<LongevitySubTab>('overview');

  // Modal States
  const [isRunnerModalOpen, setIsRunnerModalOpen] = useState<boolean>(false);
  const [runnerInitialTest, setRunnerInitialTest] = useState<FunctionalTest | undefined>(undefined);
  const [runnerBattery, setRunnerBattery] = useState<FunctionalBattery | undefined>(undefined);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportAssessment, setReportAssessment] = useState<FunctionalAssessment | undefined>(undefined);

  const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(false);
  const [storyAssessment, setStoryAssessment] = useState<FunctionalAssessment | undefined>(undefined);

  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState<boolean>(false);
  const [goalPrefillTask, setGoalPrefillTask] = useState<AutonomyTaskKey | undefined>(undefined);

  // Filter entities for this student
  const studentAssessments = React.useMemo(() => {
    return functionalAssessments.filter(a => a.studentId === student.id);
  }, [functionalAssessments, student.id]);

  const studentGoals = React.useMemo(() => {
    return functionalGoals.filter(g => g.studentId === student.id);
  }, [functionalGoals, student.id]);

  const studentMilestones = React.useMemo(() => {
    return functionalMilestones.filter(m => m.studentId === student.id);
  }, [functionalMilestones, student.id]);

  // Handlers
  const handleOpenRunnerForSingleTest = (test: FunctionalTest) => {
    setRunnerInitialTest(test);
    setRunnerBattery(undefined);
    setIsRunnerModalOpen(true);
  };

  const handleOpenRunnerForBattery = (battery: FunctionalBattery) => {
    setRunnerBattery(battery);
    setRunnerInitialTest(undefined);
    setIsRunnerModalOpen(true);
  };

  const handleOpenRunnerForAutonomyTask = (task: AutonomyTaskKey) => {
    const test = functionalTests.find(t => t.autonomyTask === task) || functionalTests[0];
    setRunnerInitialTest(test);
    setRunnerBattery(undefined);
    setIsRunnerModalOpen(true);
  };

  const handleOpenNewGoalForTask = (task?: AutonomyTaskKey) => {
    setGoalPrefillTask(task);
    setIsNewGoalModalOpen(true);
  };

  const handleOpenReport = (assessment?: FunctionalAssessment) => {
    setReportAssessment(assessment);
    setIsReportModalOpen(true);
  };

  const handleOpenStory = (assessment?: FunctionalAssessment) => {
    setStoryAssessment(assessment);
    setIsStoryModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* Longevity Sub-Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 border-b border-[#27272A] bg-[#121212] p-1.5 rounded-2xl">
        {[
          { id: 'overview', label: 'Visão Geral', icon: Activity },
          { id: 'autonomy_map', label: 'Mapa de Autonomia', icon: Grid },
          { id: 'tests', label: 'Biblioteca de Testes', icon: Layers },
          { id: 'goals', label: `Metas (${studentGoals.filter(g => g.status === 'active').length})`, icon: Target },
          { id: 'evolution', label: `Evolução (${studentAssessments.length})`, icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as LongevitySubTab)}
              className={`px-4 py-2 rounded-xl text-xs font-black font-display uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-[#374151] text-white shadow-md shadow-xs'
                  : 'bg-transparent text-[#4B5563] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content Routing */}
      {activeSubTab === 'overview' && (
        <LongevityOverviewSection
          student={student}
          assessments={studentAssessments}
          goals={studentGoals}
          milestones={studentMilestones}
          onOpenRunnerModal={() => {
            setRunnerInitialTest(undefined);
            setRunnerBattery(functionalBatteries[0]);
            setIsRunnerModalOpen(true);
          }}
          onOpenReportModal={() => handleOpenReport()}
          onOpenStoryModal={() => handleOpenStory()}
          onOpenNewGoalModal={handleOpenNewGoalForTask}
          onNavigateSubTab={setActiveSubTab}
        />
      )}

      {activeSubTab === 'autonomy_map' && (
        <AutonomyMapSection
          student={student}
          assessments={studentAssessments}
          goals={studentGoals}
          onOpenRunnerForTask={handleOpenRunnerForAutonomyTask}
          onOpenNewGoalModal={handleOpenNewGoalForTask}
        />
      )}

      {activeSubTab === 'tests' && (
        <FunctionalTestsListSection
          student={student}
          onSelectTestToRun={handleOpenRunnerForSingleTest}
          onSelectBatteryToRun={handleOpenRunnerForBattery}
        />
      )}

      {activeSubTab === 'goals' && (
        <FunctionalGoalsSection
          student={student}
          goals={studentGoals}
          milestones={studentMilestones}
          assessments={studentAssessments}
          isNewGoalModalOpen={isNewGoalModalOpen}
          prefillTask={goalPrefillTask}
          onCloseNewGoalModal={() => setIsNewGoalModalOpen(false)}
          onOpenNewGoalModal={() => setIsNewGoalModalOpen(true)}
        />
      )}

      {activeSubTab === 'evolution' && (
        <FunctionalEvolutionSection
          student={student}
          assessments={studentAssessments}
          milestones={studentMilestones}
          onOpenReportModal={handleOpenReport}
          onOpenStoryModal={handleOpenStory}
        />
      )}

      {/* Modals */}
      {isRunnerModalOpen && (
        <FunctionalAssessmentRunnerModal
          student={student}
          initialTest={runnerInitialTest}
          battery={runnerBattery}
          onClose={() => setIsRunnerModalOpen(false)}
          onComplete={(newAssessment) => {
            setActiveSubTab('evolution');
          }}
        />
      )}

      {isReportModalOpen && (
        <FunctionalReportModal
          student={student}
          assessment={reportAssessment}
          goals={studentGoals}
          milestones={studentMilestones}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {isStoryModalOpen && (
        <FunctionalStoryModal
          student={student}
          assessment={storyAssessment}
          onClose={() => setIsStoryModalOpen(false)}
        />
      )}

    </div>
  );
};
