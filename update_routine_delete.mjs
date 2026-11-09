import fs from 'fs';

const file = 'src/components/students/StudentProfileView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add states for routine deletion
if (!content.includes('routineToDelete')) {
  content = content.replace(
    /const \[deleteConfirmationText, setDeleteConfirmationText\] = useState<string>\(''\);/,
    `const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');\n  const [routineToDelete, setRoutineToDelete] = useState<WorkoutRoutine | null>(null);\n  const [isDeletingRoutine, setIsDeletingRoutine] = useState<boolean>(false);`
  );
}

// Add handleDeleteRoutine handler
if (!content.includes('handleConfirmDeleteRoutine')) {
  content = content.replace(
    /const handleDeleteStudent = async \(\) => \{/,
    `const handleConfirmDeleteRoutine = async () => {
    if (!routineToDelete) return;
    setIsDeletingRoutine(true);
    try {
      await deleteRoutine(routineToDelete.id);
    } catch (err) {
      console.error('Error deleting routine:', err);
      alert('Não foi possível excluir. Nenhum dado foi removido.');
    } finally {
      setIsDeletingRoutine(false);
      setRoutineToDelete(null);
    }
  };

  const handleDeleteStudent = async () => {`
  );
}

// Add the Excluir rotina button inside the routine mapping
if (!content.includes('Excluir rotina')) {
  content = content.replace(
    /<button[\s\S]*?onClick=\{\(\) => toggleArchiveRoutine\(routine\.id\)\}[\s\S]*?<\/button>/,
    `$&
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoutineToDelete(routine);
                            }}
                            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-red-500 hover:bg-red-50/10 transition-colors"
                            title="Excluir rotina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>`
  );
}

// Add Routine Delete Confirmation Modal
if (!content.includes('Excluir rotina?')) {
  content = content.replace(
    /\{showDeleteConfirmModal && \(/,
    `{routineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir rotina?</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              A rotina <span className="font-bold">{routineToDelete.name}</span> será removida dos treinos atuais. O histórico de treinos já realizados será preservado.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRoutineToDelete(null)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteRoutine}
                disabled={isDeletingRoutine}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isDeletingRoutine ? 'Excluindo...' : 'Excluir rotina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && (`
  );
}

fs.writeFileSync(file, content, 'utf-8');
