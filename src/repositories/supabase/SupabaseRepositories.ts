/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — REPOSITORY ADAPTERS: SUPABASE / POSTGRESQL (HOMOLOGAÇÃO / STAGING)
 * Implementação completa dos 10 repositórios para validação relacional e testes de homologação.
 */

import { 
  Student, 
  WorkoutSession, 
  WorkoutRoutine, 
  PhysicalAssessment, 
  ScheduleAppointment, 
  ScheduleRecurrence,
  Exercise,
  RoutineWorkout,
  RoutineExercise,
  WorkoutSetRecord,
  StudentPhoto
} from '../../types';
import { FunctionalTest, FunctionalBattery } from '../../types/functionalLongevity';
import { TrainingCycle, TrainingBlock } from '../../types/trainingCycle';
import { ActivePlan, PlanSuspension, PlanTransfer, PlanAuditLog, FamilyPlanParticipant } from '../../types/activePlan';
import { Proposal, ProposalParticipant } from '../../types/proposal';
import { IStudentRepository } from '../interfaces/IStudentRepository';
import { IStudentPhotoRepository } from '../interfaces/IStudentPhotoRepository';
import { ISessionRepository } from '../interfaces/ISessionRepository';
import { IRoutineRepository } from '../interfaces/IRoutineRepository';
import { IAssessmentRepository } from '../interfaces/IAssessmentRepository';
import { IScheduleRepository } from '../interfaces/IScheduleRepository';
import { IProposalRepository } from '../interfaces/IProposalRepository';
import { IExerciseRepository } from '../interfaces/IExerciseRepository';
import { ITrainingCycleRepository } from '../interfaces/ITrainingCycleRepository';
import { IActivePlanRepository } from '../interfaces/IActivePlanRepository';
import { ISettingsRepository } from '../interfaces/ISettingsRepository';
import { IWorkoutTemplateRepository } from '../interfaces/IWorkoutTemplateRepository';
import { WorkoutTemplate } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { authService } from '../../services/authService';
import { isUUID, resolveStudentUuid, resolveRoutineUuid } from '../../utils/supabaseHelpers';

export const resolveOrgId = (organizationId?: string | null): string => {
  if (organizationId && isUUID(organizationId)) {
    return organizationId;
  }
  const currentOrg = authService.getOrganizationId();
  if (currentOrg && isUUID(currentOrg)) {
    return currentOrg;
  }
  throw new Error('Operação bloqueada: nenhuma organização válida encontrada para o usuário autenticado.');
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const ensureUUID = (id?: string | null): { uuid: string; legacyId?: string } => {
  if (!id) return { uuid: generateUUID() };
  if (isUUID(id)) {
    return { uuid: id };
  }
  const match = id.match(/^[a-z0-9_]+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (match && isUUID(match[1])) {
    return { uuid: match[1], legacyId: id };
  }
  return { uuid: generateUUID(), legacyId: id };
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
};

// ==============================================================================
// 1. SUPABASE STUDENT REPOSITORY
// ==============================================================================
export class SupabaseStudentRepository implements IStudentRepository {
  private mapStudent(row: any): Student {
    return {
      id: row.legacy_id || row.id,
      uuid: row.id,
      legacyId: row.legacy_id || undefined,
      organizationId: row.organization_id,
      name: row.name,
      photo: row.photo_url || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      goal: row.goal || undefined,
      notes: row.notes || undefined,
      studentVisibleNotes: row.student_visible_notes || undefined,
      status: row.status === 'inactive' || row.status === 'archived' ? 'inactive' : 'active',
      birthDate: row.birth_date || undefined,
      gender: row.gender === 'female' ? 'female' : 'male',
      planName: row.plan_name || undefined,
      priceMonthly: row.price_monthly ? Number(row.price_monthly) : undefined,
      startDate: row.start_date || undefined,
      emergencyContact: row.emergency_contact || undefined,
      tags: (row.tags || []).filter((t: string) => !t.startsWith('modality:')), 
      modality: (row.tags || []).find((t: string) => t.startsWith('modality:'))?.split(':')[1] || 'IN_PERSON',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAll(organizationId?: string): Promise<Student[]> {
    const orgId = resolveOrgId(organizationId);
    const query = fromTable('students').select('*').eq('organization_id', orgId).order('name');
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => this.mapStudent(row));
  }

  async getById(id: string): Promise<Student | null> {
    const isU = isUUID(id);
    const query = fromTable('students').select('*');
    let data: any = null;
    let error: any = null;

    if (isU) {
      const res = await query.eq('id', id).maybeSingle();
      data = res.data;
      error = res.error;
    } else {
      const candidateUuid = id.startsWith('student-') ? id.slice(8) : null;
      if (candidateUuid && isUUID(candidateUuid)) {
        const res = await query.or(`legacy_id.eq.${id},id.eq.${candidateUuid}`).maybeSingle();
        data = res.data;
        error = res.error;
      } else {
        const res = await query.eq('legacy_id', id).maybeSingle();
        data = res.data;
        error = res.error;
      }
    }

    if (error) throw error;
    if (!data) return null;

    return this.mapStudent(data);
  }

  async create(student: Student): Promise<Student> {
    const { uuid, legacyId } = ensureUUID(student.id);
    const orgId = resolveOrgId(student.organizationId);

    const insertPayload = {
      id: uuid,
      legacy_id: legacyId || null,
      organization_id: orgId,
      name: student.name,
      photo_url: student.photo || null,
      phone: student.phone || null,
      email: student.email || null,
      goal: student.goal || null,
      notes: student.notes || null,
      student_visible_notes: student.studentVisibleNotes || null,
      status: student.status || 'active',
      birth_date: student.birthDate || null,
      gender: student.gender || null,
      plan_name: student.planName || null,
      price_monthly: student.priceMonthly || null,
      start_date: student.startDate || null,
      emergency_contact: student.emergencyContact || null,
      tags: [...(student.tags || []).filter(t => !t.startsWith('modality:')), `modality:${student.modality || 'IN_PERSON'}`],
    };

    const { data, error } = await fromTable('students').insert(insertPayload).select().single();
    if (error) throw error;

    return {
      ...student,
      id: data.legacy_id || data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, patch: Partial<Student>): Promise<Student> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Student ${id} not found`);

    const isU = isUUID(id);
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) updatePayload.name = patch.name;
    if (patch.phone !== undefined) updatePayload.phone = patch.phone;
    if (patch.email !== undefined) updatePayload.email = patch.email;
    if (patch.photo !== undefined) updatePayload.photo_url = patch.photo;
    if (patch.goal !== undefined) updatePayload.goal = patch.goal;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.studentVisibleNotes !== undefined) updatePayload.student_visible_notes = patch.studentVisibleNotes;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.birthDate !== undefined) updatePayload.birth_date = patch.birthDate;
    if (patch.gender !== undefined) updatePayload.gender = patch.gender;
    if (patch.planName !== undefined) updatePayload.plan_name = patch.planName;
    if (patch.priceMonthly !== undefined) updatePayload.price_monthly = patch.priceMonthly;
    if (patch.startDate !== undefined) updatePayload.start_date = patch.startDate;
    if (patch.emergencyContact !== undefined) updatePayload.emergency_contact = patch.emergencyContact;
    if (patch.tags !== undefined) updatePayload.tags = patch.tags;

    let query = fromTable('students').update(updatePayload);
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.select().single();
    if (error) throw error;

    return {
      ...existing,
      ...patch,
      id: data.legacy_id || data.id,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    const orgId = resolveOrgId();

    // Restrict deletion to the authenticated trainer's organization.
    let query = fromTable('students').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    query = query.eq('organization_id', orgId);
    const { error } = await query;
    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir o aluno pois existem registros dependentes (Avaliações, Treinos, etc). O banco de dados requer ON DELETE CASCADE.');
      }
      throw error;
    }
  }
}

// ==============================================================================
// STUDENT EVOLUTION PHOTO REPOSITORY
// ==============================================================================
export class SupabaseStudentPhotoRepository implements IStudentPhotoRepository {
  async getAll(organizationId?: string): Promise<StudentPhoto[]> {
    const orgId = resolveOrgId(organizationId);
    const { data, error } = await fromTable('student_photos')
      .select('id, student_id, photo_reference, category, photo_date, notes, created_at')
      .eq('organization_id', orgId)
      .order('photo_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      photoUrl: row.photo_reference,
      category: row.category,
      date: row.photo_date,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    } as StudentPhoto));
  }

  async save(photo: StudentPhoto): Promise<StudentPhoto> {
    const orgId = resolveOrgId();
    const studentUuid = await resolveStudentUuid(photo.studentId);
    if (!studentUuid || !isUUID(studentUuid)) {
      throw new Error('Aluno não encontrado na organização atual. A foto não foi salva.');
    }
    const photoId = isUUID(photo.id) ? photo.id : ensureUUID(photo.id).uuid;
    const payload = {
      id: photoId,
      organization_id: orgId,
      student_id: studentUuid,
      photo_reference: photo.photoUrl,
      category: photo.category,
      photo_date: photo.date,
      notes: photo.notes || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await fromTable('student_photos')
      .upsert(payload, { onConflict: 'id' })
      .select('id, student_id, photo_reference, category, photo_date, notes, created_at')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      studentId: data.student_id,
      photoUrl: data.photo_reference,
      category: data.category,
      date: data.photo_date,
      notes: data.notes || undefined,
      createdAt: data.created_at,
    } as StudentPhoto;
  }

  async delete(id: string): Promise<void> {
    if (!isUUID(id)) throw new Error('Identificador de foto inválido. Atualize a galeria e tente novamente.');
    const orgId = resolveOrgId();
    const { error } = await fromTable('student_photos')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    if (error) throw error;
  }
}

// ==============================================================================
// 2. SUPABASE EXERCISE REPOSITORY
// ==============================================================================
export class SupabaseExerciseRepository implements IExerciseRepository {
  async getAll(organizationId?: string): Promise<Exercise[]> {
    const orgId = resolveOrgId(organizationId);
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = fromTable('exercises')
        .select('*')
        .order('name');
        
      // Or filter: organization_id is null OR organization_id = orgId
      query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);

      const { data, error } = await query.range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        from += pageSize;
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return allData.map((row: any) => ({
      id: row.legacy_id || row.id,
      name: row.name,
      muscleGroup: row.muscle_group as Exercise['muscleGroup'],
      primaryMuscles: row.primary_muscles || [],
      secondaryMuscles: row.secondary_muscles || [],
      equipment: row.equipment || 'none',
      executionSteps: row.execution_steps || [],
      tips: row.tips || [],
      recordType: row.record_type as Exercise['recordType'] || undefined,
      isCustom: row.is_custom,
      isArchived: row.is_archived,
      videoUrl: row.video_url || undefined,
      imageUrl: row.image_url || undefined,
      defaultRestSeconds: row.default_rest_seconds || 60,
      functionalTags: (row.functional_tags as Exercise['functionalTags']) || [],
    }));
  }

  async getById(id: string): Promise<Exercise | null> {
    const isU = isUUID(id);
    let query = fromTable('exercises').select('*');
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      id: data.legacy_id || data.id,
      name: data.name,
      muscleGroup: data.muscle_group as Exercise['muscleGroup'],
      primaryMuscles: data.primary_muscles || [],
      secondaryMuscles: data.secondary_muscles || [],
      equipment: data.equipment || 'none',
      executionSteps: data.execution_steps || [],
      tips: data.tips || [],
      recordType: data.record_type as Exercise['recordType'] || undefined,
      isCustom: data.is_custom,
      isArchived: data.is_archived,
      videoUrl: data.video_url || undefined,
      imageUrl: data.image_url || undefined,
      defaultRestSeconds: data.default_rest_seconds || 60,
      functionalTags: (data.functional_tags as Exercise['functionalTags']) || [],
    };
  }

  async create(exercise: Exercise): Promise<Exercise> {
    const { uuid, legacyId } = ensureUUID(exercise.id);
    const payload = {
      id: uuid,
      legacy_id: legacyId || null,
      organization_id: resolveOrgId((exercise as any).organizationId),
      name: exercise.name,
      muscle_group: exercise.muscleGroup,
      primary_muscles: exercise.primaryMuscles || [],
      secondary_muscles: exercise.secondaryMuscles || [],
      equipment: exercise.equipment || null,
      execution_steps: exercise.executionSteps || [],
      tips: exercise.tips || [],
      prescription_type: 'weight_reps',
      record_type: exercise.recordType || null,
      is_custom: exercise.isCustom ?? false,
      is_system: !(exercise.isCustom ?? false),
      is_archived: exercise.isArchived ?? false,
      video_url: exercise.videoUrl || null,
      image_url: exercise.imageUrl || null,
      default_rest_seconds: exercise.defaultRestSeconds || 60,
      functional_tags: exercise.functionalTags || [],
    };

    const { data, error } = await fromTable('exercises').insert(payload).select().single();
    if (error) throw error;

    return {
      ...exercise,
      id: data.legacy_id || data.id,
    };
  }

  async update(id: string, patch: Partial<Exercise>): Promise<Exercise> {
    const isU = isUUID(id);
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) updatePayload.name = patch.name;
    if (patch.muscleGroup !== undefined) updatePayload.muscle_group = patch.muscleGroup;
    if (patch.primaryMuscles !== undefined) updatePayload.primary_muscles = patch.primaryMuscles;
    if (patch.secondaryMuscles !== undefined) updatePayload.secondary_muscles = patch.secondaryMuscles;
    if (patch.equipment !== undefined) updatePayload.equipment = patch.equipment;
    if (patch.executionSteps !== undefined) updatePayload.execution_steps = patch.executionSteps;
    if (patch.tips !== undefined) updatePayload.tips = patch.tips;
    if (patch.isArchived !== undefined) updatePayload.is_archived = patch.isArchived;

    let query = fromTable('exercises').update(updatePayload);
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.select().single();
    if (error) throw error;

    return {
      ...patch,
      id: data.legacy_id || data.id,
      name: data.name,
      muscleGroup: data.muscle_group as Exercise['muscleGroup'],
      primaryMuscles: data.primary_muscles || [],
      secondaryMuscles: data.secondary_muscles || [],
      equipment: data.equipment || 'none',
      executionSteps: data.execution_steps || [],
      defaultRestSeconds: data.default_rest_seconds || 60,
    };
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('exercises').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) {
      if (error.code === '23503') {
        // Violates foreign key constraint (referenced in workouts/history)
        // Soft delete (archive) instead
        const updateQuery = fromTable('exercises').update({ is_archived: true } as any);
        const { error: archiveError } = await (isU ? updateQuery.eq('id', id) : updateQuery.eq('legacy_id', id));
        if (archiveError) throw archiveError;
        return;
      }
      throw error;
    }
  }
}

// ==============================================================================
// 3. SUPABASE ROUTINE REPOSITORY
// ==============================================================================
export class SupabaseRoutineRepository implements IRoutineRepository {
  async getAll(organizationId?: string): Promise<WorkoutRoutine[]> {
    const orgId = resolveOrgId(organizationId);
    let query = fromTable('routines').select('*, students(id, legacy_id), routine_workouts(*, workout_exercises(*, exercises(id, legacy_id, name, muscle_group), exercise_groups(id, name, type, position, rounds, rest_between_exercises, rest_after_round)))');
    query = query.eq('organization_id', orgId);
    
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += pageSize;
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allData.map((r: any) => this.mapRoutine(r));
  }

  async getByStudentId(studentId: string): Promise<WorkoutRoutine[]> {
    const stdUuid = await resolveStudentUuid(studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      return [];
    }

    const { data, error } = await fromTable('routines')
      .select('*, students(id, legacy_id), routine_workouts(*, workout_exercises(*, exercises(id, legacy_id, name, muscle_group), exercise_groups(id, name, type, position, rounds, rest_between_exercises, rest_after_round)))')
      .eq('student_id', stdUuid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any) => this.mapRoutine(r));
  }

  async getById(id: string): Promise<WorkoutRoutine | null> {
    const realUuid = await resolveRoutineUuid(id);
    let data = null;

    if (realUuid) {
      const { data: byUuid, error } = await fromTable('routines')
        .select('*, students(id, legacy_id), routine_workouts(*, workout_exercises(*, exercises(id, legacy_id, name, muscle_group), exercise_groups(id, name, type, position, rounds, rest_between_exercises, rest_after_round)))')
        .eq('id', realUuid)
        .maybeSingle();
      if (error) throw error;
      data = byUuid;
    } else {
      const { data: byLeg, error } = await fromTable('routines')
        .select('*, students(id, legacy_id), routine_workouts(*, workout_exercises(*, exercises(id, legacy_id, name, muscle_group), exercise_groups(id, name, type, position, rounds, rest_between_exercises, rest_after_round)))')
        .eq('legacy_id', id)
        .maybeSingle();
      if (error) throw error;
      data = byLeg;
    }

    if (!data) return null;
    return this.mapRoutine(data);
  }

  async create(routine: WorkoutRoutine): Promise<WorkoutRoutine> {
    const { uuid, legacyId } = ensureUUID(routine.id);

    // 1. Check if routine already exists in Supabase (by ID or legacy_id)
    let existingRoutine = await this.getById(routine.id);
    if (!existingRoutine && legacyId) {
      existingRoutine = await this.getById(legacyId);
    }
    if (existingRoutine) {
      return this.update(existingRoutine.id, routine);
    }

    let stdUuid = await resolveStudentUuid(routine.studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      throw new Error(`[Integridade] Aluno não encontrado no Supabase (ID: ${routine.studentId}). A rotina não pode ser salva remotamente.`);
    }

    const orgId = resolveOrgId((routine as any).organizationId);
    const { data: createdRoutine, error } = await fromTable('routines')
      .insert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        title: routine.title,
        objective: routine.objective || null,
        description: routine.description || null,
        notes: routine.notes || null,
        status: routine.status || 'active',
        version: routine.version || 1,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint collision (e.g. routines_legacy_id_key or pkey) -> fall back to update!
        return this.update(legacyId || uuid || routine.id, routine);
      }
      throw error;
    }

    try {
      if (routine.workouts && routine.workouts.length > 0) {
        for (let i = 0; i < routine.workouts.length; i++) {
          const w = routine.workouts[i];
          const { uuid: wUuid, legacyId: wLeg } = ensureUUID(w.id);
          const { data: createdW, error: wErr } = await fromTable('routine_workouts')
            .insert({
              id: wUuid,
              legacy_id: wLeg || null,
              routine_id: createdRoutine.id,
              letter: w.letter,
              name: w.name,
              description: w.description || null,
              position: i,
            })
            .select()
            .single();

          if (wErr) throw wErr;

          if (createdW && w.exercises && w.exercises.length > 0) {
            await this.insertWorkoutExercisesAndGroups(createdW.id, w.exercises);
          }
        }
      }
    } catch (childErr) {
      // If child insertion fails, delete the newly created routine to avoid leaving an orphaned row
      try {
        await fromTable('routines').delete().eq('id', createdRoutine.id);
      } catch (cleanErr) {
        console.warn('Failed to clean up aborted routine header:', cleanErr);
      }
      throw childErr;
    }

    return (await this.getById(createdRoutine.id)) || routine;
  }

  async update(id: string, patch: Partial<WorkoutRoutine>): Promise<WorkoutRoutine> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Routine ${id} not found`);

    let realRoutineUuid = (existing as any).databaseId || (existing as any).uuid;
    if (!realRoutineUuid || !isUUID(realRoutineUuid)) {
      realRoutineUuid = await resolveRoutineUuid(id);
    }
    if (!realRoutineUuid || !isUUID(realRoutineUuid)) {
      throw new Error(`[Integridade] UUID da rotina não encontrado para atualização (ID: ${id})`);
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.objective !== undefined) updatePayload.objective = patch.objective;
    if (patch.description !== undefined) updatePayload.description = patch.description;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.version !== undefined) updatePayload.version = patch.version;

    const { error } = await fromTable('routines').update(updatePayload).eq('id', realRoutineUuid);
    if (error) throw error;

    // Handle workouts if provided
    if (patch.workouts !== undefined) {
      // Delete existing workouts (and cascaded exercise_groups & workout_exercises)
      const { error: delErr } = await fromTable('routine_workouts').delete().eq('routine_id', realRoutineUuid);
      if (delErr) throw delErr;

      if (patch.workouts.length > 0) {
        for (let i = 0; i < patch.workouts.length; i++) {
          const w = patch.workouts[i];
          const { uuid: wUuid, legacyId: wLeg } = ensureUUID(w.id);
          const { data: createdW, error: wErr } = await fromTable('routine_workouts')
            .insert({
              id: wUuid,
              legacy_id: wLeg || null,
              routine_id: realRoutineUuid,
              letter: w.letter,
              name: w.name,
              description: w.description || null,
              position: i,
            })
            .select()
            .single();

          if (wErr) throw wErr;

          if (createdW && w.exercises && w.exercises.length > 0) {
            await this.insertWorkoutExercisesAndGroups(createdW.id, w.exercises);
          }
        }
      }
    }

    return (await this.getById(realRoutineUuid)) || { ...existing, ...patch };
  }

  async delete(id: string): Promise<void> {
    const realUuid = await resolveRoutineUuid(id);
    if (realUuid) {
      const { error } = await fromTable('routines').delete().eq('id', realUuid);
      if (error) throw error;
      return;
    }
    const { error } = await fromTable('routines').delete().eq('legacy_id', id);
    if (error) throw error;
  }

  private async insertWorkoutExercisesAndGroups(workoutId: string, exercises: RoutineExercise[]): Promise<void> {
    if (!exercises || exercises.length === 0) return;

    // 1. Process Exercise Groups for this workout
    const groupMap = new Map<string, string>(); // ex.groupId -> generated or existing group UUID in db
    const groupsToCreate = new Map<string, any>();

    for (const ex of exercises) {
      if (ex.groupId) {
        if (!groupsToCreate.has(ex.groupId)) {
          const gUuid = isUUID(ex.groupId) ? ex.groupId : crypto.randomUUID();
          groupMap.set(ex.groupId, gUuid);

          let grpType: 'normal' | 'bi_set' | 'tri_set' | 'circuit' = 'bi_set';
          if (ex.groupType) {
            const norm = ex.groupType.toLowerCase().replace('-', '_');
            if (['normal', 'bi_set', 'tri_set', 'circuit'].includes(norm)) {
              grpType = norm as any;
            }
          }

          // Notice: exercise_groups table in Supabase does NOT have legacy_id!
          groupsToCreate.set(ex.groupId, {
            id: gUuid,
            workout_id: workoutId,
            name: ex.groupName || 'Grupo',
            type: grpType,
            position: ex.groupOrder ?? 0,
            rounds: (ex as any).groupRounds || (ex as any).rounds || 1,
            rest_between_exercises: ex.restBetweenExercises ?? 0,
            rest_after_round: ex.restAfterRound ?? 60,
          });
        }
      }
    }

    if (groupsToCreate.size > 0) {
      const groupsPayload = Array.from(groupsToCreate.values());
      const { error: grpErr } = await fromTable('exercise_groups').insert(groupsPayload);
      if (grpErr) throw grpErr;
    }

    // 2. Resolve exercise UUIDs
    for (const ex of exercises) {
      if (isUUID(ex.exerciseId)) {
        (ex as any).resolvedExId = ex.exerciseId;
      } else {
        const { data: exData } = await fromTable('exercises')
          .select('id')
          .eq('legacy_id', ex.exerciseId)
          .maybeSingle();
        if (exData) {
          (ex as any).resolvedExId = exData.id;
        } else {
          const candExUuid = ex.exerciseId && ex.exerciseId.includes('-')
            ? ex.exerciseId.replace(/^[a-z0-9_]+-/, '')
            : null;
          if (candExUuid && isUUID(candExUuid)) {
            const { data: candData } = await fromTable('exercises')
              .select('id')
              .eq('id', candExUuid)
              .maybeSingle();
            if (candData) {
              (ex as any).resolvedExId = candData.id;
            }
          }
        }
        if (!(ex as any).resolvedExId && ex.exerciseName) {
          const { data: nameData } = await fromTable('exercises')
            .select('id')
            .ilike('name', ex.exerciseName)
            .maybeSingle();
          if (nameData) {
            (ex as any).resolvedExId = nameData.id;
          } else {
            const { uuid: newExUuid, legacyId: newExLeg } = ensureUUID(ex.exerciseId);
            const { data: createdEx } = await fromTable('exercises').insert({
              id: newExUuid,
              legacy_id: newExLeg || null,
              name: ex.exerciseName,
              muscle_group: ex.muscleGroup || 'Peitoral',
              organization_id: resolveOrgId(),
            }).select('id').maybeSingle();
            if (createdEx) {
              (ex as any).resolvedExId = createdEx.id;
            }
          }
        }
      }
    }

    // 3. Prepare and insert workout_exercises
    const exercisesPayload = exercises.map((ex, exIdx) => {
      const { uuid: exUuid, legacyId: exLeg } = ensureUUID(ex.id);
      let finalGroupId: string | null = null;
      if (ex.groupId) {
        finalGroupId = groupMap.get(ex.groupId) || (isUUID(ex.groupId) ? ex.groupId : null);
      }

      return {
        id: exUuid,
        legacy_id: exLeg || null,
        workout_id: workoutId,
        exercise_id: (ex as any).resolvedExId,
        group_id: finalGroupId,
        position: exIdx,
        prescription_type: ex.prescriptionType || 'weight_reps',
        target_sets: ex.targetSets || 3,
        target_reps_min: ex.targetRepsMin || 8,
        target_reps_max: ex.targetRepsMax || 12,
        target_duration_seconds: ex.targetDurationSeconds || null,
        duration_unit: ex.durationUnit || 'seconds',
        target_distance: ex.targetDistance || null,
        distance_unit: ex.distanceUnit || 'meters',
        cardio_speed_kmh: ex.cardioSpeedKmh || null,
        cardio_incline_pct: ex.cardioInclinePct || null,
        target_rpe: ex.targetRPE || null,
        rest_seconds: ex.restSeconds || 60,
        notes: ex.notes || null,
      };
    });

    const { error: exErr } = await fromTable('workout_exercises').insert(exercisesPayload);
    if (exErr) throw exErr;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRoutine(row: any): WorkoutRoutine {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workouts: RoutineWorkout[] = (row.routine_workouts || [])
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map((w: any, wIdx: number) => ({
        id: w.legacy_id || w.id,
        routineId: row.legacy_id || row.id,
        letter: w.letter,
        name: w.name,
        description: w.description || undefined,
        order: w.position ?? wIdx,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exercises: (w.workout_exercises || [])
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
          .map((ex: any, exIdx: number): RoutineExercise => ({
            id: ex.legacy_id || ex.id,
            exerciseId: ex.exercises ? (ex.exercises.legacy_id || ex.exercises.id) : ex.exercise_id,
            exerciseName: ex.exercises?.name || 'Exercício',
            muscleGroup: ex.exercises?.muscle_group || 'Peitoral',
            order: ex.position ?? exIdx,
            prescriptionType: ex.prescription_type,
            targetSets: ex.target_sets,
            targetRepsMin: ex.target_reps_min,
            targetRepsMax: ex.target_reps_max,
            targetDurationSeconds: ex.target_duration_seconds || undefined,
            durationUnit: ex.duration_unit || undefined,
            targetDistance: ex.target_distance || undefined,
            distanceUnit: ex.distance_unit || undefined,
            cardioSpeedKmh: ex.cardio_speed_kmh || undefined,
            cardioInclinePct: ex.cardio_incline_pct || undefined,
            targetRPE: ex.target_rpe ? Number(ex.target_rpe) : undefined,
            restSeconds: ex.rest_seconds,
            notes: ex.notes || undefined,
            groupId: ex.group_id || undefined,
            groupType: ex.exercise_groups?.type ? (ex.exercise_groups.type.replace('-', '_') as any) : undefined,
            groupName: ex.exercise_groups?.name || undefined,
            groupOrder: ex.exercise_groups?.position ?? undefined,
            groupRounds: ex.exercise_groups?.rounds ?? undefined,
            restBetweenExercises: ex.exercise_groups?.rest_between_exercises ?? undefined,
            restAfterRound: ex.exercise_groups?.rest_after_round ?? undefined,
          })),
      }));

    return {
      id: row.legacy_id || row.id,
      studentId: row.students ? (row.students.legacy_id || row.students.id) : row.student_id,
      title: row.title,
      objective: row.objective || undefined,
      description: row.description || undefined,
      notes: row.notes || undefined,
      status: row.status,
      version: row.version,
      workouts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      databaseId: row.id,
      uuid: row.id,
    } as any;
  }
}

// ==============================================================================
// 4. SUPABASE SESSION REPOSITORY
// ==============================================================================
export class SupabaseSessionRepository implements ISessionRepository {
  async getAll(organizationId?: string): Promise<WorkoutSession[]> {
    const orgId = resolveOrgId(organizationId);
    let query = fromTable('sessions').select('*, students(id, legacy_id), session_sets(*, exercises(id, legacy_id, name, muscle_group))').order('start_time', { ascending: false });
    query = query.eq('organization_id', orgId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((s: any) => this.mapSession(s));
  }

  async getByStudentId(studentId: string): Promise<WorkoutSession[]> {
    const stdUuid = await resolveStudentUuid(studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      return [];
    }

    const { data, error } = await fromTable('sessions')
      .select('*, students(id, legacy_id), session_sets(*, exercises(id, legacy_id, name, muscle_group))')
      .eq('student_id', stdUuid)
      .order('start_time', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((s: any) => this.mapSession(s));
  }

  async getById(id: string): Promise<WorkoutSession | null> {
    const isU = isUUID(id);
    let query = fromTable('sessions').select('*, students(id, legacy_id), session_sets(*, exercises(id, legacy_id, name, muscle_group))');
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.mapSession(data);
  }

  async create(session: WorkoutSession): Promise<WorkoutSession> {
    let { uuid, legacyId } = ensureUUID(session.id);
    if (legacyId) {
      const { data: existing } = await fromTable('sessions').select('id').eq('legacy_id', legacyId).maybeSingle();
      if (existing?.id) {
        uuid = existing.id;
      }
    }

    // Resolve Student
    const stdUuid = await resolveStudentUuid(session.studentId);
    if (!stdUuid) {
      throw new Error(`[Integridade] Aluno não encontrado no Supabase (ID: ${session.studentId}). Sessão não pode ser salva remotamente sem aluno válido.`);
    }

    // Resolve Routine
    let routineUuid: string | null = null;
    if (session.routineId) {
      routineUuid = await resolveRoutineUuid(session.routineId);
    }

    // Resolve Workout
    let workoutUuid = session.workoutId;
    if (workoutUuid) {
      if (isUUID(workoutUuid)) {
        const { data } = await fromTable('routine_workouts').select('id').eq('id', workoutUuid).maybeSingle();
        if (!data) workoutUuid = null;
      } else {
        const { data } = await fromTable('routine_workouts').select('id').eq('legacy_id', workoutUuid).maybeSingle();
        if (data) workoutUuid = data.id;
        else workoutUuid = null;
      }
    }

    // Resolve Cycle and Block if any
    let cycleUuid = session.cycleId;
    if (cycleUuid) {
      if (isUUID(cycleUuid)) {
        const { data } = await fromTable('training_cycles').select('id').eq('id', cycleUuid).maybeSingle();
        if (!data) cycleUuid = null;
      } else {
        const { data } = await fromTable('training_cycles').select('id').eq('legacy_id', cycleUuid).maybeSingle();
        if (data) cycleUuid = data.id;
        else cycleUuid = null;
      }
    }

    let blockUuid = session.blockId;
    if (blockUuid) {
      if (isUUID(blockUuid)) {
        const { data } = await fromTable('training_blocks').select('id').eq('id', blockUuid).maybeSingle();
        if (!data) blockUuid = null;
      } else {
        const { data } = await fromTable('training_blocks').select('id').eq('legacy_id', blockUuid).maybeSingle();
        if (data) blockUuid = data.id;
        else blockUuid = null;
      }
    }

    const orgId = resolveOrgId((session as any).organizationId);

    const { data: createdSession, error } = await fromTable('sessions')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        routine_id: routineUuid || null,
        workout_id: workoutUuid || null,
        cycle_id: cycleUuid || null,
        block_id: blockUuid || null,
        student_name_snapshot: session.studentName || 'Aluno',
        routine_title_snapshot: session.routineTitle || 'Treino',
        workout_letter_snapshot: session.workoutLetter || null,
        workout_name_snapshot: session.workoutName || null,
        start_time: session.startTime,
        end_time: session.endTime || null,
        duration_seconds: session.durationSeconds || 0,
        status: session.status || 'completed',
        total_volume: session.totalVolume || 0,
        total_sets: session.totalSets || 0,
        notes: session.notes || null,
        coach_notes: session.coachNotes || null,
        student_rating: session.studentRating || null,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error("SupabaseSessionRepository.create error upserting session:", error);
      throw error;
    }

    if (session.sets && session.sets.length > 0) {
      // Resolve exercise UUIDs
      for (const st of session.sets) {
        if (isUUID(st.exerciseId)) {
          const { data: exData } = await fromTable('exercises').select('id').eq('id', st.exerciseId).maybeSingle();
          if (exData) {
            (st as any).resolvedExId = exData.id;
          } else {
            // Se o UUID nao existir na tabela de exercícios, busca por legacy_id p/ caso seja um legacy em formato de UUID
            const { data: fallbackData } = await fromTable('exercises').select('id').eq('legacy_id', st.exerciseId).maybeSingle();
            (st as any).resolvedExId = fallbackData ? fallbackData.id : null;
          }
        } else {
          const { data: exData } = await fromTable('exercises').select('id').eq('legacy_id', st.exerciseId).maybeSingle();
          (st as any).resolvedExId = exData ? exData.id : null;
        }
      }
      const validSets = session.sets.filter(st => (st as any).resolvedExId);
      if (validSets.length > 0) {
        const setsPayload = validSets.map((st, idx) => {
          const { uuid: stUuid, legacyId: stLeg } = ensureUUID(st.id);
          return {
            id: stUuid,
            legacy_id: stLeg || null,
            session_id: createdSession.id,
            exercise_id: (st as any).resolvedExId,
            set_number: st.setNumber ?? idx + 1,
            target_reps: st.targetReps || null,
            actual_reps: st.actualReps || 0,
            weight_kg: st.weightKg || null,
            rpe: st.rpe || null,
            is_pr: st.isPR || false,
            pr_types: st.prTypes || [],
            is_warmup: st.isWarmup || false,
            is_drop_set: st.isDropSet || false,
          };
        });

        // Limpa séries antigas da sessão para garantir idempotência ao finalizar
        await fromTable('session_sets').delete().eq('session_id', createdSession.id);

        const { error: setsErr } = await fromTable('session_sets').insert(setsPayload);
        if (setsErr) {
          console.error("SupabaseSessionRepository.create error inserting session_sets:", setsErr);
          throw setsErr;
        }
      }
    }

    return (await this.getById(createdSession.id)) || session;
  }

  async update(id: string, patch: Partial<WorkoutSession>): Promise<WorkoutSession> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Session ${id} not found`);

    const isU = isUUID(id);
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.endTime !== undefined) updatePayload.end_time = patch.endTime;
    if (patch.durationSeconds !== undefined) updatePayload.duration_seconds = patch.durationSeconds;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.totalVolume !== undefined) updatePayload.total_volume = patch.totalVolume;
    if (patch.totalSets !== undefined) updatePayload.total_sets = patch.totalSets;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.coachNotes !== undefined) updatePayload.coach_notes = patch.coachNotes;

    let query = fromTable('sessions').update(updatePayload);
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;

    return (await this.getById(id)) || { ...existing, ...patch };
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('sessions').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSession(row: any): WorkoutSession {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sets: WorkoutSetRecord[] = (row.session_sets || []).map((s: any) => ({
      id: s.legacy_id || s.id,
      sessionId: s.session_id,
      exerciseId: s.exercises ? (s.exercises.legacy_id || s.exercises.id) : s.exercise_id,
      exerciseName: s.exercises?.name || 'Exercício',
      muscleGroup: s.exercises?.muscle_group || 'Peitoral',
      setNumber: s.set_number,
      targetReps: s.target_reps || 10,
      actualReps: s.actual_reps || 0,
      weightKg: s.weight_kg ? Number(s.weight_kg) : 0,
      rpe: s.rpe ? Number(s.rpe) : undefined,
      isPR: s.is_pr,
      prTypes: s.pr_types || [],
      isWarmup: s.is_warmup,
      isDropSet: s.is_drop_set,
      notes: s.notes || undefined,
      completedAt: s.completed_at,
    }));

    return {
      id: row.legacy_id || row.id,
      studentId: row.students ? (row.students.legacy_id || row.students.id) : row.student_id,
      studentName: row.student_name_snapshot,
      routineId: row.routine_id || undefined,
      routineTitle: row.routine_title_snapshot,
      workoutId: row.workout_id || undefined,
      workoutLetter: row.workout_letter_snapshot || undefined,
      workoutName: row.workout_name_snapshot || undefined,
      startTime: row.start_time,
      endTime: row.end_time || undefined,
      durationSeconds: row.duration_seconds,
      status: row.status,
      totalVolume: Number(row.total_volume || 0),
      totalSets: row.total_sets,
      sets,
      prsAchieved: [],
      notes: row.notes || undefined,
      coachNotes: row.coach_notes || undefined,
      studentRating: row.student_rating || undefined,
      updatedAt: row.updated_at,
    };
  }
}

// ==============================================================================
// 5. SUPABASE ASSESSMENT REPOSITORY
// ==============================================================================
export class SupabaseAssessmentRepository implements IAssessmentRepository {
  async getAll(organizationId?: string): Promise<PhysicalAssessment[]> {
    const orgId = resolveOrgId(organizationId);
    let query = fromTable('assessments').select('*, students(id, legacy_id)').order('date', { ascending: false });
    query = query.eq('organization_id', orgId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((a: any) => this.mapAssessment(a));
  }

  async getByStudentId(studentId: string): Promise<PhysicalAssessment[]> {
    const stdUuid = await resolveStudentUuid(studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      return [];
    }

    const { data, error } = await fromTable('assessments')
      .select('*')
      .eq('student_id', stdUuid)
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((a: any) => this.mapAssessment(a));
  }

  async getById(id: string): Promise<PhysicalAssessment | null> {
    const isU = isUUID(id);
    let query = fromTable('assessments').select('*, students(id, legacy_id)');
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.mapAssessment(data);
  }

  async create(assessment: PhysicalAssessment): Promise<PhysicalAssessment> {
    const { uuid, legacyId } = ensureUUID(assessment.id);
    let stdUuid = await resolveStudentUuid(assessment.studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      console.info(`[SupabasePhysicalAssessmentRepository] Aluno '${assessment.studentId}' não possui UUID no Supabase. Avaliação mantida localmente.`);
      return assessment;
    }

    const orgId = resolveOrgId((assessment as any).organizationId);

    const { data, error } = await fromTable('assessments')
      .insert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        date: assessment.date,
        weight_kg: assessment.weightKg,
        height_cm: assessment.heightCm,
        age: assessment.age,
        gender: assessment.gender,
        protocol: assessment.protocol,
        body_fat_percentage: assessment.bodyFatPercentage,
        fat_mass_kg: assessment.fatMassKg,
        lean_mass_kg: assessment.leanMassKg,
        bmi: assessment.bmi,
        skinfolds: (assessment.skinfolds as unknown as Record<string, unknown>) || null,
        circumferences: (assessment.circumferences as unknown as Record<string, unknown>) || null,
        photos: (assessment.photos as unknown as Record<string, unknown>) || null,
        notes: assessment.notes || null,
        conclusions: assessment.conclusions || null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapAssessment(data);
  }

  async update(id: string, patch: Partial<PhysicalAssessment>): Promise<PhysicalAssessment> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Assessment ${id} not found`);

    const isU = isUUID(id);
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.conclusions !== undefined) updatePayload.conclusions = patch.conclusions;

    let query = fromTable('assessments').update(updatePayload);
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return this.mapAssessment(data);
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('assessments').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAssessment(row: any): PhysicalAssessment {
    return {
      id: row.legacy_id || row.id,
      studentId: row.students ? (row.students.legacy_id || row.students.id) : row.student_id,
      date: row.date,
      weightKg: Number(row.weight_kg),
      heightCm: Number(row.height_cm),
      age: row.age,
      gender: row.gender,
      protocol: row.protocol,
      bodyFatPercentage: Number(row.body_fat_percentage),
      fatMassKg: Number(row.fat_mass_kg),
      leanMassKg: Number(row.lean_mass_kg),
      bmi: Number(row.bmi),
      skinfolds: row.skinfolds || undefined,
      circumferences: row.circumferences || undefined,
      photos: row.photos || undefined,
      notes: row.notes || undefined,
      conclusions: row.conclusions || undefined,
      updatedAt: row.updated_at,
    };
  }
}

// ==============================================================================
// 6. SUPABASE SCHEDULE REPOSITORY
// ==============================================================================
export class SupabaseScheduleRepository implements IScheduleRepository {
  async getAppointments(organizationId?: string): Promise<ScheduleAppointment[]> {
    const orgId = resolveOrgId(organizationId);
    const query = fromTable('schedule_events').select('*').eq('organization_id', orgId).order('date').order('time');
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((ev: any) => ({
      id: ev.legacy_id || ev.id,
      studentId: ev.student_id,
      studentName: 'Aluno',
      date: ev.date,
      time: ev.time,
      durationMinutes: ev.duration_minutes,
      type: ev.type as ScheduleAppointment['type'],
      status: ev.status as ScheduleAppointment['status'],
      notes: ev.notes || undefined,
      isException: ev.is_exception,
    }));
  }

  async getRecurrences(organizationId?: string): Promise<ScheduleRecurrence[]> {
    const orgId = resolveOrgId(organizationId);
    const query = fromTable('schedule_recurrences').select('*').eq('organization_id', orgId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((rec: any) => ({
      id: rec.legacy_id || rec.id,
      studentId: rec.student_id,
      studentName: 'Aluno',
      startDate: rec.start_date,
      endDate: rec.end_date || undefined,
      periodType: rec.period_type as ScheduleRecurrence['periodType'],
      weekdays: rec.weekdays || [],
      defaultTime: rec.default_time,
      useDifferentTimes: false,
      useDifferentRoutines: false,
      weekdayConfigs: [],
      defaultDurationMinutes: rec.default_duration_minutes,
      status: rec.status as ScheduleRecurrence['status'],
      notes: rec.notes || undefined,
      createdAt: rec.created_at,
      updatedAt: rec.updated_at,
    }));
  }

  async saveAppointment(appointment: ScheduleAppointment): Promise<ScheduleAppointment> {
    let { uuid, legacyId } = ensureUUID(appointment.id);
    if (legacyId) { const { data } = await fromTable('schedule_events').select('id').eq('legacy_id', legacyId).maybeSingle(); if (data) uuid = data.id; }
    let stdUuid = appointment.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await fromTable('students').select('id').eq('legacy_id', appointment.studentId).maybeSingle();
      if (data) stdUuid = data.id;
      else stdUuid = appointment.studentId; // FIX: Keep original ID, do not invent UUID
    }

    const orgId = resolveOrgId((appointment as any).organizationId);

    const { data, error } = await fromTable('schedule_events')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        date: appointment.date,
        time: appointment.time,
        duration_minutes: appointment.durationMinutes || 60,
        type: appointment.type || 'workout',
        status: appointment.status || 'scheduled',
        notes: appointment.notes || null,
        is_exception: appointment.isException || false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...appointment,
      id: data?.legacy_id || data?.id || uuid,
    };
  }

  async deleteAppointment(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('schedule_events').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }

  async saveRecurrence(recurrence: ScheduleRecurrence): Promise<ScheduleRecurrence> {
    let { uuid, legacyId } = ensureUUID(recurrence.id);
    if (legacyId) { const { data } = await fromTable('schedule_recurrences').select('id').eq('legacy_id', legacyId).maybeSingle(); if (data) uuid = data.id; }
    let stdUuid = recurrence.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await fromTable('students').select('id').eq('legacy_id', recurrence.studentId).maybeSingle();
      if (data) stdUuid = data.id;
      else stdUuid = recurrence.studentId; // FIX: Keep original ID, do not invent UUID
    }

    const orgId = resolveOrgId((recurrence as any).organizationId);

    const { data, error } = await fromTable('schedule_recurrences')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        start_date: recurrence.startDate,
        end_date: recurrence.endDate || null,
        period_type: recurrence.periodType,
        weekdays: recurrence.weekdays,
        default_time: recurrence.defaultTime,
        default_duration_minutes: recurrence.defaultDurationMinutes || 60,
        status: recurrence.status || 'active',
        notes: recurrence.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...recurrence,
      id: data?.legacy_id || data?.id || uuid,
    };
  }

  async deleteRecurrence(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('schedule_recurrences').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }
}

// ==============================================================================
// 7. SUPABASE TRAINING CYCLE REPOSITORY
// ==============================================================================
export class SupabaseTrainingCycleRepository implements ITrainingCycleRepository {
  async getAll(): Promise<TrainingCycle[]> {
    const { data, error } = await fromTable('training_cycles').select('*, students(id, legacy_id), training_blocks(*)')
      .order('start_date', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((c: any) => this.mapCycle(c));
  }

  async getByStudentId(studentId: string): Promise<TrainingCycle[]> {
    const stdUuid = await resolveStudentUuid(studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      return [];
    }

    const { data, error } = await fromTable('training_cycles').select('*, students(id, legacy_id), training_blocks(*)')
      .eq('student_id', stdUuid)
      .order('start_date', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((c: any) => this.mapCycle(c));
  }

  async getById(id: string): Promise<TrainingCycle | null> {
    const isU = isUUID(id);
    let query = fromTable('training_cycles').select('*, students(id, legacy_id), training_blocks(*)');
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.mapCycle(data);
  }

  async save(cycle: TrainingCycle): Promise<TrainingCycle> {
    const { uuid, legacyId } = ensureUUID(cycle.id);
    
    let finalUuid = uuid;
    if (legacyId) {
      const { data: existing } = await fromTable('training_cycles').select('id').eq('legacy_id', legacyId).maybeSingle();
      if (existing) {
        finalUuid = existing.id;
      }
    }
    let stdUuid = await resolveStudentUuid(cycle.studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      console.info(`[SupabaseTrainingCycleRepository] Aluno '${cycle.studentId}' não possui UUID no Supabase. Ciclo mantido localmente.`);
      return cycle;
    }

    const { data: createdCycle, error } = await fromTable('training_cycles')
      .upsert({
        id: finalUuid,
        legacy_id: legacyId || null,
        organization_id: resolveOrgId((cycle as any).organizationId),
        student_id: stdUuid,
        name: cycle.name,
        objective: cycle.objective || null,
        start_date: cycle.startDate,
        total_weeks: cycle.totalWeeks || 12,
        status: cycle.status || 'planned',
        notes: cycle.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    const cycleId = createdCycle?.id || uuid;

    if (cycle.blocks && cycle.blocks.length > 0) {
      for (let i = 0; i < cycle.blocks.length; i++) {
        const b = cycle.blocks[i];
        const { uuid: bUuid, legacyId: bLeg } = ensureUUID(b.id);
        
        let finalBUuid = bUuid;
        if (bLeg) {
          const { data: existingB } = await fromTable('training_blocks').select('id').eq('legacy_id', bLeg).maybeSingle();
          if (existingB) {
            finalBUuid = existingB.id;
          }
        }
        const { error: blockErr } = await fromTable('training_blocks').upsert({
          id: finalBUuid,
          legacy_id: bLeg || null,
          cycle_id: cycleId,
          name: b.name,
          objective: b.objective || null,
          position: i,
          duration_weeks: b.durationWeeks || 4,
          start_date: b.startDate,
          end_date: b.endDate,
          notes: b.notes || null,
        });
        if (blockErr) throw blockErr;
      }
    }

    return (await this.getById(cycleId)) || cycle;
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('training_cycles').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCycle(row: any): TrainingCycle {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocks: TrainingBlock[] = (row.training_blocks || []).map((b: any) => ({
      id: b.legacy_id || b.id,
      name: b.name,
      objective: b.objective || undefined,
      durationWeeks: b.duration_weeks,
      startDate: b.start_date,
      endDate: b.end_date,
      notes: b.notes || undefined,
    }));

    return {
      id: row.legacy_id || row.id,
      studentId: row.students ? (row.students.legacy_id || row.students.id) : row.student_id,
      name: row.name,
      objective: row.objective || undefined,
      startDate: row.start_date,
      totalWeeks: row.total_weeks,
      status: row.status,
      blocks,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// ==============================================================================
// 8. SUPABASE PROPOSAL REPOSITORY
// ==============================================================================
export class SupabaseProposalRepository implements IProposalRepository {
  async getAll(organizationId?: string): Promise<Proposal[]> {
    const orgId = resolveOrgId(organizationId);
    const query = fromTable('proposals')
      .select('*, students(id, legacy_id)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((p: any) => this.mapProposal(p));
  }

  async getById(id: string): Promise<Proposal | null> {
    const isU = isUUID(id);
    let query = fromTable('proposals').select('*, students(id, legacy_id)');
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.mapProposal(data);
  }

  async save(proposal: Proposal): Promise<Proposal> {
    let { uuid, legacyId } = ensureUUID(proposal.id);
    if (legacyId) {
      const { data } = await fromTable('proposals').select('id').eq('legacy_id', legacyId).maybeSingle();
      if (data) uuid = data.id;
    }
    const orgId = resolveOrgId((proposal as any).organizationId);

    // Resolve student UUID accurately (suporta UUID direto ou legacy_id como std_carlos)
    let resolvedStudentUuid: string | null = null;
    if (proposal.studentId) {
      resolvedStudentUuid = await resolveStudentUuid(proposal.studentId);
    }
    // Fallback: verificar se algum participante titular possui studentId
    if (!resolvedStudentUuid && proposal.participants && proposal.participants.length > 0) {
      const holder = proposal.participants.find(p => p.role === 'holder' && p.studentId) || proposal.participants[0];
      if (holder?.studentId) {
        resolvedStudentUuid = await resolveStudentUuid(holder.studentId);
      }
    }

    const pricingPayload = {
      title: proposal.title,
      service: proposal.service,
      description: proposal.description,
      plans: proposal.plans || [],
      notes: proposal.notes || null,
      version: proposal.version || 1,
      sentAt: proposal.sentAt || null,
      acceptedAt: proposal.acceptedAt || (proposal.status === 'accepted' ? new Date().toISOString() : null)
    };

    const { data, error } = await fromTable('proposals')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: resolvedStudentUuid && isUUID(resolvedStudentUuid) ? resolvedStudentUuid : null,
        status: proposal.status || 'draft',
        mode: proposal.mode || 'single_plan',
        plan_type: proposal.planType || 'individual',
        student_snapshot: proposal.studentSnapshot || {},
        trainer_snapshot: proposal.trainerSnapshot || {},
        pricing_snapshot: pricingPayload,
        participants_snapshot: proposal.participants || [],
        conditions_snapshot: proposal.conditions || null,
        valid_until: proposal.validUntil || null,
        updated_at: new Date().toISOString(),
      })
      .select('*, students(id, legacy_id)')
      .single();

    if (error) throw error;
    return this.mapProposal(data);
  }

  async delete(id: string): Promise<void> {
    console.log(`[TFIVE PROPOSAL DEBUG] SupabaseProposalRepository.delete called id=${id}`);
    const isU = isUUID(id);
    let proposalUuid: string | null = isU ? id : null;
    let legacyId: string | null = !isU ? id : null;

    // Se o id for um legacy_id (ex: prop_123), tenta localizar o UUID correspondente
    if (!proposalUuid) {
      try {
        const { data } = await fromTable('proposals').select('id, legacy_id').eq('legacy_id', id).maybeSingle();
        if (data?.id) {
          proposalUuid = data.id;
          if (data.legacy_id) legacyId = data.legacy_id;
        }
      } catch (err) {
        console.warn('Não foi possível buscar UUID da proposta por legacy_id:', err);
      }
    } else if (!legacyId) {
      try {
        const { data } = await fromTable('proposals').select('id, legacy_id').eq('id', id).maybeSingle();
        if (data?.legacy_id) {
          legacyId = data.legacy_id;
        }
      } catch (err) {
        console.warn('Não foi possível buscar legacy_id da proposta:', err);
      }
    }

    console.log(`[TFIVE PROPOSAL DEBUG] SupabaseProposalRepository resolved proposalUuid=${proposalUuid} legacyId=${legacyId}`);

    // REGRA DE SEGURANÇA (CASO 2):
    // Antes de excluir, verifica se a proposta gerou ou está vinculada a um plano ativo em active_plans.
    // Preserva integralmente a proposta e o histórico do plano.
    if (proposalUuid) {
      try {
        const { data: linkedPlans, error: checkErr } = await fromTable('active_plans')
          .select('id, name')
          .eq('proposal_id', proposalUuid)
          .limit(1);

        if (checkErr) {
          console.warn('Erro ao verificar active_plans vinculados à proposta:', checkErr);
        } else if (linkedPlans && linkedPlans.length > 0) {
          throw new Error('Esta proposta está vinculada a um plano ativo e não pode ser excluída.');
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('vinculada a um plano ativo')) {
          throw checkErr;
        }
        console.warn('Aviso na verificação de planos ativos:', checkErr);
      }
    }

    // Executa a exclusão da proposta selecionada no Supabase
    let error: any = null;
    if (proposalUuid) {
      const res = await fromTable('proposals').delete().eq('id', proposalUuid);
      error = res.error;
    } else if (legacyId) {
      const res = await fromTable('proposals').delete().eq('legacy_id', legacyId);
      error = res.error;
    } else {
      const res = await fromTable('proposals').delete().eq(isU ? 'id' : 'legacy_id', id);
      error = res.error;
    }

    if (error) {
      console.error('[TFIVE PROPOSAL DEBUG] Erro no Supabase ao excluir proposta:', error);
      throw error;
    }
    console.log(`[TFIVE PROPOSAL DEBUG] SupabaseProposalRepository.delete completed successfully for id=${id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProposal(row: any): Proposal {
    const pricing = row.pricing_snapshot || {};
    const studentIdResolved = row.students 
      ? (row.students.legacy_id || row.students.id) 
      : (row.student_id || '');

    return {
      id: row.legacy_id || row.id,
      uuid: row.id,
      legacyId: row.legacy_id || undefined,
      studentId: studentIdResolved,
      studentUuid: row.student_id || (row.students?.id || undefined),
      studentSnapshot: row.student_snapshot || { name: 'Aluno' },
      participants: (row.participants_snapshot as ProposalParticipant[]) || [],
      planType: row.plan_type || 'individual',
      title: pricing.title || 'Proposta',
      service: pricing.service || 'Personal Training',
      description: pricing.description || '',
      mode: row.mode || 'single_plan',
      plans: pricing.plans || [],
      conditions: row.conditions_snapshot || '',
      status: row.status,
      validUntil: row.valid_until || '',
      version: pricing.version || row.version || 1,
      notes: pricing.notes || row.notes || '',
      sentAt: pricing.sentAt || undefined,
      acceptedAt: pricing.acceptedAt || (row.status === 'accepted' ? (row.updated_at || row.created_at) : undefined),
      trainerSnapshot: row.trainer_snapshot || { name: 'Personal Trainer' },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// ==============================================================================
// 9. SUPABASE ACTIVE PLAN REPOSITORY
// ==============================================================================
export class SupabaseActivePlanRepository implements IActivePlanRepository {
  async getAll(): Promise<ActivePlan[]> {
    const { data, error } = await fromTable('active_plans').select('*');
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((p: any) => this.mapPlan(p));
  }

  async getById(id: string): Promise<ActivePlan | null> {
    const isU = isUUID(id);
    let query = fromTable('active_plans').select('*');
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.mapPlan(data);
  }

  async getByStudentId(studentId: string): Promise<ActivePlan[]> {
    const all = await this.getAll();
    return all.filter((p) => p.participants?.some((pt) => pt.studentId === studentId));
  }

  async save(plan: ActivePlan): Promise<ActivePlan> {
    let { uuid, legacyId } = ensureUUID(plan.id);
    if (legacyId) { const { data } = await fromTable('active_plans').select('id').eq('legacy_id', legacyId).maybeSingle(); if (data) uuid = data.id; }
    
    let resolvedProposalUuid: string | null = null;
    if (plan.proposalId) {
      if (isUUID(plan.proposalId)) {
        resolvedProposalUuid = plan.proposalId;
      } else {
        const { data: propRow } = await fromTable('proposals').select('id').eq('legacy_id', plan.proposalId).maybeSingle();
        if (propRow && propRow.id) resolvedProposalUuid = propRow.id;
      }
    }

    const { data, error } = await fromTable('active_plans')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: resolveOrgId(plan.organizationId),
        proposal_id: resolvedProposalUuid,
        type: plan.type || 'individual',
        status: plan.status || 'ACTIVE',
        name: plan.name,
        service: plan.service,
        frequency_per_week: plan.frequencyPerWeek,
        duration_months: plan.durationMonths,
        start_date: plan.startDate,
        end_date: plan.endDate || null,
        original_value_cents: plan.originalValueCents,
        discount_cents: plan.discountCents || 0,
        final_value_cents: plan.finalValueCents,
        pricing_snapshot: plan.pricingSnapshot || {},
        participants_snapshot: plan.participants || [],
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapPlan(data);
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('active_plans').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }

  async getSuspensions(planId: string): Promise<PlanSuspension[]> {
    let pUuid = planId;
    if (!isUUID(planId)) {
      const { data } = await fromTable('active_plans').select('id').eq('legacy_id', planId).maybeSingle();
      if (data) pUuid = data.id;
    }
    const { data, error } = await fromTable('plan_suspensions').select('*').eq('active_plan_id', pUuid);
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((s: any) => ({
      id: s.legacy_id || s.id,
      activePlanId: s.active_plan_id,
      participantId: s.participant_id || undefined,
      participantNameSnapshot: s.participant_name_snapshot || undefined,
      scope: s.scope,
      startDate: s.start_date,
      endDate: s.end_date || undefined,
      reason: s.reason || undefined,
      extendsPlan: s.extends_plan,
      status: s.status,
      createdAt: s.created_at,
    }));
  }

  async saveSuspension(suspension: PlanSuspension): Promise<PlanSuspension> {
    let { uuid, legacyId } = ensureUUID(suspension.id);
    if (legacyId) { const { data } = await fromTable('plan_suspensions').select('id').eq('legacy_id', legacyId).maybeSingle(); if (data) uuid = data.id; }
    const { data, error } = await fromTable('plan_suspensions')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        active_plan_id: suspension.activePlanId, // FIX: Do not generate fake UUID
        scope: suspension.scope,
        start_date: suspension.startDate,
        end_date: suspension.endDate || null,
        reason: suspension.reason || null,
        extends_plan: suspension.extendsPlan ?? true,
        status: suspension.status || 'ACTIVE',
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...suspension,
      id: data?.legacy_id || data?.id || uuid,
    };
  }

  async getTransfers(planId: string): Promise<PlanTransfer[]> {
    let pUuid = planId;
    if (!isUUID(planId)) {
      const { data } = await fromTable('active_plans').select('id').eq('legacy_id', planId).maybeSingle();
      if (data) pUuid = data.id;
    }
    const { data, error } = await fromTable('plan_transfers').select('*').eq('active_plan_id', pUuid);
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((t: any) => ({
      id: t.legacy_id || t.id,
      activePlanId: t.active_plan_id,
      fromParticipantId: t.from_participant_id,
      fromStudentId: t.from_student_id || undefined,
      fromNameSnapshot: t.from_name_snapshot,
      toParticipantId: t.to_participant_id,
      toStudentId: t.to_student_id || undefined,
      toNameSnapshot: t.to_name_snapshot,
      effectiveDate: t.effective_date,
      reason: t.reason || undefined,
      createdAt: t.created_at,
    }));
  }

  async saveTransfer(transfer: PlanTransfer): Promise<PlanTransfer> {
    let { uuid, legacyId } = ensureUUID(transfer.id);
    if (legacyId) { const { data } = await fromTable('plan_transfers').select('id').eq('legacy_id', legacyId).maybeSingle(); if (data) uuid = data.id; }
    const { data, error } = await fromTable('plan_transfers')
      .upsert({
        id: uuid,
        legacy_id: legacyId || null,
        active_plan_id: transfer.activePlanId,
        from_participant_id: transfer.fromParticipantId,
        from_name_snapshot: transfer.fromNameSnapshot,
        to_participant_id: transfer.toParticipantId,
        to_name_snapshot: transfer.toNameSnapshot,
        effective_date: transfer.effectiveDate,
        reason: transfer.reason || null,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...transfer,
      id: data?.legacy_id || data?.id || uuid,
    };
  }

  async getAuditLogs(planId: string): Promise<PlanAuditLog[]> {
    let pUuid = planId;
    if (!isUUID(planId)) {
      const { data } = await fromTable('active_plans').select('id').eq('legacy_id', planId).maybeSingle();
      if (data) pUuid = data.id;
    }
    const { data, error } = await fromTable('plan_audit_logs')
      .select('*')
      .eq('active_plan_id', pUuid)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((l: any) => ({
      id: l.id,
      activePlanId: l.active_plan_id,
      eventType: l.event_type,
      description: l.description,
      details: l.details || undefined,
      timestamp: l.timestamp,
    }));
  }

  async recordAuditLog(log: PlanAuditLog): Promise<PlanAuditLog> {
    const { data, error } = await fromTable('plan_audit_logs')
      .insert({
        id: generateUUID(),
        active_plan_id: log.activePlanId,
        event_type: log.eventType,
        description: log.description,
        details: (log.details as unknown as Record<string, unknown>) || null,
        timestamp: log.timestamp || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...log,
      id: data?.id || generateUUID(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPlan(row: any): ActivePlan {
    return {
      id: row.legacy_id || row.id,
      proposalId: row.proposal_id || '',
      organizationId: row.organization_id || '',
      type: row.type || 'individual',
      status: row.status || 'ACTIVE',
      name: row.name,
      service: row.service,
      frequencyPerWeek: row.frequency_per_week,
      durationMonths: row.duration_months,
      startDate: row.start_date,
      endDate: row.end_date || undefined,
      originalEndDate: row.original_end_date || undefined,
      originalValueCents: Number(row.original_value_cents),
      discountCents: Number(row.discount_cents || 0),
      finalValueCents: Number(row.final_value_cents),
      pricingSnapshot: row.pricing_snapshot || {},
      participantsSnapshot: row.participants_snapshot || [],
      conditionsSnapshot: row.conditions_snapshot || '',
      participants: (row.participants_snapshot as FamilyPlanParticipant[]) || [],
      suspensionExtendsPlan: row.suspension_extends_plan ?? true,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// ==============================================================================
// 10. SUPABASE SETTINGS REPOSITORY
// ==============================================================================
export class SupabaseSettingsRepository implements ISettingsRepository {
  async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    const { data, error } = await fromTable('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    if (data && data.value !== undefined) {
      return data.value as unknown as T;
    }
    return defaultValue !== undefined ? defaultValue : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const orgId = resolveOrgId();
    const { error } = await fromTable('settings')
      .upsert({
        key,
        organization_id: orgId,
        value: value as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async delete(key: string): Promise<void> {
    const { error } = await fromTable('settings').delete().eq('key', key);
    if (error) throw error;
  }
}


export function mapTrainingMemory(row: any): TrainingMemory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    studentId: row.student_id,
    exerciseId: row.exercise_id || undefined,
    exerciseNameSnapshot: row.exercise_name_snapshot || undefined,
    sourceSessionId: row.source_session_id || undefined,
    text: row.text,
    status: row.status as 'ACTIVE' | 'RESOLVED',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  };
}

export function unmapTrainingMemory(memory: TrainingMemory): any {
  return {
    id: memory.id,
    organization_id: memory.organizationId,
    student_id: memory.studentId,
    exercise_id: memory.exerciseId || null,
    exercise_name_snapshot: memory.exerciseNameSnapshot || null,
    source_session_id: memory.sourceSessionId || null,
    text: memory.text,
    status: memory.status,
    created_at: memory.createdAt,
    resolved_at: memory.resolvedAt || null,
  };
}


import { TrainingMemory } from '../../types';

export class SupabaseTrainingMemoriesRepository {
  async getAll(organizationId: string = 'org_tfive_1'): Promise<TrainingMemory[]> {
    const { data, error } = await fromTable('training_memories').select('*').eq('organization_id', organizationId);
    if (error) throw error;
    if (!data) return [];
    return data.map(mapTrainingMemory);
  }

  async save(memory: TrainingMemory): Promise<void> {
    const row = unmapTrainingMemory(memory);
    const { error } = await fromTable('training_memories').upsert(row);
    if (error) throw error;
  }
}

export class SupabaseFunctionalTestRepository {
  async getAll(organizationId?: string): Promise<FunctionalTest[]> {
    const orgId = resolveOrgId(organizationId);
    const { data, error } = await fromTable('functional_tests')
      .select('*')
      .eq('organization_id', orgId);
    
    if (error) {
      console.error('[SupabaseFunctionalTestRepository] error fetching functional_tests:', error);
      throw error;
    }
    console.log('functional_tests fetched:', data?.length || 0, 'expected 12');
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.legacy_id || row.id,
      name: row.name,
      shortName: row.short_name || undefined,
      domain: row.domain,
      autonomyTask: row.autonomy_task || undefined,
      category: row.category,
      description: row.description || undefined,
      equipmentNeeded: row.equipment_needed || [],
      unit: row.unit,
      unitLabel: row.unit_label || '',
      direction: row.direction || 'higher_is_better',
      instructions: row.instructions || [],
      tips: row.tips || [],
      hasMultipleTrials: row.has_multiple_trials ?? false,
      hasBilateral: row.has_bilateral ?? false,
      hasEyesCondition: row.has_eyes_condition ?? false,
      hasArmSupportOption: row.has_arm_support_option ?? false,
      hasAssistiveDeviceOption: row.has_assistive_device_option ?? false,
      hasStepHeightOption: row.has_step_height_option ?? false,
      defaultDurationSeconds: row.default_duration_seconds || undefined,
      categoricalLevels: row.categorical_levels || undefined,
      isBuiltIn: row.is_built_in ?? true,
      isCustom: row.is_custom ?? false,
      isFavorite: row.is_favorite ?? false,
      createdAt: row.created_at,
    }));
  }

  async save(test: FunctionalTest): Promise<void> {
    const { uuid, legacyId } = ensureUUID(test.id);
    const orgId = resolveOrgId();
    const payload = {
      id: uuid,
      legacy_id: legacyId || null,
      organization_id: orgId,
      name: test.name,
      short_name: test.shortName || null,
      domain: test.domain,
      autonomy_task: test.autonomyTask || null,
      category: test.category,
      description: test.description || null,
      equipment_needed: test.equipmentNeeded || [],
      unit: test.unit,
      unit_label: test.unitLabel,
      direction: test.direction,
      instructions: test.instructions || [],
      tips: test.tips || [],
      has_multiple_trials: test.hasMultipleTrials ?? false,
      has_bilateral: test.hasBilateral ?? false,
      has_eyes_condition: test.hasEyesCondition ?? false,
      has_arm_support_option: test.hasArmSupportOption ?? false,
      has_assistive_device_option: test.hasAssistiveDeviceOption ?? false,
      has_step_height_option: test.hasStepHeightOption ?? false,
      default_duration_seconds: test.defaultDurationSeconds || null,
      categorical_levels: test.categoricalLevels || null,
      is_built_in: test.isBuiltIn ?? false,
      is_custom: test.isCustom ?? true,
      is_favorite: test.isFavorite ?? false,
    };
    const { error } = await fromTable('functional_tests').upsert(payload);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    let query = fromTable('functional_tests').delete();
    query = isU ? query.eq('id', id) : query.eq('legacy_id', id);
    const { error } = await query;
    if (error) throw error;
  }
}

export class SupabaseFunctionalBatteryRepository {
  async getAll(organizationId?: string): Promise<FunctionalBattery[]> {
    const orgId = resolveOrgId(organizationId);
    const { data, error } = await fromTable('functional_batteries')
      .select('*')
      .eq('organization_id', orgId);
    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      testIds: row.test_ids || [],
      estimatedDurationMinutes: row.estimated_duration_minutes || undefined,
      isDefault: row.is_default ?? false,
      createdAt: row.created_at,
    }));
  }

  async save(battery: FunctionalBattery): Promise<void> {
    const orgId = resolveOrgId();
    const payload = {
      id: battery.id,
      organization_id: orgId,
      title: battery.title,
      description: battery.description || null,
      test_ids: battery.testIds || [],
      estimated_duration_minutes: battery.estimatedDurationMinutes || null,
      is_default: battery.isDefault ?? false,
    };
    const { error } = await fromTable('functional_batteries').upsert(payload);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await fromTable('functional_batteries').delete().eq('id', id);
    if (error) throw error;
  }
}


// ==============================================================================
// 12. SUPABASE WORKOUT TEMPLATE REPOSITORY
// ==============================================================================
export class SupabaseWorkoutTemplateRepository implements IWorkoutTemplateRepository {
  async getAll(organizationId?: string): Promise<WorkoutTemplate[]> {
    const orgId = resolveOrgId(organizationId);
    let query = fromTable('workout_templates').select('*').eq('organization_id', orgId).eq('is_archived', false);
    
    // Perform pagination in case there are many templates
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += pageSize;
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    return allData.map(t => this.mapTemplate(t));
  }

  async getById(id: string): Promise<WorkoutTemplate | null> {
    const isU = isUUID(id);
    if (!isU) return null; // No legacy_id in workout_templates
    
    const { data, error } = await fromTable('workout_templates').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.mapTemplate(data);
  }

  async create(template: WorkoutTemplate): Promise<WorkoutTemplate> {
    const { uuid } = ensureUUID(template.id);
    const orgId = resolveOrgId((template as any).organizationId);
    
    const { data, error } = await fromTable('workout_templates')
      .insert({
        id: uuid,
        organization_id: orgId,
        name: template.name || template.title || 'Novo Modelo',
        title: template.title || template.name || 'Novo Modelo',
        description: template.description || null,
        objective: template.objective || null,
        level: template.level || 'todos',
        tags: template.tags || [],
        is_favorite: template.isFavorite || false,
        category: template.category || null,
        workouts: template.workouts || [],
        is_archived: template.isArchived || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return this.mapTemplate(data);
  }

  async update(id: string, patch: Partial<WorkoutTemplate>): Promise<WorkoutTemplate> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Template ${id} not found`);
    const isU = isUUID(id);
    if (!isU) throw new Error(`Invalid UUID ${id}`);
    
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (patch.name !== undefined) { updatePayload.name = patch.name; updatePayload.title = patch.name; }
    if (patch.title !== undefined) { updatePayload.title = patch.title; updatePayload.name = patch.title; }
    if (patch.description !== undefined) updatePayload.description = patch.description;
    if (patch.objective !== undefined) updatePayload.objective = patch.objective;
    if (patch.level !== undefined) updatePayload.level = patch.level;
    if (patch.tags !== undefined) updatePayload.tags = patch.tags;
    if (patch.isFavorite !== undefined) updatePayload.is_favorite = patch.isFavorite;
    if (patch.category !== undefined) updatePayload.category = patch.category;
    if (patch.workouts !== undefined) updatePayload.workouts = patch.workouts;
    if (patch.isArchived !== undefined) updatePayload.is_archived = patch.isArchived;
    
    const { data, error } = await fromTable('workout_templates')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return this.mapTemplate(data);
  }

  async delete(id: string): Promise<void> {
    const isU = isUUID(id);
    if (!isU) return;
    const { error } = await fromTable('workout_templates').delete().eq('id', id);
    if (error) throw error;
  }
  
  private mapTemplate(row: any): WorkoutTemplate {
    return {
      id: row.id,
      name: row.name || row.title || 'Modelo sem Nome',
      title: row.title || row.name || 'Modelo sem Nome',
      description: row.description || '',
      objective: row.objective || '',
      level: row.level || 'todos',
      tags: row.tags || [],
      isFavorite: row.is_favorite || false,
      category: row.category || '',
      workouts: row.workouts || [],
      isArchived: row.is_archived || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
