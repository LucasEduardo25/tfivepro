import fs from 'fs';

const file = 'src/components/students/StudentProfileView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add showDeleteConfirmModal to state
if (!content.includes('showDeleteConfirmModal')) {
  content = content.replace(
    /const \[showEditStudentModal, setShowEditStudentModal\] = useState<boolean>\(false\);/,
    `const [showEditStudentModal, setShowEditStudentModal] = useState<boolean>(false);\n  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);\n  const [isDeleting, setIsDeleting] = useState<boolean>(false);\n  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');`
  );
}

// Add delete student handler
if (!content.includes('handleDeleteStudent')) {
  content = content.replace(
    /const \{[\s\n]*students,/,
    `const {\n    deleteStudent,\n    students,`
  );
  
  content = content.replace(
    /return \(/,
    `const handleDeleteStudent = async () => {
    if (deleteConfirmationText !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      await deleteStudent(student.id);
      onBack();
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Não foi possível excluir. Nenhum dado foi removido.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (`
  );
}

// Add the Excluir button to the top action bar
if (!content.includes('Excluir aluno')) {
  content = content.replace(
    /<button[\s\S]*?onClick=\{\(\) => setShowEditStudentModal\(true\)\}[\s\S]*?<\/button>/,
    `<button
            onClick={() => setShowEditStudentModal(true)}
            className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] hover:text-[#1F2937] text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5"
            title="Editar cadastro e foto do aluno"
          >
            <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirmModal(true)}
            className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5"
            title="Excluir aluno"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>`
  );
}

// Add the delete modal at the bottom
if (!content.includes('Excluir aluno permanentemente?')) {
  content = content.replace(
    /\{showEditStudentModal && \(/,
    `{showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir aluno permanentemente?</h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Esta ação removerá os dados operacionais vinculados ao aluno <span className="font-bold">{student.name}</span> e não poderá ser desfeita.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digite "EXCLUIR" para confirmar.
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="EXCLUIR"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={deleteConfirmationText !== 'EXCLUIR' || isDeleting}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStudentModal && (`
  );
}

fs.writeFileSync(file, content, 'utf-8');
