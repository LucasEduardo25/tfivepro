import fs from 'fs';
const file = 'src/repositories/supabase/SupabaseRepositories.ts';
let code = fs.readFileSync(file, 'utf8');

const importRegex = /import \{.*?TrainingMemory.*?\} from '.*?\/types';/s;
if (!importRegex.test(code)) {
  code = code.replace(/import \{ (.*?) \} from '\.\.\/\.\.\/types';/, "import { $1, TrainingMemory } from '../../types';");
}

const mapMemoryCode = `
export function mapTrainingMemory(row: any): TrainingMemory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    studentId: row.student_id,
    exerciseId: row.exercise_id || undefined,
    exerciseNameSnapshot: row.exercise_name_snapshot || undefined,
    sourceSessionId: row.source_session_id || undefined,
    text: row.text,
    status: row.status as 'ACTIVE' | 'RESOLVED',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  };
}

export function unmapTrainingMemory(memory: TrainingMemory): any {
  return {
    id: memory.id,
    organization_id: memory.organizationId,
    student_id: memory.studentId,
    exercise_id: memory.exerciseId || null,
    exercise_name_snapshot: memory.exerciseNameSnapshot || null,
    source_session_id: memory.sourceSessionId || null,
    text: memory.text,
    status: memory.status,
    created_at: memory.createdAt,
    resolved_at: memory.resolvedAt || null,
  };
}
`;

const repoCode = `
export class TrainingMemoriesRepository extends BaseSupabaseRepository<TrainingMemory> {
  constructor(client: SupabaseClient) {
    super(client, 'training_memories');
  }

  protected mapFromDb(row: any): TrainingMemory {
    return mapTrainingMemory(row);
  }

  protected mapToDb(entity: TrainingMemory): any {
    return unmapTrainingMemory(entity);
  }
}
`;

if (!code.includes('class TrainingMemoriesRepository')) {
  code = code + '\n' + mapMemoryCode + '\n' + repoCode + '\n';
  fs.writeFileSync(file, code);
  console.log('Added TrainingMemoriesRepository');
} else {
  console.log('Already exists');
}
