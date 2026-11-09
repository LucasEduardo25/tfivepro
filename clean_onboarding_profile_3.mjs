import fs from 'fs';
let code = fs.readFileSync('src/components/students/StudentProfileView.tsx', 'utf8');

code = code.replace(/const handleSaveStudentOnboarding = async[\s\S]*?await saveStudentOnboardingToDb\(updated\);\n\s*\};\n/g, '');
code = code.replace(/const handleRegenerateGuideSnapshot = \(\) => \{[\s\S]*?setIsGuideModalExistingSnapshot\(false\);\n\s*\};\n/g, '');
code = code.replace(/const handleOpenGuideFromOnboarding = \(\) => \{[\s\S]*?setIsGuideModalOpen\(true\);\n\s*\};\n/g, '');
code = code.replace(/const handleSaveSnapshotAndMarkSent = async[\s\S]*?await saveStudentOnboardingToDb\(copy\);\n\s*\};\n/g, '');

fs.writeFileSync('src/components/students/StudentProfileView.tsx', code);
console.log('Cleaned handlers');
