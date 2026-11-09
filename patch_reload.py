import re

with open('src/context/AppContext.tsx', 'r') as f:
    content = f.read()

# I need to fix reloadDataSilently so it uses the repositories if DATA_BACKEND is supabase
# Alternatively, I can just not overwrite from indexedDB if DATA_BACKEND === 'supabase'
target = """  const reloadDataSilently = useCallback(async () => {
    try {
      const ["""

replacement = """  const reloadDataSilently = useCallback(async () => {
    try {
      if (DATA_BACKEND === 'supabase') {
        const [
          loadedStudents,
          loadedExercises,
          loadedRoutines,
          loadedSessions,
          loadedAssessments,
          loadedSchedule,
          loadedRecurrences,
          loadedTrainingCycles,
          loadedProposals,
          loadedActivePlans
        ] = await Promise.all([
          getStudentRepository().getAll(),
          getExerciseRepository().getAll(),
          getRoutineRepository().getAll(),
          getSessionRepository().getAll(),
          getAssessmentRepository().getAll(),
          getScheduleRepository().getAppointments(),
          getScheduleRepository().getRecurrences(),
          getTrainingCycleRepository().getAll(),
          getProposalRepository().getAll(),
          getActivePlanRepository().getAll()
        ]);
        setStudents(loadedStudents || []);
        setExercises(loadedExercises || []);
        setRoutines(loadedRoutines || []);
        setSessions(loadedSessions || []);
        setAssessments(loadedAssessments || []);
        setSchedule(loadedSchedule || []);
        setScheduleRecurrences(loadedRecurrences || []);
        setTrainingCycles(loadedTrainingCycles || []);
        setProposals(loadedProposals || []);
        setActivePlans(loadedActivePlans || []);
        return;
      }
      
      const ["""

content = content.replace(target, replacement)

with open('src/context/AppContext.tsx', 'w') as f:
    f.write(content)
