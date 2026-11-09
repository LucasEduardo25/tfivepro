import fs from 'fs';
const file = 'src/repositories/supabase/SupabaseRepositories.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
import { TrainingMemory } from '../../types';

export class SupabaseTrainingMemoriesRepository {
  async getAll(organizationId: string = 'org_tfive_1'): Promise<TrainingMemory[]> {
    const { data, error } = await fromTable('training_memories').select('*').eq('organization_id', organizationId);
    if (error) throw error;
    if (!data) return [];
    return data.map(mapTrainingMemory);
  }

  async save(memory: TrainingMemory): Promise<void> {
    const row = unmapTrainingMemory(memory);
    const { error } = await fromTable('training_memories').upsert(row);
    if (error) throw error;
  }
}
`;

code = code.replace(
  /export class SupabaseTrainingMemoriesRepository extends BaseSupabaseRepository<TrainingMemory> \{[\s\S]*?\}\n\}/,
  replacement.trim()
);

// We still need to import TrainingMemory at the top or just where it is, it's fine. Wait, the replacement adds the import right above the class.

fs.writeFileSync(file, code);
