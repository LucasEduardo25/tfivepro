/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — REPOSITORY FACTORY & BACKEND RESOLVER (V5.0)
 * Supabase PostgreSQL é a única fonte oficial de verdade dos dados de negócio.
 */

import { IStudentRepository } from './interfaces/IStudentRepository';
import { IStudentPhotoRepository } from './interfaces/IStudentPhotoRepository';
import { ISessionRepository } from './interfaces/ISessionRepository';
import { IRoutineRepository } from './interfaces/IRoutineRepository';
import { IAssessmentRepository } from './interfaces/IAssessmentRepository';
import { IScheduleRepository } from './interfaces/IScheduleRepository';
import { IProposalRepository } from './interfaces/IProposalRepository';
import { IExerciseRepository } from './interfaces/IExerciseRepository';
import { ITrainingCycleRepository } from './interfaces/ITrainingCycleRepository';
import { IActivePlanRepository } from './interfaces/IActivePlanRepository';
import { ISettingsRepository } from './interfaces/ISettingsRepository';
import { IWorkoutTemplateRepository } from './interfaces/IWorkoutTemplateRepository';

import { 
  SupabaseTrainingMemoriesRepository, 
  SupabaseStudentRepository,
  SupabaseStudentPhotoRepository,
  SupabaseSessionRepository,
  SupabaseRoutineRepository,
  SupabaseAssessmentRepository,
  SupabaseScheduleRepository,
  SupabaseProposalRepository,
  SupabaseExerciseRepository,
  SupabaseTrainingCycleRepository,
  SupabaseActivePlanRepository,
  SupabaseSettingsRepository, 
  SupabaseWorkoutTemplateRepository,
  SupabaseFunctionalTestRepository,
  SupabaseFunctionalBatteryRepository,
} from './supabase/SupabaseRepositories';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { DATA_BACKEND as APP_DATA_BACKEND } from '../utils/constants';

export type BackendType = 'supabase';

// Supabase é o backend ativo oficial
export const DATA_BACKEND = APP_DATA_BACKEND;

export const isSupabaseActive = (): boolean => {
  return isSupabaseConfigured();
};

// Instâncias únicas (Singletons) dos adaptadores Supabase oficiais
const supabaseStudentRepo = new SupabaseStudentRepository();
const supabaseStudentPhotoRepo = new SupabaseStudentPhotoRepository();
const supabaseSessionRepo = new SupabaseSessionRepository();
const supabaseRoutineRepo = new SupabaseRoutineRepository();
const supabaseAssessmentRepo = new SupabaseAssessmentRepository();
const supabaseScheduleRepo = new SupabaseScheduleRepository();
const supabaseProposalRepo = new SupabaseProposalRepository();
const supabaseExerciseRepo = new SupabaseExerciseRepository();
const supabaseCycleRepo = new SupabaseTrainingCycleRepository();
const supabasePlanRepo = new SupabaseActivePlanRepository();
const supabaseSettingsRepo = new SupabaseSettingsRepository();
const supabaseWorkoutTemplateRepo = new SupabaseWorkoutTemplateRepository();
const supabaseTrainingMemoriesRepo = new SupabaseTrainingMemoriesRepository();
const supabaseFunctionalTestRepo = new SupabaseFunctionalTestRepository();
const supabaseFunctionalBatteryRepo = new SupabaseFunctionalBatteryRepository();

export function getStudentPhotoRepository(): IStudentPhotoRepository {
  return supabaseStudentPhotoRepo;
}

export function getStudentRepository(): IStudentRepository {
  return supabaseStudentRepo;
}

export function getSessionRepository(): ISessionRepository {
  return supabaseSessionRepo;
}

export function getRoutineRepository(): IRoutineRepository {
  return supabaseRoutineRepo;
}

export function getAssessmentRepository(): IAssessmentRepository {
  return supabaseAssessmentRepo;
}

export function getScheduleRepository(): IScheduleRepository {
  return supabaseScheduleRepo;
}

export function getProposalRepository(): IProposalRepository {
  return supabaseProposalRepo;
}

export function getExerciseRepository(): IExerciseRepository {
  return supabaseExerciseRepo;
}

export function getTrainingCycleRepository(): ITrainingCycleRepository {
  return supabaseCycleRepo;
}

export function getActivePlanRepository(): IActivePlanRepository {
  return supabasePlanRepo;
}

export function getSettingsRepository(): ISettingsRepository {
  return supabaseSettingsRepo;
}

export function getWorkoutTemplateRepository(): IWorkoutTemplateRepository {
  return supabaseWorkoutTemplateRepo;
}

export function getTrainingMemoriesRepository() {
  return supabaseTrainingMemoriesRepo;
}

export function getFunctionalTestRepository() {
  return supabaseFunctionalTestRepo;
}

export function getFunctionalBatteryRepository() {
  return supabaseFunctionalBatteryRepo;
}

