import re

with open('src/components/templates/WorkoutTemplatesView.tsx', 'r') as f:
    content = f.read()

handle_delete_target = """  const handleDelete = async (template: WorkoutTemplate) => {"""
handle_archive = """  const handleArchive = async (template: WorkoutTemplate) => {
    if (window.confirm(`Deseja arquivar o modelo "${template.name}"? Ele será ocultado da lista ativa.`)) {
      try {
        await archiveWorkoutTemplate(template.id);
      } catch (err) {
        console.error('Erro ao arquivar modelo:', err);
        alert('Erro ao arquivar modelo.');
      }
    }
  };

  const handleDelete = async (template: WorkoutTemplate) => {"""
content = content.replace(handle_delete_target, handle_archive)

# Update imports from app context
context_target = """    workoutTemplates, 
    deleteWorkoutTemplate, 
    duplicateWorkoutTemplate 
  } = useApp();"""
context_repl = """    workoutTemplates, 
    deleteWorkoutTemplate, 
    archiveWorkoutTemplate,
    duplicateWorkoutTemplate 
  } = useApp();"""
content = content.replace(context_target, context_repl)

# Update icons import
icon_target = """  Trash2, 
  Copy,"""
icon_repl = """  Trash2, 
  Archive,
  Copy,"""
content = content.replace(icon_target, icon_repl)

# Find where Delete button is
button_target = """                      <button
                        onClick={() => handleDelete(template)}
                        className="p-2 rounded-xl bg-[#18181B] hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#27272A] transition-all"
                        title="Excluir modelo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>"""
button_repl = """                      <button
                        onClick={() => handleArchive(template)}
                        className="p-2 rounded-xl bg-[#18181B] hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#27272A] transition-all"
                        title="Arquivar modelo"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-2 rounded-xl bg-[#18181B] hover:bg-red-50 text-[#4B5563] hover:text-red-600 border border-[#27272A] transition-all"
                        title="Excluir modelo permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>"""
content = content.replace(button_target, button_repl)

with open('src/components/templates/WorkoutTemplatesView.tsx', 'w') as f:
    f.write(content)
