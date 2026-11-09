import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ \n  formatNumberBR, formatPercentagePointsBR, formatDeltaValueBR, formatTimer, formatWeight \n\} from '\.\.\/\.\.\/utils\/formatters';/, '');
code = code.replace(/import \{ \n  calculateSumOf7Skinfolds, SKINFOLD_LABELS_PT, CIRCUMFERENCE_LABELS_PT \n\} from '\.\.\/\.\.\/utils\/assessmentCalculations';/, `import { 
  calculateSumOf7Skinfolds, SKINFOLD_LABELS_PT, CIRCUMFERENCE_LABELS_PT, compareAssessments, formatNumberBR, formatPercentagePointsBR, formatDeltaValueBR
} from '../../utils/assessmentCalculations';`);

fs.writeFileSync(file, code);
console.log('Fixed for real real');
