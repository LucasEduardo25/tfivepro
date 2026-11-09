import sys
with open('src/services/studentDataService.ts', 'r') as f:
    content = f.read()

import re

# Add console logging
log_stmt = """
        console.log('[StudentMode] student resolved', studentId);
        const routineRepo = getRoutineRepository();
        const routines = await routineRepo.getByStudentId(studentId);
        console.log('[StudentMode] routines count:', routines.length);
        if (routines.length > 0) {
            console.log('[StudentMode] workouts count:', routines[0].workouts?.length);
            console.log('[StudentMode] workout_exercises count:', routines[0].workouts?.[0]?.exercises?.length);
        }
        return routines;
"""
content = re.sub(r'const routineRepo = getRoutineRepository\(\);\s+return await routineRepo\.getByStudentId\(studentId\);', log_stmt, content)

with open('src/services/studentDataService.ts', 'w') as f:
    f.write(content)
