import re

with open('src/context/AppContext.tsx', 'r') as f:
    content = f.read()

# Add logging inside the safeFetch for exercises
target = "safeFetch(getExerciseRepository().getAll(), exercises, 'exercises'),"
replacement = """safeFetch(getExerciseRepository().getAll().then(res => { console.log('DEBUG SUPABASE EXERCISES:', res?.length); return res; }), exercises, 'exercises'),"""
content = content.replace(target, replacement)

# Add logging when setting state
target2 = "setExercises(loadedExercises || []);"
replacement2 = """console.log('DEBUG SET_EXERCISES (loadedExercises length):', loadedExercises?.length);
        setExercises(loadedExercises || []);"""
content = content.replace(target2, replacement2)

with open('src/context/AppContext.tsx', 'w') as f:
    f.write(content)
