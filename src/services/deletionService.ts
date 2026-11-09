import { supabase } from './supabaseClient';
import { isUUID, resolveStudentUuid } from '../utils/supabaseHelpers';

export class DeletionService {
  /**
   * Hard-deletes a student and all their dependent records.
   */
  static async deleteStudent(studentId: string): Promise<void> {
    const stdUuid = await resolveStudentUuid(studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      // Se não tem UUID no Supabase, apenas tenta remover por legacy_id se existir
      await supabase.from('students').delete().eq('legacy_id', studentId);
      return;
    }

    // 1. Delete dependent tables that have ON DELETE RESTRICT for student_id
    await supabase.from('personal_records').delete().eq('student_id', stdUuid);
    await supabase.from('assessments').delete().eq('student_id', stdUuid);
    await supabase.from('schedule_events').delete().eq('student_id', stdUuid);
    await supabase.from('schedule_recurrences').delete().eq('student_id', stdUuid);
    await supabase.from('training_cycles').delete().eq('student_id', stdUuid);
    await supabase.from('sessions').delete().eq('student_id', stdUuid);
    await supabase.from('routines').delete().eq('student_id', stdUuid);
    
    // 2. Finally delete the student (CASCADE and SET NULL will handle the rest)
    const { error } = await supabase.from('students').delete().eq('id', stdUuid);
    if (error) {
      throw error;
    }
  }
}
