import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

const correctImports = `
import { 
  TrendingDown, TrendingUp, Camera, Activity, Eye, Printer, Share2, Layers, Trash2, Scale, Plus, X 
} from 'lucide-react';
import { 
  calculateSumOf7Skinfolds, SKINFOLD_LABELS_PT, CIRCUMFERENCE_LABELS_PT,
  formatNumberBR, formatPercentagePointsBR, formatDeltaValueBR
} from '../../utils/assessmentCalculations';
import { EvolutionPhotosGallery } from './EvolutionPhotosGallery';
import { StudentEditModal } from './StudentEditModal';
import { RoutineEditorModal } from '../routines/RoutineEditorModal';
import { NewPhysicalAssessmentModal } from '../assessments/NewPhysicalAssessmentModal';
import { PhysicalAssessmentReportView } from '../assessments/PhysicalAssessmentReportView';
import { PhysicalAssessmentStudentModeModal } from '../assessments/PhysicalAssessmentStudentModeModal';
import { PhysicalAssessmentPDFModal } from '../assessments/PhysicalAssessmentPDFModal';
import { AssessmentStudentPresentationModal } from '../assessments/AssessmentStudentPresentationModal';
import { AssessmentStoryModal } from '../assessments/AssessmentStoryModal';
import { ReportPDFModal } from '../reports/ReportPDFModal';
import { WorkoutStoryModal } from '../story/WorkoutStoryModal';
import { SessionSummaryViewModal } from '../workout/SessionSummaryViewModal';
import { ImportAssessmentPhotoModal } from '../assessments/ImportAssessmentPhotoModal';
import { SaveRoutineAsTemplateModal } from '../templates/SaveRoutineAsTemplateModal';
import { TemplateSelectorModal } from '../templates/TemplateSelectorModal';
import { CycleEditorModal } from '../cycles/CycleEditorModal';
import { CycleDashboardCard } from '../cycles/CycleDashboardCard';
import { formatPrescriptionSummary, formatTimer, formatWeight } from '../../utils/formatters';
import { StudentMetricsSummaryTab } from './StudentMetricsSummaryTab';
import { LongevityTab } from '../longevity/LongevityTab';
import { EvolutionReportsTab } from '../reports/EvolutionReportsTab';
import { useApp } from '../../context/AppContext';
import { Student, WorkoutRoutine, RoutineWorkout, WorkoutSession, PhysicalAssessment, TrainingCycle } from '../../types';
`;

code = code.replace(/import \{ \n  TrendingDown.*?from '\.\.\/types';/s, correctImports.trim());

fs.writeFileSync(file, code);
console.log('Fixed imports correctly');
