import fs from 'fs';
const file = 'src/services/liveWorkoutSupabaseService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/if \(data\) stdUuid = data\.id;/g, 'if (data) stdUuid = (data as any).id;');
code = code.replace(/if \(data\) routineUuid = data\.id;/g, 'if (data) routineUuid = (data as any).id;');
code = code.replace(/if \(data\) workoutUuid = data\.id;/g, 'if (data) workoutUuid = (data as any).id;');

fs.writeFileSync(file, code);
