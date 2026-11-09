import fs from 'fs';
let code = fs.readFileSync('src/components/students/StudentProfileView.tsx', 'utf8');

// 1. Remove from tabs
code = code.replace(/\{ id: 'onboarding', label: 'Onboarding' \},\n\s*/, '');
code = code.replace(/\{ id: 'cycles', label: `Ciclos & Blocos \(\$\{studentCycles\.length\}\)` \},\n\s*/, '');

// 2. Remove tab contents
code = code.replace(/\{\/\* TAB CONTENT: CICLOS E BLOCOS DE PERIODIZAÇÃO \*\/\}\n\s*\{activeTab === 'cycles' && \(\n\s*<StudentCyclesTab[\s\S]*?\/>\n\s*\)\}\n\s*/, '');
code = code.replace(/\{\/\* TAB CONTENT: ONBOARDING DO NOVO ALUNO \*\/\}\n\s*\{activeTab === 'onboarding' && \(\n\s*<div className="space-y-6">[\s\S]*?<\/div>\n\s*\)\}\n\s*/, '');

// 3. Find and remove StudentOnboardingCard from summary
code = code.replace(/<StudentOnboardingCard[\s\S]*?onOpenGuideModal=\{[\s\S]*?\}\n\s*\/>\n\s*/, '');

fs.writeFileSync('src/components/students/StudentProfileView.tsx', code);
console.log('Cleaned tabs');
