import fs from 'fs';
let code = fs.readFileSync('src/components/students/StudentProfileView.tsx', 'utf8');

// Imports
code = code.replace(/import \{ StudentOnboardingCard \} from '\.\.\/onboarding\/StudentOnboardingCard';\n/g, '');
code = code.replace(/import \{ StudentOnboardingModal \} from '\.\.\/onboarding\/StudentOnboardingModal';\n/g, '');
code = code.replace(/import \{ OnboardingGuideModal \} from '\.\.\/onboarding\/OnboardingGuideModal';\n/g, '');
code = code.replace(/import \{\s*getStudentOnboardingFromDb,\s*saveStudentOnboardingToDb,\s*getOnboardingGlobalConfigFromDb\s*\} from '\.\.\/\.\.\/db\/indexedDB';\n/g, '');
code = code.replace(/import \{\s*createDefaultStudentOnboarding,\s*createDefaultGlobalConfig\s*\} from '\.\.\/\.\.\/utils\/onboardingDefaults';\n/g, '');
code = code.replace(/import \{ StudentOnboarding, OnboardingGlobalConfig, OnboardingGuideSnapshot \} from '\.\.\/\.\.\/types';\n/g, '');

// States
code = code.replace(/const \[studentOnboarding, setStudentOnboarding\] = useState<StudentOnboarding \| null>\(null\);\n/g, '');
code = code.replace(/const \[onboardingConfig, setOnboardingConfig\] = useState<OnboardingGlobalConfig>\(\(\) => createDefaultGlobalConfig\(trainerProfile\)\);\n/g, '');
code = code.replace(/const \[isOnboardingModalOpen, setIsOnboardingModalOpen\] = useState<boolean>\(false\);\n/g, '');
code = code.replace(/const \[isGuideModalOpen, setIsGuideModalOpen\] = useState<boolean>\(false\);\n/g, '');
code = code.replace(/const \[guideModalSnapshot, setGuideModalSnapshot\] = useState<OnboardingGuideSnapshot \| null>\(null\);\n/g, '');
code = code.replace(/const \[isGuideModalExistingSnapshot, setIsGuideModalExistingSnapshot\] = useState<boolean>\(false\);\n/g, '');

// Effects & handlers
code = code.replace(/useEffect\(\(\) => \{\n\s*let isMounted = true;\n\s*Promise\.all\(\[\n\s*getStudentOnboardingFromDb\(student\.id\),\n\s*getOnboardingGlobalConfigFromDb\(trainerProfile\)\n\s*\]\)\.then\(\(\[onboardingRecord, globalCfg\]\) => \{\n\s*if \(\!isMounted\) return;\n\s*setStudentOnboarding\(onboardingRecord\);\n\s*setOnboardingConfig\(globalCfg\);\n\s*\}\)\.catch\(err => \{\n\s*console\.error\('Erro ao carregar dados de onboarding:', err\);\n\s*\}\);\n\s*return \(\) => \{ isMounted = false; \};\n\s*\}, \[student\.id, trainerProfile\]\);\n\n/g, '');

code = code.replace(/useEffect\(\(\) => \{\n\s*if \(initialTab === 'onboarding'\) \{\n\s*setActiveTab\('onboarding'\);\n\s*getStudentOnboardingFromDb\(student\.id\)\.then\(record => \{\n\s*if \(\!record\) \{\n\s*const newRecord = createDefaultStudentOnboarding\(student\.id, student\.name\);\n\s*setStudentOnboarding\(newRecord\);\n\s*saveStudentOnboardingToDb\(newRecord\)\.catch\(console\.error\);\n\s*\} else \{\n\s*setStudentOnboarding\(record\);\n\s*\}\n\s*\}\)\.catch\(console\.error\);\n\s*\}\n\s*\}, \[initialTab, student\.id, student\.name\]\);\n\n/g, '');

code = code.replace(/const handleStartOrOpenOnboarding = \(\) => \{\n\s*if \(\!studentOnboarding\) \{\n\s*const newRecord = createDefaultStudentOnboarding\(student\.id, student\.name\);\n\s*setStudentOnboarding\(newRecord\);\n\s*saveStudentOnboardingToDb\(newRecord\)\.catch\(console\.error\);\n\s*\}\n\s*setIsOnboardingModalOpen\(true\);\n\s*\};\n\n/g, '');

// Inside render
code = code.replace(/\{isOnboardingModalOpen && \(\n\s*<StudentOnboardingModal\n\s*student=\{student\}\n\s*onboarding=\{studentOnboarding || undefined\}\n\s*config=\{onboardingConfig\}\n\s*onClose=\{\(\) => setIsOnboardingModalOpen\(false\)\}\n\s*onSave=\{async \(updated\) => \{\n\s*await saveStudentOnboardingToDb\(updated\);\n\s*setStudentOnboarding\(updated\);\n\s*\}\}\n\s*\/>\n\s*\)\}\n\n/g, '');

code = code.replace(/\{isGuideModalOpen && \(\n\s*<OnboardingGuideModal\n\s*onClose=\{\(\) => setIsGuideModalOpen\(false\)\}\n\s*snapshot=\{guideModalSnapshot \|\| undefined\}\n\s*isExistingSnapshot=\{isGuideModalExistingSnapshot\}\n\s*\/>\n\s*\)\}\n\n/g, '');

fs.writeFileSync('src/components/students/StudentProfileView.tsx', code);
console.log('Cleaned more onboarding from profile');
