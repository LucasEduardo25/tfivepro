import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Strip out duplicate formatTimer and formatWeight
code = code.replace(/import \{ formatPrescriptionSummary, formatTimer, formatWeight \} from '\.\.\/\.\.\/utils\/formatters';/g, '');

// The long replace block
code = code.replace(/import \{\s*normalizeWorkoutRoutine, compareAssessments, calculateAllTimePRs, calculateEstimated1RM, formatPrescriptionSummary, formatTimer, formatWeight\s*\} from '\.\.\/\.\.\/utils\/calculations';/, `
import { calculateAllTimePRs, calculateEstimated1RM, formatPrescriptionSummary, formatTimer, formatWeight } from '../../utils/calculations';
import { normalizeWorkoutRoutine } from '../../db/indexedDB';
`);

// Add compareAssessments to assessmentCalculations
code = code.replace(/import \{\s*calculateSumOf7Skinfolds, SKINFOLD_LABELS_PT, CIRCUMFERENCE_LABELS_PT,\s*formatNumberBR, formatPercentagePointsBR, formatDeltaValueBR\s*\} from '\.\.\/\.\.\/utils\/assessmentCalculations';/, `import { 
  calculateSumOf7Skinfolds, SKINFOLD_LABELS_PT, CIRCUMFERENCE_LABELS_PT,
  formatNumberBR, formatPercentagePointsBR, formatDeltaValueBR, compareAssessments
} from '../../utils/assessmentCalculations';`);


fs.writeFileSync(file, code);
console.log('Fixed imports again');
