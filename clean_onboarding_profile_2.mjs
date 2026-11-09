import fs from 'fs';
let code = fs.readFileSync('src/components/students/StudentProfileView.tsx', 'utf8');

// Remove modals
code = code.replace(/\{\/\* Student Onboarding Management Modal \*\/\}\n\s*\{isOnboardingModalOpen && studentOnboarding && \(\n\s*<StudentOnboardingModal[\s\S]*?\/>\n\s*\)\}\n\s*/g, '');
code = code.replace(/\{\/\* Student Onboarding Guide PDF & Print Modal \*\/\}\n\s*\{isGuideModalOpen && guideModalSnapshot && \(\n\s*<OnboardingGuideModal[\s\S]*?\/>\n\s*\)\}\n\s*/g, '');

// Removing any import of utils/onboardingDefaults
code = code.replace(/import \{[\s\S]*?\} from '\.\.\/\.\.\/utils\/onboardingDefaults';\n/g, '');

// State and handler cleanup if I missed anything
code = code.replace(/const \[studentOnboarding, setStudentOnboarding\] = useState.*?;\n/g, '');
code = code.replace(/const \[onboardingConfig, setOnboardingConfig\] = useState.*?;\n/g, '');
code = code.replace(/const \[isOnboardingModalOpen, setIsOnboardingModalOpen\] = useState.*?;\n/g, '');
code = code.replace(/const \[isGuideModalOpen, setIsGuideModalOpen\] = useState.*?;\n/g, '');
code = code.replace(/const \[guideModalSnapshot, setGuideModalSnapshot\] = useState.*?;\n/g, '');
code = code.replace(/const \[isGuideModalExistingSnapshot, setIsGuideModalExistingSnapshot\] = useState.*?;\n/g, '');

code = code.replace(/const handleSaveStudentOnboarding = async.*?;\n\s*\}\n\s*\};\n/g, '');
code = code.replace(/const handleOpenGuideFromOnboarding = .*?;\n\s*\};\n/g, '');
code = code.replace(/const handleSaveSnapshotAndMarkSent = .*?;\n\s*\};\n/g, '');
code = code.replace(/const handleRegenerateGuideSnapshot = .*?;\n\s*\};\n/g, '');

// Clean the onboarding tab block from useEffect
code = code.replace(/if \(initialTab === 'onboarding'\) \{\n\s*setActiveTab\('onboarding'\);\n\s*\}/g, '');

fs.writeFileSync('src/components/students/StudentProfileView.tsx', code);
console.log('Cleaned modals and handlers');
