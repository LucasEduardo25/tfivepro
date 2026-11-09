import fs from 'fs';
let code = fs.readFileSync('src/components/students/StudentProfileView.tsx', 'utf8');

// The onboarding useEffect
code = code.replace(/useEffect\(\(\) => \{\n\s*if \(initialTab === "onboarding"\) \{[\s\S]*?\}, \[initialTab, student\.id, student\.name\]\);/m, '');

// The guide functions
code = code.replace(/const handleOpenGuideFromOnboarding = \([\s\S]*?setIsGuideModalOpen\(true\);\n\s*\};/m, '');
code = code.replace(/const handleSaveSnapshotAndMarkSent = async \([\s\S]*?await saveStudentOnboardingToDb\(updated\);\n\s*\};/m, '');

// Remove CycleDashboardCard because it's not needed (since I'm removing the cycles tab)
code = code.replace(/\{activeTab === 'cycles' && \([\s\S]*?<StudentCyclesTab[\s\S]*?\/>\n\s*\)\}/m, '');

fs.writeFileSync('src/components/students/StudentProfileView.tsx', code);
console.log('Cleaned onboarding again');
