import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove ANY existing imports for these
code = code.replace(/import \{.*?\} from '\.\.\/\.\.\/utils\/formatters';/g, '');
code = code.replace(/import \{ EvolutionPhotosGallery \} from '.*?';/g, '');
code = code.replace(/import \{ WorkoutStoryModal \} from '.*?';/g, '');
code = code.replace(/import \{ SessionSummaryViewModal \} from '.*?';/g, '');
code = code.replace(/import \{ SaveRoutineAsTemplateModal \} from '.*?';/g, '');
code = code.replace(/import \{ TemplateSelectorModal \} from '.*?';/g, '');
code = code.replace(/import \{ CycleDashboardCard \} from '.*?';/g, '');
code = code.replace(/import \{ normalizeWorkoutRoutine \} from '.*?';/g, '');
code = code.replace(/import \{ compareAssessments \} from '.*?';/g, '');
code = code.replace(/import \{ calculateAllTimePRs \} from '.*?';/g, '');
code = code.replace(/import \{ calculateEstimated1RM \} from '.*?';/g, '');
code = code.replace(/import \{ formatPrescriptionSummary \} from '.*?';/g, '');
code = code.replace(/import \{ formatTimer \} from '.*?';/g, '');
code = code.replace(/import \{ formatWeight \} from '.*?';/g, '');

const correctImports = `
import { EvolutionPhotosGallery } from './EvolutionPhotosGallery';
import { WorkoutStoryModal } from '../story/WorkoutStoryModal';
import { SessionSummaryViewModal } from '../workout/SessionSummaryViewModal';
import { SaveRoutineAsTemplateModal } from '../templates/SaveRoutineAsTemplateModal';
import { TemplateSelectorModal } from '../templates/TemplateSelectorModal';
import { CycleDashboardCard } from '../cycles/CycleDashboardCard';
import { 
  normalizeWorkoutRoutine, compareAssessments, calculateAllTimePRs, calculateEstimated1RM, formatPrescriptionSummary, formatTimer, formatWeight 
} from '../../utils/calculations';
`;

code = code.replace(/import \{ Student, WorkoutRoutine, RoutineWorkout, WorkoutSession, PhysicalAssessment, TrainingCycle \} from '\.\.\/\.\.\/types';/, correctImports + "import { Student, WorkoutRoutine, RoutineWorkout, WorkoutSession, PhysicalAssessment, TrainingCycle } from '../../types';");

fs.writeFileSync(file, code);
console.log('Fixed imports for real');
