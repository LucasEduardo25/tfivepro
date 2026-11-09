import sys

with open('src/components/student/StudentAppShell.tsx', 'r') as f:
    content = f.read()

# Insert activeWorkout render
insertion = """
  if (activeWorkout) {
    return (
      <StudentLiveWorkoutView
        workoutState={activeWorkout}
        onRecordSet={recordSet}
        onUpdateSet={updateRecordedSet}
        onStartRest={startRestTimer}
        onStopRest={stopRestTimer}
        onAddRestTime={addRestTime}
        onUpdateState={updateWorkoutState}
        onFinish={finishWorkout}
        onCancel={cancelWorkout}
        onExit={() => {}}
      />
    );
  }
"""
content = content.replace('  return (\n    <div className="min-h-screen', insertion + '\n  return (\n    <div className="min-h-screen')

# Replace TodayTab
today_tab_old = '<StudentTodayTab data={data} onNavigateToTab={handleSelectTab} />'
today_tab_new = """<StudentTodayTab 
              data={data} 
              onNavigateToTab={handleSelectTab}
              onStartWorkout={async (workout) => {
                if (onExitPreview) {
                  alert('O Início de Treino está desabilitado no modo de visualização do Personal.');
                  return;
                }
                await startWorkout(data.student, undefined, workout);
              }}
            />"""
content = content.replace(today_tab_old, today_tab_new)

# Replace WorkoutTab
workout_tab_old = '<StudentWorkoutTab data={data} />'
workout_tab_new = """<StudentWorkoutTab 
              data={data} 
              onStartWorkout={async (workout) => {
                if (onExitPreview) {
                  alert('O Início de Treino está desabilitado no modo de visualização do Personal.');
                  return;
                }
                await startWorkout(data.student, undefined, workout);
              }}
            />"""
content = content.replace(workout_tab_old, workout_tab_new)

with open('src/components/student/StudentAppShell.tsx', 'w') as f:
    f.write(content)
