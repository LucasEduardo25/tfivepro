import fs from 'fs';

const file = 'src/components/exercises/ExerciseBankView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add deleteExercise to useApp
if (!content.includes('deleteExercise')) {
  content = content.replace(
    /const \{ exercises, saveExercise \} = useApp\(\);/,
    `const { exercises, saveExercise, deleteExercise } = useApp();`
  );
}

// Add state for deletion
if (!content.includes('exerciseToDelete')) {
  content = content.replace(
    /const \[showAddModal, setShowAddModal\] = useState<boolean>\(false\);/,
    `const [showAddModal, setShowAddModal] = useState<boolean>(false);\n  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);\n  const [isDeletingEx, setIsDeletingEx] = useState<boolean>(false);`
  );
}

// Add delete handler
if (!content.includes('handleDeleteExercise')) {
  content = content.replace(
    /const handleSaveCustomExercise = async \(\) => \{/,
    `const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    setIsDeletingEx(true);
    try {
      await deleteExercise(exerciseToDelete.id);
      setSelectedExercise(null);
    } catch (err) {
      console.error('Error deleting exercise:', err);
      alert('Não foi possível excluir. Este exercício pode estar em uso e não pode ser apagado para preservar a integridade do histórico.');
    } finally {
      setIsDeletingEx(false);
      setExerciseToDelete(null);
    }
  };

  const handleSaveCustomExercise = async () => {`
  );
}

// Add delete button inside the exercise detail modal (where selectedExercise is shown)
if (!content.includes('Excluir exercício')) {
  // Try to find the edit button or header of the selectedExercise modal
  content = content.replace(
    /<h3 className="text-xl font-bold font-display uppercase text-white pr-8">\{selectedExercise\.name\}<\/h3>/,
    `$&
                <button
                  onClick={() => setExerciseToDelete(selectedExercise)}
                  className="absolute top-4 right-14 w-8 h-8 flex items-center justify-center rounded-xl bg-[#27272A] hover:bg-red-500 hover:text-white text-[#A1A1AA] transition-colors"
                  title="Excluir exercício"
                >
                  <Trash2 className="w-4 h-4" />
                </button>`
  );
  
  // Wait, I need to make sure Trash2 is imported
  if (!content.includes('Trash2,')) {
    content = content.replace(/X,/g, 'X, Trash2,');
  }
}

// Add Exercise Delete Confirmation Modal
if (!content.includes('Excluir exercício?')) {
  content = content.replace(
    /\{showAddModal && \(/,
    `{exerciseToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir exercício?</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Tem certeza que deseja excluir <span className="font-bold">{exerciseToDelete.name}</span>? Se ele estiver em uso no histórico, será arquivado para preservar os dados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setExerciseToDelete(null)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteExercise}
                disabled={isDeletingEx}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isDeletingEx ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (`
  );
}

fs.writeFileSync(file, content, 'utf-8');
