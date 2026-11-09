import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import \{ formatPrescriptionSummary, formatTimer, formatWeight \} from '\.\.\/\.\.\/utils\/formatters';/,
  `import { formatPrescriptionSummary, formatTimer, formatWeight, calculateEstimated1RM, normalizeWorkoutRoutine, compareAssessments, calculateAllTimePRs } from '../../utils/calculations';`
);

fs.writeFileSync(file, code);
console.log('Fixed calculation imports');
