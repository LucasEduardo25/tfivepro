import { supabase } from '../services/supabaseClient';

export const isUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const resolveStudentUuid = async (studentId?: string | null): Promise<string | null> => {
  if (!studentId) return null;
  
  try {
    // 1. Check if the provided ID is a valid UUID AND exists in the database
    if (isUUID(studentId)) {
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .maybeSingle();
      if (!error && data && (data as any).id) {
        return (data as any).id;
      }
    }
    
    // 2. Check by legacy_id
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('legacy_id', studentId)
      .maybeSingle();
      
    if (!error && data && (data as any).id) {
      return (data as any).id;
    }
    
    // 3. Check alternative formats like "student-UUID" or "prefix-UUID"
    const candidateUuid = !isUUID(studentId) && studentId.includes('-')
      ? studentId.replace(/^[a-z0-9_]+-/, '')
      : null;

    if (candidateUuid && isUUID(candidateUuid)) {
      const { data: candData, error: candErr } = await supabase
        .from('students')
        .select('id')
        .eq('legacy_id', candidateUuid)
        .maybeSingle();
      if (!candErr && candData && (candData as any).id) {
        return (candData as any).id;
      }
      
      const { data: cData, error: cErr } = await supabase
        .from('students')
        .select('id')
        .eq('id', candidateUuid)
        .maybeSingle();
      if (!cErr && cData && (cData as any).id) {
        return (cData as any).id;
      }
    }
  } catch (err) {
    console.warn('Erro ao resolver UUID do aluno no Supabase:', err);
  }
  
  return null; // Explicitly returning null means NOT FOUND
};

export const resolveRoutineUuid = async (routineId?: string | null): Promise<string | null> => {
  if (!routineId) return null;

  try {
    // 1. If it's already a valid UUID, check if it exists by id
    if (isUUID(routineId)) {
      const { data, error } = await supabase
        .from('routines')
        .select('id')
        .eq('id', routineId)
        .maybeSingle();
      if (!error && data && (data as any).id) {
        return (data as any).id;
      }
    }

    // 2. Check by legacy_id
    const { data: legData, error: legErr } = await supabase
      .from('routines')
      .select('id')
      .eq('legacy_id', routineId)
      .maybeSingle();
    if (!legErr && legData && (legData as any).id) {
      return (legData as any).id;
    }

    // 3. If prefixed like "routine-<uuid>"
    const candidateUuid = !isUUID(routineId) && routineId.includes('-')
      ? routineId.replace(/^[a-z0-9_]+-/, '')
      : null;

    if (candidateUuid && isUUID(candidateUuid)) {
      const { data: candIdData } = await supabase
        .from('routines')
        .select('id')
        .eq('id', candidateUuid)
        .maybeSingle();
      if (candIdData && (candIdData as any).id) {
        return (candIdData as any).id;
      }

      const { data: candLegData } = await supabase
        .from('routines')
        .select('id')
        .eq('legacy_id', candidateUuid)
        .maybeSingle();
      if (candLegData && (candLegData as any).id) {
        return (candLegData as any).id;
      }
    }
  } catch (err) {
    console.warn('Erro ao resolver UUID da rotina no Supabase:', err);
  }

  return null;
};
