import fs from 'fs';
const file = 'src/repositories/repositoryConfig.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('SupabaseTrainingMemoriesRepository')) {
  // Add imports
  code = code.replace(
    /import \{\s*SupabaseStudentRepository,/,
    `import { SupabaseTrainingMemoriesRepository, SupabaseStudentRepository,`
  );
  
  // Add Supabase init
  code = code.replace(
    /const supabaseStudentRepo = new SupabaseStudentRepository\(\);/,
    `const supabaseTrainingMemoriesRepo = new SupabaseTrainingMemoriesRepository();\nconst supabaseStudentRepo = new SupabaseStudentRepository();`
  );
  
  // Add export function
  code = code + `
export function getTrainingMemoriesRepository() {
  return supabaseTrainingMemoriesRepo; // Enforced Supabase only
}
`;

  fs.writeFileSync(file, code);
  console.log('Added TrainingMemories to repositoryConfig');
}
