import fs from 'fs';
const file = 'src/services/syncService.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("'training_memories'")) {
  code = code.replace(
    /export const TRAINER_SYNCABLE_STORES: SyncEntityType\[\] = \[/,
    "export const TRAINER_SYNCABLE_STORES: SyncEntityType[] = [\n  'training_memories',"
  );
  fs.writeFileSync(file, code);
  console.log('Added training_memories to sync');
} else {
  console.log('Already in sync');
}
