/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — SERVIÇO DE DADOS DO MODO ALUNO (ISOLAMENTO E RESTRIÇÃO ABSOLUTA)
 * 
 * REGRAS CRÍTICAS:
 * 1. Um aluno só pode acessar dados relacionados ao seu próprio student_id e organization_id.
 * 2. As consultas feitas pelo Modo Aluno utilizam estritamente student_id e organization_id via Supabase.
 * 3. Prescrição é 100% READ-ONLY (nenhum método de mutação de rotinas/exercícios é exposto aqui).
 * 4. Bloqueio absoluto de acesso a dados de outros alunos, relatórios confidenciais do treinador ou finanças.
 * 5. Supabase é a fonte oficial exclusiva — sem fallback silencioso para IndexedDB.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  getStudentRepository,
  getRoutineRepository, 
  getSessionRepository,
  getAssessmentRepository,
  getActivePlanRepository,
  getTrainingCycleRepository
} from '../repositories/repositoryConfig';
import { 
  Student, 
  WorkoutRoutine, 
  WorkoutSession, 
  ScheduleAppointment, 
  TrainingCycle,
  PhysicalAssessment
} from '../types';
import { StudentAccess, DEFAULT_STUDENT_PERMISSIONS, SecurityViolationError } from '../types/auth';
import { ActivePlan } from '../types/activePlan';
import { authService } from './authService';
import { studentAccessService } from './studentAccessService';
import { resolveStudentModality, StudentModalityInfo } from './studentModalityService';
import { isUUID, resolveStudentUuid } from '../utils/supabaseHelpers';

export interface StudentDashboardData {
  student: Student;
  access: StudentAccess;
  modalityInfo: StudentModalityInfo;
  routines: WorkoutRoutine[];
  recentSessions: WorkoutSession[];
  upcomingAppointments: ScheduleAppointment[];
  pastAppointments: ScheduleAppointment[];
  activePlan: ActivePlan | null;
  currentCycle: TrainingCycle | null;
  assessments: PhysicalAssessment[];
}

class StudentDataService {
  /**
   * Valida se a chamada atual está autorizada para o studentId solicitado
   */
  private checkSecurity(requestedStudentId: string): void {
    const currentRole = authService.getCurrentRole();

    if (currentRole === 'TRAINER' || currentRole === 'OWNER') {
      return;
    }

    if (currentRole === 'STUDENT') {
      const authenticatedStudentId = authService.getStudentId();
      if (!authenticatedStudentId || authenticatedStudentId !== requestedStudentId) {
        throw new SecurityViolationError(
          `Tentativa de acesso não autorizado aos dados do aluno ${requestedStudentId}.`,
          'UNAUTHORIZED_STUDENT_ACCESS'
        );
      }
      return;
    }

    throw new SecurityViolationError('Papel de autenticação desconhecido ou não autorizado.');
  }

  /**
   * Obtém as permissões e o status do acesso do aluno
   */
  public async getStudentAccess(studentId: string): Promise<StudentAccess> {
    return await studentAccessService.getOrCreateAccess(studentId);
  }

  /**
   * Carrega perfil restrito do próprio aluno
   */
  public async getStudentProfile(studentId: string): Promise<Student | null> {
    this.checkSecurity(studentId);
    try {
      return await getStudentRepository().getById(studentId);
    } catch (err) {
      console.error('Falha ao carregar perfil do aluno no Supabase:', err);
      return null;
    }
  }

  /**
   * Alias de segurança compatível com a suíte de auditoria
   */
  public async getAuthorizedStudent(studentId: string): Promise<Student | null> {
    return this.getStudentProfile(studentId);
  }

  /**
   * Bloqueio estrito: Alunos NUNCA podem listar a relação geral de alunos
   */
  public async getAllStudentsList(): Promise<Student[]> {
    authService.assertTrainer('listar a relação geral de alunos');
    return await getStudentRepository().getAll();
  }

  /**
   * Carrega avaliações físicas autorizadas do aluno
   */
  public async getAuthorizedAssessments(studentId: string): Promise<PhysicalAssessment[]> {
    this.checkSecurity(studentId);
    const access = await this.getStudentAccess(studentId);
    if (!access.permissions.assessments) {
      throw new SecurityViolationError('Permissão para visualização de avaliações não habilitada.');
    }

    try {
      return await getAssessmentRepository().getByStudentId(studentId);
    } catch (err) {
      console.warn('Erro ao carregar avaliações no Supabase:', err);
      return [];
    }
  }

  /**
   * Alias de segurança para rotinas autorizadas
   */
  public async getAuthorizedRoutines(studentId: string): Promise<WorkoutRoutine[]> {
    return this.getStudentRoutines(studentId);
  }

  /**
   * Carrega rotinas ativas prescritas para o aluno
   */
  public async getStudentRoutines(studentId: string): Promise<WorkoutRoutine[]> {
    this.checkSecurity(studentId);
    const access = await this.getStudentAccess(studentId);
    if (!access.permissions.currentWorkout) {
      throw new SecurityViolationError('Permissão para visualização de treinos não habilitada.');
    }

    try {
      const routineRepo = getRoutineRepository();
      const routines = await routineRepo.getByStudentId(studentId);
      return routines.filter(r => r.status === 'active' && !r.isArchived);
    } catch (err) {
      console.error('Falha ao carregar rotinas do aluno:', err);
      return [];
    }
  }

  /**
   * Carrega histórico de sessões executadas pelo aluno
   */
  public async getStudentSessions(studentId: string): Promise<WorkoutSession[]> {
    this.checkSecurity(studentId);
    try {
      return await getSessionRepository().getByStudentId(studentId);
    } catch (err) {
      console.error('Falha ao carregar histórico de treinos do aluno:', err);
      return [];
    }
  }

  /**
   * Carrega agendamentos de aulas do aluno (Apenas Presencial)
   */
  public async getStudentAppointments(studentId: string): Promise<{
    upcoming: ScheduleAppointment[];
    past: ScheduleAppointment[];
  }> {
    this.checkSecurity(studentId);

    try {
      let appointments: ScheduleAppointment[] = [];
      const stdUuid = await resolveStudentUuid(studentId);

      if (isSupabaseConfigured() && stdUuid && isUUID(stdUuid)) {
        const { data, error } = await (supabase as any)
          .from('schedule_events')
          .select('*')
          .eq('student_id', stdUuid)
          .order('date', { ascending: true });

        if (!error && data && data.length > 0) {
          appointments = data.map((e: any) => ({
            id: e.legacy_id || e.id,
            studentId: studentId,
            studentName: e.student_name || 'Aluno',
            date: e.date,
            time: e.time,
            durationMinutes: e.duration_minutes || 60,
            status: e.status || 'scheduled',
            workoutId: e.workout_id,
            workoutLetter: e.workout_letter,
            notes: e.notes || '',
            createdAt: e.created_at,
            updatedAt: e.updated_at
          })) as ScheduleAppointment[];
        }
      }

      const todayStr = new Date().toISOString().split('T')[0];

      const upcoming = appointments
        .filter(a => (a.date || '') >= todayStr && a.status !== 'cancelled')
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

      const past = appointments
        .filter(a => (a.date || '') < todayStr || a.status === 'completed')
        .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

      return { upcoming, past };
    } catch (err) {
      console.error('Falha ao carregar agenda do aluno:', err);
      return { upcoming: [], past: [] };
    }
  }

  /**
   * Carrega ciclo de periodização atual do aluno (se autorizado)
   */
  public async getStudentCurrentCycle(studentId: string): Promise<TrainingCycle | null> {
    this.checkSecurity(studentId);

    try {
      const stdUuid = await resolveStudentUuid(studentId);
      if (isSupabaseConfigured() && stdUuid && isUUID(stdUuid)) {
        const { data, error } = await (supabase as any)
          .from('training_cycles')
          .select('*')
          .eq('student_id', stdUuid)
          .eq('status', 'current')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.legacy_id || data.id,
            studentId: studentId,
            name: data.name,
            objective: data.objective,
            startDate: data.start_date,
            totalWeeks: data.total_weeks || 12,
            status: data.status,
            blocks: Array.isArray(data.blocks) ? data.blocks : [],
            createdAt: data.created_at,
            updatedAt: data.updated_at
          } as TrainingCycle;
        }
      }
      return null;
    } catch (err) {
      console.warn('Falha ao carregar ciclo do aluno:', err);
      return null;
    }
  }

  /**
   * Carrega plano ativo do aluno
   */
  public async getStudentActivePlan(studentId: string): Promise<ActivePlan | null> {
    this.checkSecurity(studentId);

    try {
      const plans = await getActivePlanRepository().getByStudentId(studentId);
      return plans.find(p => p.status === 'ACTIVE') || plans[0] || null;
    } catch (err) {
      console.warn('Falha ao carregar active_plan no Supabase:', err);
      return null;
    }
  }

  /**
   * Carregamento unificado dos dados da fundação do Modo Aluno
   */
  public async loadAllStudentData(studentId: string): Promise<StudentDashboardData> {
    this.checkSecurity(studentId);

    const [
      student,
      access,
      routines,
      sessions,
      appointmentsData,
      activePlan,
      currentCycle,
      assessments
    ] = await Promise.all([
      this.getStudentProfile(studentId),
      this.getStudentAccess(studentId),
      this.getStudentRoutines(studentId).catch(() => []),
      this.getStudentSessions(studentId).catch(() => []),
      this.getStudentAppointments(studentId).catch(() => ({ upcoming: [], past: [] })),
      this.getStudentActivePlan(studentId).catch(() => null),
      this.getStudentCurrentCycle(studentId).catch(() => null),
      this.getAuthorizedAssessments(studentId).catch(() => [])
    ]);

    if (!student) {
      throw new Error(`Aluno não encontrado para o ID: ${studentId}`);
    }

    const modalityInfo = await resolveStudentModality(student.id, access.permissions.schedule !== false);

    return {
      student,
      access,
      modalityInfo,
      routines,
      recentSessions: sessions.slice(0, 10),
      upcomingAppointments: appointmentsData.upcoming,
      pastAppointments: appointmentsData.past,
      activePlan,
      currentCycle,
      assessments
    };
  }

  /**
   * Bloqueio explícito de acesso a dados financeiros para alunos (Security Canary)
   */
  public async getFinancialRecords(): Promise<never> {
    const currentRole = authService.getCurrentRole();
    if (currentRole === 'STUDENT') {
      throw new SecurityViolationError(
        'Acesso a registros financeiros bloqueado para alunos.',
        'FINANCIAL_ACCESS_DENIED'
      );
    }
    throw new SecurityViolationError('Não implementado para este perfil.', 'FINANCIAL_ACCESS_DENIED');
  }
}

export const studentDataService = new StudentDataService();
