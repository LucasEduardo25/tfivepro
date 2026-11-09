import fs from 'fs';
const file = 'src/repositories/repositoryConfig.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('SupabaseTrainingMemoryRepository') && code.includes('export const repositoryFactory')) {
  // It's just a proxy factory. Let's see if it's there.
}
