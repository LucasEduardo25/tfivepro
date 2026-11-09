import re

with open('src/context/AppContext.tsx', 'r') as f:
    content = f.read()

archive_fn = """  const archiveWorkoutTemplate = async (id: string) => {
    try {
      await getWorkoutTemplateRepository().update(id, { isArchived: true });
      setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error archiving workout template:', err);
      throw err;
    }
  };

  const deleteWorkoutTemplate = async (id: string) => {"""

content = content.replace("  const deleteWorkoutTemplate = async (id: string) => {", archive_fn)

if "archiveWorkoutTemplate" not in content:
    print("FAILED TO ADD archiveWorkoutTemplate")

# Add to AppContext return type
type_target = """  deleteWorkoutTemplate: (id: string) => Promise<void>;"""
type_repl = """  deleteWorkoutTemplate: (id: string) => Promise<void>;
  archiveWorkoutTemplate: (id: string) => Promise<void>;"""
content = content.replace(type_target, type_repl)

# Add to AppContext values exported
export_target = """        deleteWorkoutTemplate,"""
export_repl = """        deleteWorkoutTemplate,
        archiveWorkoutTemplate,"""
content = content.replace(export_target, export_repl)

with open('src/context/AppContext.tsx', 'w') as f:
    f.write(content)
