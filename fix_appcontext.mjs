import fs from 'fs';
const file = 'src/context/AppContext.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace import
code = code.replace(/getTrainingMemories,/, '');
code = code.replace(/saveTrainingMemoryToDb,/, '');

// Add new import
code = code.replace(
  /import \{ getStudentRepository, getSessionRepository/,
  `import { getTrainingMemoriesRepository, getStudentRepository, getSessionRepository`
);

// In bootstrap (around line 494)
code = code.replace(
  /getTrainingMemories\(\),/,
  `getTrainingMemoriesRepository().getAll(),`
);

// In handleSaveTrainingMemory
code = code.replace(
  /const handleSaveTrainingMemory = async \(memory: TrainingMemory\) => \{\n\s*await saveTrainingMemoryToDb\(memory\);\n\s*setTrainingMemories\(prev => \{[\s\S]*?\}\);\n\s*syncService\.enqueue\('training_memories', memory\.id, 'upsert', memory\);\n\s*\};/,
  `const handleSaveTrainingMemory = async (memory: TrainingMemory) => {
    await getTrainingMemoriesRepository().save(memory);
    setTrainingMemories(prev => {
      const idx = prev.findIndex(m => m.id === memory.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = memory;
        return copy;
      }
      return [memory, ...prev];
    });
  };`
);

// In handleResolveTrainingMemory
code = code.replace(
  /const handleResolveTrainingMemory = async \(id: string\) => \{\n\s*await resolveTrainingMemoryInDb\(id\);\n\s*setTrainingMemories\(prev => prev\.map\(m => m\.id === id \? \{ \.\.\.m, status: 'RESOLVED', resolvedAt: new Date\(\)\.toISOString\(\) \} : m\)\);\n\s*const mem = trainingMemories\.find\(m => m\.id === id\);\n\s*if \(mem\) \{\n\s*syncService\.enqueue\('training_memories', id, 'upsert', \{ \.\.\.mem, status: 'RESOLVED', resolvedAt: new Date\(\)\.toISOString\(\) \}\);\n\s*\}\n\s*\};/,
  `const handleResolveTrainingMemory = async (id: string) => {
    const mem = trainingMemories.find(m => m.id === id);
    if (!mem) return;
    const updated = { ...mem, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() };
    await getTrainingMemoriesRepository().save(updated);
    setTrainingMemories(prev => prev.map(m => m.id === id ? updated : m));
  };`
);

fs.writeFileSync(file, code);
console.log('Fixed AppContext to use Supabase for training_memories');
